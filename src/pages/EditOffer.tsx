import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { useSubscriptionStatus } from '@/hooks/useSubscriptionStatus';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { InterestSelect } from '@/components/InterestSelect';
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
  Sparkles,
  Loader2,
  Save,
  Truck,
  Building2
} from 'lucide-react';
import GooglePlacesAutocomplete from '@/components/GooglePlacesAutocomplete';
import { Switch } from '@/components/ui/switch';
import { DraggableImageGrid } from '@/components/DraggableImageGrid';
import { geminiService } from '@/lib/gemini';
import { OFFER_TYPES, normalizeOfferType } from '@/lib/offerTypes';
import CheckinPrizesEditor from '@/components/business/CheckinPrizesEditor';
import { getMinValidUntil, getMaxValidUntil, clampValidUntil, isValidUntilWithinLimit, MAX_OFFER_DAYS } from '@/lib/offerValidity';


const EditOffer = () => {
  const { user } = useAuth();
  const { hasActiveSubscription, loading: subscriptionLoading } = useSubscriptionStatus();
  const navigate = useNavigate();
  const { id: offerId } = useParams();
  const { getOfferInterests, setOfferInterests } = useInterests();
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [existingImages, setExistingImages] = useState<string[]>([]);

const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    originalPrice: '',
    discountedPrice: '',
    discountPercentage: 0,
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
    // Campos condicionais
    flashDuration: '',
    firstUseBonus: '',
    comboItems: '',
    comboDiscount: '',
    minPurchaseValue: '' // Valor mínimo para tipo "Compras acima de valor"
  });

  useEffect(() => {
    if (offerId && user) {
      loadOffer();
    }
  }, [offerId, user]);

  const loadOffer = async () => {
    try {
      setIsLoading(true);
      
      // Buscar oferta e dados do negócio
      const { data: offer, error: offerError } = await supabase
        .from('offers')
        .select(`
          *,
          businesses!inner(name, owner_id, address, latitude, longitude)
        `)
        .eq('id', offerId)
        .single();

      if (offerError || !offer) {
        throw new Error('Oferta não encontrada');
      }

      // Verificar se o usuário é o dono da oferta
      if (offer.businesses.owner_id !== user?.id) {
        toast.error('Você não tem permissão para editar esta oferta');
        navigate('/anunciante/ofertas');
        return;
      }

      // Calcular percentual de desconto
      const originalPrice = offer.original_price || 0;
      const discountedPrice = offer.discounted_price || 0;
      const calculatedPercentage = originalPrice > 0 && discountedPrice < originalPrice 
        ? Math.round(((originalPrice - discountedPrice) / originalPrice) * 100)
        : 0;

      // Preencher formulário com dados existentes
      setFormData({
        title: offer.title || '',
        description: offer.description || '',
        category: offer.category || '',
        originalPrice: offer.original_price?.toString() || '',
        discountedPrice: offer.discounted_price?.toString() || '',
        discountPercentage: offer.discount_percentage || calculatedPercentage,
        validUntil: offer.valid_until ? new Date(offer.valid_until).toISOString().slice(0, 16) : '',
        maxUses: offer.max_uses?.toString() || '',
        businessName: offer.businesses.name || '',
        address: (offer as any).address || (offer.businesses as any).address || '',
        latitude: offer.latitude || (offer.businesses as any).latitude || null,
        longitude: offer.longitude || (offer.businesses as any).longitude || null,
        productOrService: offer.title || '', // Usar o título como fallback
        promoType: normalizeOfferType(offer.offer_type),
        productCondition: (offer.targeting_data as any)?.product_condition || '',
        interests: [], // Será carregado separadamente da tabela offer_interests
        checkinPoints: offer.checkin_points?.toString() || '50',
        checkinPrizes: (offer.targeting_data as any)?.checkin_prizes || [],
        isDelivery: offer.is_delivery || false,
        flashDuration: '',
        firstUseBonus: '',
        comboItems: '',
        comboDiscount: '',
        minPurchaseValue: (offer.targeting_data as any)?.min_purchase_value?.toString() || ''
      });

      // Definir imagens existentes
      const images = offer.image_urls || (offer.image_url ? [offer.image_url] : []);
      const imageUrls = Array.isArray(images) ? images.filter((img): img is string => typeof img === 'string') : [];
      setExistingImages(imageUrls);

      // Carregar interesses da tabela relacional offer_interests
      if (offerId) {
        const offerInterests = await getOfferInterests(offerId);
        if (offerInterests.length > 0) {
          setFormData(prev => ({ ...prev, interests: offerInterests }));
        }
      }

    } catch (error: any) {
      console.error('Error loading offer:', error);
      toast.error(error.message || 'Erro ao carregar oferta');
      navigate('/anunciante/ofertas');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string | number | string[] | boolean) => {
    setFormData(prev => {
      const updated = {
        ...prev,
        [field]: value
      };

      // Calcular porcentagem de desconto automaticamente quando preços mudarem
      if (field === 'originalPrice' || field === 'discountedPrice') {
        const originalPrice = field === 'originalPrice' ? parseFloat(value as string) || 0 : parseFloat(prev.originalPrice) || 0;
        const discountedPrice = field === 'discountedPrice' ? parseFloat(value as string) || 0 : parseFloat(prev.discountedPrice) || 0;
        
        if (originalPrice > 0 && discountedPrice >= 0 && discountedPrice < originalPrice) {
          const percentage = Math.max(0, Math.min(100, Math.round(((originalPrice - discountedPrice) / originalPrice) * 100)));
          updated.discountPercentage = percentage;
        } else {
          updated.discountPercentage = 0;
        }
      }

      return updated;
    });
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length + imageFiles.length + existingImages.length > 4) {
      toast.error('Máximo de 4 imagens permitidas');
      return;
    }

    const newFiles = [...imageFiles, ...files].slice(0, 4 - existingImages.length);
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

  const removeExistingImage = (index: number) => {
    const newExistingImages = existingImages.filter((_, i) => i !== index);
    setExistingImages(newExistingImages);
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
    const newExisting: string[] = [];
    const newPreviews: string[] = [];
    const newFiles: File[] = [];

    newOrder.forEach((image) => {
      const existingIndex = existingImages.indexOf(image);
      const previewIndex = imagePreviews.indexOf(image);
      
      if (existingIndex !== -1) {
        newExisting.push(image);
      } else if (previewIndex !== -1) {
        newPreviews.push(image);
        if (imageFiles[previewIndex]) {
          newFiles.push(imageFiles[previewIndex]);
        }
      }
    });

    setExistingImages(newExisting);
    setImagePreviews(newPreviews);
    setImageFiles(newFiles);
    toast.success('Ordem das imagens atualizada');
  };

  const uploadImages = async (files: File[]): Promise<string[]> => {
    const { compressForOffer } = await import('@/lib/imageCompression');
    // A policy do bucket exige que o arquivo fique dentro da pasta do próprio usuário.
    let { data: authData } = await supabase.auth.getUser();
    let uid = authData?.user?.id;
    if (!uid) {
      const { data: refreshed } = await supabase.auth.refreshSession();
      uid = refreshed?.user?.id;
    }
    if (!uid) throw new Error('Sessão expirada. Faça login novamente.');

    const uploadOne = async (file: File): Promise<string> => {
      const compressed = await compressForOffer(file);
      const fileExt = (compressed.name.split('.').pop() || 'jpg').toLowerCase();
      const filePath = `${uid}/${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`;

      let { error: uploadError } = await supabase.storage
        .from('offer-images')
        .upload(filePath, compressed, { contentType: compressed.type || 'image/jpeg' });

      if (uploadError) {
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
      toast.error('Faça login para editar ofertas');
      return;
    }

    // Verificar se tem assinatura ativa
    if (!hasActiveSubscription) {
      toast.error('Renove seu plano para editar ofertas');
      navigate('/anunciante/planos');
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

    if (!formData.validUntil) {
      toast.error('Data de validade é obrigatória');
      return;
    }

    if (!isValidUntilWithinLimit(formData.validUntil)) {
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
      // Upload das novas imagens se houver
      let newImageUrls: string[] = [];
      if (imageFiles.length > 0) {
        toast.info('Fazendo upload das imagens...');
        try {
          newImageUrls = await uploadImages(imageFiles);
        } catch (uploadErr: any) {
          toast.error(`Erro ao fazer upload das imagens: ${uploadErr?.message || 'tente novamente'}`);
          setIsLoading(false);
          return;
        }
      }


      // Combinar imagens existentes com novas
      const allImageUrls = [...existingImages, ...newImageUrls];

      // Calcular desconto
      const originalPrice = parseFloat(formData.originalPrice);
      const discountedPrice = parseFloat(formData.discountedPrice);
      const discountPercentage = Math.round(((originalPrice - discountedPrice) / originalPrice) * 100);

      // Parse e validar data de validade
      const validUntilDate = new Date(formData.validUntil);
      const now = new Date();
      
      // Verificar se a nova data de validade é no futuro (oferta deve ser reativada)
      const isValidUntilInFuture = validUntilDate > now;

      const offerData = {
        title: formData.title.trim(),
        description: formData.description?.trim() || null,
        category: formData.category,
        original_price: originalPrice,
        discounted_price: discountedPrice,
        discount_percentage: discountPercentage,
        valid_until: validUntilDate.toISOString(),
        max_uses: formData.maxUses ? parseInt(formData.maxUses) : null,
        image_url: allImageUrls[0] || null, // Primeira imagem para compatibilidade
        image_urls: allImageUrls, // Array completo de imagens
        checkin_points: parseInt(formData.checkinPoints) || 50,
        is_delivery: formData.isDelivery, // Modo delivery
        offer_type: formData.promoType || 'standard',
        targeting_data: {
          product_condition: formData.productCondition || null,
          interests: formData.interests || [],
          min_purchase_value: formData.promoType === 'min-purchase' && formData.minPurchaseValue 
            ? parseFloat(formData.minPurchaseValue) 
            : null,
          checkin_prizes: formData.promoType === 'checkin' && formData.checkinPrizes.length > 0
            ? formData.checkinPrizes
            : null
        },
        updated_at: new Date().toISOString(),
        // Reativar oferta automaticamente se a data de validade for no futuro
        is_active: isValidUntilInFuture,
        // Limpar arquivamento se a data for no futuro (reativando)
        archived_at: isValidUntilInFuture ? null : undefined,
        archived_by: isValidUntilInFuture ? null : undefined,
        address: formData.address || null,
        latitude: formData.latitude || null,
        longitude: formData.longitude || null,
      };

      console.log('Dados da oferta atualizada:', offerData);

      // Atualizar a oferta no banco de dados
      const { error: updateError } = await supabase
        .from('offers')
        .update(offerData)
        .eq('id', offerId);

      if (updateError) {
        console.error('Erro ao atualizar oferta:', updateError);
        throw new Error(updateError.message || 'Erro ao atualizar oferta');
      }

      // Atualizar interesses na tabela relacional offer_interests
      if (offerId && formData.interests.length > 0) {
        await setOfferInterests(offerId, formData.interests);
      }

      toast.success('Oferta atualizada com sucesso!');
      
      // Navegar de volta para a lista de ofertas
      navigate('/anunciante/ofertas');
    } catch (error: any) {
      console.error('Error updating offer:', error);
      toast.error(error.message || 'Erro ao atualizar oferta');
    } finally {
      setIsLoading(false);
    }
  };

  if (subscriptionLoading || (isLoading && !formData.title)) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Carregando...</p>
        </div>
      </div>
    );
  }

  if (!hasActiveSubscription) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
              <Zap className="w-8 h-8 text-destructive" />
            </div>
            <CardTitle className="text-xl">Plano Expirado</CardTitle>
            <CardDescription>
              Seu plano de assinatura não está ativo. Renove para poder editar suas ofertas.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <Button onClick={() => navigate('/anunciante/planos')} className="w-full">
              Renovar Plano
            </Button>
            <Button variant="outline" onClick={() => navigate('/anunciante/ofertas')} className="w-full">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar às Ofertas
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card/95 backdrop-blur-sm sticky top-0 z-50 shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link 
                to="/anunciante/ofertas" 
                className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-muted transition-colors font-medium"
              >
                <ArrowLeft className="w-4 h-4" />
                <span className="hidden sm:inline">Voltar</span>
              </Link>
              <div className="h-6 w-px bg-border" />
              <h1 className="text-xl font-semibold">Editar Oferta</h1>
            </div>
            <Badge variant="secondary" className="gap-1.5">
              <Sparkles className="w-3 h-3" />
              Powered by IA
            </Badge>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6 sm:py-8 max-w-4xl">
        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
          <div className="grid lg:grid-cols-2 gap-4 sm:gap-6">
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
                    disabled
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="productOrService">Produto/Serviço</Label>
                  <Input 
                    id="productOrService"
                    placeholder="Ex: Pizza Margherita, Corte de Cabelo"
                    value={formData.productOrService}
                    onChange={(e) => handleInputChange('productOrService', e.target.value)}
                  />
                </div>

                 <div className="space-y-2">
                   <Label htmlFor="category">Categoria</Label>
                   <Select value={formData.category} onValueChange={(value) => handleInputChange('category', value)}>
                     <SelectTrigger>
                       <SelectValue placeholder="Selecione a categoria" />
                     </SelectTrigger>
                     <SelectContent>
                       <SelectItem value="alimentacao">Alimentação e Bebidas</SelectItem>
                       <SelectItem value="beleza">Beleza e Estética</SelectItem>
                       <SelectItem value="roupas">Roupas e Acessórios</SelectItem>
                       <SelectItem value="casa">Casa e Decoração</SelectItem>
                       <SelectItem value="saude">Saúde e Bem-estar</SelectItem>
                       <SelectItem value="educacao">Educação e Cursos</SelectItem>
                       <SelectItem value="tecnologia">Tecnologia e Eletrônicos</SelectItem>
                       <SelectItem value="automotivo">Automotivo</SelectItem>
                       <SelectItem value="pets">Pets e Animais</SelectItem>
                       <SelectItem value="esportes">Esportes e Fitness</SelectItem>
                       <SelectItem value="viagem">Viagem e Turismo</SelectItem>
                       <SelectItem value="entretenimento">Entretenimento</SelectItem>
                       <SelectItem value="servicos">Serviços Gerais</SelectItem>
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
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione a condição" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="novo">
                          <div className="flex items-center gap-2">
                            <Sparkles className="w-4 h-4" />
                            Novo
                          </div>
                        </SelectItem>
                        <SelectItem value="seminovo">
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
                   <InterestSelect
                     value={formData.interests}
                     onChange={(interests) => handleInputChange('interests', interests)}
                     placeholder="Digite interesses do seu público-alvo..."
                   />
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
                       placeholder="29.90"
                       value={formData.discountedPrice}
                       onChange={(e) => handleInputChange('discountedPrice', e.target.value)}
                       required
                     />
                   </div>
                  </div>

                  {/* Percentual de desconto calculado automaticamente */}
                  {formData.discountPercentage > 0 && (
                    <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg border border-green-200 dark:border-green-800">
                      <div className="flex items-center text-green-700 dark:text-green-300">
                        <span className="text-sm font-medium">
                          Desconto calculado: {formData.discountPercentage}%
                        </span>
                      </div>
                    </div>
                  )}

                 <div className="space-y-2">
                   <Label htmlFor="checkinPoints">Pontos por Check-in</Label>
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
                   <p className="text-sm text-muted-foreground">
                     Pontos que os usuários ganham ao fazer check-in nesta oferta (10-200)
                   </p>
                 </div>

                 <div className="border-t pt-4">
                   <CheckinPrizesEditor
                     prizes={formData.checkinPrizes}
                     onChange={(prizes) => handleInputChange('checkinPrizes', prizes as any)}
                   />
                 </div>

                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="validUntil">Válida até</Label>
                    <Input 
                      id="validUntil"
                      type="datetime-local"
                      value={formData.validUntil}
                      min={getMinValidUntil()}
                      max={getMaxValidUntil()}
                      onChange={(e) => handleInputChange('validUntil', clampValidUntil(e.target.value))}
                      required
                    />
                    <p className="text-xs text-muted-foreground">
                      Validade máxima de {MAX_OFFER_DAYS} dias (1 mês).
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="maxUses">Limite de Usos (opcional)</Label>
                    <Input 
                      id="maxUses"
                      type="number"
                      placeholder="Ex: 100"
                      value={formData.maxUses}
                      onChange={(e) => handleInputChange('maxUses', e.target.value)}
                    />
                  </div>
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

                {/* Address Section moved here in the flow */}
                {!formData.isDelivery ? (
                  <div className="space-y-4 pt-4 border-t">
                    <div className="flex items-center gap-2 mb-2">
                      <Building2 className="w-5 h-5 text-primary" />
                      <h3 className="font-semibold">Localização da Oferta</h3>
                    </div>
                    
                    <GooglePlacesAutocomplete
                      label="Endereço"
                      value={formData.address || ''}
                      onChange={(address, coordinates) => {
                        setFormData(prev => ({
                          ...prev,
                          address,
                          latitude: coordinates?.lat || prev.latitude,
                          longitude: coordinates?.lng || prev.longitude
                        }));
                      }}
                      placeholder="Digite o endereço da oferta"
                      required
                    />
                    <p className="text-xs text-muted-foreground">
                      Por padrão, usamos o endereço do seu negócio. Altere aqui se esta oferta for para uma unidade ou local específico.
                    </p>
                  </div>
                ) : (
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

            {/* Título e Descrição */}
            <Card className="border-0 shadow-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Wand2 className="w-5 h-5" />
                  Título e Descrição
                </CardTitle>
                <CardDescription>
                  Use nossa IA para gerar conteúdo atrativo
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
                      className="text-xs"
                    >
                      <Wand2 className="w-3 h-3 mr-1" />
                      IA
                    </Button>
                  </div>
                  <Input 
                    id="title"
                    placeholder="Ex: 50% OFF em Pizza Margherita"
                    value={formData.title}
                    onChange={(e) => handleInputChange('title', e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <Label htmlFor="description">Descrição (opcional)</Label>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => generateWithAI('description')}
                        disabled={isGenerating}
                      >
                        <Wand2 className="w-3 h-3 mr-1" />
                        Básica
                      </Button>
                      <Button
                        type="button"
                        variant="default"
                        size="sm"
                        onClick={() => generateWithAI('aida')}
                        disabled={isGenerating}
                        className="bg-gradient-primary gap-1"
                      >
                        <Sparkles className="w-3 h-3" />
                        AIDA
                      </Button>
                    </div>
                  </div>
                  <Textarea 
                    id="description"
                    placeholder="Descrição detalhada da sua oferta..."
                    value={formData.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    rows={4}
                  />
                  <p className="text-xs text-muted-foreground">💡 AIDA = descrição otimizada para conversão</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Imagens da Oferta */}
          <Card className="border-0 shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ImageIcon className="w-5 h-5" />
                Imagens da Oferta
              </CardTitle>
              <CardDescription>
                Adicione até 4 imagens atrativas da sua oferta
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Grid com drag-and-drop */}
              {(existingImages.length > 0 || imagePreviews.length > 0) && (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    Arraste para reorganizar. A primeira será a principal.
                  </p>
                  <DraggableImageGrid
                    images={[...existingImages, ...imagePreviews]}
                    onReorder={reorderImages}
                    onRemove={(index) => {
                      if (index < existingImages.length) {
                        removeExistingImage(index);
                      } else {
                        removeImage(index - existingImages.length);
                      }
                    }}
                  />
                </div>
              )}

              {/* Upload de Novas Imagens */}
              <div className="space-y-4">
                <div>
                  <Label htmlFor="images" className="cursor-pointer">
                    <div className="border-2 border-dashed border-muted rounded-lg p-6 text-center hover:border-primary/50 transition-colors">
                      <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground mb-1">
                        Clique para adicionar imagens ou arraste aqui
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Máximo de 4 imagens • PNG, JPG até 5MB cada
                      </p>
                    </div>
                  </Label>
                  <Input
                    id="images"
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                </div>

                {/* Preview das Novas Imagens */}
                {imagePreviews.length > 0 && (
                  <div>
                    <Label className="text-sm text-muted-foreground">Novas Imagens</Label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-2">
                      {imagePreviews.map((preview, index) => (
                        <div key={`preview-${index}`} className="relative group">
                          <img 
                            src={preview} 
                            alt={`Preview ${index + 1}`}
                            className="w-full aspect-square object-cover rounded-lg border"
                          />
                          <Button
                            type="button"
                            variant="destructive"
                            size="icon"
                            onClick={() => removeImage(index)}
                            className="absolute -top-2 -right-2 w-6 h-6 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="w-3 h-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Botões de Ação */}
          <div className="flex flex-col-reverse sm:flex-row gap-3 justify-end sticky bottom-0 bg-background/95 backdrop-blur-sm p-4 -mx-4 border-t sm:relative sm:bg-transparent sm:backdrop-blur-none sm:border-0 sm:p-0 sm:mx-0">
            <Link to="/anunciante/ofertas" className="w-full sm:w-auto">
              <Button
                type="button"
                variant="outline"
                className="w-full hover-scale font-medium"
                size="lg"
                disabled={isLoading}
              >
                Cancelar
              </Button>
            </Link>
            <Button
              type="submit"
              disabled={isLoading}
              className="w-full sm:flex-1 bg-gradient-primary hover:opacity-90 transition-opacity shadow-lg hover:shadow-xl font-semibold gap-2"
              size="lg"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="w-5 h-5" />
                  Atualizar Oferta
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditOffer;