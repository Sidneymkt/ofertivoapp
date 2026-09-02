import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/hooks/useAuth';
import { useSubscriptionStatus } from '@/hooks/useSubscriptionStatus';
import { useBusinessStatus } from '@/hooks/useBusinessStatus';
import { usePlanLimits } from '@/hooks/usePlanLimits';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { InterestSelect } from '@/components/InterestSelect';
import GooglePlacesAutocomplete from '@/components/GooglePlacesAutocomplete';
import { useInterests } from '@/hooks/useInterests';
import { 
  Upload, 
  ArrowLeft, 
  Wand2, 
  Calendar,
  MapPin,
  DollarSign,
  X,
  Image as ImageIcon,
  Zap,
  Users,
  CheckCircle,
  Package,
  Lock,
  CreditCard,
  Sparkles,
  Loader2,
  Save,
  Plus,
  Truck,
  Calculator
} from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { DraggableImageGrid } from '@/components/DraggableImageGrid';
import { geminiService } from '@/lib/gemini';
import { OFFER_TYPES } from '@/lib/offerTypes';
import PointsSimulator from '@/components/business/PointsSimulator';
import CheckinPrizesEditor from '@/components/business/CheckinPrizesEditor';

import { useBusinessWallet } from '@/hooks/useBusinessWallet';
import CoverageRadiusSelector from '@/components/business/CoverageRadiusSelector';
import { getMinValidUntil, getMaxValidUntil, clampValidUntil, isValidUntilWithinLimit, MAX_OFFER_DAYS, FLASH_HOUR_PRESETS, FLASH_MAX_HOURS, hoursToValidUntil } from '@/lib/offerValidity';


const CreateOffer = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { hasActiveSubscription, planName, loading: subscriptionLoading } = useSubscriptionStatus();
  const { isActive: isBusinessActive, isInactive: isBusinessInactive, loading: businessStatusLoading } = useBusinessStatus();
  const { canCreateOffer, currentOffers, maxOffers, offersRemaining, loading: limitsLoading } = usePlanLimits();
  const { wallet, hasBalance, isLoading: walletLoading } = useBusinessWallet();
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [businessCoords, setBusinessCoords] = useState<{ lat: number; lng: number } | null>(null);

const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    originalPrice: '',
    discountedPrice: '',
    validUntil: '',
    maxUses: '',
    businessName: '',
    address: '',
    latitude: null as number | null,
    longitude: null as number | null,
    productOrService: '',
    promoType: '',
    productCondition: '',
    interests: [] as string[],
    checkinPoints: '50',
    checkinPrizes: [] as any[],
    isDelivery: false, // Modo delivery - permite validação no local do cliente
    coverageRadius: 5, // Raio de abrangência em km
    // Campos condicionais
    flashDuration: '',
    firstUseBonus: '',
    comboItems: '',
    comboDiscount: '',
    minPurchaseValue: '' // Valor mínimo para tipo "Compras acima de valor"
  });

  // Buscar coordenadas do negócio ao carregar
  useEffect(() => {
    const fetchBusinessCoords = async () => {
      if (!user) return;
      try {
        const { data: business } = await supabase
          .from('businesses')
          .select('latitude, longitude, name')
          .eq('owner_id', user.id)
          .maybeSingle();
        
        if (business?.latitude && business?.longitude) {
          setBusinessCoords({
            lat: Number(business.latitude),
            lng: Number(business.longitude)
          });
          // Preencher nome do negócio se não preenchido
          if (business.name && !formData.businessName) {
            setFormData(prev => ({ ...prev, businessName: business.name }));
          }
        }
      } catch (error) {
        console.error('Erro ao buscar coordenadas do negócio:', error);
      }
    };
    fetchBusinessCoords();
  }, [user]);

  // Preencher formulário com dados da campanha criada pela IA
  useEffect(() => {
    const prefilled = location.state?.prefilled;
    if (prefilled) {
      setFormData(prev => ({
        ...prev,
        title: prefilled.title || prev.title,
        description: prefilled.description || prev.description,
        promoType: prefilled.offerType || prev.promoType,
        category: prefilled.category || prev.category,
        originalPrice: prefilled.originalPrice?.toString() || prev.originalPrice,
        discountedPrice: prefilled.discountedPrice?.toString() || prev.discountedPrice,
        checkinPoints: prefilled.checkinPoints?.toString() || prev.checkinPoints,
        maxUses: prefilled.maxUses?.toString() || prev.maxUses,
        isDelivery: prefilled.isDelivery ?? prev.isDelivery,
      }));
      
      const msg = prefilled.isDuplicate 
        ? '📋 Oferta duplicada! Ajuste os dados e salve.' 
        : '✨ Formulário preenchido com dados da campanha IA!';
      toast.success(msg);
    }
  }, [location.state]);

  const handleInputChange = (field: string, value: string | number | string[] | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length + imageFiles.length > 4) {
      toast.error('Máximo de 4 imagens permitidas');
      return;
    }

    const newFiles = [...imageFiles, ...files].slice(0, 4);
    setImageFiles(newFiles);

    // Generate previews
    const newPreviews = [...imagePreviews];
    files.forEach((file, index) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        newPreviews[imageFiles.length + index] = e.target?.result as string;
        setImagePreviews([...newPreviews]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (index: number) => {
    const newFiles = imageFiles.filter((_, i) => i !== index);
    const newPreviews = imagePreviews.filter((_, i) => i !== index);
    setImageFiles(newFiles);
    setImagePreviews(newPreviews);
  };

  // Oferta relâmpago: duração em horas define automaticamente a validade
  const applyFlashDuration = (value: string) => {
    const raw = value === '' ? '' : String(Math.min(Math.max(Number(value) || 0, 0), FLASH_MAX_HOURS));
    setFormData(prev => ({
      ...prev,
      flashDuration: raw,
      validUntil: raw ? hoursToValidUntil(raw) : prev.validUntil,
    }));
  };



  const generateCompleteOfferWithAI = async () => {
    if (!formData.businessName || !formData.productOrService) {
      toast.error('Preencha ao menos o Nome do Negócio e o Produto/Serviço');
      return;
    }

    setIsGeneratingAI(true);
    try {
      const payload = {
        businessName: formData.businessName,
        productOrService: formData.productOrService,
        category: formData.category || null,
        originalPrice: formData.originalPrice ? parseFloat(formData.originalPrice) : null,
        interests: formData.interests.join(', ') || null
      };

      console.log('Gerando oferta completa com IA...', payload);

      const { data, error } = await supabase.functions.invoke('generate-offer-ai', {
        body: payload
      });

      if (error) {
        console.error('Erro na função:', error);
        throw new Error(error.message || 'Erro ao gerar oferta com IA');
      }

      if (!data) {
        throw new Error('Nenhum dado retornado da IA');
      }

      console.log('Oferta gerada:', data);

      // Preencher formulário com dados da IA
      setFormData(prev => ({
        ...prev,
        title: data.title || prev.title,
        description: data.description || prev.description,
        promoType: data.offerType || prev.promoType,
        originalPrice: data.originalPrice?.toString() || prev.originalPrice,
        discountedPrice: data.discountedPrice?.toString() || prev.discountedPrice,
      }));

      toast.success('✨ Oferta criada com IA! Revise e ajuste se necessário.');
      
      if (data.tips) {
        setTimeout(() => {
          toast.info(`💡 Dica: ${data.tips}`);
        }, 1000);
      }

    } catch (error: any) {
      console.error('Erro ao gerar oferta completa:', error);
      toast.error(error.message || 'Erro ao gerar oferta com IA. Tente novamente.');
    } finally {
      setIsGeneratingAI(false);
    }
  };

  const generateWithAI = async (type: 'title' | 'description' | 'aida') => {
    if (!formData.businessName || !formData.productOrService || !formData.originalPrice || !formData.discountedPrice) {
      toast.error('Preencha os campos básicos antes de gerar com IA');
      return;
    }

    setIsGenerating(true);
    try {
      const input = {
        businessName: formData.businessName,
        category: formData.category,
        originalPrice: parseFloat(formData.originalPrice),
        discountedPrice: parseFloat(formData.discountedPrice),
        productOrService: formData.productOrService,
        targetAudience: formData.interests.join(', ')
      };

      let generated = '';
      
      if (type === 'title') {
        generated = await geminiService.generateOfferTitle(input);
        handleInputChange('title', generated);
        toast.success('✨ Título gerado com IA!');
      } else if (type === 'aida') {
        generated = await geminiService.generateAIDADescription(input);
        handleInputChange('description', generated);
        toast.success('🎯 Descrição AIDA gerada com sucesso!');
      } else {
        generated = await geminiService.generateOfferDescription(input);
        handleInputChange('description', generated);
        toast.success('✨ Descrição gerada com IA!');
      }
    } catch (error) {
      console.error('Erro ao gerar com IA:', error);
      toast.error('Erro ao gerar conteúdo com IA');
    } finally {
      setIsGenerating(false);
    }
  };

  const reorderImages = (newOrder: string[]) => {
    setImagePreviews(newOrder);
    // Reordenar os arquivos correspondentes
    const newFiles: File[] = [];
    newOrder.forEach((preview) => {
      const index = imagePreviews.indexOf(preview);
      if (index !== -1 && imageFiles[index]) {
        newFiles.push(imageFiles[index]);
      }
    });
    setImageFiles(newFiles);
    toast.success('Ordem das imagens atualizada');
  };

  const uploadImages = async (files: File[]): Promise<string[]> => {
    const { compressForOffer } = await import('@/lib/imageCompression');
    // A policy do bucket exige que o arquivo fique dentro da pasta do próprio usuário.
    let { data: authData } = await supabase.auth.getUser();
    let uid = authData?.user?.id;
    if (!uid) {
      // Tenta renovar a sessão antes de falhar
      const { data: refreshed } = await supabase.auth.refreshSession();
      uid = refreshed?.user?.id;
    }
    if (!uid) {
      throw new Error('Sessão expirada. Faça login novamente.');
    }

    const uploadOne = async (file: File): Promise<string> => {
      const compressed = await compressForOffer(file);
      const fileExt = (compressed.name.split('.').pop() || 'jpg').toLowerCase();
      const filePath = `${uid}/${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`;

      let { error: uploadError } = await supabase.storage
        .from('offer-images')
        .upload(filePath, compressed, { contentType: compressed.type || 'image/jpeg' });

      if (uploadError) {
        // Uma tentativa extra após renovar o token (JWT expirado durante o preenchimento)
        await supabase.auth.refreshSession();
        const retry = await supabase.storage
          .from('offer-images')
          .upload(`${uid}/${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`, compressed, {
            contentType: compressed.type || 'image/jpeg',
          });
        uploadError = retry.error;
        if (!uploadError) {
          const { data } = supabase.storage.from('offer-images').getPublicUrl(retry.data!.path);
          return data.publicUrl;
        }
      }

      if (uploadError) {
        console.error('Error uploading image:', uploadError);
        throw new Error(uploadError.message || 'Falha no upload da imagem');
      }

      const { data: { publicUrl } } = supabase.storage
        .from('offer-images')
        .getPublicUrl(filePath);

      return publicUrl;
    };

    // Sequencial: evita rajadas simultâneas que estouram limites do storage
    const urls: string[] = [];
    for (const file of files) {
      urls.push(await uploadOne(file));
    }
    return urls;
  };


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validações básicas
    if (!user) {
      toast.error('Faça login para criar ofertas');
      return;
    }

    // Verificar limite de ofertas do plano
    if (!canCreateOffer) {
      const limitText = maxOffers !== null ? `${maxOffers} ofertas ativas` : 'ofertas';
      toast.error(`Você atingiu o limite de ${limitText} do seu plano. Faça upgrade para criar mais ofertas.`);
      return;
    }

    if (!formData.title.trim()) {
      toast.error('Título é obrigatório');
      return;
    }

    if (!formData.category) {
      toast.error('Categoria é obrigatória');
      return;
    }

    if (!formData.originalPrice || !formData.discountedPrice) {
      toast.error('Preços são obrigatórios');
      return;
    }

    let effectiveValidUntil = formData.validUntil;

    if (formData.promoType === 'flash') {
      const hrs = Number(formData.flashDuration);
      if (!hrs || hrs <= 0 || hrs > FLASH_MAX_HOURS) {
        toast.error(`Informe a duração da oferta relâmpago em horas (1 a ${FLASH_MAX_HOURS}h)`);
        return;
      }
      effectiveValidUntil = hoursToValidUntil(hrs);
      setFormData(prev => ({ ...prev, validUntil: effectiveValidUntil }));
    }

    if (!effectiveValidUntil) {
      toast.error('Data de validade é obrigatória');
      return;
    }



    if (!isValidUntilWithinLimit(effectiveValidUntil)) {
      toast.error(`A validade da oferta não pode ultrapassar ${MAX_OFFER_DAYS} dias (1 mês)`);
      return;
    }


    if (parseFloat(formData.discountedPrice) >= parseFloat(formData.originalPrice)) {
      toast.error('Preço com desconto deve ser menor que o preço original');
      return;
    }

    // Validação específica para tipo "Compras acima de valor"
    if (formData.promoType === 'min-purchase' && (!formData.minPurchaseValue || parseFloat(formData.minPurchaseValue) <= 0)) {
      toast.error('Informe o valor mínimo de compra para este tipo de promoção');
      return;
    }

    setIsLoading(true);
    try {
      // Primeiro, buscar o business do usuário
      const { data: business, error: businessError } = await supabase
        .from('businesses')
        .select('id, latitude, longitude')
        .eq('owner_id', user.id)
        .maybeSingle();

      if (businessError) {
        console.error('Erro ao buscar negócio:', businessError);
        throw new Error('Erro ao buscar dados do negócio');
      }

      if (!business) {
        toast.error('Finalize o cadastro do seu negócio para criar ofertas.');
        // Armazenar intenção de criar oferta para retornar depois
        sessionStorage.setItem('pendingOfferCreation', 'true');
        navigate('/anunciante/perfil');
        setIsLoading(false);
        return;
      }

      // Upload das imagens se houver
      let imageUrls: string[] = [];
      if (imageFiles.length > 0) {
        toast.info('Fazendo upload das imagens...');
        try {
          imageUrls = await uploadImages(imageFiles);
        } catch (uploadErr: any) {
          toast.error(`Erro ao fazer upload das imagens: ${uploadErr?.message || 'tente novamente'}`);
          setIsLoading(false);
          return;
        }
        if (imageUrls.length === 0) {
          toast.error('Erro ao fazer upload das imagens');
          setIsLoading(false);
          return;
        }
      }


      // Calcular desconto
      const originalPrice = parseFloat(formData.originalPrice);
      const discountedPrice = parseFloat(formData.discountedPrice);
      const discountPercentage = Math.round(((originalPrice - discountedPrice) / originalPrice) * 100);

      // Usar coordenadas da oferta (se fornecidas), do negócio ou padrão de Manaus
      const latitude = formData.latitude || business.latitude || -3.1190275;
      const longitude = formData.longitude || business.longitude || -60.0217314;

      const offerData = {
        title: formData.title.trim(),
        description: formData.description?.trim() || null,
        category: formData.category,
        original_price: originalPrice,
        discounted_price: discountedPrice,
        valid_until: new Date(effectiveValidUntil).toISOString(),
        max_uses: formData.maxUses ? parseInt(formData.maxUses) : null,
        image_url: imageUrls[0] || null, // Primeira imagem para compatibilidade
        image_urls: imageUrls, // Array completo de imagens
        checkin_points: parseInt(formData.checkinPoints) || 50,
        // Novos campos do sistema de pontos promocionais
        points_per_action: parseInt(formData.checkinPoints) || 50,
        max_actions: formData.maxUses ? parseInt(formData.maxUses) : null,
        latitude,
        longitude,
        business_id: business.id,
        is_active: true,
        is_delivery: formData.isDelivery, // Modo delivery
        offer_type: formData.promoType || 'flash', // Salvar tipo de promoção
        targeting_data: {
          product_condition: formData.productCondition || null,
          interests: formData.interests || [],
          coverage_radius_km: formData.coverageRadius || 5,
          min_purchase_value: formData.promoType === 'min-purchase' && formData.minPurchaseValue 
            ? parseFloat(formData.minPurchaseValue) 
            : null,
          checkin_prizes: formData.promoType === 'checkin' && formData.checkinPrizes.length > 0
            ? formData.checkinPrizes
            : null
        }
      };

      console.log('Dados da oferta:', offerData);

      // Inserir a oferta no banco de dados
      const { data: insertedOffer, error: insertError } = await supabase
        .from('offers')
        .insert([offerData])
        .select()
        .single();

      if (insertError) {
        console.error('Erro ao inserir oferta:', insertError);
        throw new Error(insertError.message || 'Erro ao criar oferta');
      }

      console.log('Oferta criada:', insertedOffer);

      // Associar interesses à oferta (usa tabela relacional offer_interests)
      if (insertedOffer && formData.interests.length > 0) {
        try {
          await supabase.rpc('set_offer_interests', {
            p_offer_id: insertedOffer.id,
            p_interests: formData.interests
          });
          console.log('Interesses associados à oferta:', formData.interests);
        } catch (interestsError) {
          console.warn('Erro ao associar interesses:', interestsError);
          // Não falha a criação da oferta por erro de interesses
        }
      }

      // Registrar evento de analytics (opcional - não bloqueia se falhar)
      try {
        if (insertedOffer) {
          await supabase
            .from('business_analytics')
            .insert({
              business_id: business.id,
              offer_id: insertedOffer.id,
              event_type: 'offer_created',
              metadata: {
                category: formData.category,
                promo_type: formData.promoType || 'standard',
                discount_percentage: discountPercentage,
                has_images: imageUrls.length > 0,
                interests: formData.interests
              }
            });
        }
      } catch (analyticsError) {
        console.warn('Erro ao registrar analytics:', analyticsError);
        // Não falha a criação da oferta por erro de analytics
      }

      toast.success('Oferta criada com sucesso!');
      
      // Limpar formulário
      setFormData({
        title: '',
        description: '',
        category: '',
        originalPrice: '',
        discountedPrice: '',
        validUntil: '',
        maxUses: '',
        businessName: '',
        address: '',
        latitude: null,
        longitude: null,
        productOrService: '',
        promoType: '',
        productCondition: '',
        interests: [],
        checkinPoints: '50',
        checkinPrizes: [],
        isDelivery: false,
        coverageRadius: 5,
        flashDuration: '',
        firstUseBonus: '',
        comboItems: '',
        comboDiscount: '',
        minPurchaseValue: ''
      });
      setImageFiles([]);
      setImagePreviews([]);
      
      // Navegar para dashboard
      navigate('/anunciante/dashboard');
    } catch (error: any) {
      console.error('Error creating offer:', error);
      toast.error(error.message || 'Erro ao criar oferta');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      {/* Header */}
      <header className="border-b bg-card/95 backdrop-blur-sm sticky top-0 z-50 shadow-sm">
        <div className="container mx-auto px-3 sm:px-4 py-3 sm:py-4">
          <div className="flex items-center justify-between flex-wrap gap-3 sm:gap-4">
            <div className="flex items-center gap-2 sm:gap-4">
              <Link 
                to="/anunciante/dashboard" 
                className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-2 rounded-lg hover:bg-muted transition-colors font-medium"
              >
                <ArrowLeft className="w-4 h-4" />
                <span className="hidden sm:inline">Voltar</span>
              </Link>
              <div className="h-6 w-px bg-border hidden sm:block" />
              <h1 className="text-lg sm:text-xl font-semibold">Nova Oferta</h1>
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              <Button
                type="button"
                onClick={generateCompleteOfferWithAI}
                disabled={isGeneratingAI || !formData.businessName || !formData.productOrService}
                className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white shadow-lg text-xs sm:text-sm"
                size="sm"
              >
                {isGeneratingAI ? (
                  <>
                    <Loader2 className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2 animate-spin" />
                    <span className="hidden xs:inline">Gerando...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                    <span className="hidden xs:inline">Criar com IA</span>
                    <span className="xs:hidden">IA</span>
                  </>
                )}
              </Button>
              <Badge variant="secondary" className="gap-1.5 hidden md:flex">
                <Sparkles className="w-3 h-3" />
                Powered by IA
              </Badge>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 md:py-8 max-w-6xl">
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
                  Para criar ofertas, você precisa assinar um plano. Escolha o plano ideal para seu negócio.
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
        ) : !canCreateOffer && !limitsLoading ? (
          <Alert className="mb-6 border-orange-500/50 bg-orange-500/10">
            <Lock className="h-5 w-5 text-orange-600" />
            <AlertDescription className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <p className="font-semibold text-orange-600 mb-1">Limite de Ofertas Atingido</p>
                <p className="text-sm text-muted-foreground">
                  Você já possui {currentOffers}/{maxOffers} ofertas ativas no plano {planName}. 
                  Desative ou exclua ofertas antigas, ou faça upgrade do seu plano.
                </p>
              </div>
              <Button 
                onClick={() => navigate('/anunciante/planos')}
                className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 whitespace-nowrap"
              >
                <CreditCard className="w-4 h-4 mr-2" />
                Fazer Upgrade
              </Button>
            </AlertDescription>
          </Alert>
        ) : (
          <div className="mb-4 flex items-center gap-3 flex-wrap">
            <Badge variant="default" className="bg-green-600">
              <CheckCircle className="w-3 h-3 mr-1" />
              {planName}
            </Badge>
            {offersRemaining !== null && (
              <Badge variant="outline" className="border-muted-foreground/50">
                {offersRemaining} {offersRemaining === 1 ? 'oferta disponível' : 'ofertas disponíveis'}
              </Badge>
            )}
            {offersRemaining === null && (
              <Badge variant="outline" className="border-green-500/50 text-green-600">
                Ofertas ilimitadas
              </Badge>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Informações Básicas */}

            <Card className="border-0 shadow-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5" />
                  Informações da Oferta
                </CardTitle>
                <CardDescription>
                  Dados básicos sobre sua promoção
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="businessName">Nome do Negócio</Label>
                  <Input 
                    id="businessName"
                    placeholder="Ex: Pizzaria do Bairro"
                    value={formData.businessName}
                    onChange={(e) => handleInputChange('businessName', e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="productOrService">Produto/Serviço</Label>
                  <Input 
                    id="productOrService"
                    placeholder="Ex: Pizza Margherita, Corte de Cabelo"
                    value={formData.productOrService}
                    onChange={(e) => handleInputChange('productOrService', e.target.value)}
                    required
                  />
                </div>

                 <div className="space-y-2">
                   <Label htmlFor="category">Categoria <span className="text-red-500">*</span></Label>
                   <Select value={formData.category} onValueChange={(value) => handleInputChange('category', value)}>
                     <SelectTrigger className="w-full">
                       <SelectValue placeholder="Selecione a categoria" />
                     </SelectTrigger>
                      <SelectContent 
                        className="bg-background border border-border z-50 max-h-[300px] overflow-y-auto"
                        position="popper"
                        sideOffset={5}
                      >
                        <SelectItem value="alimentacao" className="hover:bg-accent focus:bg-accent cursor-pointer">Alimentação e Bebidas</SelectItem>
                        <SelectItem value="beleza" className="hover:bg-accent focus:bg-accent cursor-pointer">Beleza e Estética</SelectItem>
                        <SelectItem value="roupas" className="hover:bg-accent focus:bg-accent cursor-pointer">Roupas e Acessórios</SelectItem>
                        <SelectItem value="casa" className="hover:bg-accent focus:bg-accent cursor-pointer">Casa e Decoração</SelectItem>
                        <SelectItem value="saude" className="hover:bg-accent focus:bg-accent cursor-pointer">Saúde e Bem-estar</SelectItem>
                        <SelectItem value="educacao" className="hover:bg-accent focus:bg-accent cursor-pointer">Educação e Cursos</SelectItem>
                        <SelectItem value="tecnologia" className="hover:bg-accent focus:bg-accent cursor-pointer">Tecnologia e Eletrônicos</SelectItem>
                        <SelectItem value="automotivo" className="hover:bg-accent focus:bg-accent cursor-pointer">Automotivo</SelectItem>
                        <SelectItem value="pets" className="hover:bg-accent focus:bg-accent cursor-pointer">Pets e Animais</SelectItem>
                        <SelectItem value="esportes" className="hover:bg-accent focus:bg-accent cursor-pointer">Esportes e Fitness</SelectItem>
                        <SelectItem value="viagem" className="hover:bg-accent focus:bg-accent cursor-pointer">Viagem e Turismo</SelectItem>
                        <SelectItem value="entretenimento" className="hover:bg-accent focus:bg-accent cursor-pointer">Entretenimento</SelectItem>
                        <SelectItem value="servicos" className="hover:bg-accent focus:bg-accent cursor-pointer">Serviços Gerais</SelectItem>
                        <SelectItem value="eventos">Eventos e Festas</SelectItem>
                        <SelectItem value="construcao">Construção e Reforma</SelectItem>
                        <SelectItem value="artesanato">Artesanato e Presentes</SelectItem>
                        <SelectItem value="fotografia">Fotografia e Design</SelectItem>
                        <SelectItem value="limpeza">Limpeza e Organização</SelectItem>
                        <SelectItem value="consultoria">Consultoria e Assessoria</SelectItem>
                        <SelectItem value="outros">Outros</SelectItem>
                      </SelectContent>
                   </Select>
                 </div>

                  <div className="space-y-2">
                    <Label htmlFor="promoType">Tipo de Promoção *</Label>
                    <Select value={formData.promoType} onValueChange={(value) => handleInputChange('promoType', value)} required>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Selecione o tipo de promoção" />
                      </SelectTrigger>
                      <SelectContent 
                        className="bg-background border border-border z-50 max-h-[300px] overflow-y-auto"
                        position="popper"
                        sideOffset={5}
                      >
                        {OFFER_TYPES.map((type) => {
                          const Icon = type.icon;
                          return (
                            <SelectItem key={type.value} value={type.value} className="cursor-pointer hover:bg-accent">
                              <div className="flex items-center gap-2">
                                <Icon className="w-4 h-4" />
                                {type.label}
                              </div>
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Campo condicional para Compras Acima de Valor */}
                  {formData.promoType === 'min-purchase' && (
                    <div className="space-y-2 p-4 bg-violet-500/10 rounded-lg border border-violet-500/20">
                      <Label htmlFor="minPurchaseValue" className="flex items-center gap-2">
                        <DollarSign className="w-4 h-4 text-violet-500" />
                        Valor Mínimo da Compra (R$) *
                      </Label>
                      <Input 
                        id="minPurchaseValue"
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="Ex: 100.00"
                        value={formData.minPurchaseValue}
                        onChange={(e) => handleInputChange('minPurchaseValue', e.target.value)}
                        required
                      />
                      <p className="text-xs text-muted-foreground">
                        O desconto será aplicado para compras a partir deste valor
                      </p>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="productCondition">Condição do Produto (opcional)</Label>
                    <Select value={formData.productCondition} onValueChange={(value) => handleInputChange('productCondition', value)}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Selecione a condição" />
                      </SelectTrigger>
                      <SelectContent 
                        className="bg-background border border-border z-50"
                        position="popper"
                        sideOffset={5}
                      >
                        <SelectItem value="novo" className="cursor-pointer hover:bg-accent">
                          <div className="flex items-center gap-2">
                            <Sparkles className="w-4 h-4" />
                            Novo
                          </div>
                        </SelectItem>
                        <SelectItem value="seminovo" className="cursor-pointer hover:bg-accent">
                          <div className="flex items-center gap-2">
                            <Package className="w-4 h-4" />
                            Seminovo
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                 <div className="space-y-2">
                   <Label htmlFor="interests">Interesses do Público (opcional)</Label>
                   <div className="space-y-3">
                     <div className="flex flex-wrap gap-2">
                       {formData.interests.length === 0 ? (
                         <span className="text-sm text-muted-foreground">Nenhum interesse adicionado ainda.</span>
                       ) : (
                         formData.interests.map((tag) => (
                           <div key={tag} className="inline-flex items-center gap-1 rounded-full bg-muted px-3 py-1">
                             <span className="text-sm">{tag}</span>
                             <button
                               type="button"
                               aria-label={`Remover ${tag}`}
                               onClick={() => {
                                 const newInterests = formData.interests.filter((i) => i !== tag);
                                 handleInputChange('interests', newInterests);
                               }}
                               className="text-muted-foreground hover:text-foreground transition"
                             >
                               <X className="w-4 h-4" />
                             </button>
                           </div>
                         ))
                       )}
                     </div>
                     <div className="flex items-center gap-2">
                       <Input
                         id="interest-input"
                         placeholder="Digite um interesse e pressione Enter (ex: pizza, hamburguer, sushi)"
                         onKeyDown={(e) => {
                           if (e.key === 'Enter' || e.key === ',' || e.key === 'Tab') {
                             e.preventDefault();
                             const input = e.currentTarget;
                             const value = input.value.trim();
                             if (value && !formData.interests.includes(value)) {
                               handleInputChange('interests', [...formData.interests, value]);
                               input.value = '';
                             }
                           }
                         }}
                       />
                       <Button 
                         type="button"
                         onClick={(e) => {
                           const input = document.getElementById('interest-input') as HTMLInputElement;
                           if (input) {
                             const value = input.value.trim();
                             if (value && !formData.interests.includes(value)) {
                               handleInputChange('interests', [...formData.interests, value]);
                               input.value = '';
                             }
                           }
                         }}
                       >
                         <Plus className="w-4 h-4 mr-1" />
                         Adicionar
                       </Button>
                     </div>
                     <p className="text-xs text-muted-foreground">
                       Dica: Esses interesses ajudam a segmentar sua oferta para o público certo.
                     </p>
                   </div>
                 </div>

                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                   <div className="space-y-2">
                     <Label htmlFor="originalPrice">Preço Original (R$)</Label>
                     <Input 
                       id="originalPrice"
                       type="number"
                       step="0.01"
                       placeholder="45.00"
                       value={formData.originalPrice}
                       onChange={(e) => handleInputChange('originalPrice', e.target.value)}
                       required
                     />
                   </div>
                   <div className="space-y-2">
                     <Label htmlFor="discountedPrice">Preço com Desconto (R$)</Label>
                     <Input 
                       id="discountedPrice"
                      type="number"
                      step="0.01"
                      placeholder="22.50"
                      value={formData.discountedPrice}
                      onChange={(e) => handleInputChange('discountedPrice', e.target.value)}
                      required
                    />
                  </div>
                </div>

                {formData.originalPrice && formData.discountedPrice && (
                  <div className="p-3 bg-gradient-points/10 rounded-lg">
                    <div className="text-sm font-medium">
                      Desconto: {Math.round(((parseFloat(formData.originalPrice) - parseFloat(formData.discountedPrice)) / parseFloat(formData.originalPrice)) * 100)}%
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Economia de R$ {(parseFloat(formData.originalPrice) - parseFloat(formData.discountedPrice)).toFixed(2)}
                    </div>
                  </div>
                 )}

               </CardContent>
             </Card>



          {/* Título e Descrição com IA */}
          <Card className="border-0 shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wand2 className="w-5 h-5" />
                Título e Descrição
              </CardTitle>
              <CardDescription>
                Use nossa IA para criar títulos e descrições que convertem
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="title">Título da Oferta</Label>
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm"
                    onClick={() => generateWithAI('title')}
                    disabled={isGenerating}
                  >
                    <Wand2 className="w-4 h-4 mr-2" />
                    {isGenerating ? 'Gerando...' : 'Gerar com IA'}
                  </Button>
                </div>
                <Input 
                  id="title"
                  placeholder="Ex: 50% OFF em Pizza Margherita - Imperdível!"
                  value={formData.title}
                  onChange={(e) => handleInputChange('title', e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <Label htmlFor="description">Descrição</Label>
                  <div className="flex gap-2">
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="sm"
                      onClick={() => generateWithAI('description')}
                      disabled={isGenerating}
                      className="hover-scale"
                    >
                      <Wand2 className="w-4 h-4 mr-2" />
                      {isGenerating ? 'Gerando...' : 'Gerar Básica'}
                    </Button>
                    <Button 
                      type="button" 
                      variant="default"
                      size="sm"
                      onClick={() => generateWithAI('aida')}
                      disabled={isGenerating}
                      className="bg-gradient-primary hover-scale gap-1.5"
                    >
                      {isGenerating ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Gerando...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4" />
                          Gerar AIDA
                        </>
                      )}
                    </Button>
                  </div>
                </div>
                <Textarea 
                  id="description"
                  placeholder="Descreva sua oferta de forma atrativa..."
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  rows={4}
                  className="resize-none"
                />
                <p className="text-xs text-muted-foreground">
                  💡 <span className="font-medium">AIDA</span> = Atenção, Interesse, Desejo, Ação. Descrição otimizada para conversão máxima!
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Configurações Condicionais por Tipo */}
          {formData.promoType && (
            <Card className="border-0 shadow-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {formData.promoType === 'flash' && <Zap className="w-5 h-5" />}
                  {formData.promoType === 'first-use' && <Users className="w-5 h-5" />}
                  {formData.promoType === 'checkin' && <CheckCircle className="w-5 h-5" />}
                  {formData.promoType === 'combo' && <Package className="w-5 h-5" />}
                  {formData.promoType === 'min-purchase' && <CreditCard className="w-5 h-5" />}
                  Configurações da {formData.promoType === 'flash' ? 'Oferta Relâmpago' : 
                                   formData.promoType === 'first-use' ? 'Oferta para Primeiro Uso' :
                                   formData.promoType === 'checkin' ? 'Check-in Premiado' :
                                   formData.promoType === 'min-purchase' ? 'Compras Acima de Valor' : 'Combo Econômico'}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {formData.promoType === 'flash' && (
                  <div className="space-y-3">
                    <Label htmlFor="flashDuration">Duração da Oferta Relâmpago (horas)</Label>
                    <div className="flex flex-wrap gap-2">
                      {FLASH_HOUR_PRESETS.map((h) => (
                        <Button
                          key={h}
                          type="button"
                          size="sm"
                          variant={String(formData.flashDuration) === String(h) ? 'default' : 'outline'}
                          onClick={() => applyFlashDuration(String(h))}
                        >
                          {h}h
                        </Button>
                      ))}
                    </div>
                    <Input 
                      id="flashDuration"
                      type="number"
                      min={1}
                      max={FLASH_MAX_HOURS}
                      placeholder="Ex: 6"
                      value={formData.flashDuration}
                      onChange={(e) => applyFlashDuration(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      A oferta relâmpago é definida em horas (máx. {FLASH_MAX_HOURS}h). A data de validade é calculada automaticamente a partir de agora
                      {formData.validUntil ? ` — expira em ${new Date(formData.validUntil).toLocaleString('pt-BR')}` : ''}.
                    </p>
                  </div>
                )}


                {formData.promoType === 'first-use' && (
                  <div className="space-y-2">
                    <Label htmlFor="firstUseBonus">Pontos Bônus para Primeiro Uso</Label>
                    <Input 
                      id="firstUseBonus"
                      type="number"
                      placeholder="Ex: 50"
                      value={formData.firstUseBonus}
                      onChange={(e) => handleInputChange('firstUseBonus', e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Pontos extras para usuários que usam a oferta pela primeira vez
                    </p>
                  </div>
                )}

                {formData.promoType === 'checkin' && (
                  <div className="space-y-6">
                    <CheckinPrizesEditor
                      prizes={formData.checkinPrizes}
                      onChange={(prizes) => handleInputChange('checkinPrizes', prizes as any)}
                    />
                  </div>
                )}

                {formData.promoType === 'combo' && (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="comboItems">Itens do Combo</Label>
                      <Textarea 
                        id="comboItems"
                        placeholder={"Ex: 1 Pizza grande (2 sabores) + 1 Refrigerante 2L + 1 Sobremesa"}
                        value={formData.comboItems}
                        onChange={(e) => handleInputChange('comboItems', e.target.value)}
                        rows={3}
                      />
                      <p className="text-xs text-muted-foreground">
                        Descreva cada item com quantidade, tamanho/porção e separe com “+”. Ex: “2 Hambúrgueres artesanais + 1 Batata grande + 2 Refrigerantes 350ml”.
                        Evite repetir preços ou percentuais aqui — o desconto já é definido nos valores da oferta acima.
                      </p>
                    </div>
                  </div>
                )}

              </CardContent>
            </Card>
          )}

          

          {/* Configurações Gerais */}
          <Card className="border-0 shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Configurações Gerais
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
                {/* Coluna esquerda: campos - grid 3 colunas em telas médias+ para preencher a largura */}
                <div className="lg:col-span-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="validUntil" className="text-sm">Válida até</Label>
                      <Input 
                        id="validUntil"
                        type="datetime-local"
                        value={formData.validUntil}
                        min={getMinValidUntil()}
                        max={getMaxValidUntil()}
                        onChange={(e) => handleInputChange('validUntil', clampValidUntil(e.target.value))}
                        required
                        disabled={formData.promoType === 'flash'}
                      />
                      <p className="text-xs text-muted-foreground">
                        {formData.promoType === 'flash'
                          ? `Definida automaticamente pela duração em horas da oferta relâmpago (máx. ${FLASH_MAX_HOURS}h).`
                          : `Validade máxima de ${MAX_OFFER_DAYS} dias (1 mês).`}
                      </p>
                    </div>


                    <div className="space-y-1.5">
                      <Label htmlFor="maxUses" className="text-sm">Limite de usos (opcional)</Label>
                      <Input 
                        id="maxUses"
                        type="number"
                        placeholder="Ex: 100"
                        value={formData.maxUses}
                        onChange={(e) => handleInputChange('maxUses', e.target.value)}
                      />
                    </div>
                    <div className="space-y-1.5 sm:col-span-2 lg:col-span-1 xl:col-span-2">
                      <Label htmlFor="checkinPoints" className="text-sm flex items-center gap-1">
                        Pontos por Check-in
                        <span className="text-[10px] text-amber-600 font-normal">(crédito)</span>
                      </Label>
                      <Input 
                        id="checkinPoints"
                        type="number"
                        min="10"
                        max="200"
                        step="10"
                        placeholder="50"
                        value={formData.checkinPoints}
                        onChange={(e) => handleInputChange('checkinPoints', e.target.value)}
                        required
                      />
                      <p className="text-[10px] sm:text-xs text-muted-foreground leading-tight">
                        Mín. 10 pts. Debitado da sua carteira promocional (100 pts = R$ 1,00).
                      </p>
                    </div>
                  </div>
                </div>

                {/* Coluna direita: simulador compacto - colapsável no mobile para não ocupar altura excessiva */}
                {hasActiveSubscription && (
                  <div className="lg:col-span-2">
                    {/* Mobile: collapsible via <details> */}
                    <details className="lg:hidden group rounded-lg border bg-muted/20">
                      <summary className="flex items-center justify-between cursor-pointer px-3 py-2 text-sm font-medium select-none">
                        <span className="flex items-center gap-2">
                          <Calculator className="w-4 h-4" />
                          Simulação de Pontos
                        </span>
                        <span className="text-xs text-muted-foreground group-open:hidden">Ver</span>
                        <span className="text-xs text-muted-foreground hidden group-open:inline">Ocultar</span>
                      </summary>
                      <div className="p-2 pt-0">
                        <PointsSimulator 
                          compact
                          pointsPerAction={parseInt(formData.checkinPoints) || 50}
                          maxActions={formData.maxUses ? parseInt(formData.maxUses) : null}
                        />
                      </div>
                    </details>
                    {/* Desktop: inline */}
                    <div className="hidden lg:block lg:sticky lg:top-4">
                      <PointsSimulator 
                        compact
                        pointsPerAction={parseInt(formData.checkinPoints) || 50}
                        maxActions={formData.maxUses ? parseInt(formData.maxUses) : null}
                      />
                    </div>
                  </div>
                )}
              </div>




              {/* Modo Delivery */}
              <div className="flex items-center justify-between p-4 rounded-lg border bg-muted/30">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-primary/10">
                    <Truck className="w-5 h-5 text-primary" />
                  </div>
                  <div className="space-y-0.5">
                    <Label htmlFor="isDelivery" className="text-base font-medium cursor-pointer">
                      Modo Delivery
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Permite que o entregador valide o check-in no endereço do cliente
                    </p>
                  </div>
                </div>
                <Switch
                  id="isDelivery"
                  checked={formData.isDelivery}
                  onCheckedChange={(checked) => handleInputChange('isDelivery', checked)}
                />
              </div>

              {/* Campo de endereço - oculto quando Modo Delivery ativo */}
              {!formData.isDelivery && (
                <div className="space-y-2">
                  <GooglePlacesAutocomplete
                    label="Endereço"
                    value={formData.address}
                    onChange={(address, coordinates) => {
                      handleInputChange('address', address);
                      if (coordinates) {
                        handleInputChange('latitude', coordinates.lat);
                        handleInputChange('longitude', coordinates.lng);
                        console.log('[CreateOffer] Address selected with coordinates:', {
                          address,
                          coordinates
                        });
                      }
                    }}
                    placeholder="Digite o endereço da oferta"
                    required
                  />
                </div>
              )}

              {/* Raio de Abrangência - Exibe se há coordenadas do formulário OU do negócio e Modo Delivery está desativado */}
              {(formData.latitude || formData.longitude || businessCoords) && !formData.isDelivery && (
                <CoverageRadiusSelector
                  latitude={formData.latitude || businessCoords?.lat || -3.1190}
                  longitude={formData.longitude || businessCoords?.lng || -60.0217}
                  radiusKm={formData.coverageRadius}
                  onRadiusChange={(radius) => handleInputChange('coverageRadius', radius)}
                />
              )}

              {/* Info quando Modo Delivery ativo */}
              {formData.isDelivery && (
                <div className="p-4 rounded-lg border border-primary/20 bg-primary/5">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-full bg-primary/10">
                      <MapPin className="w-4 h-4 text-primary" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-primary">
                        Validação no endereço do cliente
                      </p>
                      <p className="text-xs text-muted-foreground">
                        No Modo Delivery, o check-in será validado no endereço de entrega do cliente, permitindo que o entregador confirme a presença no local correto.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Upload de Imagens */}
          <Card className="border-0 shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ImageIcon className="w-5 h-5" />
                Imagens da Oferta
              </CardTitle>
              <CardDescription>
                Adicione até 4 imagens atrativas para sua oferta
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {imagePreviews.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">
                      Arraste as imagens para reorganizar. A primeira será a imagem principal.
                    </p>
                    <DraggableImageGrid
                      images={imagePreviews}
                      onReorder={reorderImages}
                      onRemove={removeImage}
                    />
                  </div>
                )}

                {imageFiles.length < 4 && (
                  <div className="border-2 border-dashed border-border rounded-lg p-6 text-center relative hover:border-primary/50 transition-colors">
                    <div className="space-y-4">
                      <Upload className="w-12 h-12 text-muted-foreground mx-auto" />
                      <div>
                        <p className="text-sm font-medium">
                          {imageFiles.length === 0 ? 'Clique para adicionar imagens' : 'Adicionar mais imagens'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          PNG, JPG até 5MB ({imageFiles.length}/4 imagens)
                        </p>
                      </div>
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handleImageUpload}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      />
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Botões de Ação */}
          <div className="flex flex-col-reverse sm:flex-row gap-3 justify-end sticky bottom-0 bg-background/95 backdrop-blur-sm p-4 -mx-4 border-t sm:relative sm:bg-transparent sm:backdrop-blur-none sm:border-0 sm:p-0 sm:mx-0">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => navigate('/anunciante/dashboard')}
              className="w-full sm:w-auto hover-scale font-medium"
              size="lg"
            >
              Cancelar
            </Button>
            <Button 
              type="submit" 
              className="w-full sm:w-auto bg-gradient-primary hover:opacity-90 transition-opacity shadow-lg hover:shadow-xl font-semibold gap-2" 
              disabled={isLoading || !hasActiveSubscription}
              size="lg"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Criando Oferta...
                </>
              ) : (
                <>
                  <Save className="w-5 h-5" />
                  Publicar Oferta
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateOffer;