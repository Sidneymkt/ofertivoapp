import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { BusinessLogoUpload } from '@/components/BusinessLogoUpload';
import { CoverImageUpload } from '@/components/CoverImageUpload';
import GooglePlacesAutocomplete from '@/components/GooglePlacesAutocomplete';
import CategorySelect from '@/components/CategorySelect';
import SubscriptionPlanSelect from '@/components/SubscriptionPlanSelect';
import { BackButton } from '@/components/BackButton';
import { BusinessBadgeShowcase } from '@/components/BusinessBadgeShowcase';
import { 
  Building2, 
  MapPin, 
  Phone, 
  Mail, 
  Globe, 
  MessageSquare,
  Save,
  ArrowLeft,
  CreditCard,
  Link2,
  Copy,
  Check,
  ExternalLink,
  Lock
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { syncBusinessProfileUpdate } from '@/lib/businessProfileSync';
import { ChangePasswordForm } from '@/components/ChangePasswordForm';

interface BusinessData {
  id: string;
  name: string;
  description: string;
  category: string;
  address: string;
  phone: string;
  whatsapp: string;
  email: string;
  website: string;
  logo_url: string;
  cover_image_url?: string | null;
  latitude: number;
  longitude: number;
  slug?: string;
}

const BusinessProfile = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [business, setBusiness] = useState<BusinessData | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<Partial<BusinessData>>({});
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [selectedPlanId, setSelectedPlanId] = useState<string>('');
  const [selectedPlanName, setSelectedPlanName] = useState<string>('');
  const [referralCode, setReferralCode] = useState<string>('');
  const [slugValue, setSlugValue] = useState<string>('');
  const [slugSaving, setSlugSaving] = useState(false);
  const [slugCopied, setSlugCopied] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/', { replace: true });
    } catch (error) {
      console.error('Erro no logout:', error);
      navigate('/', { replace: true });
    }
  };

  useEffect(() => {
    const fetchBusiness = async () => {
      if (!user) return;
      
      const { data, error } = await supabase
        .from('businesses')
        .select('*')
        .eq('owner_id', user.id)
        .maybeSingle();
      
      if (error && error.code !== 'PGRST116') {
        console.error('[BusinessProfile] Error fetching business:', error);
        toast({
          title: 'Erro ao carregar perfil',
          description: error.message || 'Não foi possível buscar os dados do negócio.',
          variant: 'destructive'
        });
        return;
      }

      if (data) {
        setBusiness(data);
        setFormData(data);
        setSlugValue((data as any)?.slug || '');
        const coverImageUrl = (data as any)?.cover_image_url;
        setCoverUrl(coverImageUrl || null);
      } else {
        // Business não existe, inicializar formulário para criação
        setIsEditing(true);
        setFormData({
          name: '',
          description: '',
          category: '',
          address: '',
          phone: '',
          whatsapp: '',
          email: '',
          website: '',
          logo_url: '',
          latitude: -3.1190275, // Manaus coordinates default
          longitude: -60.0217314
        });
      }
    };

    fetchBusiness();

    // Subscribe to business changes for real-time updates
    if (user) {
      const channel = supabase
        .channel('business-profile-changes')
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'businesses',
            filter: `owner_id=eq.${user.id}`,
          },
          (payload) => {
            console.log('[BusinessProfile] Real-time update received:', payload);
            if (payload.new) {
              const newData = payload.new as any;
              setBusiness(newData);
              setFormData(newData);
              setCoverUrl(newData.cover_image_url || null);
              syncBusinessProfileUpdate({ queryClient, businessId: newData.id, ownerId: user.id });
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user, queryClient, toast]);

  const buildBusinessUpdatePayload = () => ({
    name: String(formData.name || '').trim(),
    description: formData.description || '',
    category: String(formData.category || '').trim(),
    address: String(formData.address || '').trim(),
    latitude: formData.latitude || -3.1190275,
    longitude: formData.longitude || -60.0217314,
    phone: formData.phone || '',
    whatsapp: formData.whatsapp || '',
    email: formData.email || '',
    website: formData.website || '',
    logo_url: formData.logo_url || '',
    cover_image_url: (formData as any).cover_image_url || coverUrl || null,
  });

  const handleSave = async () => {
    if (!user) return;

    // Validações básicas
    if (!formData.name || !formData.category || !formData.address) {
      alert('Preencha os campos obrigatórios: Nome, Categoria e Endereço');
      return;
    }

    // Se é novo negócio, precisa selecionar plano
    if (!business && !selectedPlanId) {
      alert('Por favor, selecione um plano de assinatura');
      return;
    }

    setSaving(true);
    try {
      if (business) {
        // Atualizar business existente
        const updatePayload = buildBusinessUpdatePayload();
        const { data: updatedBusiness, error } = await supabase
          .from('businesses')
          .update(updatePayload as any)
          .eq('id', business.id)
          .eq('owner_id', user.id)
          .select('*')
          .single();

        if (error) throw error;
        setBusiness(updatedBusiness as BusinessData);
        setFormData(updatedBusiness as BusinessData);
        setCoverUrl((updatedBusiness as any).cover_image_url || null);
        syncBusinessProfileUpdate({ queryClient, businessId: updatedBusiness.id, ownerId: user.id });
        toast({ title: 'Perfil atualizado!', description: 'As alterações foram salvas e sincronizadas.' });
        setIsEditing(false);
      } else {
        // Criar novo business
        const businessData = {
          name: formData.name!,
          description: formData.description || '',
          category: formData.category!,
          address: formData.address!,
          latitude: formData.latitude || -3.1190275,
          longitude: formData.longitude || -60.0217314,
          phone: formData.phone || '',
          whatsapp: formData.whatsapp || '',
          email: formData.email || '',
          website: formData.website || '',
          logo_url: formData.logo_url || '',
          cover_image_url: (formData as any).cover_image_url || coverUrl || null,
          owner_id: user.id,
          is_active: true,
          followers_count: 0,
          referred_by: referralCode || null
        };

        const { data: newBusiness, error: businessError } = await supabase
          .from('businesses')
          .insert([businessData])
          .select()
          .single();

        if (businessError) throw businessError;
        
        // Criar subscription pendente
        const subscriptionData = {
          business_id: newBusiness.id,
          plan_id: selectedPlanId,
          status: 'pending',
          payment_status: 'pending',
          current_period_start: new Date().toISOString(),
          current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
        };

        const { error: subError } = await supabase
          .from('business_subscriptions')
          .insert([subscriptionData]);

        if (subError) throw subError;

        setBusiness(newBusiness);
        setFormData(newBusiness);
        setCoverUrl((newBusiness as any).cover_image_url || null);
        syncBusinessProfileUpdate({ queryClient, businessId: newBusiness.id, ownerId: user.id });
        toast({ title: 'Negócio cadastrado!', description: 'Agora você pode assinar seu plano.' });
        setIsEditing(false);

        // Redirecionar para upgrade de plano para finalizar pagamento
        setTimeout(() => {
          navigate('/anunciante/planos');
        }, 1500);
      }
    } catch (error: any) {
      console.error('Error saving business:', error);
      toast({
        title: 'Erro ao salvar perfil',
        description: error.message || 'Verifique os dados e tente novamente.',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  const handleLogoChange = (url: string) => {
    setFormData({ ...formData, logo_url: url });
    if (business) {
      setBusiness({ ...business, logo_url: url });
      syncBusinessProfileUpdate({ queryClient, businessId: business.id, ownerId: user?.id });
    }
  };

  // Mostrar loading apenas se o usuário existe mas ainda não terminou de carregar
  if (user && business === null && formData.name === undefined) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Carregando dados do negócio...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      {/* Header */}
      <header className="border-b bg-card sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link to="/anunciante/dashboard" className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                Ofertivo Business
              </Link>
              <Badge variant="secondary">
                {business ? 'Configurações' : 'Cadastro'}
              </Badge>
            </div>
            <div className="flex items-center gap-3">
              <Link to="/anunciante/dashboard">
                <Button variant="ghost" size="sm" className="text-primary hover:text-primary-dark">
                  <Building2 className="w-4 h-4 mr-2" />
                  Olá, empreendedor
                </Button>
              </Link>
              <Button variant="ghost" size="sm" onClick={handleSignOut}>
                Sair
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Header Actions - Mobile Optimized */}
          <div className="flex flex-col gap-4 mb-8">
            <div className="flex items-start gap-3 sm:gap-4">
              <BackButton to="/anunciante/dashboard" className="flex-shrink-0 mt-1" />
              <div className="flex-1 min-w-0">
                <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold truncate">
                  {business ? 'Perfil do Negócio' : 'Cadastrar Negócio'}
                </h1>
                <p className="text-sm sm:text-base text-muted-foreground mt-1">
                  {business 
                    ? 'Gerencie as informações do seu estabelecimento' 
                    : 'Complete o cadastro do seu negócio para começar a criar ofertas'
                  }
                </p>
              </div>
            </div>

            {/* Action Buttons - Responsive */}
            <div className="flex gap-2 w-full sm:w-auto sm:self-end">
              {isEditing ? (
                <>
                  <Button 
                    onClick={handleSave}
                    disabled={saving}
                    className="bg-gradient-primary flex-1 sm:flex-initial min-w-[120px]"
                    size="default"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    {saving ? 'Salvando...' : 'Salvar'}
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setIsEditing(false);
                      setFormData(business || {});
                      setCoverUrl((business as any)?.cover_image_url || null);
                    }}
                    disabled={saving}
                    className="flex-1 sm:flex-initial min-w-[100px]"
                    size="default"
                  >
                    Cancelar
                  </Button>
                </>
              ) : (
                <Button 
                  onClick={() => setIsEditing(true)} 
                  className="bg-gradient-primary w-full sm:w-auto"
                  size="default"
                >
                  {business ? 'Editar Perfil' : 'Finalizar Cadastro'}
                </Button>
              )}
            </div>
          </div>

          {/* Cover Image and Logo */}
          <div className="relative mb-8">
            {/* Cover Image - higher z-index for hover interactions */}
            <div className="relative z-10">
            <CoverImageUpload
                currentCoverUrl={coverUrl}
                onCoverChange={(url) => {
                  console.log('[BusinessProfile] Cover changed, new URL:', url);
                  setCoverUrl(url);
                  // Update business state immediately
                  if (business) {
                    setBusiness({ ...business, cover_image_url: url } as any);
                    syncBusinessProfileUpdate({ queryClient, businessId: business.id, ownerId: user?.id });
                  }
                  // Update form data
                  setFormData({ ...formData, cover_image_url: url } as any);
                }}
                entityType="business"
                entityId={business?.id}
                disabled={!business}
                showSizeHint={isEditing}
              />
            </div>
            
            {/* Logo positioned over the cover - lower z-index */}
            <div className="absolute -bottom-12 sm:-bottom-16 left-4 sm:left-8 z-20 pointer-events-none">
              <div className="pointer-events-auto">
                <BusinessLogoUpload
                  businessId={business?.id || 'temp'}
                  currentLogoUrl={business?.logo_url || formData.logo_url}
                  onLogoChange={handleLogoChange}
                  disabled={!business}
                  showSizeHint={isEditing}
                />

              </div>
            </div>
          </div>

          {/* Spacing for overlapped logo */}
          <div className="h-12 sm:h-16" />

          {/* Business Profile Card */}
          <Card className="border-0 shadow-card mb-8">
            <CardContent className="p-8">
              <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Nome do Negócio <span className="text-red-500">*</span></Label>
                      <Input
                        id="name"
                        value={formData.name || ''}
                        onChange={(e) => setFormData({...formData, name: e.target.value})}
                        disabled={!isEditing}
                        required
                      />
                    </div>
                    <CategorySelect
                      value={formData.category || ''}
                      onValueChange={(value) => setFormData({...formData, category: value})}
                      disabled={!isEditing}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Descrição</Label>
                    <Textarea
                      id="description"
                      value={formData.description || ''}
                      onChange={(e) => setFormData({...formData, description: e.target.value})}
                      disabled={!isEditing}
                      rows={3}
                      placeholder="Descreva seu negócio, produtos e serviços..."
                    />
                  </div>

                  <GooglePlacesAutocomplete
                    value={formData.address || ''}
                    onChange={(address, coordinates) => {
                      setFormData({
                        ...formData, 
                        address,
                        latitude: coordinates?.lat || formData.latitude || -3.1190275,
                        longitude: coordinates?.lng || formData.longitude || -60.0217314
                      });
                    }}
                    disabled={!isEditing}
                    required
                  />

                  {/* Segurança */}
                  <div className="pt-6 border-t">
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <Lock className="w-5 h-5 text-primary" />
                      Segurança
                    </h3>
                    <div className="max-w-md">
                      <ChangePasswordForm />
                    </div>
                  </div>
                </div>
            </CardContent>
          </Card>

          {/* Contact Information */}
          <Card className="border-0 shadow-card mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Phone className="w-5 h-5" />
                Informações de Contato
              </CardTitle>
              <CardDescription>
                Mantenha seus dados de contato atualizados para facilitar a comunicação com clientes.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">Telefone</Label>
                  <Input
                    id="phone"
                    value={formData.phone || ''}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    disabled={!isEditing}
                    placeholder="(92) 3000-0000"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="whatsapp">WhatsApp</Label>
                  <Input
                    id="whatsapp"
                    value={formData.whatsapp || ''}
                    onChange={(e) => setFormData({...formData, whatsapp: e.target.value})}
                    disabled={!isEditing}
                    placeholder="(92) 99999-9999"
                  />
                </div>
              </div>

              {/* Referral Section */}
              {!business && isEditing && (
                <div className="space-y-2">
                  <Label htmlFor="referral_code">Código de Indicação (Opcional)</Label>
                  <Input
                    id="referral_code"
                    value={referralCode}
                    onChange={(e) => setReferralCode(e.target.value)}
                    disabled={!isEditing}
                    placeholder="Código do usuário que indicou seu negócio"
                  />
                  <p className="text-xs text-muted-foreground">
                    Se alguém indicou seu negócio, coloque o código aqui para que a pessoa ganhe comissão.
                  </p>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email">E-mail</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email || ''}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    disabled={!isEditing}
                    placeholder="contato@seunegocio.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="website">Website</Label>
                  <Input
                    id="website"
                    value={formData.website || ''}
                    onChange={(e) => setFormData({...formData, website: e.target.value})}
                    disabled={!isEditing}
                    placeholder="https://www.seunegocio.com"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Hotsite Link Personalizado */}
          {business && (
            <Card className="border-0 shadow-card mb-8">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Link2 className="w-5 h-5" />
                  Link Personalizado (Hotsite)
                </CardTitle>
                <CardDescription>
                  Compartilhe seu link personalizado nas redes sociais, cartões de visita e materiais de divulgação.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="slug">Seu link personalizado</Label>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center bg-muted rounded-md px-3 py-2 text-sm text-muted-foreground whitespace-nowrap">
                      ofertivoapp.com/loja/
                    </div>
                    <Input
                      id="slug"
                      value={slugValue}
                      onChange={(e) => setSlugValue(
                        e.target.value.toLowerCase()
                          .replace(/[^a-z0-9-]/g, '-')
                          .replace(/-+/g, '-')
                          .replace(/^-|-$/g, '')
                      )}
                      placeholder="meu-negocio"
                      className="flex-1"
                    />
                    <Button
                      size="sm"
                      disabled={slugSaving || !slugValue}
                      onClick={async () => {
                        setSlugSaving(true);
                        const { error } = await supabase
                          .from('businesses')
                          .update({ slug: slugValue } as any)
                          .eq('id', business.id)
                          .eq('owner_id', user?.id);
                        setSlugSaving(false);
                        if (error) {
                          toast({
                            title: 'Erro',
                            description: error.message.includes('unique') 
                              ? 'Este link já está em uso. Tente outro.' 
                              : 'Erro ao salvar link.',
                            variant: 'destructive'
                          });
                        } else {
                          const updatedBusiness = { ...business, slug: slugValue } as any;
                          setBusiness(updatedBusiness);
                          setFormData({ ...formData, slug: slugValue } as any);
                          syncBusinessProfileUpdate({ queryClient, businessId: business.id, ownerId: user?.id });
                          toast({ title: 'Link salvo!', description: 'Seu hotsite está pronto para divulgação.' });
                        }
                      }}
                    >
                      <Save className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {slugValue && (
                  <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
                    <span className="text-sm font-medium truncate flex-1">
                      https://ofertivoapp.com/loja/{slugValue}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        navigator.clipboard.writeText(`https://ofertivoapp.com/loja/${slugValue}`);
                        setSlugCopied(true);
                        setTimeout(() => setSlugCopied(false), 2000);
                        toast({ title: 'Link copiado!' });
                      }}
                    >
                      {slugCopied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => window.open(`/loja/${slugValue}`, '_blank')}
                    >
                      <ExternalLink className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {!business && isEditing && (
            <Card className="border-0 shadow-card mb-8">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="w-5 h-5" />
                  Plano de Assinatura
                </CardTitle>
                <CardDescription>
                  Escolha o plano que melhor se adapta às necessidades do seu negócio. Você finalizará o pagamento após concluir o cadastro.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <SubscriptionPlanSelect
                  selectedPlanId={selectedPlanId}
                  onPlanSelect={(planId, planName) => {
                    setSelectedPlanId(planId);
                    setSelectedPlanName(planName);
                  }}
                  disabled={!isEditing}
                />
                {selectedPlanId && (
                  <div className="mt-4 p-4 bg-primary/10 rounded-lg">
                    <p className="text-sm text-primary font-medium">
                      ✓ Plano {selectedPlanName} selecionado. Complete o cadastro para finalizar o pagamento.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          
          {/* Business Achievements */}
          {business && (
            <div className="mt-8">
              <BusinessBadgeShowcase 
                businessId={business.id} 
                showProgress={true}
                className="mb-6"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BusinessProfile;
