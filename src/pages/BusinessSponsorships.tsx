import { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  Sparkles, Heart, ArrowLeft, Plus, Calendar, Trash2, ExternalLink, 
  TrendingUp, Users, Wallet, Clock, CheckCircle2, QrCode
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useSponsorship } from '@/hooks/useSponsorship';
import { usePatrocinioPixPayment } from '@/hooks/usePatrocinioPixPayment';
import { SponsorCampaignModal } from '@/components/SponsorCampaignModal';
import { AvailableCampaign } from '@/hooks/useSponsorship';
import { SEOHead } from '@/components/SEOHead';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const BusinessSponsorships = () => {
  const { 
    sponsorships, availableCampaigns, loading, cancelSponsorship, pontosParaReais 
  } = useSponsorship();
  const {
    payments, confirmedPayments, pendingPayments, totalInvestido, totalPontos, loadingPayments
  } = usePatrocinioPixPayment();
  
  const [selectedCampaign, setSelectedCampaign] = useState<AvailableCampaign | null>(null);
  const [showSponsorModal, setShowSponsorModal] = useState(false);
  const [cancelingId, setCancelingId] = useState<string | null>(null);

  const activeSponsorships = sponsorships.filter(s => s.is_active);

  const handleSelectCampaign = (campaign: AvailableCampaign) => {
    setSelectedCampaign(campaign);
    setShowSponsorModal(true);
  };

  const handleCancelSponsorship = async () => {
    if (cancelingId) {
      await cancelSponsorship(cancelingId);
      setCancelingId(null);
    }
  };

  return (
    <>
      <SEOHead
        title="Patrocínios via PIX - Painel do Anunciante"
        description="Patrocine vaquinhas via PIX e ganhe benefícios exclusivos para seu negócio"
      />
      
      <div className="min-h-screen bg-background py-4 sm:py-8">
        <div className="container mx-auto px-3 sm:px-4 max-w-6xl">
          {/* Header */}
          <div className="flex items-center gap-4 mb-6">
            <Link to="/anunciante/dashboard">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div className="flex-1">
              <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
                <Sparkles className="h-6 w-6 sm:h-8 sm:w-8 text-yellow-500" />
                Patrocínios via PIX
              </h1>
              <p className="text-sm text-muted-foreground">
                Apoie causas, ganhe pontos e visibilidade para sua marca
              </p>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-6">
            <Card>
              <CardContent className="p-4 text-center">
                <Wallet className="h-6 w-6 mx-auto mb-2 text-green-500" />
                <p className="text-2xl font-bold">
                  R$ {totalInvestido.toFixed(2)}
                </p>
                <p className="text-xs text-muted-foreground">Total Investido</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <Sparkles className="h-6 w-6 mx-auto mb-2 text-yellow-500" />
                <p className="text-2xl font-bold">{totalPontos.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Pontos Ganhos</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <CheckCircle2 className="h-6 w-6 mx-auto mb-2 text-blue-500" />
                <p className="text-2xl font-bold">{confirmedPayments.length}</p>
                <p className="text-xs text-muted-foreground">Confirmados</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <Clock className="h-6 w-6 mx-auto mb-2 text-orange-500" />
                <p className="text-2xl font-bold">{pendingPayments.length}</p>
                <p className="text-xs text-muted-foreground">Pendentes</p>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="campaigns" className="space-y-4">
            <TabsList className="w-full justify-start">
              <TabsTrigger value="campaigns">Campanhas Disponíveis</TabsTrigger>
              <TabsTrigger value="payments">Meus Pagamentos</TabsTrigger>
              <TabsTrigger value="active">Patrocínios Ativos</TabsTrigger>
            </TabsList>

            {/* Campanhas Disponíveis */}
            <TabsContent value="campaigns">
              {loading ? (
                <div className="text-center py-12">
                  <p className="text-muted-foreground">Carregando...</p>
                </div>
              ) : availableCampaigns.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <Heart className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <h3 className="text-lg font-semibold mb-2">Nenhuma campanha disponível</h3>
                    <p className="text-muted-foreground">
                      Não há campanhas ativas para patrocinar no momento
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {availableCampaigns.map((campaign) => {
                    const progress = (campaign.current_points / campaign.goal_points) * 100;
                    return (
                      <Card key={campaign.id} className="overflow-hidden hover:shadow-md transition-shadow">
                        {campaign.image_url && (
                          <div className="h-32 overflow-hidden">
                            <img src={campaign.image_url} alt={campaign.title} className="w-full h-full object-cover" />
                          </div>
                        )}
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <h3 className="font-semibold line-clamp-2">{campaign.title}</h3>
                            {campaign.is_verified && (
                              <Badge variant="secondary" className="flex-shrink-0">✓ Verificada</Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{campaign.description}</p>
                          <Progress value={progress} className="h-2 mb-2" />
                          <div className="flex justify-between text-xs mb-3">
                            <span className="font-medium">{Math.round(progress)}%</span>
                            <span className="text-muted-foreground">{pontosParaReais(campaign.goal_points)}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {format(new Date(campaign.end_date), "dd/MM", { locale: ptBR })}
                            </span>
                            <Button 
                              size="sm"
                              onClick={() => handleSelectCampaign(campaign)}
                              className="bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600"
                            >
                              <QrCode className="h-3 w-3 mr-1" />
                              Patrocinar via PIX
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </TabsContent>

            {/* Meus Pagamentos PIX */}
            <TabsContent value="payments">
              {loadingPayments ? (
                <div className="text-center py-12">
                  <p className="text-muted-foreground">Carregando...</p>
                </div>
              ) : payments.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <Wallet className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <h3 className="text-lg font-semibold mb-2">Nenhum pagamento</h3>
                    <p className="text-muted-foreground">Patrocine uma campanha via PIX para começar</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-3">
                  {payments.map((p) => (
                    <Card key={p.id}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-semibold text-sm truncate">
                                {p.campaign?.title || 'Patrocínio Geral'}
                              </h4>
                              <Badge 
                                variant={p.status === 'confirmado' ? 'default' : 'secondary'}
                                className={p.status === 'confirmado' 
                                  ? 'bg-green-500/20 text-green-700 dark:text-green-400' 
                                  : 'bg-yellow-500/20 text-yellow-700 dark:text-yellow-400'
                                }
                              >
                                {p.status === 'confirmado' ? '✓ Confirmado' : '⏳ Pendente'}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-4 text-xs text-muted-foreground">
                              <span>R$ {Number(p.valor_total).toFixed(2)}</span>
                              <span>{p.pontos_gerados.toLocaleString()} pts</span>
                              <span>{format(new Date(p.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}</span>
                            </div>
                            {p.transaction_id_pix && (
                              <p className="text-xs text-muted-foreground mt-1 font-mono">
                                ID: {p.transaction_id_pix}
                              </p>
                            )}
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-bold text-primary">
                              R$ {Number(p.valor_total).toFixed(2)}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Patrocínios Ativos (legacy) */}
            <TabsContent value="active">
              {loading ? (
                <div className="text-center py-12">
                  <p className="text-muted-foreground">Carregando...</p>
                </div>
              ) : activeSponsorships.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <Sparkles className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <h3 className="text-lg font-semibold mb-2">Nenhum patrocínio ativo</h3>
                    <p className="text-muted-foreground mb-4">
                      Patrocine uma campanha via PIX para ativar benefícios
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4">
                  {activeSponsorships.map((sponsorship) => (
                    <Card key={sponsorship.id} className="overflow-hidden">
                      <div className="flex flex-col sm:flex-row">
                        {sponsorship.campaign?.image_url && (
                          <div className="w-full sm:w-48 h-32 sm:h-auto flex-shrink-0">
                            <img src={sponsorship.campaign.image_url} alt={sponsorship.campaign.title} className="w-full h-full object-cover" />
                          </div>
                        )}
                        <CardContent className="flex-1 p-4">
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div>
                              <h3 className="font-semibold">{sponsorship.campaign?.title || 'Campanha'}</h3>
                              <Badge variant="secondary" className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 text-yellow-700 dark:text-yellow-400 mt-1">
                                <Sparkles className="w-3 h-3 mr-1" />
                                {sponsorship.tipo === 'dobrar_pontos' && `${sponsorship.multiplicador}x pontos`}
                                {sponsorship.tipo === 'valor_fixo' && `Até ${pontosParaReais((sponsorship.valor_maximo || 0) * 100)}`}
                                {sponsorship.tipo === 'destaque' && 'Destaque'}
                              </Badge>
                            </div>
                            <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => setCancelingId(sponsorship.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                          {sponsorship.campaign && (
                            <>
                              <Progress value={(sponsorship.campaign.current_points / sponsorship.campaign.goal_points) * 100} className="h-2 mb-2" />
                              <div className="flex justify-between text-xs text-muted-foreground mb-3">
                                <span>{sponsorship.campaign.current_points.toLocaleString()} pts</span>
                                <span>Meta: {sponsorship.campaign.goal_points.toLocaleString()} pts</span>
                              </div>
                              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <Calendar className="h-3 w-3" />
                                  Até {format(new Date(sponsorship.campaign.end_date), "dd/MM/yyyy", { locale: ptBR })}
                                </span>
                                <Link to="/vaquinhas" className="flex items-center gap-1 text-primary hover:underline">
                                  <ExternalLink className="h-3 w-3" /> Ver campanha
                                </Link>
                              </div>
                            </>
                          )}
                        </CardContent>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>

          {/* Benefits info */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-yellow-500" />
                Como funciona o Patrocínio via PIX
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold text-sm mb-2">Fluxo</h4>
                  <ol className="space-y-1.5 text-sm text-muted-foreground list-decimal list-inside">
                    <li>Escolha uma campanha e o valor</li>
                    <li>Pague via QR Code PIX</li>
                    <li>Após confirmação, benefícios são ativados</li>
                    <li>90% vira pontos internos, 10% vai para o Fundo</li>
                  </ol>
                </div>
                <div>
                  <h4 className="font-semibold text-sm mb-2">Benefícios</h4>
                  <ul className="space-y-1.5 text-sm text-muted-foreground">
                    <li className="flex items-center gap-2">
                      <span className="text-green-500">✓</span>
                      Pontos para impulsionar ofertas
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-green-500">✓</span>
                      Destaque no feed e buscas
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-green-500">✓</span>
                      Selo "Empresa Patrocinadora"
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-green-500">✓</span>
                      Marca visível na campanha
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-green-500">✓</span>
                      Conversão: R$ 1 = 100 pontos
                    </li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Modal */}
      {selectedCampaign && (
        <SponsorCampaignModal
          open={showSponsorModal}
          onOpenChange={setShowSponsorModal}
          campaign={selectedCampaign}
          onSuccess={() => setSelectedCampaign(null)}
        />
      )}

      {/* Cancel dialog */}
      <AlertDialog open={!!cancelingId} onOpenChange={() => setCancelingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancelar Patrocínio?</AlertDialogTitle>
            <AlertDialogDescription>
              Ao cancelar, sua marca será removida da campanha. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Voltar</AlertDialogCancel>
            <AlertDialogAction onClick={handleCancelSponsorship} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Cancelar Patrocínio
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default BusinessSponsorships;
