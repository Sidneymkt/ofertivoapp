import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { PixKeyManager } from '@/components/business/PixKeyManager';
import { OfferOrdersPanel } from '@/components/business/OfferOrdersPanel';
import { BackButton } from '@/components/BackButton';
import { Loader2 } from 'lucide-react';

export default function BusinessPixPayments() {
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isLoading && !user) navigate('/anunciante/login');
  }, [user, isLoading, navigate]);

  useEffect(() => {
    (async () => {
      if (!user) return;
      const { data } = await (supabase as any).from('businesses').select('id').eq('owner_id', user.id).maybeSingle();
      setBusinessId(data?.id ?? null);
      setLoading(false);
    })();
  }, [user]);

  if (loading || isLoading) return <div className="p-8 flex justify-center"><Loader2 className="animate-spin" /></div>;
  if (!businessId) return <div className="p-8 text-center text-muted-foreground">Cadastre seu negócio primeiro.</div>;

  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-6 space-y-6">
      <div className="flex items-center gap-3">
        <BackButton to="/anunciante/painel" />
        <h1 className="text-2xl font-bold">PIX e Delivery</h1>
      </div>
      <PixKeyManager businessId={businessId} />
      <OfferOrdersPanel businessId={businessId} />
    </div>
  );
}
