import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Heart, Plus, Settings, Shield, QrCode } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useCrowdfunding } from '@/hooks/useCrowdfunding';
import { CampaignCard } from '@/components/CampaignCard';
import { CreateCampaignModal } from '@/components/CreateCampaignModal';
import { PointsTransferHistory } from '@/components/PointsTransferHistory';
import { PixDonationModal } from '@/components/PixDonationModal';
import { BackButton } from '@/components/BackButton';
import { SEOHead } from '@/components/SEOHead';

const Crowdfunding = () => {
  const { campaigns, loading, loadCampaigns } = useCrowdfunding();
  const navigate = useNavigate();
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showPixModal, setShowPixModal] = useState(false);

  const handleCategoryChange = (category: string) => {
    setSelectedCategory(category);
    loadCampaigns(category);
  };

  const categories = [
    { value: 'all', label: 'Todas' },
    { value: 'community', label: 'Comunidade' },
    { value: 'business', label: 'Negócios' },
    { value: 'charity', label: 'Caridade' },
    { value: 'event', label: 'Eventos' },
    { value: 'other', label: 'Outros' }
  ];

  return (
    <>
      <SEOHead
        title="Vaquinhas Digitais"
        description="Apoie causas e projetos da comunidade com seus pontos. Descubra campanhas ativas e faça a diferença."
        image="https://storage.googleapis.com/gpt-engineer-file-uploads/JPKEQ3Sg09UQwFg2Zlg1WtYkX6o2/social-images/social-1762531660055-Posts Ofertivo Instagranm_20251107_111948_0000.png"
        url={window.location.href}
      />
      <div className="min-h-screen bg-background py-4 sm:py-8">
        <div className="container mx-auto px-3 sm:px-4 max-w-7xl">
          <div className="mb-4">
            <BackButton />
          </div>
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 sm:mb-8">
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="p-2 sm:p-3 rounded-xl bg-gradient-to-br from-pink-500 to-purple-600 flex-shrink-0">
              <Heart className="h-6 w-6 sm:h-8 sm:w-8 text-white" />
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-2xl sm:text-3xl font-bold">Vaquinhas Digitais</h1>
              <p className="text-sm sm:text-base text-muted-foreground line-clamp-2">
                Apoie causas via PIX e ganhe pontos como recompensa
              </p>
            </div>
          </div>
          <div className="flex gap-2 w-full sm:w-auto flex-wrap">
            <Button
              variant="outline"
              onClick={() => setShowPixModal(true)}
              className="flex-1 sm:flex-initial text-xs sm:text-sm border-primary text-primary hover:bg-primary/10"
              size="sm"
            >
              <QrCode className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">Doar via PIX</span>
              <span className="sm:hidden">PIX</span>
            </Button>
            <Link to="/transparencia">
              <Button 
                variant="ghost" 
                size="sm"
                className="text-xs sm:text-sm"
              >
                <Shield className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                <span className="hidden sm:inline">Transparência</span>
                <span className="sm:hidden">Ver</span>
              </Button>
            </Link>
            <Button 
              variant="outline" 
              onClick={() => navigate('/minhas-vaquinhas')}
              className="flex-1 sm:flex-initial text-xs sm:text-sm"
              size="sm"
            >
              <Settings className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">Minhas Vaquinhas</span>
              <span className="sm:hidden">Minhas</span>
            </Button>
            <Button 
              onClick={() => setShowCreateModal(true)}
              className="flex-1 sm:flex-initial text-xs sm:text-sm"
              size="sm"
            >
              <Plus className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">Criar Vaquinha</span>
              <span className="sm:hidden">Criar</span>
            </Button>
          </div>
        </div>

        {/* Filtros */}
        <Tabs defaultValue="all" value={selectedCategory} onValueChange={handleCategoryChange} className="mb-6 sm:mb-8">
          <TabsList className="w-full justify-start overflow-x-auto scrollbar-hide flex-nowrap">
            {categories.map((cat) => (
              <TabsTrigger 
                key={cat.value} 
                value={cat.value}
                className="text-xs sm:text-sm whitespace-nowrap px-3 sm:px-4"
              >
                {cat.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        {/* Lista de Campanhas */}
        {loading ? (
          <div className="text-center py-8 sm:py-12">
            <p className="text-sm sm:text-base text-muted-foreground">Carregando campanhas...</p>
          </div>
        ) : campaigns.length === 0 ? (
          <div className="text-center py-8 sm:py-12 px-4">
            <Heart className="h-12 w-12 sm:h-16 sm:w-16 mx-auto mb-3 sm:mb-4 text-muted-foreground" />
            <h3 className="text-lg sm:text-xl font-semibold mb-2">Nenhuma campanha ativa</h3>
            <p className="text-sm sm:text-base text-muted-foreground">
              Não há campanhas nesta categoria no momento.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {campaigns.map((campaign) => (
              <CampaignCard
                key={campaign.id}
                campaign={campaign}
                onContribute={loadCampaigns}
              />
            ))}
          </div>
        )}

        {/* Histórico de Transferências */}
        <div className="mt-8 sm:mt-12">
          <PointsTransferHistory />
        </div>

        {/* Info Footer */}
        <div className="mt-6 sm:mt-8 p-4 sm:p-6 bg-muted rounded-lg">
          <h3 className="font-semibold mb-2 text-sm sm:text-base">💙 Vaquinha Solidária com Recompensa</h3>
          <ul className="space-y-1.5 sm:space-y-2 text-xs sm:text-sm text-muted-foreground">
            <li>• Doe via PIX e ganhe pontos como recompensa (1 Real = 100 pontos)</li>
            <li>• 90% do valor é convertido em pontos para você</li>
            <li>• 10% vai para o Fundo Social Ofertivo</li>
            <li>• Acompanhe o progresso e ranking de doadores em tempo real</li>
            <li>• Empresas podem doar e receber o selo "Apoiadora da Comunidade"</li>
            <li>• Suas contribuições podem ser anônimas ou públicas</li>
          </ul>
        </div>
      </div>

      <CreateCampaignModal
        open={showCreateModal}
        onOpenChange={setShowCreateModal}
        onSuccess={loadCampaigns}
      />

      <PixDonationModal
        open={showPixModal}
        onOpenChange={setShowPixModal}
      />
      </div>
    </>
  );
};

export default Crowdfunding;
