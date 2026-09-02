
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuth } from '@/hooks/useAuth';
import { useSubscriptionStatus } from '@/hooks/useSubscriptionStatus';
import { useBusinessStatus } from '@/hooks/useBusinessStatus';
import { usePlanLimits } from '@/hooks/usePlanLimits';
import { toast } from 'sonner';
import { DeleteConfirmationDialog } from '@/components/DeleteConfirmationDialog';
import { 
  ArrowLeft, 
  Gift, 
  PlusCircle, 
  Users, 
  Trophy,
  Shuffle,
  Eye,
  X,
  Camera,
  Upload,
  Settings,
  Zap,
  Edit,
  Crown,
  Trash2,
  Lock,
  CreditCard,
  CheckCircle,
  Copy,
  Sparkles
} from 'lucide-react';
import { GenerateRaffleArtModal } from '@/components/business/GenerateRaffleArtModal';
import { supabase } from '@/integrations/supabase/client';
import { useBusiness } from '@/hooks/useBusiness';
import { useAutomaticRaffles } from '@/hooks/useAutomaticRaffles';
import { CampaignFormBuilder } from '@/components/CampaignFormBuilder';
import { RaffleDrawEngine } from '@/components/RaffleDrawEngine';
import { CampaignHotsite } from '@/components/CampaignHotsite';
import { RaffleParticipantsViewer } from '@/components/RaffleParticipantsViewer';
import { TransparentRaffleDrawEngine } from '@/components/TransparentRaffleDrawEngine';
import { useNavigate } from 'react-router-dom';

type RaffleRow = {
  id: string;
  business_id: string;
  title: string;
  description: string | null;
  prize: string;
  entry_cost: number;
  max_participants: number | null;
  current_participants: number;
  start_date: string;
  end_date: string;
  winner_id: string | null;
  is_active: boolean;
  image_url: string | null;
  created_at: string;
  participant_names?: string[];
};

const BusinessRaffles = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { businessId, business, loading: businessLoading } = useBusiness();
  const { conductRaffle } = useAutomaticRaffles();
  const { hasActiveSubscription, planName, loading: subscriptionLoading } = useSubscriptionStatus();
  const { isActive: isBusinessActive, isInactive: isBusinessInactive, loading: businessStatusLoading } = useBusinessStatus();
  const { canCreateRaffle, currentRaffles, maxRaffles, rafflesRemaining, loading: limitsLoading } = usePlanLimits();
  const [activeTab, setActiveTab] = useState<'active' | 'finished'>('active');

  const [raffles, setRaffles] = useState<RaffleRow[]>([]);
  const [selectedRaffle, setSelectedRaffle] = useState<string | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingRaffle, setEditingRaffle] = useState<RaffleRow | null>(null);
  const [showAdvancedForm, setShowAdvancedForm] = useState(false);
  const [showDrawEngine, setShowDrawEngine] = useState<string | null>(null);
  const [showHotsite, setShowHotsite] = useState<string | null>(null);
  const [showParticipants, setShowParticipants] = useState<string | null>(null);
  const [artRaffle, setArtRaffle] = useState<RaffleRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [conducting, setConducting] = useState<string | null>(null);
  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    raffle: RaffleRow | null;
  }>({ open: false, raffle: null });
  const [isDeleting, setIsDeleting] = useState(false);
  const [newRaffle, setNewRaffle] = useState({
    title: '',
    description: '',
    prize: '',
    entry_cost: 100,
    end_date: '',
    max_participants: '',
    auto_participation: false,
    is_immediate: false, // Sorteio imediato
    participation_rules: {
      checkin: false,
      purchase: false,
      offer_interaction: false,
      follow_business: false
    }
  });
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  useEffect(() => {
    if (!businessLoading && businessId) {
      loadRaffles(businessId);
      setupRealtime(businessId);
    }
    // Cleanup realtime on business change/unmount
    return () => {
      supabase.getChannels().forEach((ch) => {
        if (ch.topic === 'raffles-realtime') {
          supabase.removeChannel(ch);
        }
      });
    };
  }, [businessLoading, businessId]);

  const setupRealtime = (bizId: string) => {
    console.log('[BusinessRaffles] Subscribing realtime for business', bizId);
    const channel = supabase
      .channel('raffles-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'raffles', filter: `business_id=eq.${bizId}` },
        (payload) => {
          console.log('[Realtime] raffles change', payload);
          loadRaffles(bizId);
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'raffle_entries' },
        (payload) => {
          console.log('[Realtime] raffle_entries change', payload);
          const r = (payload.new as any) || (payload.old as any);
          if (r?.raffle_id) {
            loadRaffles(bizId);
          }
        }
      )
      .subscribe((status) => {
        console.log('[Realtime] channel status:', status);
      });
  };

  const loadRaffles = async (bizId: string, attempt: number = 0) => {
    setLoading(true);
    try {
      console.log('[BusinessRaffles] Loading raffles for business', bizId);

      // Buscar sorteios com contagem de participantes
      const { data: rafflesData, error: rafflesError } = await supabase
        .from('raffles')
        .select(`
          id,
          business_id,
          title,
          description,
          prize,
          entry_cost,
          max_participants,
          current_participants,
          start_date,
          end_date,
          winner_id,
          is_active,
          image_url,
          created_at
        `)
        .eq('business_id', bizId)
        .order('created_at', { ascending: false });

      if (rafflesError) throw rafflesError;

      // Buscar participantes para cada sorteio separadamente usando RPC
      const mapped = await Promise.all(
        (rafflesData || []).map(async (raffle: any) => {
          const { data: entries, error: entriesError } = await supabase
            .rpc('get_raffle_participants', { raffle_id_param: raffle.id });

          if (entriesError) {
            console.warn('Error fetching entries for raffle', raffle.id, entriesError);
          }

          const participantNames: string[] = entries?.map((entry: any) => entry.full_name).filter(Boolean) || [];

          return {
            id: raffle.id,
            business_id: raffle.business_id,
            title: raffle.title,
            description: raffle.description,
            prize: raffle.prize,
            entry_cost: raffle.entry_cost,
            max_participants: raffle.max_participants,
            current_participants: entries ? entries.length : 0,
            start_date: raffle.start_date,
            end_date: raffle.end_date,
            winner_id: raffle.winner_id,
            is_active: raffle.is_active,
            image_url: raffle.image_url,
            created_at: raffle.created_at,
            participant_names: participantNames
          } as RaffleRow;
        })
      );

      setRaffles(mapped);
    } catch (err: any) {
      console.error('Error loading raffles:', err);
      // JWT expirado (PGRST301) — aguardar refresh e tentar novamente sem toast
      const isJwtExpired = err?.code === 'PGRST301' || /jwt expired/i.test(err?.message || '');
      if (isJwtExpired && attempt < 2) {
        try {
          await supabase.auth.refreshSession();
        } catch {}
        await new Promise((r) => setTimeout(r, 400));
        return loadRaffles(bizId, attempt + 1);
      }
      if (!isJwtExpired) {
        toast.error('Erro ao carregar sorteios');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast.error('Apenas imagens são permitidas');
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast.error('A imagem deve ter no máximo 5MB');
        return;
      }

      setSelectedImage(file);
      const reader = new FileReader();
      reader.onload = (e) => setImagePreview(e.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  const uploadRaffleImage = async (file: File): Promise<string | null> => {
    if (!user || !businessId) return null;
    
    try {
      const fileExt = file.name.split('.').pop();
      const safeBusinessId = businessId.replace(/[^a-zA-Z0-9-]/g, '');
      const fileName = `${safeBusinessId}/${user.id}/${Date.now()}.${fileExt}`;
      
      console.log('[RaffleImage] Starting upload:', { fileName, fileSize: file.size });
      
      const { error: uploadError, data: uploadData } = await supabase.storage
        .from('raffle-images')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });
        
      if (uploadError) {
        console.error('[RaffleImage] Upload error:', uploadError);
        throw uploadError;
      }

      console.log('[RaffleImage] Upload successful:', uploadData);

      const { data } = supabase.storage
        .from('raffle-images')
        .getPublicUrl(fileName);

      console.log('[RaffleImage] Public URL generated:', data.publicUrl);
      return data.publicUrl;
    } catch (error) {
      console.error('[RaffleImage] Error uploading image:', error);
      throw error;
    }
  };

  const fileToDataUrl = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = () => reject(new Error('Não foi possível processar a imagem'));
      reader.readAsDataURL(file);
    });

  const createRaffleViaEdgeFunction = async (payload: {
    business_id: string;
    title: string;
    description?: string | null;
    prize: string;
    entry_cost: number;
    end_date: string;
    max_participants?: number | null;
    image_url?: string | null;
    image?: {
      data_url: string;
      file_name: string;
      file_type: string;
    } | null;
    auto_participation?: boolean;
    participation_rules?: Record<string, boolean>;
  }) => {
    const { data, error } = await supabase.functions.invoke('create-business-raffle', {
      body: payload,
    });

    if (error) {
      throw new Error(error.message || 'Erro ao criar sorteio');
    }

    if (!data?.success) {
      throw new Error(data?.error || 'Erro ao criar sorteio');
    }

    return data;
  };

  const handleDeleteRaffle = async () => {
    if (!deleteDialog.raffle) return;

    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from('raffles')
        .delete()
        .eq('id', deleteDialog.raffle.id);

      if (error) throw error;

      toast.success('Sorteio excluído com sucesso!');
      setDeleteDialog({ open: false, raffle: null });
      
      // Reload raffles
      await loadRaffles(businessId!);
    } catch (error: any) {
      console.error('Error deleting raffle:', error);
      toast.error('Erro ao excluir sorteio');
    } finally {
      setIsDeleting(false);
    }
  };

  const createRaffle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error('Sessão expirada. Faça login novamente.');
      return;
    }
    if (!businessId) {
      toast.error('Nenhum negócio ativo vinculado a esta conta.');
      return;
    }
    
    // Verificar limite de sorteios do plano
    if (!canCreateRaffle) {
      const limitText = maxRaffles !== null ? `${maxRaffles} sorteios ativos` : 'sorteios';
      toast.error(`Você atingiu o limite de ${limitText} do seu plano. Faça upgrade para criar mais sorteios.`);
      return;
    }
    
    // Validação: para sorteio normal, precisa de data
    if (!newRaffle.title.trim() || !newRaffle.prize.trim()) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }
    
    // Se não for sorteio imediato, precisa de data
    if (!newRaffle.is_immediate && !newRaffle.end_date) {
      toast.error('Informe a data de encerramento ou ative o modo Sorteio Imediato');
      return;
    }

    setSubmitting(true);
    try {
      // Preparar data de encerramento
      let endDateIso: string;
      if (newRaffle.is_immediate) {
        const farFutureDate = new Date();
        farFutureDate.setFullYear(farFutureDate.getFullYear() + 100);
        endDateIso = farFutureDate.toISOString();
      } else {
        const endDate = new Date(newRaffle.end_date);
        if (endDate <= new Date()) {
          toast.error('A data de encerramento deve ser no futuro');
          setSubmitting(false);
          return;
        }
        endDateIso = endDate.toISOString();
      }

      // 1) Preparar imagem para a Edge Function fazer upload com permissão segura
      let imagePayload: {
        data_url: string;
        file_name: string;
        file_type: string;
      } | null = null;
      if (selectedImage) {
        imagePayload = {
          data_url: await fileToDataUrl(selectedImage),
          file_name: selectedImage.name,
          file_type: selectedImage.type,
        };
      }

      // 2) Criar sorteio exclusivamente pela Edge Function com service role validada
      const result = await createRaffleViaEdgeFunction({
        business_id: businessId,
        title: newRaffle.title.trim(),
        description: newRaffle.description.trim() || null,
        prize: newRaffle.prize.trim(),
        entry_cost: Math.max(1, newRaffle.entry_cost),
        end_date: endDateIso,
        max_participants: newRaffle.max_participants ? parseInt(newRaffle.max_participants) : null,
        image: imagePayload,
        auto_participation: newRaffle.auto_participation,
        participation_rules: newRaffle.participation_rules,
      });

      console.log('Sorteio criado com sucesso:', result.raffle);

      resetForm();
      setShowCreateDialog(false);

      if (result.imageUploadWarning) {
        toast.warning('Sorteio criado, mas a imagem não foi anexada. Você pode editar e tentar novamente.');
      } else {
        toast.success('Sorteio criado com sucesso!');
      }

      await loadRaffles(businessId);
    } catch (error: any) {
      console.error('Erro ao criar sorteio:', error);
      const errorMessage = error?.message || 'Erro desconhecido ao criar sorteio';
      toast.error(`Erro ao criar sorteio: ${errorMessage}`);
    } finally {
      setSubmitting(false);
    }
  };

  const removeImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
  };

  const handleConductRaffle = async (raffleId: string) => {
    if (!confirm('Tem certeza que deseja realizar o sorteio? Esta ação não pode ser desfeita.')) {
      return;
    }

    setConducting(raffleId);
    try {
      const result = await conductRaffle(raffleId);
      
      if (result.success) {
        toast.success(`Sorteio realizado com sucesso! Ganhador: ${result.winner_id || 'ID do ganhador'}`);
        await loadRaffles(businessId!);
      } else {
        throw new Error(result.error?.message || 'Erro ao realizar sorteio');
      }
    } catch (error: any) {
      console.error('Error conducting raffle:', error);
      toast.error(error.message || 'Erro ao realizar sorteio');
    } finally {
      setConducting(null);
    }
  };

  const handleEditRaffle = (raffle: RaffleRow) => {
    setEditingRaffle(raffle);
    setNewRaffle({
      title: raffle.title,
      description: raffle.description || '',
      prize: raffle.prize,
      entry_cost: raffle.entry_cost,
      end_date: new Date(raffle.end_date).toISOString().slice(0, 16),
      max_participants: raffle.max_participants?.toString() || '',
      auto_participation: false,
      is_immediate: false,
      participation_rules: {
        checkin: false,
        purchase: false,
        offer_interaction: false,
        follow_business: false
      }
    });
    setShowEditDialog(true);
  };

  const updateRaffle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRaffle || !businessId) return;

    // Verificar se tem assinatura ativa
    if (!hasActiveSubscription) {
      toast.error('Renove seu plano para editar sorteios');
      navigate('/anunciante/planos');
      return;
    }

    if (!newRaffle.title.trim() || !newRaffle.prize.trim() || !newRaffle.end_date) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    setSubmitting(true);
    try {
      let imageUrl = editingRaffle.image_url;
      
      if (selectedImage) {
        toast.info('Enviando nova imagem...');
        imageUrl = await uploadRaffleImage(selectedImage);
      }

      const endDate = new Date(newRaffle.end_date);
      if (endDate <= new Date()) {
        toast.error('A data de encerramento deve ser no futuro');
        setSubmitting(false);
        return;
      }

      const updateData: Record<string, any> = {
        title: newRaffle.title.trim(),
        description: newRaffle.description.trim() || null,
        prize: newRaffle.prize.trim(),
        entry_cost: Math.max(1, newRaffle.entry_cost),
        end_date: endDate.toISOString(),
        max_participants: newRaffle.max_participants ? parseInt(newRaffle.max_participants) : null,
        image_url: imageUrl
      };

      // Se o sorteio estava expirado ou inativo, reativar ao salvar com nova data futura
      if (editingRaffle && (isRaffleEnded(editingRaffle.end_date) || !editingRaffle.is_active)) {
        updateData.is_active = true;
      }

      const { error } = await supabase
        .from('raffles')
        .update(updateData)
        .eq('id', editingRaffle.id);

      if (error) throw error;

      toast.success('Sorteio atualizado com sucesso!');
      setShowEditDialog(false);
      setEditingRaffle(null);
      resetForm();
      await loadRaffles(businessId);
    } catch (error: any) {
      console.error('Error updating raffle:', error);
      toast.error(error?.message || 'Erro ao atualizar sorteio');
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setNewRaffle({
      title: '',
      description: '',
      prize: '',
      entry_cost: 100,
      end_date: '',
      is_immediate: false,
      max_participants: '',
      auto_participation: false,
      participation_rules: {
        checkin: false,
        purchase: false,
        offer_interaction: false,
        follow_business: false
      }
    });
    setSelectedImage(null);
    setImagePreview(null);
  };

  // Detecta se um sorteio é imediato (data de encerramento > 50 anos no futuro)
  const isImmediateRaffle = (endDate: string) => {
    const end = new Date(endDate);
    const now = new Date();
    const yearsFromNow = (end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24 * 365);
    return yearsFromNow > 50; // Se end_date está mais de 50 anos no futuro, é imediato
  };

  const getStatusBadge = (raffle: RaffleRow) => {
    if (raffle.winner_id) return <Badge className="bg-success">Finalizado</Badge>;
    if (!raffle.is_active) return <Badge variant="secondary">Inativo</Badge>;
    if (isImmediateRaffle(raffle.end_date)) return <Badge className="bg-gradient-points flex items-center gap-1"><Zap className="w-3 h-3" />Imediato</Badge>;
    if (new Date(raffle.end_date) < new Date()) return <Badge variant="destructive">Expirado</Badge>;
    return <Badge className="bg-gradient-points">Ativo</Badge>;
  };

  const isRaffleEnded = (endDate: string) => {
    // Sorteios imediatos nunca expiram automaticamente
    if (isImmediateRaffle(endDate)) return false;
    return new Date(endDate) < new Date();
  };

  // Verifica se o sorteio pode ser executado manualmente
  const canExecuteDraw = (raffle: RaffleRow) => {
    // Sorteio já tem ganhador
    if (raffle.winner_id) return false;
    // Precisa de pelo menos 1 participante
    if (raffle.current_participants < 1) return false;
    // Para sorteios imediatos, sempre pode executar
    if (isImmediateRaffle(raffle.end_date)) return true;
    // Para sorteios normais, precisa estar expirado ou inativo
    return isRaffleEnded(raffle.end_date) || !raffle.is_active;
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 sm:gap-4 min-w-0">
              <Link 
                to="/anunciante/dashboard" 
                className="flex items-center gap-2 text-muted-foreground hover:text-foreground flex-shrink-0"
              >
                <ArrowLeft className="w-4 h-4" />
                <span className="hidden sm:inline">Voltar</span>
              </Link>
              <h1 className="text-lg sm:text-xl font-semibold truncate">Gestão de Sorteios</h1>
              {hasActiveSubscription && !limitsLoading && (
                <div className="hidden md:flex items-center gap-2">
                  {rafflesRemaining !== null ? (
                    <Badge variant="outline" className="border-muted-foreground/50">
                      {currentRaffles}/{maxRaffles} sorteios ativos
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="border-green-500/50 text-green-600">
                      Sorteios ilimitados
                    </Badge>
                  )}
                </div>
              )}
            </div>
            <Dialog open={showCreateDialog} onOpenChange={(open) => {
              setShowCreateDialog(open);
              if (!open) resetForm();
            }}>
              <DialogTrigger asChild>
                <Button 
                  className="bg-gradient-primary flex-shrink-0" 
                  disabled={businessLoading || !businessId || subscriptionLoading || !hasActiveSubscription || businessStatusLoading || isBusinessInactive || (!canCreateRaffle && !limitsLoading)}
                  size="sm"
                  title={
                    isBusinessInactive 
                      ? 'Seu negócio está inativo' 
                      : !hasActiveSubscription 
                        ? 'Assine um plano para criar sorteios' 
                        : !canCreateRaffle 
                          ? `Limite de ${maxRaffles} sorteios atingido` 
                          : ''
                  }
                >
                  {(isBusinessInactive || !hasActiveSubscription || !canCreateRaffle) && <Lock className="w-4 h-4 sm:mr-2" />}
                  {!isBusinessInactive && hasActiveSubscription && canCreateRaffle && <PlusCircle className="w-4 h-4 sm:mr-2" />}
                  <span className="hidden sm:inline">Novo Sorteio</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh]">
                <DialogHeader>
                  <DialogTitle>Criar Novo Sorteio</DialogTitle>
                  <DialogDescription>
                    Configure um novo sorteio para engajar seus clientes
                  </DialogDescription>
                </DialogHeader>
                <ScrollArea className="max-h-[70vh] pr-2">
                  <form onSubmit={createRaffle} className="space-y-6">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="title">Título do Sorteio</Label>
                      <Input
                        id="title"
                        placeholder="Ex: Sorteio iPhone 15"
                        value={newRaffle.title}
                        onChange={(e) => setNewRaffle(prev => ({ ...prev, title: e.target.value }))}
                        required
                        disabled={submitting}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="prize">Prêmio</Label>
                      <Input
                        id="prize"
                        placeholder="Ex: iPhone 15 Pro Max"
                        value={newRaffle.prize}
                        onChange={(e) => setNewRaffle(prev => ({ ...prev, prize: e.target.value }))}
                        required
                        disabled={submitting}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Descrição</Label>
                    <Textarea
                      id="description"
                      placeholder="Descreva os detalhes do sorteio..."
                      value={newRaffle.description}
                      onChange={(e) => setNewRaffle(prev => ({ ...prev, description: e.target.value }))}
                      rows={3}
                      disabled={submitting}
                    />
                  </div>

                  {/* Image Upload */}
                  <div className="space-y-2">
                    <Label>Imagem do Sorteio</Label>
                    <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-4">
                      {imagePreview ? (
                        <div className="relative">
                          <img 
                            src={imagePreview} 
                            alt="Preview" 
                            className="w-full h-48 object-cover rounded-lg"
                          />
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            className="absolute top-2 right-2"
                            onClick={removeImage}
                            disabled={submitting}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      ) : (
                        <div className="text-center">
                          <Camera className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                          <p className="text-sm text-muted-foreground mb-2">
                            Adicione uma imagem para tornar seu sorteio mais atrativo
                          </p>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => document.getElementById('raffle-image')?.click()}
                            disabled={submitting}
                          >
                            <Upload className="w-4 h-4 mr-2" />
                            Escolher Imagem
                          </Button>
                        </div>
                      )}
                      <input
                        id="raffle-image"
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="hidden"
                        disabled={submitting}
                      />
                    </div>
                  </div>

                  {/* Sorteio Imediato Toggle */}
                  <div className="flex items-center space-x-3 p-4 border border-primary/20 rounded-lg bg-primary/5">
                    <Switch
                      id="is_immediate"
                      checked={newRaffle.is_immediate}
                      onCheckedChange={(checked) => 
                        setNewRaffle(prev => ({ 
                          ...prev, 
                          is_immediate: checked,
                          end_date: checked ? '' : prev.end_date
                        }))
                      }
                      disabled={submitting}
                    />
                    <div className="flex-1">
                      <Label htmlFor="is_immediate" className="flex items-center gap-2 font-medium cursor-pointer">
                        <Zap className="w-4 h-4 text-primary" />
                        Sorteio Imediato
                      </Label>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        O sorteio ficará ativo até você executar manualmente
                      </p>
                    </div>
                  </div>

                  <div className={`grid grid-cols-1 gap-4 sm:grid-cols-2 ${newRaffle.is_immediate ? '' : 'md:grid-cols-3'}`}>
                    <div className="space-y-2">
                      <Label htmlFor="entry_cost">Custo de Entrada (pontos)</Label>
                      <Input
                        id="entry_cost"
                        type="number"
                        min="1"
                        placeholder="100"
                        value={newRaffle.entry_cost}
                        onChange={(e) => setNewRaffle(prev => ({ ...prev, entry_cost: parseInt(e.target.value) || 100 }))}
                        required
                        disabled={submitting}
                      />
                    </div>
                    {!newRaffle.is_immediate && (
                      <div className="space-y-2">
                        <Label htmlFor="end_date">Data de Encerramento</Label>
                        <Input
                          id="end_date"
                          type="datetime-local"
                          value={newRaffle.end_date}
                          onChange={(e) => setNewRaffle(prev => ({ ...prev, end_date: e.target.value }))}
                          required
                          disabled={submitting}
                          min={new Date(Date.now() + 60000).toISOString().slice(0, 16)} // Mínimo 1 minuto no futuro
                        />
                      </div>
                    )}
                    <div className="space-y-2">
                      <Label htmlFor="max_participants">Máx. Participantes (opcional)</Label>
                      <Input
                        id="max_participants"
                        type="number"
                        min="1"
                        placeholder="100"
                        value={newRaffle.max_participants}
                        onChange={(e) => setNewRaffle(prev => ({ ...prev, max_participants: e.target.value }))}
                        disabled={submitting}
                      />
                    </div>
                  </div>

                  {/* Participation Rules */}
                  <div className="space-y-4 border-t pt-4">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                      <Settings className="w-5 h-5" />
                      Regras de Participação
                    </h3>
                    
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="auto_participation"
                        checked={newRaffle.auto_participation}
                        onCheckedChange={(checked) => 
                          setNewRaffle(prev => ({ ...prev, auto_participation: checked }))
                        }
                        disabled={submitting}
                      />
                      <Label htmlFor="auto_participation" className="flex items-center gap-2">
                        <Zap className="w-4 h-4" />
                        Participação Automática
                      </Label>
                    </div>
                    
                    {newRaffle.auto_participation && (
                      <div className="bg-muted p-4 rounded-lg space-y-3">
                        <p className="text-sm text-muted-foreground mb-3">
                          Selecione as ações que geram participação automática no sorteio:
                        </p>
                        
                        <div className="space-y-3">
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id="rule_checkin"
                              checked={newRaffle.participation_rules.checkin}
                              onCheckedChange={(checked) =>
                                setNewRaffle(prev => ({
                                  ...prev,
                                  participation_rules: {
                                    ...prev.participation_rules,
                                    checkin: checked as boolean
                                  }
                                }))
                              }
                              disabled={submitting}
                            />
                            <Label htmlFor="rule_checkin" className="text-sm">
                              Check-in nas suas ofertas (1 número)
                            </Label>
                          </div>
                          <p className="text-xs text-muted-foreground ml-6">
                            O cliente ganha 1 bilhete ao fazer check-in em qualquer oferta do seu negócio.
                          </p>
                          
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id="rule_follow"
                              checked={newRaffle.participation_rules.follow_business}
                              onCheckedChange={(checked) =>
                                setNewRaffle(prev => ({
                                  ...prev,
                                  participation_rules: {
                                    ...prev.participation_rules,
                                    follow_business: checked as boolean
                                  }
                                }))
                              }
                              disabled={submitting}
                            />
                            <Label htmlFor="rule_follow" className="text-sm">
                              Seguir negócio (1 número)
                            </Label>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => setShowCreateDialog(false)}
                      disabled={submitting}
                      className="w-full sm:w-auto"
                    >
                      Cancelar
                    </Button>
                    <Button 
                      type="submit" 
                      disabled={submitting} 
                      className="bg-gradient-primary w-full sm:w-auto"
                    >
                      {submitting ? 'Criando...' : 'Criar Sorteio'}
                    </Button>
                  </div>
                  </form>
                </ScrollArea>
              </DialogContent>
            </Dialog>

            {/* Edit Dialog */}
            <Dialog open={showEditDialog} onOpenChange={(open) => {
              setShowEditDialog(open);
              if (!open) {
                setEditingRaffle(null);
                resetForm();
                setSelectedImage(null);
                setImagePreview(null);
              }
            }}>
              <DialogContent className="max-w-2xl max-h-[90vh]">
                <DialogHeader>
                  <DialogTitle>Editar Sorteio</DialogTitle>
                  <DialogDescription>
                    Modifique as informações do sorteio
                  </DialogDescription>
                </DialogHeader>
                <div className="max-h-[70vh] overflow-y-auto pr-2">
                  <form onSubmit={updateRaffle} className="space-y-6">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="edit-title">Título do Sorteio</Label>
                        <Input
                          id="edit-title"
                          placeholder="Ex: Sorteio iPhone 15"
                          value={newRaffle.title}
                          onChange={(e) => setNewRaffle(prev => ({ ...prev, title: e.target.value }))}
                          required
                          disabled={submitting}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="edit-prize">Prêmio</Label>
                        <Input
                          id="edit-prize"
                          placeholder="Ex: iPhone 15 Pro Max"
                          value={newRaffle.prize}
                          onChange={(e) => setNewRaffle(prev => ({ ...prev, prize: e.target.value }))}
                          required
                          disabled={submitting}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="edit-description">Descrição</Label>
                      <Textarea
                        id="edit-description"
                        placeholder="Descreva os detalhes do sorteio..."
                        value={newRaffle.description}
                        onChange={(e) => setNewRaffle(prev => ({ ...prev, description: e.target.value }))}
                        rows={3}
                        disabled={submitting}
                      />
                    </div>

                     <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
                       <div className="space-y-2">
                         <Label htmlFor="edit-entry_cost">Custo de Entrada (pontos)</Label>
                         <Input
                           id="edit-entry_cost"
                           type="number"
                           min="1"
                           value={newRaffle.entry_cost}
                           onChange={(e) => setNewRaffle(prev => ({ ...prev, entry_cost: parseInt(e.target.value) || 100 }))}
                           required
                           disabled={submitting}
                         />
                       </div>
                       <div className="space-y-2">
                         <Label htmlFor="edit-end_date">Data de Encerramento</Label>
                         <Input
                           id="edit-end_date"
                           type="datetime-local"
                           value={newRaffle.end_date}
                           onChange={(e) => setNewRaffle(prev => ({ ...prev, end_date: e.target.value }))}
                           required
                           disabled={submitting}
                           min={new Date(Date.now() + 60000).toISOString().slice(0, 16)}
                         />
                       </div>
                       <div className="space-y-2">
                         <Label htmlFor="edit-max_participants">Máx. Participantes</Label>
                         <Input
                           id="edit-max_participants"
                           type="number"
                           min="1"
                           placeholder="100"
                           value={newRaffle.max_participants}
                           onChange={(e) => setNewRaffle(prev => ({ ...prev, max_participants: e.target.value }))}
                           disabled={submitting}
                         />
                       </div>
                     </div>

                     {/* Upload de Imagem */}
                     <div className="space-y-2">
                       <Label>Imagem do Sorteio</Label>
                       <div className="flex flex-col gap-3">
                         {/* Imagem atual */}
                         {editingRaffle?.image_url && !imagePreview && (
                           <div className="relative">
                             <img 
                               src={editingRaffle.image_url} 
                               alt="Imagem atual do sorteio" 
                               className="w-full h-32 object-cover rounded-md border"
                             />
                             <div className="absolute top-2 right-2">
                               <Badge className="bg-blue-500">Atual</Badge>
                             </div>
                           </div>
                         )}
                         
                         {/* Preview da nova imagem */}
                         {imagePreview && (
                           <div className="relative">
                             <img 
                               src={imagePreview} 
                               alt="Preview" 
                               className="w-full h-32 object-cover rounded-md border"
                             />
                             <Button
                               type="button"
                               variant="destructive"
                               size="sm"
                               onClick={removeImage}
                               className="absolute top-2 right-2"
                             >
                               <X className="w-3 h-3" />
                             </Button>
                           </div>
                         )}
                         
                         {/* Upload button */}
                         <div className="flex items-center gap-2">
                           <Input
                             type="file"
                             accept="image/*"
                             onChange={handleImageUpload}
                             disabled={submitting}
                             className="hidden"
                             id="edit-raffle-image"
                           />
                           <Label
                             htmlFor="edit-raffle-image"
                             className="cursor-pointer flex items-center gap-2 px-4 py-2 border border-input rounded-md hover:bg-accent hover:text-accent-foreground transition-colors"
                           >
                             <Camera className="w-4 h-4" />
                             {imagePreview ? 'Alterar Imagem' : 'Selecionar Nova Imagem'}
                           </Label>
                         </div>
                       </div>
                     </div>

                    <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={() => setShowEditDialog(false)}
                        disabled={submitting}
                        className="w-full sm:w-auto"
                      >
                        Cancelar
                      </Button>
                      <Button 
                        type="submit" 
                        disabled={submitting} 
                        className="bg-gradient-primary w-full sm:w-auto"
                      >
                        {submitting ? 'Salvando...' : 'Salvar Alterações'}
                      </Button>
                    </div>
                  </form>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Verificação de Status do Negócio */}
        {businessStatusLoading ? (
          <Card className="mb-6">
            <CardContent className="py-8">
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                <span className="ml-3 text-muted-foreground">Verificando status...</span>
              </div>
            </CardContent>
          </Card>
        ) : isBusinessInactive ? (
          <Alert className="mb-6 border-destructive/50 bg-destructive/10">
            <Lock className="h-5 w-5 text-destructive" />
            <AlertDescription className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <p className="font-semibold text-destructive mb-1">Conta Inativa</p>
                <p className="text-sm text-muted-foreground">
                  Seu negócio está inativo. Aguarde a liberação do administrador ou entre em contato com o suporte para ativar sua conta.
                </p>
              </div>
              <Button 
                onClick={() => navigate('/anunciante/suporte')}
                variant="outline"
                className="whitespace-nowrap"
              >
                Contatar Suporte
              </Button>
            </AlertDescription>
          </Alert>
        ) : subscriptionLoading ? (
          <Card className="mb-6">
            <CardContent className="py-8">
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                <span className="ml-3 text-muted-foreground">Verificando plano...</span>
              </div>
            </CardContent>
          </Card>
        ) : !hasActiveSubscription ? (
          <Alert className="mb-6 border-yellow-500/50 bg-yellow-500/10">
            <Lock className="h-5 w-5 text-yellow-600" />
            <AlertDescription className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <p className="font-semibold text-yellow-600 mb-1">Plano Necessário</p>
                <p className="text-sm text-muted-foreground">
                  Para criar e gerenciar sorteios, você precisa assinar um plano. Escolha o plano ideal para seu negócio.
                </p>
              </div>
              <Button 
                onClick={() => navigate('/anunciante/planos')}
                className="bg-gradient-primary whitespace-nowrap"
              >
                <CreditCard className="w-4 h-4 mr-2" />
                Ver Planos
              </Button>
            </AlertDescription>
          </Alert>
        ) : (
          <div className="mb-4">
            <Badge variant="default" className="bg-green-600">
              <CheckCircle className="w-3 h-3 mr-1" />
              {planName}
            </Badge>
          </div>
        )}

        {/* Estatísticas */}
        <div className="grid grid-cols-2 gap-4 mb-8 sm:grid-cols-4">
          <Card className="border-0 shadow-card">
            <CardContent className="p-4 text-center">
              <Gift className="w-6 h-6 text-primary mx-auto mb-2" />
              <div className="text-2xl font-bold">{raffles.length}</div>
              <div className="text-xs text-muted-foreground">Total Sorteios</div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-card">
            <CardContent className="p-4 text-center">
              <Trophy className="w-6 h-6 text-points mx-auto mb-2" />
              <div className="text-2xl font-bold">{raffles.filter(r => r.is_active).length}</div>
              <div className="text-xs text-muted-foreground">Ativos</div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-card">
            <CardContent className="p-4 text-center">
              <Users className="w-6 h-6 text-secondary mx-auto mb-2" />
              <div className="text-2xl font-bold">
                {raffles.reduce((sum, r) => sum + (r.current_participants || 0), 0)}
              </div>
              <div className="text-xs text-muted-foreground">Participantes</div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-card">
            <CardContent className="p-4 text-center">
              <Shuffle className="w-6 h-6 text-success mx-auto mb-2" />
              <div className="text-2xl font-bold">{raffles.filter(r => r.winner_id).length}</div>
              <div className="text-xs text-muted-foreground">Finalizados</div>
            </CardContent>
          </Card>
        </div>

        {/* Lista de Sorteios */}
        {loading ? (
          <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i} className="border-0 shadow-card animate-pulse">
                <div className="h-40 sm:h-48 bg-muted rounded-t-lg"></div>
                <CardContent className="p-3 sm:p-4">
                  <div className="h-4 bg-muted rounded mb-2"></div>
                  <div className="h-4 bg-muted rounded w-2/3"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : raffles.length === 0 ? (
          <Card className="border-0 shadow-card">
            <CardContent className="p-8 sm:p-12 text-center">
              <Gift className="w-10 h-10 sm:w-12 sm:h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Nenhum sorteio criado</h3>
              <p className="text-sm sm:text-base text-muted-foreground mb-4">
                Crie seu primeiro sorteio para engajar seus clientes e aumentar a fidelização.
              </p>
              <Button 
                onClick={() => setShowCreateDialog(true)} 
                className="bg-gradient-primary w-full sm:w-auto" 
                disabled={businessLoading || !businessId}
              >
                <PlusCircle className="w-4 h-4 mr-2" />
                Criar Primeiro Sorteio
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {raffles.map((raffle) => (
              <Card 
                key={raffle.id} 
                className="border-0 shadow-card hover:shadow-glow transition-all duration-300 cursor-pointer" 
                onClick={(e) => {
                  console.log('Card clicado:', raffle.id);
                  setShowDrawEngine(raffle.id);
                }}
              >
                <div className="relative">
                  {raffle.image_url ? (
                    <img 
                      src={raffle.image_url} 
                      alt={raffle.title} 
                      className="w-full h-40 sm:h-48 object-cover rounded-t-lg" 
                    />
                  ) : (
                    <div className="w-full h-40 sm:h-48 bg-gradient-points rounded-t-lg flex items-center justify-center">
                      <Gift className="w-10 h-10 sm:w-12 sm:h-12 text-white" />
                    </div>
                  )}
                  <div className="absolute top-2 left-2">
                    {getStatusBadge(raffle)}
                  </div>
                </div>

                <CardContent className="p-3 sm:p-4">
                  <h3 className="font-semibold text-sm sm:text-base mb-2 line-clamp-2">
                    {raffle.title}
                  </h3>
                  <p className="text-xs sm:text-sm text-muted-foreground mb-3 line-clamp-2">
                    {raffle.description}
                  </p>

                  <div className="space-y-1 sm:space-y-2 mb-3 sm:mb-4">
                    <div className="flex justify-between text-xs sm:text-sm">
                      <span className="text-muted-foreground">Prêmio:</span>
                      <span className="font-medium truncate ml-2">{raffle.prize}</span>
                    </div>
                    <div className="flex justify-between text-xs sm:text-sm">
                      <span className="text-muted-foreground">Custo:</span>
                      <span className="font-medium">{raffle.entry_cost} pontos</span>
                    </div>
                    <div className="flex justify-between text-xs sm:text-sm">
                      <span className="text-muted-foreground">Participantes:</span>
                      <span className="font-medium">
                        {raffle.current_participants}
                        {raffle.max_participants ? `/${raffle.max_participants}` : ''}
                      </span>
                    </div>
                    {!isImmediateRaffle(raffle.end_date) && (
                      <div className="flex justify-between text-xs sm:text-sm">
                        <span className="text-muted-foreground">Encerra em:</span>
                        <span className="font-medium text-xs">
                          {new Date(raffle.end_date).toLocaleDateString('pt-BR', {
                            day: '2-digit',
                            month: '2-digit',
                            year: '2-digit'
                          })}
                        </span>
                      </div>
                    )}
                    {isImmediateRaffle(raffle.end_date) && (
                      <div className="flex justify-between text-xs sm:text-sm">
                        <span className="text-muted-foreground">Tipo:</span>
                        <span className="font-medium text-xs flex items-center gap-1 text-primary">
                          <Zap className="w-3 h-3" />
                          Sorteio Imediato
                        </span>
                      </div>
                    )}
                  </div>

                   <div className="space-y-2" onClick={(e) => e.stopPropagation()}>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 text-xs sm:text-sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowParticipants(raffle.id);
                          }}
                        >
                          <Eye className="w-3 h-3 mr-1" />
                          Participantes ({raffle.current_participants})
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-xs sm:text-sm bg-gradient-to-r from-primary/10 to-accent/10 hover:from-primary/20 hover:to-accent/20"
                          onClick={(e) => {
                            e.stopPropagation();
                            setArtRaffle(raffle);
                          }}
                          title="Gerar arte do sorteio"
                        >
                          <Sparkles className="w-3 h-3 mr-1" />
                          Gerar Arte
                        </Button>
                      </div>

                     {/* Action Buttons */}
                     {!raffle.winner_id && (
                       <div className="flex gap-2">
                         <Button
                           variant="outline"
                           size="sm"
                           onClick={(e) => {
                             e.stopPropagation();
                             handleEditRaffle(raffle);
                           }}
                           disabled={false}
                           className="flex-1 text-xs sm:text-sm"
                         >
                            <Edit className="w-3 h-3 mr-1" />
                            {isRaffleEnded(raffle.end_date) ? 'Reativar' : 'Editar'}
                         </Button>
                         
                         <Button
                           variant="outline"
                           size="sm"
                          onClick={async (e) => {
                            e.stopPropagation();
                            if (!businessId) return;
                            try {
                              const data = await createRaffleViaEdgeFunction({
                                business_id: businessId,
                                title: `${raffle.title} (cópia)`,
                                description: raffle.description,
                                prize: raffle.prize,
                                entry_cost: raffle.entry_cost,
                                end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
                                max_participants: raffle.max_participants,
                                image_url: raffle.image_url,
                                auto_participation: false,
                                participation_rules: { checkin: false, purchase: false, follow_business: false, offer_interaction: false },
                              });
                              if (!data) throw new Error('Erro ao duplicar sorteio');
                              toast.success('Sorteio duplicado com sucesso!');
                              await loadRaffles(businessId);
                            } catch (err: any) {
                              console.error('Erro ao duplicar sorteio:', err);
                              toast.error(err?.message || 'Erro ao duplicar sorteio');
                            }
                          }}
                           className="px-2"
                           title="Duplicar sorteio"
                         >
                           <Copy className="w-3 h-3" />
                         </Button>
                         
                         <Button 
                           variant="outline" 
                           size="sm" 
                           onClick={(e) => {
                             e.stopPropagation();
                             setDeleteDialog({ open: true, raffle });
                           }}
                           className="px-2 hover:bg-destructive hover:text-destructive-foreground hover:border-destructive"
                         >
                           <Trash2 className="w-3 h-3" />
                         </Button>
                         
                          {canExecuteDraw(raffle) && (
                            <Button
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                setShowDrawEngine(raffle.id);
                              }}
                              className="bg-gradient-primary flex-1 text-xs sm:text-sm"
                            >
                              <Shuffle className="w-3 h-3 mr-1" />
                              Sortear
                           </Button>
                         )}
                       </div>
                     )}
                  </div>

                  {raffle.winner_id && (
                    <div className="mt-3 p-2 bg-success/10 rounded text-center">
                      <Trophy className="w-4 h-4 text-success mx-auto mb-1" />
                      <div className="text-xs text-success font-medium">Sorteio Finalizado</div>
                      <div className="flex gap-2 mt-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-xs border-success text-success hover:bg-success/10 flex-1"
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowDrawEngine(raffle.id);
                          }}
                        >
                          <Eye className="w-3 h-3 mr-1" />
                          Ver Resultado
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                             onClick={async (e) => {
                               e.stopPropagation();
                               if (!businessId) return;
                               try {
                                  const data = await createRaffleViaEdgeFunction({
                                    business_id: businessId,
                                    title: `${raffle.title} (cópia)`,
                                    description: raffle.description,
                                    prize: raffle.prize,
                                    entry_cost: raffle.entry_cost,
                                    end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
                                    max_participants: raffle.max_participants,
                                    image_url: raffle.image_url,
                                    auto_participation: false,
                                    participation_rules: { checkin: false, purchase: false, follow_business: false, offer_interaction: false },
                                 });
                                 if (!data) throw new Error('Erro ao duplicar sorteio');
                                 toast.success('Sorteio duplicado com sucesso!');
                                 await loadRaffles(businessId);
                               } catch (err: any) {
                                 console.error('Erro ao duplicar sorteio:', err);
                                 toast.error(err?.message || 'Erro ao duplicar sorteio');
                               }
                             }}
                          className="px-2"
                          title="Duplicar sorteio"
                        >
                          <Copy className="w-3 h-3" />
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteDialog({ open: true, raffle });
                          }}
                          className="px-2 hover:bg-destructive hover:text-destructive-foreground hover:border-destructive"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
      {/* Advanced Campaign Form Dialog */}
      <Dialog open={showAdvancedForm} onOpenChange={setShowAdvancedForm}>
        <DialogContent className="w-[calc(100%-2rem)] max-w-[95vw] sm:max-w-6xl max-h-[90vh] overflow-y-auto p-3 sm:p-6">
          <DialogHeader>
            <DialogTitle className="text-base sm:text-lg">Criar Campanha Avançada de Sorteio</DialogTitle>
          </DialogHeader>
          <CampaignFormBuilder
            onSave={(config) => {
              console.log('Advanced campaign config:', config);
              // Here you would integrate with your backend to create the advanced campaign
              toast.success('Campanha avançada criada com sucesso!');
              setShowAdvancedForm(false);
              loadRaffles(businessId);
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Draw Engine Dialog - Sistema Transparente de Sorteio */}
      <Dialog 
        open={!!showDrawEngine} 
        onOpenChange={(open) => {
          console.log('🔔 Dialog state changed:', { open, showDrawEngine });
          if (!open) {
            setShowDrawEngine(null);
          }
        }}
      >
        {showDrawEngine && (
          <DialogContent className="w-[calc(100%-2rem)] max-w-[95vw] sm:max-w-6xl h-[90vh] flex flex-col p-0">
            <DialogHeader className="p-3 sm:p-6 pb-2 sm:pb-4 border-b">
              <DialogTitle className="text-base sm:text-lg md:text-xl lg:text-2xl font-bold">
                🎯 Sistema Transparente de Sorteio
              </DialogTitle>
              <DialogDescription className="text-xs sm:text-sm">
                Execução auditável, transparente e com registro completo de todas as ações
              </DialogDescription>
            </DialogHeader>
            <div className="flex-1 overflow-y-auto p-3 sm:p-6 pt-2 sm:pt-4">
              <TransparentRaffleDrawEngine
                raffleId={showDrawEngine}
                raffleName={raffles.find(r => r.id === showDrawEngine)?.title || 'Sorteio'}
                raffleEndDate={raffles.find(r => r.id === showDrawEngine)?.end_date || new Date().toISOString()}
                raffleImage={raffles.find(r => r.id === showDrawEngine)?.image_url || undefined}
                raffleDescription={raffles.find(r => r.id === showDrawEngine)?.description || undefined}
                isImmediate={isImmediateRaffle(raffles.find(r => r.id === showDrawEngine)?.end_date || '')}
                onDrawComplete={(result) => {
                  console.log('✅ Draw completed:', result);
                  toast.success(`🎉 Sorteio finalizado! Ganhador: ${result.winnerName}`);
                  setShowDrawEngine(null);
                  loadRaffles(businessId!);
                }}
              />
            </div>
          </DialogContent>
        )}
      </Dialog>

      {/* Participants Dialog */}
      {showParticipants && (
        <Dialog open={!!showParticipants} onOpenChange={() => setShowParticipants(null)}>
          <DialogContent className="w-[calc(100%-2rem)] max-w-[95vw] sm:max-w-4xl h-[90vh] flex flex-col p-0">
            <DialogHeader className="p-3 sm:p-6 pb-2 sm:pb-4 border-b">
              <DialogTitle className="text-base sm:text-lg">Participantes e Números da Sorte</DialogTitle>
              <DialogDescription className="text-xs sm:text-sm">
                Visualização completa e transparente dos participantes
              </DialogDescription>
            </DialogHeader>
            <div className="flex-1 overflow-y-auto p-3 sm:p-6 pt-2 sm:pt-4">
              <RaffleParticipantsViewer
                raffleId={showParticipants}
                raffleName={raffles.find(r => r.id === showParticipants)?.title || 'Sorteio'}
                isBusinessOwner={true}
                canDeleteParticipants={true}
              />
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Hotsite Dialog */}
      {showHotsite && (
        <Dialog open={!!showHotsite} onOpenChange={() => setShowHotsite(null)}>
          <DialogContent className="w-[calc(100%-2rem)] max-w-[95vw] sm:max-w-7xl max-h-[90vh] overflow-y-auto p-3 sm:p-6">
            <DialogHeader>
              <DialogTitle className="text-base sm:text-lg">Hotsite da Campanha</DialogTitle>
            </DialogHeader>
            <CampaignHotsite
              campaign={{
                id: showHotsite,
                title: 'Sorteio de Exemplo',
                description: 'Descrição do sorteio de exemplo',
                regulation: 'Regulamento completo do sorteio...',
                startDate: new Date().toISOString(),
                endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
                drawDate: new Date(Date.now() + 35 * 24 * 60 * 60 * 1000).toISOString(),
                prizes: [
                  { name: 'Prêmio Principal', description: 'Descrição do prêmio', value: 1000, position: 1 }
                ],
                totalParticipants: 0,
                businessInfo: {
                  name: 'Meu Negócio',
                  logo: '',
                  address: '',
                  phone: '',
                  email: ''
                },
                isActive: true
              }}
              onParticipate={async (formData) => {
                console.log('Participation form:', formData);
                return { 
                  success: true, 
                  message: 'Participação registrada com sucesso!',
                  luckyNumbers: [123, 456, 789]
                };
              }}
              isPreview={true}
            />
          </DialogContent>
        </Dialog>
      )}

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmationDialog
        open={deleteDialog.open}
        onOpenChange={(open) => setDeleteDialog({ ...deleteDialog, open })}
        title="Excluir Sorteio"
        description={`Tem certeza que deseja excluir o sorteio "${deleteDialog.raffle?.title}"? Esta ação não pode ser desfeita e todos os participantes serão removidos.`}
        onConfirm={handleDeleteRaffle}
        isLoading={isDeleting}
      />

      <GenerateRaffleArtModal
        isOpen={!!artRaffle}
        onClose={() => setArtRaffle(null)}
        raffle={artRaffle}
        businessId={businessId || ''}
        businessName={business?.name || ''}
      />
    </div>
  );
};

export default BusinessRaffles;
