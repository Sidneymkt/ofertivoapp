import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Heart, Calendar, TrendingUp, ArrowRight, Coins, Sparkles } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface CampaignSponsor {
  id: string;
  business_id: string;
  name: string;
  logo_url: string | null;
  tipo: string;
  multiplicador: number;
}

interface FeaturedCampaign {
  id: string;
  title: string;
  description: string;
  goal_points: number;
  current_points: number;
  end_date: string;
  image_url: string | null;
  category: string;
  creator: {
    id: string;
    full_name: string;
    avatar_url: string | null;
  } | null;
  patrocinadores: CampaignSponsor[];
}

export const FeaturedCampaigns = () => {
  const [campaigns, setCampaigns] = useState<FeaturedCampaign[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  
  useEffect(() => {
    fetchFeaturedCampaigns();
  }, []);
  
  const fetchFeaturedCampaigns = async () => {
    try {
      const { data, error } = await supabase
        .from('crowdfunding_campaigns')
        .select('*')
        .eq('is_active', true)
        .gt('end_date', new Date().toISOString())
        .order('current_points', { ascending: false })
        .limit(6);
        
      if (error) throw error;

      // Buscar informações dos criadores e patrocinadores
      const campaignsWithData = await Promise.all((data || []).map(async campaign => {
        const { data: creator } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url')
          .eq('user_id', campaign.creator_id)
          .single();
        
        // Buscar todos os patrocinadores ativos (até 10)
        const { data: sponsorships } = await supabase
          .from('patrocinios_vaquinha')
          .select('id, business_id, tipo, multiplicador')
          .eq('campanha_id', campaign.id)
          .eq('is_active', true)
          .limit(10);
          
        let patrocinadores: CampaignSponsor[] = [];
        if (sponsorships && sponsorships.length > 0) {
          const businessIds = sponsorships.map(s => s.business_id);
          const { data: businesses } = await supabase
            .from('businesses')
            .select('id, name, logo_url')
            .in('id', businessIds);
            
          if (businesses) {
            patrocinadores = sponsorships.map(s => {
              const biz = businesses.find(b => b.id === s.business_id);
              return {
                id: s.id,
                business_id: s.business_id,
                name: biz?.name || 'Patrocinador',
                logo_url: biz?.logo_url || null,
                tipo: s.tipo,
                multiplicador: s.multiplicador
              };
            });
          }
        }
        
        return {
          ...campaign,
          creator,
          patrocinadores
        } as FeaturedCampaign;
      }));
      
      setCampaigns(campaignsWithData);
    } catch (error) {
      console.error('Erro ao buscar vaquinhas:', error);
    } finally {
      setLoading(false);
    }
  };
  const formatTimeRemaining = (endDate: string) => {
    try {
      return formatDistanceToNow(new Date(endDate), {
        locale: ptBR,
        addSuffix: true
      });
    } catch (error) {
      return 'Data inválida';
    }
  };
  const getInitials = (name: string) => {
    return name.split(' ').map(n => n.charAt(0)).join('').toUpperCase().slice(0, 2);
  };
  const getCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      medical: 'Saúde',
      education: 'Educação',
      community: 'Comunidade',
      emergency: 'Emergência',
      animal: 'Animais',
      other: 'Outros'
    };
    return labels[category] || category;
  };
  const getProgressPercentage = (current: number, goal: number) => {
    return Math.min(current / goal * 100, 100);
  };
  if (loading) {
    return <section className="py-16 bg-background">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
          </div>
        </div>
      </section>;
  }
  if (campaigns.length === 0) {
    return null;
  }
  return <section className="py-16 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Heart className="w-8 h-8 text-destructive fill-destructive" />
            <h2 className="text-4xl font-bold text-foreground">
              Vaquinhas em Destaque
            </h2>
          </div>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Ajude causas importantes contribuindo com seus pontos e faça a diferença na comunidade
          </p>
        </div>

        <div className="relative mb-8">
          <div className="flex overflow-x-auto gap-6 pb-4 snap-x snap-mandatory scrollbar-hide">
            {campaigns.map(campaign => {
              const hasPatrocinadores = campaign.patrocinadores && campaign.patrocinadores.length > 0;
              const maxMultiplicador = campaign.patrocinadores?.reduce((max, p) => 
                p.multiplicador > max ? p.multiplicador : max, 1) || 1;
                
              return (
                <Card key={campaign.id} className="flex-shrink-0 w-[320px] border-0 bg-card shadow-card hover:shadow-glow transition-all duration-300 transform hover:scale-105 cursor-pointer overflow-hidden snap-start" onClick={() => navigate('/vaquinhas')}>
                  {/* Badge de Patrocínio */}
                  {hasPatrocinadores && (
                    <div className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white text-center py-1.5 px-2 text-xs font-medium">
                      <div className="flex items-center justify-center gap-1.5">
                        <Sparkles className="w-3 h-3" />
                        {maxMultiplicador > 1 ? (
                          <span>Pontos valem {maxMultiplicador}x!</span>
                        ) : (
                          <span>Campanha Patrocinada!</span>
                        )}
                      </div>
                      
                      {/* Grid de logos de patrocinadores */}
                      <div className="flex items-center justify-center gap-1 mt-1.5">
                        <span className="text-white/80 text-[10px]">por</span>
                        <TooltipProvider>
                          <div className="flex items-center -space-x-1.5">
                            {campaign.patrocinadores.slice(0, 10).map((sponsor, index) => (
                              <Tooltip key={sponsor.id}>
                                <TooltipTrigger asChild>
                                  <div 
                                    className="w-6 h-6 rounded-full border-2 border-white bg-white overflow-hidden flex-shrink-0 shadow-sm hover:z-10 hover:scale-110 transition-transform cursor-pointer"
                                    style={{ zIndex: 10 - index }}
                                  >
                                    {sponsor.logo_url ? (
                                      <img 
                                        src={sponsor.logo_url} 
                                        alt={sponsor.name}
                                        className="w-full h-full object-cover"
                                      />
                                    ) : (
                                      <div className="w-full h-full bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center text-white text-[8px] font-bold">
                                        {sponsor.name.charAt(0)}
                                      </div>
                                    )}
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p className="text-xs font-medium">{sponsor.name}</p>
                                  {sponsor.multiplicador > 1 && (
                                    <p className="text-[10px] text-muted-foreground">
                                      Multiplicador: {sponsor.multiplicador}x
                                    </p>
                                  )}
                                </TooltipContent>
                              </Tooltip>
                            ))}
                            {campaign.patrocinadores.length > 10 && (
                              <div className="w-6 h-6 rounded-full border-2 border-white bg-muted flex items-center justify-center text-[8px] font-bold">
                                +{campaign.patrocinadores.length - 10}
                              </div>
                            )}
                          </div>
                        </TooltipProvider>
                      </div>
                    </div>
                  )}
                  
                  {campaign.image_url && <div className="relative h-48 overflow-hidden">
                      <img src={campaign.image_url} alt={campaign.title} className="w-full h-full object-cover" />
                      <div className="absolute top-4 right-4">
                        <Badge className="bg-card text-card-foreground font-bold">
                          {getCategoryLabel(campaign.category)}
                        </Badge>
                      </div>
                    </div>}
                
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <CardTitle className="text-xl text-card-foreground line-clamp-2">
                      {campaign.title}
                    </CardTitle>
                    {campaign.creator && <Avatar className="h-10 w-10 border-2 border-primary/20">
                        <AvatarImage src={campaign.creator.avatar_url || ''} />
                        <AvatarFallback className="bg-gradient-secondary text-white text-xs">
                          {getInitials(campaign.creator.full_name || 'AN')}
                        </AvatarFallback>
                      </Avatar>}
                  </div>

                  {campaign.creator && <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">
                        Por {campaign.creator.full_name}
                      </span>
                    </div>}
                </CardHeader>

                <CardContent className="pt-0">
                  <div className="mb-4">
                    <CardDescription className="text-sm line-clamp-2">
                      {campaign.description}
                    </CardDescription>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Coins className="w-4 h-4 text-points" />
                        <span className="font-semibold text-foreground">
                          {campaign.current_points.toLocaleString('pt-BR')} pontos
                        </span>
                      </div>
                      <span className="text-muted-foreground">
                        de {campaign.goal_points.toLocaleString('pt-BR')}
                      </span>
                    </div>

                    <div className="w-full bg-muted rounded-full h-2">
                      <div className="bg-gradient-points h-2 rounded-full transition-all duration-300" style={{
                    width: `${getProgressPercentage(campaign.current_points, campaign.goal_points)}%`
                  }} />
                    </div>

                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-1 text-points">
                        <TrendingUp className="w-4 h-4" />
                        <span className="font-semibold">
                          {getProgressPercentage(campaign.current_points, campaign.goal_points).toFixed(0)}%
                        </span>
                      </div>
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Calendar className="w-4 h-4" />
                        <span>Termina {formatTimeRemaining(campaign.end_date)}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              );
            })}
          </div>
        </div>

        <div className="text-center">
          <Button variant="outline" size="lg" onClick={() => navigate('/vaquinhas')} className="hover:bg-destructive/10 text-points border-points">
            <Heart className="w-5 h-5 mr-2" />
            Ver Todas as Vaquinhas
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </div>
    </section>;
};