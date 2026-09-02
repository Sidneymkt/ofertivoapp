import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader } from './ui/card';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { Heart, MessageCircle, Send, Trash2, MapPin, Tag, User, Store, Gift, HeartIcon, Share2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CommunityPost, PostComment } from '@/hooks/useCommunityPosts';
import { useAuth } from '@/hooks/useAuth';
import { Badge } from './ui/badge';
import { supabase } from '@/lib/supabase';
import { ShareMenu } from './ShareMenu';

interface CommunityPostCardProps {
  post: CommunityPost;
  onLike: (postId: string) => void;
  onComment: (postId: string, comment: string) => Promise<boolean>;
  onLoadComments: (postId: string) => Promise<PostComment[]>;
  onDelete?: (postId: string) => void;
}

export const CommunityPostCard = ({ 
  post, 
  onLike, 
  onComment,
  onLoadComments,
  onDelete 
}: CommunityPostCardProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<PostComment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loadingComments, setLoadingComments] = useState(false);

  const handleNavigateToProfile = async (userId: string, userType?: string) => {
    if (userType === 'business') {
      // Buscar o negócio do usuário
      const { data: business } = await supabase
        .from('businesses')
        .select('id')
        .eq('owner_id', userId)
        .single();
      
      if (business) {
        navigate(`/negocio/${business.id}`);
        return;
      }
    }
    navigate(`/usuario/${userId}`);
  };

  const handleMentionClick = (mention: { type: string; id: string; name: string }) => {
    switch (mention.type) {
      case 'offer':
        navigate(`/ofertas/${mention.id}`);
        break;
      case 'user':
        navigate(`/usuario/${mention.id}`);
        break;
      case 'business':
        navigate(`/negocio/${mention.id}`);
        break;
      case 'raffle':
        navigate(`/sorteios/${mention.id}`);
        break;
      case 'campaign':
        navigate(`/vaquinhas/${mention.id}`);
        break;
    }
  };

  const getMentionIcon = (type: string) => {
    switch (type) {
      case 'offer': return <Tag className="h-3 w-3" />;
      case 'user': return <User className="h-3 w-3" />;
      case 'business': return <Store className="h-3 w-3" />;
      case 'raffle': return <Gift className="h-3 w-3" />;
      case 'campaign': return <HeartIcon className="h-3 w-3" />;
      default: return null;
    }
  };

  const getMentionStyle = (type: string) => {
    switch (type) {
      case 'offer': return 'bg-primary/10 text-primary hover:bg-primary/20 border-primary/20';
      case 'user': return 'bg-blue-500/10 text-blue-600 hover:bg-blue-500/20 border-blue-500/20';
      case 'business': return 'bg-green-500/10 text-green-600 hover:bg-green-500/20 border-green-500/20';
      case 'raffle': return 'bg-purple-500/10 text-purple-600 hover:bg-purple-500/20 border-purple-500/20';
      case 'campaign': return 'bg-rose-500/10 text-rose-600 hover:bg-rose-500/20 border-rose-500/20';
      default: return '';
    }
  };

  const handleShowComments = async () => {
    if (!showComments && comments.length === 0) {
      setLoadingComments(true);
      const loadedComments = await onLoadComments(post.id);
      setComments(loadedComments);
      setLoadingComments(false);
    }
    setShowComments(!showComments);
  };

  const handleSubmitComment = async () => {
    if (!newComment.trim()) return;
    
    const success = await onComment(post.id, newComment);
    if (success) {
      setNewComment('');
      const loadedComments = await onLoadComments(post.id);
      setComments(loadedComments);
    }
  };

  const isOwner = user?.id === post.user_id;

  return (
    <Card className="hover:shadow-md transition-shadow overflow-hidden w-full max-w-full">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div 
            className="flex items-start gap-3 cursor-pointer min-w-0 flex-1"
            onClick={() => handleNavigateToProfile(post.user_id, post.profiles?.user_type)}
          >
            <Avatar className="h-10 w-10 sm:h-12 sm:w-12 shrink-0 ring-2 ring-transparent hover:ring-primary transition-all">
              <AvatarImage src={post.profiles?.avatar_url} />
              <AvatarFallback>
                {post.profiles?.full_name?.charAt(0) || '?'}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-semibold hover:text-primary transition-colors truncate">{post.profiles?.full_name}</p>
                {post.profiles?.user_type === 'business' && (
                  <Badge variant="secondary" className="text-xs shrink-0">
                    Anunciante
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-1 text-xs sm:text-sm text-muted-foreground flex-wrap">
                <MapPin className="h-3 w-3 shrink-0" />
                <span className="truncate">{post.profiles?.city || 'Sua cidade'}</span>
                <span>•</span>
                <span className="truncate">
                  {formatDistanceToNow(new Date(post.created_at), {
                    addSuffix: true,
                    locale: ptBR
                  })}
                </span>
              </div>
            </div>
          </div>
          {isOwner && onDelete && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onDelete(post.id)}
              className="text-destructive hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <p className="text-foreground whitespace-pre-wrap break-words">{post.content}</p>

        {/* Menções */}
        {post.mentions && post.mentions.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {post.mentions.map((mention, index) => (
              <Badge
                key={`${mention.type}-${mention.id}-${index}`}
                variant="outline"
                className={`cursor-pointer flex items-center gap-1.5 transition-colors max-w-full ${getMentionStyle(mention.type)}`}
                onClick={() => handleMentionClick(mention)}
              >
                {getMentionIcon(mention.type)}
                <span className="max-w-[120px] sm:max-w-[150px] truncate">{mention.name}</span>
              </Badge>
            ))}
          </div>
        )}

        {post.image_url && (
          <img
            src={post.image_url}
            alt="Post"
            className="w-full rounded-lg object-cover max-h-96"
          />
        )}

        <div className="flex items-center gap-4 pt-2 border-t">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onLike(post.id)}
            className={post.user_has_liked ? 'text-red-500' : ''}
          >
            <Heart className={`h-4 w-4 mr-1 ${post.user_has_liked ? 'fill-current' : ''}`} />
            {post.likes_count || 0}
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleShowComments}
          >
            <MessageCircle className="h-4 w-4 mr-1" />
            {post.comments_count || 0}
          </Button>

          <ShareMenu
            url={`https://ofertivoapp.com/comunidade?post=${post.id}`}
            title={`${post.profiles?.full_name || 'Usuário'} na Comunidade Ofertivo`}
            description={post.content?.substring(0, 100) || 'Publicação na comunidade Ofertivo'}
            contentType="post"
            contentId={post.id}
            variant="ghost"
            size="sm"
          />
        </div>

        {showComments && (
          <div className="space-y-3 pt-3 border-t">
            {loadingComments ? (
              <p className="text-sm text-muted-foreground">Carregando comentários...</p>
            ) : (
              <>
                {comments.map((comment) => (
                  <div key={comment.id} className="flex gap-2">
                    <Avatar 
                      className="h-8 w-8 cursor-pointer ring-2 ring-transparent hover:ring-primary transition-all"
                      onClick={() => handleNavigateToProfile(comment.user_id, comment.profiles?.user_type)}
                    >
                      <AvatarImage src={comment.profiles?.avatar_url} />
                      <AvatarFallback>
                        {comment.profiles?.full_name?.charAt(0) || '?'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="bg-muted rounded-lg p-2">
                        <p 
                          className="font-semibold text-sm cursor-pointer hover:text-primary transition-colors"
                          onClick={() => handleNavigateToProfile(comment.user_id, comment.profiles?.user_type)}
                        >
                          {comment.profiles?.full_name}
                        </p>
                        <p className="text-sm">{comment.comment}</p>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatDistanceToNow(new Date(comment.created_at), {
                          addSuffix: true,
                          locale: ptBR
                        })}
                      </p>
                    </div>
                  </div>
                ))}

                <div className="flex gap-2">
                  <Textarea
                    placeholder="Escreva um comentário..."
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    className="min-h-[60px]"
                  />
                  <Button
                    onClick={handleSubmitComment}
                    disabled={!newComment.trim()}
                    size="icon"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
