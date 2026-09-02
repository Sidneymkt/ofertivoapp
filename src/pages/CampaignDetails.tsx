import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Heart, Share2, QrCode, MessageSquare, ArrowLeft, Calendar, Users, DollarSign, Sparkles, CheckCircle, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { BackButton } from '@/components/BackButton';
import { SEOHead } from '@/components/SEOHead';
import { Countdown } from '@/components/Countdown';
import { ContributeModal } from '@/components/ContributeModal';
import { ChatWindow } from '@/components/ChatWindow';
import { ShareMenu } from '@/components/ShareMenu';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Campaign, CampaignSponsor } from '@/hooks/useCrowdfunding';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const categoryLabels: Record<string, string> = {
  community: 'Comunidade',
  business: 'Negócio',
  charity: 'Caridade',
  event: 'Evento',
  other: 'Outros'
};

const categoryColors: Record<string, string> = {
  community: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  business: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
  charity: 'bg-pink-500/10 text-pink-500 border-pink-500/20',
  event: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
  other: 'bg-gray-500/10 text-gray-500 border-gray-500/20'
};

const pontosParaReais = (pontos: number): string => {
  return (pontos / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

const CampaignDetails = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [loading, setLoading] = useState(true);
  const [showContributeModal, setShowContributeModal] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [contributions, setContributions] = useState<any[]>([]);

  useEffect(() => {
    if (id) {
      loadCampaign();
      loadContributions();
    }
  }, [id]);

  const loadCampaign = async () => {
    try {
      const { data, error } = await supabase
        .from('crowdfunding_campaigns')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;

      // Load creator profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, avatar_url')
        .eq('id', data.creator_id)
        .single();

      // Load sponsors
      const { data: sponsorships } = await supabase
        .from('patrocinios_vaquinha')
        .select('id, business_id, tipo, multiplicador')
        .eq('campanha_id', id!)
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
              tipo: s.tipo as 'dobrar_pontos' | 'valor_fixo' | 'destaque',
              multiplicador: s.multiplicador
            };
          });
        }
      }

      setCampaign({
        ...data,
        creator: profile || undefined,
        patrocinadores,
      } as unknown as Campaign);
    } catch (err) {
      console.error('Error loading campaign:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadContributions = async () => {
    try {
      const { data } = await supabase
        .from('campaign_contributions')
        .select('*, profiles:contributor_id(full_name, avatar_url)')
        .eq('campaign_id', id)
        .order('created_at', { ascending: false })
        .limit(20);

      setContributions(data || []);
    } catch (err) {
      console.error('Error loading contributions:', err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <h2 className="text-xl font-semibold">Vaquinha não encontrada</h2>
        <Link to="/vaquinhas">
          <Button><ArrowLeft className="w-4 h-4 mr-2" /> Voltar</Button>
        </Link>
      </div>
    );
  }

  const progress = (campaign.current_points / campaign.goal_points) * 100;
  const daysLeft = Math.ceil(
    (new Date(campaign.end_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
  );
  const isOwnCampaign = user?.id === campaign.creator_id;
  const statusPagamento = campaign.status_pagamento || 'pendente';
  const isPago = statusPagamento === 'pago';
  const hasPatrocinadores = campaign.patrocinadores && campaign.patrocinadores.length > 0;
  const maxMultiplicador = campaign.patrocinadores?.reduce((max, p) =>
    p.multiplicador > max ? p.multiplicador : max, 1) || campaign.multiplicador_patrocinio || 1;

  // Extract YouTube video ID
  let videoId: string | null = null;
  if (campaign.video_url) {
    const match = campaign.video_url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([a-zA-Z0-9_-]{11})/);
    videoId = match?.[1] || null;
  }

  return (
    <>
      <SEOHead
        title={`${campaign.title} - Vaquinha Digital`}
        description={campaign.description || `Apoie a vaquinha: ${campaign.title}`}
        image={campaign.image_url || undefined}
        url={window.location.href}
      />
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-3 sm:px-4 max-w-4xl py-4 sm:py-8">
          <div className="mb-4">
            <BackButton />
          </div>

          {/* Patrocínio Banner */}
          {(hasPatrocinadores || maxMultiplicador > 1) && (
            <div className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white text-center py-3 px-4 rounded-t-xl text-sm font-medium">
              <div className="flex items-center justify-center gap-2">
                <Sparkles className="w-4 h-4" />
                {maxMultiplicador > 1 ? (
                  <span>Pontos valem {maxMultiplicador}x nesta campanha!</span>
                ) : (
                  <span>Campanha Patrocinada!</span>
                )}
              </div>
              {hasPatrocinadores && campaign.patrocinadores && (
                <div className="flex items-center justify-center gap-2 mt-2">
                  <span className="text-white/80 text-xs">Patrocinadores:</span>
                  <div className="flex items-center -space-x-1.5">
                    {campaign.patrocinadores.map((sponsor, index) => (
                      <div
                        key={sponsor.id}
                        className="w-7 h-7 rounded-full border-2 border-white bg-white overflow-hidden"
                        style={{ zIndex: 10 - index }}
                        title={sponsor.name}
                      >
                        {sponsor.logo_url ? (
                          <img src={sponsor.logo_url} alt={sponsor.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full bg-primary flex items-center justify-center text-white text-[10px] font-bold">
                            {sponsor.name.charAt(0)}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <Card className={`overflow-hidden ${hasPatrocinadores || maxMultiplicador > 1 ? 'rounded-t-none' : ''}`}>
            {/* Mídia: imagem e/ou vídeo */}
            {(campaign.image_url || videoId) && (
              <div className={`grid gap-px bg-border ${campaign.image_url && videoId ? 'md:grid-cols-2' : 'grid-cols-1'}`}>
                {campaign.image_url && (
                  <div className="relative aspect-video overflow-hidden bg-muted">
                    <img
                      src={campaign.image_url}
                      alt={campaign.title}
                      className="w-full h-full object-cover"
                    />
                    {videoId && (
                      <div className="absolute top-2 left-2">
                        <Badge variant="secondary" className="bg-background/90 backdrop-blur text-xs">
                          Imagem
                        </Badge>
                      </div>
                    )}
                    {isPago && (
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                        <Badge className="bg-emerald-500 text-white text-base sm:text-xl px-4 sm:px-6 py-2 sm:py-3">
                          <CheckCircle className="w-5 h-5 sm:w-6 sm:h-6 mr-2" />
                          Pago
                        </Badge>
                      </div>
                    )}
                  </div>
                )}

                {videoId && (
                  <div className="relative aspect-video bg-black">
                    {campaign.image_url && (
                      <div className="absolute top-2 left-2 z-10">
                        <Badge variant="secondary" className="bg-background/90 backdrop-blur text-xs">
                          Vídeo
                        </Badge>
                      </div>
                    )}
                    <iframe
                      src={`https://www.youtube.com/embed/${videoId}`}
                      className="w-full h-full"
                      allowFullScreen
                      title={`Vídeo: ${campaign.title}`}
                    />
                  </div>
                )}
              </div>
            )}

            <CardContent className="p-5 sm:p-8 space-y-6">
              {/* Título e badges */}
              <div>
                <div className="flex items-center gap-2 mb-3 flex-wrap">
                  <Badge className={categoryColors[campaign.category]}>
                    {categoryLabels[campaign.category]}
                  </Badge>
                  {campaign.is_verified && (
                    <Badge variant="default" className="bg-green-500/10 text-green-500 border-green-500/20">
                      ✓ Verificado
                    </Badge>
                  )}
                </div>
                <h1 className="text-2xl sm:text-3xl font-bold">{campaign.title}</h1>
              </div>

              {/* Descrição completa */}
              <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">
                {campaign.description}
              </p>

              {/* Progresso */}
              <Card className="bg-muted/50">
                <CardContent className="p-4 sm:p-6 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-2xl sm:text-3xl font-bold text-primary">
                        {campaign.current_points.toLocaleString('pt-BR')}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        pontos arrecadados ({pontosParaReais(campaign.current_points)})
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-semibold">
                        {campaign.goal_points.toLocaleString('pt-BR')}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        meta ({pontosParaReais(campaign.goal_points)})
                      </p>
                    </div>
                  </div>
                  <Progress value={progress} className="h-3" />
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span className="font-medium">{progress.toFixed(1)}% alcançado</span>
                    <div className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      <Countdown endDate={campaign.end_date} variant="badge" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Valor liberado (se pago) */}
              {isPago && campaign.valor_liberado && (
                <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-xl p-5 text-center">
                  <p className="text-sm text-muted-foreground">Valor liberado ao beneficiário</p>
                  <p className="text-2xl font-bold text-emerald-600 mt-1">
                    {campaign.valor_liberado.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </p>
                  {campaign.data_liberacao && (
                    <p className="text-sm text-muted-foreground mt-1">
                      em {format(new Date(campaign.data_liberacao), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                    </p>
                  )}
                </div>
              )}

              {/* Datas */}
              <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-4 h-4" />
                  <span>Início: {format(new Date(campaign.start_date), "dd/MM/yyyy", { locale: ptBR })}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-4 h-4" />
                  <span>Fim: {format(new Date(campaign.end_date), "dd/MM/yyyy", { locale: ptBR })}</span>
                </div>
              </div>

              <Separator />

              {/* Organizador */}
              {campaign.creator && (
                <div className="flex items-center gap-3">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={campaign.creator.avatar_url || undefined} />
                    <AvatarFallback className="text-lg">
                      {campaign.creator.full_name?.charAt(0) || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-semibold">{campaign.creator.full_name || 'Usuário'}</p>
                    <p className="text-sm text-muted-foreground">Organizador da vaquinha</p>
                  </div>
                </div>
              )}

              {/* Ações */}
              <div className="flex gap-3 flex-wrap">
                <Button
                  size="lg"
                  className="flex-1"
                  onClick={() => setShowContributeModal(true)}
                  disabled={daysLeft <= 0 || isPago}
                >
                  <QrCode className="w-5 h-5 mr-2" />
                  {isPago ? 'Campanha Encerrada' : 'Doar via PIX'}
                </Button>
                <ShareMenu
                  url={`${window.location.origin}/vaquinhas/${campaign.id}`}
                  title={campaign.title}
                  description={campaign.description || `Apoie: ${campaign.title}`}
                  contentType="crowdfunding"
                  contentId={campaign.id}
                  variant="outline"
                  size="lg"
                />
                {!isOwnCampaign && user && campaign.creator_id && !isPago && (
                  <Button
                    variant="outline"
                    size="lg"
                    onClick={() => setShowChat(true)}
                  >
                    <MessageSquare className="w-5 h-5 mr-2" />
                    Conversar
                  </Button>
                )}
              </div>

              {/* Contribuições recentes */}
              {contributions.length > 0 && (
                <>
                  <Separator />
                  <div>
                    <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                      <Users className="w-5 h-5" />
                      Últimas contribuições
                    </h3>
                    <div className="space-y-3">
                      {contributions.map((c) => (
                        <div key={c.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={c.is_anonymous ? undefined : c.profiles?.avatar_url} />
                            <AvatarFallback>
                              {c.is_anonymous ? '?' : c.profiles?.full_name?.charAt(0) || 'U'}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">
                              {c.is_anonymous ? 'Anônimo' : c.profiles?.full_name || 'Usuário'}
                            </p>
                            {c.message && (
                              <p className="text-xs text-muted-foreground truncate">{c.message}</p>
                            )}
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p className="text-sm font-semibold text-primary">
                              {c.amount.toLocaleString('pt-BR')} pts
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {format(new Date(c.created_at), "dd/MM", { locale: ptBR })}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <ContributeModal
        open={showContributeModal}
        onOpenChange={setShowContributeModal}
        campaign={campaign}
        onSuccess={() => {
          setShowContributeModal(false);
          loadCampaign();
          loadContributions();
        }}
      />

      {showChat && campaign.creator_id && (
        <ChatWindow
          targetUserId={campaign.creator_id}
          businessName={campaign.creator?.full_name || 'Organizador'}
          onClose={() => setShowChat(false)}
        />
      )}
    </>
  );
};

export default CampaignDetails;
