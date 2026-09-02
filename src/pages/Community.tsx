import { useState, useEffect } from 'react';
import { BackButton } from '@/components/BackButton';
import { useCommunityPosts } from '@/hooks/useCommunityPosts';
import { CommunityPostCard } from '@/components/CommunityPostCard';
import { CreatePostModal } from '@/components/CreatePostModal';
import { CommunityMembersList } from '@/components/CommunityMembersList';
import { FeaturedCampaigns } from '@/components/FeaturedCampaigns';
import { CommunityEliteSidebar } from '@/components/CommunityEliteSidebar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Users, FileText, Heart } from 'lucide-react';
import { useDailyMissions } from '@/hooks/useDailyMissions';

const Community = () => {
  const { completeMission } = useDailyMissions();
  
  useEffect(() => {
    completeMission('visit_community');
    console.log('[Community] Page loaded successfully');
  }, []);
  const {
    posts,
    loading,
    createPost,
    toggleLike,
    addComment,
    loadComments,
    deletePost
  } = useCommunityPosts();

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0 overflow-x-hidden">
      <div className="container max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
        <div className="mb-4 sm:mb-6">
          <BackButton />
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold mt-3 sm:mt-4 break-words">Comunidade Ofertivo</h1>
          <p className="text-xs sm:text-sm md:text-base text-muted-foreground">
            Conecte-se, compartilhe e colabore com a comunidade
          </p>
        </div>

        <Tabs defaultValue="feed" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="feed" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline">Feed</span>
            </TabsTrigger>
            <TabsTrigger value="members" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Membros</span>
            </TabsTrigger>
            <TabsTrigger value="campaigns" className="flex items-center gap-2">
              <Heart className="h-4 w-4" />
              <span className="hidden sm:inline">Vaquinhas</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="feed" className="space-y-6">
            <div className="flex justify-end">
              <CreatePostModal onCreatePost={createPost} />
            </div>

            {loading ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">Carregando publicações...</p>
              </div>
            ) : posts.length === 0 ? (
              <div className="text-center py-12">
                <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  Nenhuma publicação ainda. Seja o primeiro a compartilhar!
                </p>
              </div>
            ) : (
              <div className="grid gap-6 lg:grid-cols-3">
                <div className="lg:col-span-2 space-y-6 min-w-0">
                  {posts.map((post, index) => (
                    <div key={post.id} className="min-w-0">
                      <CommunityPostCard
                        post={post}
                        onLike={toggleLike}
                        onComment={addComment}
                        onLoadComments={loadComments}
                        onDelete={deletePost}
                      />
                      {/* Mobile: show elite sidebar every 5 posts */}
                      {(index + 1) % 5 === 0 && (
                        <div className="lg:hidden mt-6">
                          <CommunityEliteSidebar compact />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                <div className="hidden lg:block space-y-6">
                  <CommunityEliteSidebar />
                  <CommunityMembersList />
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="members">
            <CommunityMembersList />
          </TabsContent>

          <TabsContent value="campaigns">
            <FeaturedCampaigns />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Community;
