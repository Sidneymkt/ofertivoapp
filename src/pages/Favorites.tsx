
import React from 'react';
import { FavoritesHistory } from '@/components/FavoritesHistory';
import { FollowedBusinessesFeed } from '@/components/FollowedBusinessesFeed';
import { BackButton } from '@/components/BackButton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Heart, Rss } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useFollowsRealtimeSubscription } from '@/hooks/useRealtimeSubscription';

const Favorites = () => {
  const { user } = useAuth();
  
  // Real-time sync for favorites and follows
  useFollowsRealtimeSubscription();
  
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto p-4">
        <div className="flex items-center gap-4 mb-6">
          <BackButton to="/" />
          <div>
            <h1 className="text-2xl font-bold">Favoritos</h1>
            <p className="text-muted-foreground">
              Gerencie suas ofertas favoritas e negócios seguidos
            </p>
          </div>
        </div>

        <Tabs defaultValue="favorites" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="favorites" className="flex items-center gap-2">
              <Heart className="w-4 h-4" />
              Favoritos e Histórico
            </TabsTrigger>
            <TabsTrigger value="feed" className="flex items-center gap-2">
              <Rss className="w-4 h-4" />
              Feed Personalizado
            </TabsTrigger>
          </TabsList>

          <TabsContent value="favorites" className="mt-6">
            <FavoritesHistory />
          </TabsContent>

          <TabsContent value="feed" className="mt-6">
            <FollowedBusinessesFeed />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Favorites;
