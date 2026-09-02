import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { BusinessReferralDashboard } from '@/components/BusinessReferralDashboard';
import ReferralTracking from '@/components/ReferralTracking';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const BusinessReferrals: React.FC = () => {
  const { user, isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate('/anunciante/login');
      return;
    }
  }, [isAuthenticated, isLoading, navigate]);

  if (isLoading) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6 max-w-6xl">
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => navigate(-1)}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Sistema de Indicações</h1>
            <p className="text-muted-foreground mt-2">
              Indique negócios e ganhe comissões recorrentes. As indicações aparecem em tempo real!
            </p>
          </div>
        </div>

        <Tabs defaultValue="dashboard" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="dashboard">Painel Principal</TabsTrigger>
            <TabsTrigger value="tracking">Tracking Detalhado</TabsTrigger>
          </TabsList>
          
          <TabsContent value="dashboard">
            <BusinessReferralDashboard />
          </TabsContent>
          
          <TabsContent value="tracking">
            <ReferralTracking />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default BusinessReferrals;