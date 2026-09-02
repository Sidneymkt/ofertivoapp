import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Navigation } from '@/components/ui/navigation';
import { BottomNavigation } from '@/components/ui/bottom-navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { MapPin, Star, Search, Award, Truck, LayoutGrid, List, SlidersHorizontal } from 'lucide-react';
import { LikeButton } from '@/components/LikeButton';
import { Countdown } from '@/components/Countdown';
import { supabase } from '@/lib/supabase';
import { getOfferTypeLabel, getOfferTypeStyle } from '@/lib/offerTypes';
import { getCategoryStyle, CATEGORY_FILTER_LIST, CATEGORY_SLUG_TO_SHORT, CATEGORY_SHORT_TO_SLUG } from '@/lib/categories';
import { calculateDistance } from '@/lib/geo';
import { SponsoredBannerCarousel } from '@/components/SponsoredBannerCarousel';
import { NearbyOffersMap } from '@/components/NearbyOffersMap';
import { HyperlocalFilters, type HyperlocalFilter } from '@/components/HyperlocalFilters';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface Offer {
  id: string;
  title: string;
  business: string;
  description: string;
  discount: string;
  originalPrice: string;
  finalPrice: string;
  location: string;
  city: string;
  distance: number | null;
  latitude: number;
  longitude: number;
  validUntil: string;
  rating: number;
  points: number;
  category: string;
  image: string;
  offerType: string;
  productCondition?: string;
  minPurchaseValue?: number | null;
  isDelivery?: boolean;
}

// Localização padrão de Manaus
const DEFAULT_LOCATION = { lat: -3.1190, lng: -60.0217 };

const Offers = () => {
  const location = useLocation();
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Todos');
  const [hyperlocalFilter, setHyperlocalFilter] = useState<HyperlocalFilter | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list' | 'map'>('grid');
  // Advanced filters
  const [maxDistance, setMaxDistance] = useState<number>(50); // km
  const [maxPrice, setMaxPrice] = useState<number>(1000);
  const [minPoints, setMinPoints] = useState<number>(0);
  const [onlyDelivery, setOnlyDelivery] = useState<boolean>(false);
  const [minRating, setMinRating] = useState<number>(0);
  const [sortBy, setSortBy] = useState<'distance' | 'price_asc' | 'price_desc' | 'points_desc' | 'recent'>('distance');
  const [selectedCity, setSelectedCity] = useState<string>('all');
  const [filtersOpen, setFiltersOpen] = useState(false);
  // Inicializar com localização padrão para exibir distância imediatamente
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number }>(DEFAULT_LOCATION);

  // Tentar obter localização real do usuário (atualiza se disponível)
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (error) => {
          console.log('Usando localização padrão de Manaus:', error.message);
        },
        { enableHighAccuracy: false, timeout: 5000, maximumAge: 300000 }
      );
    }
  }, []);

  // Mapeamento de categorias da URL para categorias do sistema (centralizado)
  const categoryMapping = CATEGORY_SLUG_TO_SHORT;

  useEffect(() => {
    // Processar parâmetros da URL
    const searchParams = new URLSearchParams(location.search);
    const categoryParam = searchParams.get('categoria');
    
    if (categoryParam && categoryMapping[categoryParam]) {
      setSelectedCategory(categoryMapping[categoryParam]);
    }
    
    loadOffers();
  }, [location.search, userLocation]);

  const loadOffers = async () => {
    try {
      setLoading(true);
      const { data: offersData, error } = await supabase
        .from('offers')
        .select(`
          *,
          businesses (
            id,
            name,
            address,
            category,
            average_rating
          )
        `)
        .eq('is_active', true)
        .gte('valid_until', new Date().toISOString())
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Erro ao carregar ofertas:', error);
        throw error;
      }

      // Fetch cities from addresses for each business
      const businessIds = Array.from(
        new Set((offersData || []).map((o: any) => o.businesses?.id).filter(Boolean))
      );
      const cityMap = new Map<string, string>();
      if (businessIds.length) {
        const { data: addrs } = await supabase
          .from('addresses')
          .select('business_id, city, is_default')
          .in('business_id', businessIds);
        (addrs || []).forEach((a: any) => {
          if (!a.business_id || !a.city) return;
          if (!cityMap.has(a.business_id) || a.is_default) {
            cityMap.set(a.business_id, a.city);
          }
        });
      }

      // Fallback: try to extract city from businesses.address string
      const extractCityFromAddress = (addr?: string) => {
        if (!addr) return '';
        // Common BR pattern: "Rua X, 123 - Bairro, Cidade - UF"
        const parts = addr.split(/[,-]/).map(p => p.trim()).filter(Boolean);
        // Look for token before "- UF" (2 letters uppercase)
        for (let i = parts.length - 1; i >= 0; i--) {
          if (/^[A-Z]{2}$/.test(parts[i]) && i > 0) return parts[i - 1];
        }
        return parts[parts.length - 2] || '';
      };

      const transformedOffers: Offer[] = offersData?.map((offer) => {
        const offerLat = Number(offer.latitude);
        const offerLng = Number(offer.longitude);
        const distance = offerLat && offerLng
          ? calculateDistance(userLocation.lat, userLocation.lng, offerLat, offerLng)
          : null;
        const bizId = offer.businesses?.id;
        const city = (bizId && cityMap.get(bizId)) || extractCityFromAddress(offer.businesses?.address) || '';

        return {
          id: offer.id,
          title: offer.title || '',
          business: offer.businesses?.name || 'Negócio',
          description: offer.description || '',
          discount: `${offer.discount_percentage || 0}%`,
          originalPrice: `R$ ${offer.original_price?.toFixed(2) || '0,00'}`,
          finalPrice: `R$ ${offer.discounted_price?.toFixed(2) || '0,00'}`,
          location: offer.businesses?.address || 'Sua cidade',
          city,
          distance,
          latitude: offerLat,
          longitude: offerLng,
          validUntil: offer.valid_until || '',
          rating: offer.businesses?.average_rating || 0,
          points: offer.checkin_points || 50,
          category: offer.category || 'Geral',
          image: offer.image_url || "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=400&h=300&fit=crop",
          offerType: offer.offer_type || 'standard',
          productCondition: (offer.targeting_data as any)?.product_condition || null,
          minPurchaseValue: (offer.targeting_data as any)?.min_purchase_value || null,
          isDelivery: offer.is_delivery || false
        };
      }) || [];

      transformedOffers.sort((a, b) => {
        if (a.distance === null) return 1;
        if (b.distance === null) return -1;
        return a.distance - b.distance;
      });

      setOffers(transformedOffers);
    } catch (error) {
      console.error('Erro ao carregar ofertas:', error);
      setOffers([]);
    } finally {
      setLoading(false);
    }
  };

  const categories = CATEGORY_FILTER_LIST;

  const availableCities = React.useMemo(() => {
    const set = new Set<string>();
    offers.forEach(o => { if (o.city) set.add(o.city); });
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'pt-BR'));
  }, [offers]);

  const filteredOffers = offers.filter(offer => {
    const matchesSearch = searchTerm === '' || 
      offer.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      offer.business.toLowerCase().includes(searchTerm.toLowerCase()) ||
      offer.description.toLowerCase().includes(searchTerm.toLowerCase());
      
    const selectedSlug = CATEGORY_SHORT_TO_SLUG[selectedCategory];
    const matchesCategory = selectedCategory === 'Todos' || 
      offer.category === selectedSlug ||
      offer.category.toLowerCase() === selectedCategory.toLowerCase();

    // Hyperlocal filters
    let matchesHyperlocal = true;
    if (hyperlocalFilter === 'nearby') {
      matchesHyperlocal = offer.distance !== null && offer.distance <= 2;
    } else if (hyperlocalFilter === 'under_10') {
      matchesHyperlocal = parseFloat(offer.finalPrice.replace('R$ ', '').replace(',', '.')) <= 10;
    } else if (hyperlocalFilter === 'lunch') {
      const cat = offer.category.toLowerCase();
      matchesHyperlocal = (cat === 'alimentação' || cat === 'alimentacao') && 
        parseFloat(offer.finalPrice.replace('R$ ', '').replace(',', '.')) <= 25;
    } else if (hyperlocalFilter === 'top_bairro') {
      matchesHyperlocal = offer.rating >= 4;
    } else if (hyperlocalFilter === 'flash') {
      matchesHyperlocal = offer.offerType === 'flash';
    } else if (hyperlocalFilter === 'open_now') {
      matchesHyperlocal = new Date(offer.validUntil) > new Date();
    }
      
    return matchesSearch && matchesCategory && matchesHyperlocal &&
      (selectedCity === 'all' || offer.city === selectedCity) &&
      (offer.distance === null || offer.distance <= maxDistance) &&
      (parseFloat(offer.finalPrice.replace('R$ ', '').replace(',', '.')) <= maxPrice) &&
      (offer.points >= minPoints) &&
      (!onlyDelivery || offer.isDelivery) &&
      (offer.rating >= minRating);
  });

  const sortedOffers = [...filteredOffers].sort((a, b) => {
    const pa = parseFloat(a.finalPrice.replace('R$ ', '').replace(',', '.'));
    const pb = parseFloat(b.finalPrice.replace('R$ ', '').replace(',', '.'));
    switch (sortBy) {
      case 'price_asc': return pa - pb;
      case 'price_desc': return pb - pa;
      case 'points_desc': return b.points - a.points;
      case 'recent': return 0;
      case 'distance':
      default:
        if (a.distance === null) return 1;
        if (b.distance === null) return -1;
        return a.distance - b.distance;
    }
  });

  const activeFilterCount =
    (maxDistance < 50 ? 1 : 0) +
    (maxPrice < 1000 ? 1 : 0) +
    (minPoints > 0 ? 1 : 0) +
    (onlyDelivery ? 1 : 0) +
    (minRating > 0 ? 1 : 0) +
    (selectedCity !== 'all' ? 1 : 0) +
    (sortBy !== 'distance' ? 1 : 0);

  const resetFilters = () => {
    setMaxDistance(50);
    setMaxPrice(1000);
    setMinPoints(0);
    setOnlyDelivery(false);
    setMinRating(0);
    setSelectedCity('all');
    setSortBy('distance');
  };


  const handleCategoryClick = (category: string) => {
    setSelectedCategory(category);
  };
  return (
    <div className="page-shell bg-background">
      {/* Header */}
      <header className="border-b sticky top-0 bg-background/95 backdrop-blur-sm z-50">
        <div className="page-container">
          <Navigation />
        </div>
      </header>

      {/* Sponsored Banner */}
      <section className="pt-4 sm:pt-6">
        <div className="page-container">
          <SponsoredBannerCarousel category={CATEGORY_SHORT_TO_SLUG[selectedCategory]} />
        </div>
      </section>

      {/* Search Bar */}
      <section className="pt-4">
        <div className="page-container">
          <div className="flex gap-2 items-center max-w-3xl mx-auto">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                className="pl-10 h-11 rounded-full bg-muted/50 border-border/60 focus-visible:ring-primary"
                placeholder="Buscar ofertas, negócios..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Popover open={filtersOpen} onOpenChange={setFiltersOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" size="icon" className="relative h-11 w-11 rounded-full flex-shrink-0" title="Filtros" aria-label="Abrir filtros">
                  <SlidersHorizontal className="w-4 h-4" />
                  {activeFilterCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center">
                      {activeFilterCount}
                    </span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-[320px] sm:w-[380px] p-4 space-y-4 z-[60]">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold text-sm">Filtros avançados</h4>
                  <Button variant="ghost" size="sm" onClick={resetFilters} className="h-7 text-xs">Limpar</Button>
                </div>
                <Separator />
                <div className="space-y-2">
                  <Label className="text-xs">Cidade</Label>
                  <Select value={selectedCity} onValueChange={setSelectedCity}>
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue placeholder="Todas as cidades" />
                    </SelectTrigger>
                    <SelectContent className="z-[70] max-h-64">
                      <SelectItem value="all">Todas as cidades</SelectItem>
                      {availableCities.map((city) => (
                        <SelectItem key={city} value={city}>{city}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-xs"><Label>Distância máxima</Label><span className="text-muted-foreground">{maxDistance} km</span></div>
                  <Slider value={[maxDistance]} min={1} max={50} step={1} onValueChange={(v) => setMaxDistance(v[0])} />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-xs"><Label>Preço máximo</Label><span className="text-muted-foreground">R$ {maxPrice}</span></div>
                  <Slider value={[maxPrice]} min={5} max={1000} step={5} onValueChange={(v) => setMaxPrice(v[0])} />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-xs"><Label>Mínimo de pontos</Label><span className="text-muted-foreground">{minPoints} pts</span></div>
                  <Slider value={[minPoints]} min={0} max={500} step={10} onValueChange={(v) => setMinPoints(v[0])} />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-xs"><Label>Avaliação mínima</Label><span className="text-muted-foreground">{minRating} ★</span></div>
                  <Slider value={[minRating]} min={0} max={5} step={0.5} onValueChange={(v) => setMinRating(v[0])} />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="only-delivery" className="text-xs">Apenas com entrega</Label>
                  <Switch id="only-delivery" checked={onlyDelivery} onCheckedChange={setOnlyDelivery} />
                </div>
                <Separator />
                <div className="space-y-2">
                  <Label className="text-xs">Ordenar por</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {([
                      ['distance', 'Mais próximas'],
                      ['price_asc', 'Menor preço'],
                      ['price_desc', 'Maior preço'],
                      ['points_desc', 'Mais pontos'],
                    ] as const).map(([key, label]) => (
                      <Button key={key} size="sm" variant={sortBy === key ? 'default' : 'outline'} onClick={() => setSortBy(key)} className="text-xs h-8">
                        {label}
                      </Button>
                    ))}
                  </div>
                </div>
                <Button className="w-full" onClick={() => setFiltersOpen(false)}>Aplicar</Button>
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </section>

      {/* Category Filters */}
      <section className="pt-4">
        <div className="page-container">
          <div className="scroll-snap-x -mx-3 sm:-mx-4 px-3 sm:px-4">
            <div className="flex gap-2 pb-1" style={{ minWidth: 'fit-content' }}>
              {categories.map((category) => (
                <Button
                  key={category}
                  variant={selectedCategory === category ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleCategoryClick(category)}
                  className={`whitespace-nowrap flex-shrink-0 rounded-full text-xs sm:text-sm h-9 px-4 transition-all ${selectedCategory === category ? 'bg-gradient-primary shadow-md scale-[1.03]' : 'hover:border-primary/50'}`}
                >
                  {category}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Hyperlocal Filters */}
      <section className="py-3">
        <div className="page-container">
          <HyperlocalFilters
            activeFilter={hyperlocalFilter}
            onFilterChange={setHyperlocalFilter}
          />
        </div>
      </section>


      {/* Offers Section */}
      <section className="py-4 sm:py-8">
        <div className="page-container">
          {/* View Mode Toggle */}
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-muted-foreground">
              {sortedOffers.length} oferta{sortedOffers.length !== 1 ? 's' : ''} encontrada{sortedOffers.length !== 1 ? 's' : ''}
            </p>
            <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
              <Button
                variant={viewMode === 'grid' ? 'default' : 'ghost'}
                size="icon"
                className={`h-8 w-8 ${viewMode === 'grid' ? 'bg-primary text-primary-foreground' : ''}`}
                onClick={() => setViewMode('grid')}
                title="Visualização em grade"
              >
                <LayoutGrid className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'ghost'}
                size="icon"
                className={`h-8 w-8 ${viewMode === 'list' ? 'bg-primary text-primary-foreground' : ''}`}
                onClick={() => setViewMode('list')}
                title="Visualização em lista"
              >
                <List className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'map' ? 'default' : 'ghost'}
                size="icon"
                className={`h-8 w-8 ${viewMode === 'map' ? 'bg-primary text-primary-foreground' : ''}`}
                onClick={() => setViewMode('map')}
                title="Ofertas próximas no mapa"
                aria-label="Ver ofertas próximas no mapa"
              >
                <MapPin className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {viewMode === 'map' && (
            <div className="mb-6 space-y-2">
              <NearbyOffersMap
                userLocation={userLocation}
                offers={sortedOffers.map((o) => ({
                  id: o.id,
                  title: o.title,
                  business: o.business,
                  finalPrice: o.finalPrice,
                  latitude: o.latitude,
                  longitude: o.longitude,
                  distance: o.distance,
                }))}
                height={420}
              />
              <p className="text-[11px] text-muted-foreground">
                Toque em um marcador para ver os detalhes e dê dois toques para abrir a oferta.
              </p>
            </div>
          )}


          {loading ? (
            <div className={viewMode === 'grid' 
              ? "grid-responsive-cards"
              : "flex flex-col gap-3"
            }>
              {[1, 2, 3].map((i) => (
                <Card key={i} className="border-0 shadow-card animate-pulse">
                  <div className={viewMode === 'grid' ? "h-40 sm:h-48 bg-muted rounded-t-lg" : "h-24 bg-muted rounded-l-lg"}></div>
                  <CardContent className="p-3 sm:p-4">
                    <div className="h-4 bg-muted rounded mb-2"></div>
                    <div className="h-4 bg-muted rounded w-2/3"></div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <>
              {sortedOffers.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-muted-foreground text-lg">
                    {searchTerm || selectedCategory !== 'Todos' 
                      ? 'Nenhuma oferta encontrada para os filtros selecionados.' 
                      : 'Nenhuma oferta disponível no momento.'}
                  </p>
                  {(searchTerm || selectedCategory !== 'Todos') && (
                    <Button 
                      variant="outline" 
                      className="mt-4"
                      onClick={() => {
                        setSearchTerm('');
                        setSelectedCategory('Todos');
                      }}
                    >
                      Limpar filtros
                    </Button>
                  )}
                </div>
              ) : viewMode === 'grid' ? (
                <div className="grid-responsive-cards">
                  {sortedOffers.map((offer) => (
                    <Card key={offer.id} className="border-0 shadow-card hover:shadow-glow transition-all duration-300 transform hover:scale-[1.02] sm:hover:scale-105 cursor-pointer overflow-hidden">
                      <Link to={`/ofertas/${offer.id}`}>
                        <div className="relative h-40 sm:h-48 overflow-hidden">
                          <img src={offer.image} alt={offer.title} className="w-full h-full object-cover transition-transform duration-300 hover:scale-110" />
                          <div className="absolute top-3 left-3">
                            <Badge className="bg-gradient-points text-accent-foreground font-bold shadow-lg">{offer.discount} OFF</Badge>
                          </div>
                          <div className="absolute top-2 right-2 flex items-center gap-1 text-sm bg-black/50 text-white px-2 py-1 rounded">
                            <Star className="w-4 h-4 fill-accent text-accent" />{offer.rating}
                          </div>
                        </div>
                      </Link>
                      <CardHeader className="pb-3">
                        <div className="flex flex-wrap gap-2 mb-3">
                          <Badge className={`${getCategoryStyle(offer.category)} font-semibold shadow-md border-0 px-3 py-1`}>{offer.category}</Badge>
                          <Badge className={`${getOfferTypeStyle(offer.offerType)} font-semibold shadow-md border-0 px-3 py-1`}>{getOfferTypeLabel(offer.offerType)}</Badge>
                          {offer.productCondition && (
                            <Badge className={`${offer.productCondition === 'novo' ? 'bg-gradient-to-r from-emerald-500 to-green-500' : 'bg-gradient-to-r from-blue-500 to-cyan-500'} text-white font-semibold shadow-md border-0 px-3 py-1`}>
                              {offer.productCondition === 'novo' ? '✨ Novo' : '🔄 Seminovo'}
                            </Badge>
                          )}
                          {offer.offerType === 'min-purchase' && offer.minPurchaseValue && (
                            <Badge className="bg-gradient-to-r from-violet-500 to-purple-600 text-white font-semibold shadow-md border-0 px-3 py-1">💰 Mín. R$ {offer.minPurchaseValue.toFixed(2)}</Badge>
                          )}
                          {offer.isDelivery && (
                            <Badge className="bg-gradient-to-r from-teal-500 to-cyan-600 text-white font-semibold shadow-md border-0 px-3 py-1 flex items-center gap-1"><Truck className="w-3 h-3" />Delivery</Badge>
                          )}
                        </div>
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <CardTitle className="text-lg leading-tight">{offer.title}</CardTitle>
                            <CardDescription className="text-primary font-medium">{offer.business}</CardDescription>
                          </div>
                          <LikeButton offerId={offer.id} variant="compact" />
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3 sm:space-y-4 p-3 sm:p-6">
                        <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2">{offer.description}</p>
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-xl sm:text-2xl font-bold text-primary">{offer.finalPrice}</div>
                            <div className="text-xs sm:text-sm text-muted-foreground line-through">{offer.originalPrice}</div>
                          </div>
                          <div className="text-right">
                            <div className="text-xs sm:text-sm font-medium text-points">+{offer.points} pontos</div>
                          </div>
                        </div>
                        <div className="flex items-center justify-between text-sm text-muted-foreground">
                          <div className="flex items-center gap-1"><MapPin className="w-4 h-4" />{offer.distance !== null ? `${offer.distance.toFixed(1)} km` : '--'}</div>
                          <Countdown endDate={offer.validUntil} variant="compact" />
                        </div>
                        <Link to={`/ofertas/${offer.id}`}><Button className="w-full bg-gradient-primary">Ver oferta</Button></Link>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                /* List View */
                <div className="flex flex-col gap-3">
                  {sortedOffers.map((offer) => (
                    <Link key={offer.id} to={`/ofertas/${offer.id}`}>
                      <Card className="border-0 shadow-card hover:shadow-glow transition-all duration-300 cursor-pointer overflow-hidden">
                        <div className="flex flex-row">
                          {/* Image */}
                          <div className="relative w-28 sm:w-40 md:w-48 flex-shrink-0">
                            <img src={offer.image} alt={offer.title} className="w-full h-full object-cover min-h-[120px]" />
                            <div className="absolute top-2 left-2">
                              <Badge className="bg-gradient-points text-accent-foreground font-bold text-xs shadow-lg">{offer.discount} OFF</Badge>
                            </div>
                          </div>
                          {/* Content */}
                          <div className="flex-1 p-3 sm:p-4 flex flex-col justify-between min-w-0">
                            <div>
                              <div className="flex items-center gap-2 mb-1 flex-wrap">
                                <Badge className={`${getCategoryStyle(offer.category)} font-semibold border-0 px-2 py-0.5 text-xs`}>{offer.category}</Badge>
                                <Badge className={`${getOfferTypeStyle(offer.offerType)} font-semibold border-0 px-2 py-0.5 text-xs`}>{getOfferTypeLabel(offer.offerType)}</Badge>
                                {offer.isDelivery && (
                                  <Badge className="bg-gradient-to-r from-teal-500 to-cyan-600 text-white font-semibold border-0 px-2 py-0.5 text-xs flex items-center gap-1"><Truck className="w-3 h-3" />Delivery</Badge>
                                )}
                              </div>
                              <h3 className="font-semibold text-sm sm:text-base leading-tight truncate">{offer.title}</h3>
                              <p className="text-xs sm:text-sm text-primary font-medium">{offer.business}</p>
                              <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{offer.description}</p>
                            </div>
                            <div className="flex items-center justify-between mt-2">
                              <div className="flex items-center gap-3">
                                <span className="text-base sm:text-lg font-bold text-primary">{offer.finalPrice}</span>
                                <span className="text-xs text-muted-foreground line-through">{offer.originalPrice}</span>
                              </div>
                              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                <span className="font-medium text-points">+{offer.points} pts</span>
                                <span className="flex items-center gap-0.5"><Star className="w-3 h-3 fill-accent text-accent" />{offer.rating}</span>
                                <span className="flex items-center gap-0.5"><MapPin className="w-3 h-3" />{offer.distance !== null ? `${offer.distance.toFixed(1)}km` : '--'}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </Card>
                    </Link>
                  ))}
                </div>
              )}
            </>
          )}

          {/* Load More */}
          {!loading && sortedOffers.length > 0 && (
            <div className="text-center mt-12">
              <Button variant="outline" size="lg">
                Carregar mais ofertas
              </Button>
            </div>
          )}
        </div>
      </section>
      <BottomNavigation />
    </div>
  );
};

export default Offers;