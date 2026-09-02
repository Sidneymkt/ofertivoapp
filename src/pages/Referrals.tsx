import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { UnifiedReferralDashboard } from '@/components/UnifiedReferralDashboard';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useUserProfileRealtimeSync } from '@/hooks/useRealtimeSubscription';

export default function Referrals() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  // Real-time sync for referral data
  useUserProfileRealtimeSync(user?.id);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/login');
    }
  }, [user, loading, navigate]);

  if (loading) {
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
              Convide amigos e negócios, ganhe pontos e comissões
            </p>
          </div>
        </div>

        <UnifiedReferralDashboard />
      </div>
    </div>
  );
}
