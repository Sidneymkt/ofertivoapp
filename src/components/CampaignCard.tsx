import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { TrendingUp, MessageSquare, Share2, Sparkles, DollarSign, CheckCircle, QrCode, Users } from 'lucide-react';
import { Countdown } from '@/components/Countdown';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import { Campaign } from '@/hooks/useCrowdfunding';
import { ContributeModal } from './ContributeModal';
import { ChatWindow } from './ChatWindow';
import { ShareMenu } from './ShareMenu';
import { useAuth } from '@/hooks/useAuth';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface CampaignCardProps {
  campaign: Campaign;
  onContribute?: () => void;
}

const categoryLabels = {
  community: 'Comunidade',
  business: 'Negócio',
  charity: 'Caridade',
  event: 'Evento',
  other: 'Outros'
};

const categoryColors = {
  community: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  business: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
  charity: 'bg-pink-500/10 text-pink-500 border-pink-500/20',
  event: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
  other: 'bg-gray-500/10 text-gray-500 border-gray-500/20'
};

const statusPagamentoLabels: Record<string, { label: string; color: string }> = {
  pendente: { label: 'Em andamento', color: 'bg-blue-500/10 text-blue-500' },
  meta_atingida: { label: 'Meta Atingida! 🎯', color: 'bg-green-500/10 text-green-500' },
  validando: { label: 'Em Validação', color: 'bg-yellow-500/10 text-yellow-500' },
  aprovado: { label: 'Aprovado', color: 'bg-green-500/10 text-green-500' },
  pago: { label: 'Pago ✓', color: 'bg-emerald-500/10 text-emerald-500' },
  cancelado: { label: 'Cancelado', color: 'bg-red-500/10 text-red-500' }
};

// Converter pontos para reais (100 pontos = R$1)
const pontosParaReais = (pontos: number): string => {
  return (pontos / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

export const CampaignCard = ({ campaign, onContribute }: CampaignCardProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [showContributeModal, setShowContributeModal] = useState(false);
  const [showChat, setShowChat] = useState(false);

  const progress = (campaign.current_points / campaign.goal_points) * 100;
  const daysLeft = Math.ceil(
    (new Date(campaign.end_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
  );

  const handleContributeSuccess = () => {
    setShowContributeModal(false);
    onContribute?.();
  };

  const isOwnCampaign = user?.id === campaign.creator_id;
  const hasMultiplicador = campaign.multiplicador_patrocinio && campaign.multiplicador_patrocinio > 1;
  const hasPatrocinadores = campaign.patrocinadores && campaign.patrocinadores.length > 0;
  const hasPatrocinador = !!campaign.patrocinador || hasPatrocinadores;
  const statusPagamento = campaign.status_pagamento || 'pendente';
  const isPago = statusPagamento === 'pago';

  // Calcular maior multiplicador entre os patrocinadores
  const maxMultiplicador = campaign.patrocinadores?.reduce((max, p) => 
    p.multiplicador > max ? p.multiplicador : max, 1) || campaign.multiplicador_patrocinio || 1;

  return (
    <>
      <Card className={`overflow-hidden hover:shadow-lg transition-all cursor-pointer ${isPago ? 'opacity-75' : ''}`} onClick={() => navigate(`/vaquinhas/${campaign.id}`)}>
        {/* Patrocínio Badge - mostrar quando tem patrocinador OU multiplicador > 1 */}
        {(hasPatrocinador || hasMultiplicador) && (
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
            {hasPatrocinadores && campaign.patrocinadores && (
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
            )}
          </div>
        )}

        {/* Imagem */}
        {campaign.image_url && (
          <div className="h-48 overflow-hidden relative">
            <img
              src={campaign.image_url}
              alt={campaign.title}
              className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
            />
            {isPago && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                <Badge className="bg-emerald-500 text-white text-lg px-4 py-2">
                  <CheckCircle className="w-5 h-5 mr-2" />
                  Pago
                </Badge>
              </div>
            )}
          </div>
        )}

        {/* Vídeo do YouTube */}
        {campaign.video_url && (() => {
          const match = campaign.video_url!.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([a-zA-Z0-9_-]{11})/);
          const videoId = match?.[1];
          return videoId ? (
            <div className="aspect-video">
              <iframe
                src={`https://www.youtube.com/embed/${videoId}`}
                className="w-full h-full"
                allowFullScreen
                title={`Vídeo: ${campaign.title}`}
              />
            </div>
          ) : null;
        })()}

        <div className="p-6 space-y-4">
          {/* Header */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <Badge className={categoryColors[campaign.category]}>
                  {categoryLabels[campaign.category]}
                </Badge>
                {campaign.is_verified && (
                  <Badge variant="default" className="bg-success/10 text-success border-success/20">
                    ✓ Verificado
                  </Badge>
                )}
                {statusPagamento !== 'pendente' && (
                  <Badge className={statusPagamentoLabels[statusPagamento]?.color || ''}>
                    {statusPagamentoLabels[statusPagamento]?.label || statusPagamento}
                  </Badge>
                )}
              </div>
              <h3 className="font-bold text-lg leading-tight">{campaign.title}</h3>
            </div>
          </div>

          {/* Descrição */}
          <p className="text-sm text-muted-foreground line-clamp-2">
            {campaign.description}
          </p>

          {/* Progresso */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <div className="flex flex-col">
                <span className="font-semibold text-primary">
                  {campaign.current_points.toLocaleString('pt-BR')} pontos
                </span>
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <DollarSign className="w-3 h-3" />
                  {pontosParaReais(campaign.current_points)}
                </span>
              </div>
              <div className="flex flex-col items-end">
                <span className="text-muted-foreground">
                  de {campaign.goal_points.toLocaleString('pt-BR')}
                </span>
                <span className="text-xs text-muted-foreground">
                  ({pontosParaReais(campaign.goal_points)})
                </span>
              </div>
            </div>
            <Progress value={progress} className="h-2" />
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{progress.toFixed(0)}% alcançado</span>
              <Countdown endDate={campaign.end_date} variant="badge" />
            </div>
          </div>

          {/* Valor liberado (se pago) */}
          {isPago && campaign.valor_liberado && (
            <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-lg p-3 text-center">
              <p className="text-xs text-muted-foreground">Valor liberado</p>
              <p className="text-lg font-bold text-emerald-600">
                {(campaign.valor_liberado).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </p>
              {campaign.data_liberacao && (
                <p className="text-xs text-muted-foreground">
                  em {format(new Date(campaign.data_liberacao), "dd/MM/yyyy", { locale: ptBR })}
                </p>
              )}
            </div>
          )}

          {/* Criador */}
          {campaign.creator && (
            <div className="flex items-center gap-2 pt-2 border-t">
              <Avatar className="h-8 w-8">
                <AvatarImage src={campaign.creator.avatar_url || undefined} />
                <AvatarFallback>
                  {campaign.creator.full_name?.charAt(0) || 'U'}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {campaign.creator.full_name || 'Usuário'}
                </p>
                <p className="text-xs text-muted-foreground">Organizador</p>
              </div>
            </div>
          )}

          {/* Botões de ação */}
          <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
            <Button
              className="flex-1"
              onClick={() => setShowContributeModal(true)}
              disabled={daysLeft <= 0 || isPago}
            >
              <QrCode className="w-4 h-4 mr-2" />
              {isPago ? 'Encerrada' : 'Doar via PIX'}
            </Button>
            <ShareMenu
              url={`https://ofertivoapp.com/vaquinhas/${campaign.id}`}
              title={campaign.title}
              description={campaign.description || `Apoie: ${campaign.title}`}
              contentType="crowdfunding"
              contentId={campaign.id}
              variant="outline"
              size="icon"
            />
            {!isOwnCampaign && user && campaign.creator_id && !isPago && (
              <Button
                variant="outline"
                size="icon"
                onClick={() => setShowChat(true)}
                title="Conversar com organizador"
              >
                <MessageSquare className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      </Card>

      <ContributeModal
        open={showContributeModal}
        onOpenChange={setShowContributeModal}
        campaign={campaign}
        onSuccess={handleContributeSuccess}
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
