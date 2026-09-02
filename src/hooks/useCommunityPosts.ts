import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from './use-toast';
import { useAuth } from './useAuth';
import { useDailyMissions } from './useDailyMissions';

export interface CommunityPost {
  id: string;
  user_id: string;
  content: string;
  image_url?: string;
  post_type: 'standard' | 'promotion' | 'announcement';
  is_active: boolean;
  created_at: string;
  updated_at: string;
  mentions?: Array<{type: string; id: string; name: string}>;
  profiles?: {
    full_name: string;
    avatar_url: string;
    user_type: string;
    city: string;
  };
  likes_count?: number;
  comments_count?: number;
  user_has_liked?: boolean;
}

export interface PostComment {
  id: string;
  post_id: string;
  user_id: string;
  comment: string;
  created_at: string;
  profiles?: {
    full_name: string;
    avatar_url: string;
    user_type?: string;
  };
}

export const useCommunityPosts = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { completeMission } = useDailyMissions();
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [loading, setLoading] = useState(false);

  const loadPosts = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('community_posts')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const postsData = data || [];
      if (postsData.length === 0) {
        setPosts([]);
        return;
      }

      const postIds = postsData.map((post) => post.id);
      const userIds = [...new Set(postsData.map((post) => post.user_id))];

      const [profilesResult, likesResult, commentsResult, userLikesResult] = await Promise.all([
        supabase
          .from('profiles')
          .select('user_id, full_name, avatar_url, user_type, city')
          .in('user_id', userIds),
        supabase
          .from('post_likes')
          .select('post_id')
          .in('post_id', postIds),
        supabase
          .from('post_comments')
          .select('post_id')
          .in('post_id', postIds),
        user?.id
          ? supabase
              .from('post_likes')
              .select('post_id')
              .eq('user_id', user.id)
              .in('post_id', postIds)
          : Promise.resolve({ data: [], error: null }),
      ]);

      if (profilesResult.error) throw profilesResult.error;
      if (likesResult.error) throw likesResult.error;
      if (commentsResult.error) throw commentsResult.error;
      if (userLikesResult.error) throw userLikesResult.error;

      const profileMap = new Map(
        (profilesResult.data || []).map((profile) => [profile.user_id, profile])
      );

      const likesCountMap = new Map<string, number>();
      for (const like of likesResult.data || []) {
        likesCountMap.set(like.post_id, (likesCountMap.get(like.post_id) || 0) + 1);
      }

      const commentsCountMap = new Map<string, number>();
      for (const comment of commentsResult.data || []) {
        commentsCountMap.set(comment.post_id, (commentsCountMap.get(comment.post_id) || 0) + 1);
      }

      const userLikedPostIds = new Set((userLikesResult.data || []).map((like) => like.post_id));

      const postsWithStats = postsData.map((post) => {
        const mentions = Array.isArray((post as any).mentions)
          ? (post as any).mentions
          : [];

        return {
          ...post,
          post_type: post.post_type as 'standard' | 'promotion' | 'announcement',
          profiles: profileMap.get(post.user_id) || undefined,
          likes_count: likesCountMap.get(post.id) || 0,
          comments_count: commentsCountMap.get(post.id) || 0,
          user_has_liked: userLikedPostIds.has(post.id),
          mentions,
        };
      });

      setPosts(postsWithStats as CommunityPost[]);
    } catch (error: any) {
      console.error('Error loading posts:', error);
      toast({
        title: 'Erro ao carregar posts',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const createPost = async (content: string, imageUrl?: string, postType: 'standard' | 'promotion' | 'announcement' = 'standard', mentions?: Array<{type: string; id: string; name: string}>) => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('community_posts')
        .insert({
          user_id: user.id,
          content,
          image_url: imageUrl,
          post_type: postType,
          mentions: mentions || []
        } as any);

      if (error) throw error;

      toast({
        title: '✅ Post publicado!',
        description: 'Sua publicação foi compartilhada na comunidade'
      });

      completeMission('visit_community');
      await loadPosts();
      return true;
    } catch (error: any) {
      console.error('Error creating post:', error);
      toast({
        title: 'Erro ao publicar',
        description: error.message,
        variant: 'destructive'
      });
      return false;
    }
  };

  const toggleLike = async (postId: string) => {
    if (!user) return;

    try {
      const { data: existingLike } = await supabase
        .from('post_likes')
        .select('id')
        .eq('post_id', postId)
        .eq('user_id', user.id)
        .single();

      if (existingLike) {
        await supabase
          .from('post_likes')
          .delete()
          .eq('id', existingLike.id);
      } else {
        await supabase
          .from('post_likes')
          .insert({ post_id: postId, user_id: user.id });
        completeMission('visit_community');
      }

      await loadPosts();
    } catch (error: any) {
      console.error('Error toggling like:', error);
    }
  };

  const addComment = async (postId: string, comment: string) => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('post_comments')
        .insert({
          post_id: postId,
          user_id: user.id,
          comment
        });

      if (error) throw error;

      toast({
        title: '✅ Comentário adicionado!',
      });

      completeMission('visit_community');
      await loadPosts();
      return true;
    } catch (error: any) {
      console.error('Error adding comment:', error);
      toast({
        title: 'Erro ao comentar',
        description: error.message,
        variant: 'destructive'
      });
      return false;
    }
  };

  const loadComments = async (postId: string): Promise<PostComment[]> => {
    try {
      const { data, error } = await supabase
        .from('post_comments')
        .select('*')
        .eq('post_id', postId)
        .order('created_at', { ascending: true});

      if (error) throw error;

      // Buscar profiles dos autores dos comentários
      const commentsWithProfiles = await Promise.all(
        (data || []).map(async (comment) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name, avatar_url, user_type')
            .eq('user_id', comment.user_id)
            .single();

          return {
            ...comment,
            profiles: profile || undefined
          };
        })
      );

      return commentsWithProfiles as PostComment[];
    } catch (error: any) {
      console.error('Error loading comments:', error);
      return [];
    }
  };

  const deletePost = async (postId: string) => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('community_posts')
        .delete()
        .eq('id', postId)
        .eq('user_id', user.id);

      if (error) throw error;

      toast({
        title: '✅ Post excluído',
      });

      await loadPosts();
      return true;
    } catch (error: any) {
      console.error('Error deleting post:', error);
      toast({
        title: 'Erro ao excluir',
        description: error.message,
        variant: 'destructive'
      });
      return false;
    }
  };

  useEffect(() => {
    if (user) {
      loadPosts();

      // Realtime updates
      const channel = supabase
        .channel('community-posts')
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'community_posts'
        }, () => {
          loadPosts();
        })
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'post_likes'
        }, () => {
          loadPosts();
        })
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'post_comments'
        }, () => {
          loadPosts();
        })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user?.id]);

  return {
    posts,
    loading,
    loadPosts,
    createPost,
    toggleLike,
    addComment,
    loadComments,
    deletePost
  };
};
