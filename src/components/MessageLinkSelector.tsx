import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  Link2, Tag, Gift, Users, Heart, ChevronRight, 
  Search, Loader2, Image as ImageIcon, X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { getShareableUrl } from '@/lib/shareUrls';

export interface SelectedLink {
  type: 'offer' | 'raffle' | 'post' | 'crowdfunding';
  id: string;
  title: string;
  description?: string;
  imageUrl?: string | null;
  url: string;
}

interface MessageLinkSelectorProps {
  businessId: string;
  onSelectLink: (link: SelectedLink) => void;
  trigger?: React.ReactNode;
}

export const MessageLinkSelector = ({ businessId, onSelectLink, trigger }: MessageLinkSelectorProps) => {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('offers');

  // Fetch offers
  const { data: offers = [], isLoading: loadingOffers } = useQuery({
    queryKey: ['business-offers-for-links', businessId],
    queryFn: async () => {
      const { data } = await supabase
        .from('offers')
        .select('id, title, image_url, discount_percentage, discounted_price, category')
        .eq('business_id', businessId)
        .eq('is_active', true)
        .is('deleted_at', null)
        .gte('valid_until', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(20);
      return data || [];
    },
    enabled: open && !!businessId,
  });

  // Fetch raffles
  const { data: raffles = [], isLoading: loadingRaffles } = useQuery({
    queryKey: ['business-raffles-for-links', businessId],
    queryFn: async () => {
      const { data } = await supabase
        .from('raffles')
        .select('id, title, image_url, ticket_price, total_tickets, sold_tickets')
        .eq('business_id', businessId)
        .eq('is_active', true)
        .gte('end_date', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(20);
      return data || [];
    },
    enabled: open && !!businessId,
  });

  // Fetch community posts by business owner
  const { data: posts = [], isLoading: loadingPosts } = useQuery({
    queryKey: ['business-posts-for-links', businessId],
    queryFn: async () => {
      // Get business owner id first
      const { data: business } = await supabase
        .from('businesses')
        .select('owner_id')
        .eq('id', businessId)
        .single();
      
      if (!business) return [];
      
      const { data } = await supabase
        .from('community_posts')
        .select('id, content, image_url, created_at')
        .eq('user_id', business.owner_id)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(20);
      return data || [];
    },
    enabled: open && !!businessId,
  });

  // Fetch sponsored crowdfunding campaigns
  const { data: campaigns = [], isLoading: loadingCampaigns } = useQuery({
    queryKey: ['business-crowdfunding-for-links', businessId],
    queryFn: async () => {
      const { data } = await supabase
        .from('crowdfunding_campaigns')
        .select('id, title, image_url, goal_points, current_points, category')
        .eq('patrocinador_id', businessId)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(20);
      return data || [];
    },
    enabled: open && !!businessId,
  });

  const handleSelectOffer = (offer: any) => {
    const link: SelectedLink = {
      type: 'offer',
      id: offer.id,
      title: offer.title,
      imageUrl: offer.image_url,
      url: getShareableUrl('offer', offer.id),
      description: offer.discount_percentage 
        ? `${offer.discount_percentage}% OFF` 
        : `R$ ${offer.discounted_price?.toFixed(2)}`
    };
    onSelectLink(link);
    setOpen(false);
  };

  const handleSelectRaffle = (raffle: any) => {
    const progress = raffle.total_tickets > 0 
      ? Math.round((raffle.sold_tickets / raffle.total_tickets) * 100) 
      : 0;
    const link: SelectedLink = {
      type: 'raffle',
      id: raffle.id,
      title: raffle.title,
      imageUrl: raffle.image_url,
      url: getShareableUrl('raffle', raffle.id),
      description: `🎰 ${progress}% vendido · ${raffle.ticket_price} pts/bilhete`
    };
    onSelectLink(link);
    setOpen(false);
  };

  const handleSelectPost = (post: any) => {
    const link: SelectedLink = {
      type: 'post',
      id: post.id,
      title: post.content.slice(0, 50) + (post.content.length > 50 ? '...' : ''),
      imageUrl: post.image_url,
      url: getShareableUrl('post', post.id),
      description: '📝 Publicação na comunidade'
    };
    onSelectLink(link);
    setOpen(false);
  };

  const handleSelectCampaign = (campaign: any) => {
    const progress = campaign.goal_points > 0 
      ? Math.round((campaign.current_points / campaign.goal_points) * 100) 
      : 0;
    const link: SelectedLink = {
      type: 'crowdfunding',
      id: campaign.id,
      title: campaign.title,
      imageUrl: campaign.image_url,
      url: getShareableUrl('crowdfunding', campaign.id),
      description: `❤️ ${progress}% arrecadado`
    };
    onSelectLink(link);
    setOpen(false);
  };

  const filterItems = (items: any[], query: string) => {
    if (!query) return items;
    const lower = query.toLowerCase();
    return items.filter(item => 
      item.title?.toLowerCase().includes(lower) || 
      item.content?.toLowerCase().includes(lower)
    );
  };

  const filteredOffers = filterItems(offers, searchQuery);
  const filteredRaffles = filterItems(raffles, searchQuery);
  const filteredPosts = filterItems(posts, searchQuery);
  const filteredCampaigns = filterItems(campaigns, searchQuery);

  const tabCounts = {
    offers: offers.length,
    raffles: raffles.length,
    posts: posts.length,
    crowdfunding: campaigns.length,
  };

  return (
    <>
      {trigger ? (
        <div onClick={() => setOpen(true)}>
          {trigger}
        </div>
      ) : (
        <Button 
          type="button" 
          variant="outline" 
          size="sm"
          onClick={() => setOpen(true)}
          className="gap-1.5"
        >
          <Link2 className="w-4 h-4" />
          <span className="hidden sm:inline">Inserir Link</span>
        </Button>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] flex flex-col p-0">
          <DialogHeader className="p-4 pb-0">
            <DialogTitle className="flex items-center gap-2">
              <Link2 className="w-5 h-5 text-primary" />
              Inserir Link na Mensagem
            </DialogTitle>
            <DialogDescription>
              Selecione um conteúdo para compartilhar com o cliente
            </DialogDescription>
          </DialogHeader>

          <div className="px-4 pt-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
            <TabsList className="mx-4 mt-3 grid grid-cols-4 h-9">
              <TabsTrigger value="offers" className="text-xs gap-1">
                <Tag className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Ofertas</span>
                <Badge variant="secondary" className="ml-1 h-4 px-1 text-[10px]">{tabCounts.offers}</Badge>
              </TabsTrigger>
              <TabsTrigger value="raffles" className="text-xs gap-1">
                <Gift className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Sorteios</span>
                <Badge variant="secondary" className="ml-1 h-4 px-1 text-[10px]">{tabCounts.raffles}</Badge>
              </TabsTrigger>
              <TabsTrigger value="posts" className="text-xs gap-1">
                <Users className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Posts</span>
                <Badge variant="secondary" className="ml-1 h-4 px-1 text-[10px]">{tabCounts.posts}</Badge>
              </TabsTrigger>
              <TabsTrigger value="crowdfunding" className="text-xs gap-1">
                <Heart className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Vaquinhas</span>
                <Badge variant="secondary" className="ml-1 h-4 px-1 text-[10px]">{tabCounts.crowdfunding}</Badge>
              </TabsTrigger>
            </TabsList>

            <ScrollArea className="flex-1 p-4">
              <TabsContent value="offers" className="mt-0 space-y-2">
                {loadingOffers ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                  </div>
                ) : filteredOffers.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Tag className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Nenhuma oferta ativa</p>
                  </div>
                ) : (
                  filteredOffers.map((offer) => (
                    <LinkItemCard
                      key={offer.id}
                      imageUrl={offer.image_url}
                      title={offer.title}
                      subtitle={offer.discount_percentage ? `${offer.discount_percentage}% OFF` : `R$ ${offer.discounted_price?.toFixed(2)}`}
                      badge={offer.category}
                      onClick={() => handleSelectOffer(offer)}
                    />
                  ))
                )}
              </TabsContent>

              <TabsContent value="raffles" className="mt-0 space-y-2">
                {loadingRaffles ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                  </div>
                ) : filteredRaffles.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Gift className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Nenhum sorteio ativo</p>
                  </div>
                ) : (
                  filteredRaffles.map((raffle) => {
                    const progress = raffle.total_tickets > 0 
                      ? Math.round((raffle.sold_tickets / raffle.total_tickets) * 100) 
                      : 0;
                    return (
                      <LinkItemCard
                        key={raffle.id}
                        imageUrl={raffle.image_url}
                        title={raffle.title}
                        subtitle={`${progress}% vendido · ${raffle.ticket_price} pts/bilhete`}
                        badge="Sorteio"
                        badgeColor="bg-blue-500"
                        onClick={() => handleSelectRaffle(raffle)}
                      />
                    );
                  })
                )}
              </TabsContent>

              <TabsContent value="posts" className="mt-0 space-y-2">
                {loadingPosts ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                  </div>
                ) : filteredPosts.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Nenhuma publicação encontrada</p>
                  </div>
                ) : (
                  filteredPosts.map((post) => (
                    <LinkItemCard
                      key={post.id}
                      imageUrl={post.image_url}
                      title={post.content.slice(0, 60) + (post.content.length > 60 ? '...' : '')}
                      subtitle="Publicação na comunidade"
                      badge="Post"
                      badgeColor="bg-purple-500"
                      onClick={() => handleSelectPost(post)}
                    />
                  ))
                )}
              </TabsContent>

              <TabsContent value="crowdfunding" className="mt-0 space-y-2">
                {loadingCampaigns ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                  </div>
                ) : filteredCampaigns.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Heart className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Nenhuma vaquinha patrocinada</p>
                  </div>
                ) : (
                  filteredCampaigns.map((campaign) => {
                    const progress = campaign.goal_points > 0 
                      ? Math.round((campaign.current_points / campaign.goal_points) * 100) 
                      : 0;
                    return (
                      <LinkItemCard
                        key={campaign.id}
                        imageUrl={campaign.image_url}
                        title={campaign.title}
                        subtitle={`${progress}% arrecadado`}
                        badge={campaign.category}
                        badgeColor="bg-rose-500"
                        onClick={() => handleSelectCampaign(campaign)}
                      />
                    );
                  })
                )}
              </TabsContent>
            </ScrollArea>
          </Tabs>
        </DialogContent>
      </Dialog>
    </>
  );
};

// Sub-component for link items
interface LinkItemCardProps {
  imageUrl?: string | null;
  title: string;
  subtitle: string;
  badge?: string;
  badgeColor?: string;
  onClick: () => void;
}

const LinkItemCard = ({ imageUrl, title, subtitle, badge, badgeColor, onClick }: LinkItemCardProps) => (
  <button
    onClick={onClick}
    className="w-full flex items-center gap-3 p-2.5 rounded-lg border bg-card hover:bg-accent transition-colors text-left group"
  >
    <div className="w-12 h-12 rounded-md bg-muted flex items-center justify-center overflow-hidden flex-shrink-0">
      {imageUrl ? (
        <img src={imageUrl} alt="" className="w-full h-full object-cover" />
      ) : (
        <ImageIcon className="w-5 h-5 text-muted-foreground" />
      )}
    </div>
    <div className="flex-1 min-w-0">
      <p className="font-medium text-sm truncate">{title}</p>
      <p className="text-xs text-muted-foreground truncate">{subtitle}</p>
    </div>
    {badge && (
      <Badge variant="secondary" className={`text-[10px] ${badgeColor ? `${badgeColor} text-white` : ''}`}>
        {badge}
      </Badge>
    )}
    <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors flex-shrink-0" />
  </button>
);

// Component to display a selected link preview
interface MessageLinkPreviewProps {
  link: SelectedLink;
  onRemove: () => void;
}

export const MessageLinkPreview = ({ link, onRemove }: MessageLinkPreviewProps) => {
  const typeLabels = {
    offer: '🏷️ Oferta',
    raffle: '🎰 Sorteio',
    post: '📝 Post',
    crowdfunding: '❤️ Vaquinha'
  };

  const typeColors = {
    offer: 'border-primary/30 bg-primary/5',
    raffle: 'border-blue-500/30 bg-blue-500/5',
    post: 'border-purple-500/30 bg-purple-500/5',
    crowdfunding: 'border-rose-500/30 bg-rose-500/5'
  };

  return (
    <div className={`flex items-center gap-2 p-2 rounded-lg border-2 ${typeColors[link.type]}`}>
      {link.imageUrl ? (
        <img src={link.imageUrl} alt="" className="w-10 h-10 rounded object-cover" />
      ) : (
        <div className="w-10 h-10 rounded bg-muted flex items-center justify-center">
          <Link2 className="w-4 h-4 text-muted-foreground" />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-[10px] text-muted-foreground">{typeLabels[link.type]}</p>
        <p className="text-xs font-medium truncate">{link.title}</p>
        {link.description && (
          <p className="text-[10px] text-muted-foreground truncate">{link.description}</p>
        )}
      </div>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-6 w-6"
        onClick={onRemove}
      >
        <X className="w-3.5 h-3.5" />
      </Button>
    </div>
  );
};
