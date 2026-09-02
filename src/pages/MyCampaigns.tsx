import { useEffect, useState } from 'react';
import { Heart, TrendingUp, Users, Calendar, Edit, Trash2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BackButton } from '@/components/BackButton';
import { EditCampaignModal } from '@/components/EditCampaignModal';
import { DeleteConfirmationDialog } from '@/components/DeleteConfirmationDialog';
import { useCrowdfunding } from '@/hooks/useCrowdfunding';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { SEOHead } from '@/components/SEOHead';

const MyCampaigns = () => {
  const { user } = useAuth();
  const { campaigns, loading, loadCampaigns, deleteCampaign } = useCrowdfunding();
  const [myCampaigns, setMyCampaigns] = useState<any[]>([]);
  const [selectedCampaign, setSelectedCampaign] = useState<any>(null);
  const [contributors, setContributors] = useState<any[]>([]);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [campaignToEdit, setCampaignToEdit] = useState<any>(null);
  const [campaignToDelete, setCampaignToDelete] = useState<any>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (user) {
      loadMyCampaigns();
    }
  }, [user]);

  // Realtime updates para contribuições
  useEffect(() => {
    if (!selectedCampaign) return;

    const channel = supabase
      .channel('campaign-contributions-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'campaign_contributions',
          filter: `campaign_id=eq.${selectedCampaign.id}`,
        },
        () => {
          loadContributors(selectedCampaign.id);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'crowdfunding_campaigns',
          filter: `id=eq.${selectedCampaign.id}`,
        },
        (payload) => {
          setSelectedCampaign(payload.new);
          setMyCampaigns((prev) =>
            prev.map((c) => (c.id === payload.new.id ? payload.new : c))
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedCampaign?.id]);

  const loadMyCampaigns = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('crowdfunding_campaigns')
      .select('*')
      .eq('creator_id', user.id)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setMyCampaigns(data);
      if (data.length > 0 && !selectedCampaign) {
        setSelectedCampaign(data[0]);
        loadContributors(data[0].id);
      }
    }
  };

  const loadContributors = async (campaignId: string) => {
    const { data, error } = await supabase
      .from('campaign_contributions')
      .select(`
        *,
        contributor:profiles!campaign_contributions_contributor_id_fkey(
          full_name,
          avatar_url
        )
      `)
      .eq('campaign_id', campaignId)
      .order('amount', { ascending: false });

    if (!error && data) {
      setContributors(data);
    }
  };

  const handleSelectCampaign = (campaign: any) => {
    setSelectedCampaign(campaign);
    loadContributors(campaign.id);
  };

  const handleEditCampaign = (campaign: any) => {
    setCampaignToEdit(campaign);
    setEditModalOpen(true);
  };

  const handleDeleteCampaign = (campaign: any) => {
    setCampaignToDelete(campaign);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!campaignToDelete) return;
    
    setDeleting(true);
    const success = await deleteCampaign(campaignToDelete.id);
    setDeleting(false);
    
    if (success) {
      setDeleteDialogOpen(false);
      setCampaignToDelete(null);
      if (selectedCampaign?.id === campaignToDelete.id) {
        setSelectedCampaign(null);
      }
      loadMyCampaigns();
    }
  };

  const activeCampaigns = myCampaigns.filter(c => c.is_active && new Date(c.end_date) > new Date());
  const endedCampaigns = myCampaigns.filter(c => !c.is_active || new Date(c.end_date) <= new Date());

  // Conversão de pontos para reais (1 ponto = R$ 0,01)
  const pointsToReais = (points: number) => {
    return (points * 0.01).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  return (
    <>
      <SEOHead
        title="Minhas Vaquinhas"
        description="Gerencie suas campanhas de vaquinha digital. Acompanhe contribuições e veja o progresso das suas causas."
        url={window.location.href}
      />
      <div className="min-h-screen bg-background py-8">
        <div className="container mx-auto px-4 max-w-7xl">
          <BackButton />

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-gradient-to-br from-pink-500 to-purple-600">
              <Heart className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Minhas Vaquinhas</h1>
              <p className="text-muted-foreground">
                Gerencie suas campanhas e acompanhe contribuições
              </p>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Carregando campanhas...</p>
          </div>
        ) : myCampaigns.length === 0 ? (
          <div className="text-center py-12">
            <Heart className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-xl font-semibold mb-2">Nenhuma campanha criada</h3>
            <p className="text-muted-foreground mb-6">
              Crie sua primeira vaquinha e comece a arrecadar pontos
            </p>
            <Button onClick={() => window.location.href = '/vaquinhas'}>
              Criar Vaquinha
            </Button>
          </div>
        ) : (
          <Tabs defaultValue="active" className="space-y-6">
            <TabsList>
              <TabsTrigger value="active">
                Ativas ({activeCampaigns.length})
              </TabsTrigger>
              <TabsTrigger value="ended">
                Encerradas ({endedCampaigns.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="active" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Lista de campanhas */}
                <div className="lg:col-span-1 space-y-4">
                  {activeCampaigns.map((campaign) => (
                    <Card
                      key={campaign.id}
                      className={`p-4 cursor-pointer transition-all ${
                        selectedCampaign?.id === campaign.id ? 'ring-2 ring-primary' : ''
                      }`}
                      onClick={() => handleSelectCampaign(campaign)}
                    >
                      <h3 className="font-semibold mb-2">{campaign.title}</h3>
                      <div className="space-y-2">
                        <Progress value={(campaign.current_points / campaign.goal_points) * 100} />
                        <div className="flex justify-between text-sm">
                          <div>
                            <span className="text-primary font-semibold block">
                              {campaign.current_points.toLocaleString('pt-BR')} pts
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {pointsToReais(campaign.current_points)}
                            </span>
                          </div>
                          <div className="text-right">
                            <span className="text-muted-foreground block">
                              de {campaign.goal_points.toLocaleString('pt-BR')} pts
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {pointsToReais(campaign.goal_points)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>

                {/* Detalhes da campanha selecionada */}
                {selectedCampaign && (
                  <div className="lg:col-span-2 space-y-6">
                    {/* Card principal */}
                    <Card className="p-6">
                      {selectedCampaign.image_url && (
                        <img
                          src={selectedCampaign.image_url}
                          alt={selectedCampaign.title}
                          className="w-full h-48 object-cover rounded-lg mb-4"
                        />
                      )}
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <h2 className="text-2xl font-bold">{selectedCampaign.title}</h2>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEditCampaign(selectedCampaign)}
                          >
                            <Edit className="w-4 h-4 mr-1" />
                            Editar
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleDeleteCampaign(selectedCampaign)}
                          >
                            <Trash2 className="w-4 h-4 mr-1" />
                            Excluir
                          </Button>
                        </div>
                      </div>
                      <p className="text-muted-foreground mb-6">{selectedCampaign.description}</p>

                      {/* Estatísticas */}
                      <div className="grid grid-cols-2 gap-4 mb-6">
                        <div className="bg-muted rounded-lg p-4">
                          <div className="flex items-center gap-2 text-muted-foreground mb-1">
                            <TrendingUp className="w-4 h-4" />
                            <span className="text-sm">Arrecadado</span>
                          </div>
                          <p className="text-2xl font-bold text-primary">
                            {selectedCampaign.current_points.toLocaleString('pt-BR')} pts
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {pointsToReais(selectedCampaign.current_points)}
                          </p>
                        </div>
                        <div className="bg-muted rounded-lg p-4">
                          <div className="flex items-center gap-2 text-muted-foreground mb-1">
                            <Users className="w-4 h-4" />
                            <span className="text-sm">Contribuidores</span>
                          </div>
                          <p className="text-2xl font-bold">{contributors.length}</p>
                        </div>
                      </div>

                      {/* Progresso */}
                      <div className="space-y-2 mb-6">
                        <Progress 
                          value={(selectedCampaign.current_points / selectedCampaign.goal_points) * 100} 
                          className="h-3"
                        />
                        <div className="flex justify-between text-sm">
                          <div>
                            <span className="block">
                              {((selectedCampaign.current_points / selectedCampaign.goal_points) * 100).toFixed(1)}% da meta
                            </span>
                            <span className="text-xs text-muted-foreground">
                              Meta: {selectedCampaign.goal_points.toLocaleString('pt-BR')} pts ({pointsToReais(selectedCampaign.goal_points)})
                            </span>
                          </div>
                          <span className="text-muted-foreground">
                            Termina em {format(new Date(selectedCampaign.end_date), "dd 'de' MMMM", { locale: ptBR })}
                          </span>
                        </div>
                      </div>
                    </Card>

                    {/* Lista de contribuidores */}
                    <Card className="p-6">
                      <h3 className="font-semibold text-lg mb-4">
                        🏆 Ranking de Contribuidores
                      </h3>
                      {contributors.length === 0 ? (
                        <p className="text-center text-muted-foreground py-8">
                          Nenhuma contribuição ainda
                        </p>
                      ) : (
                        <div className="space-y-3">
                          {contributors.map((contrib, index) => (
                            <div
                              key={contrib.id}
                              className="flex items-center gap-3 p-3 bg-muted rounded-lg"
                            >
                              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground font-bold text-sm">
                                {index + 1}
                              </div>
                              <Avatar className="h-10 w-10">
                                <AvatarImage src={contrib.contributor?.avatar_url} />
                                <AvatarFallback>
                                  {contrib.is_anonymous ? '?' : contrib.contributor?.full_name?.charAt(0) || 'U'}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1">
                                <p className="font-medium">
                                  {contrib.is_anonymous ? 'Anônimo' : contrib.contributor?.full_name || 'Usuário'}
                                </p>
                                {contrib.message && (
                                  <p className="text-sm text-muted-foreground line-clamp-1">
                                    "{contrib.message}"
                                  </p>
                                )}
                              </div>
                              <div className="text-right">
                                <Badge variant="secondary" className="font-bold">
                                  {contrib.amount.toLocaleString('pt-BR')} pts
                                </Badge>
                                <p className="text-xs text-muted-foreground mt-1">
                                  {pointsToReais(contrib.amount)}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </Card>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="ended">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {endedCampaigns.map((campaign) => (
                  <Card key={campaign.id} className="p-6 opacity-75">
                    {campaign.image_url && (
                      <img
                        src={campaign.image_url}
                        alt={campaign.title}
                        className="w-full h-32 object-cover rounded-lg mb-4"
                      />
                    )}
                    <Badge variant="secondary" className="mb-2">Encerrada</Badge>
                    <h3 className="font-semibold mb-2">{campaign.title}</h3>
                    <div className="space-y-2">
                      <Progress value={(campaign.current_points / campaign.goal_points) * 100} />
                      <div className="flex justify-between text-sm">
                        <div>
                          <span className="font-semibold block">
                            {campaign.current_points.toLocaleString('pt-BR')} pts
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {pointsToReais(campaign.current_points)}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="text-muted-foreground block">
                            de {campaign.goal_points.toLocaleString('pt-BR')} pts
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {pointsToReais(campaign.goal_points)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        )}

        {/* Modais */}
        {campaignToEdit && (
          <EditCampaignModal
            open={editModalOpen}
            onOpenChange={setEditModalOpen}
            campaign={campaignToEdit}
            onSuccess={() => {
              loadMyCampaigns();
              if (selectedCampaign?.id === campaignToEdit.id) {
                loadMyCampaigns();
              }
            }}
          />
        )}

        <DeleteConfirmationDialog
          open={deleteDialogOpen}
          onOpenChange={setDeleteDialogOpen}
          title="Excluir Vaquinha"
          description={`Tem certeza que deseja excluir a vaquinha "${campaignToDelete?.title}"? Esta ação não pode ser desfeita.`}
          onConfirm={confirmDelete}
          isLoading={deleting}
          confirmButtonText="Excluir Vaquinha"
        />
      </div>
    </div>
    </>
  );
};

export default MyCampaigns;
