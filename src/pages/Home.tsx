import React, { useEffect } from 'react';
import { ActiveAdvertisersBar } from '@/components/ActiveAdvertisersBar';
import { useNavigate, Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Navigation } from '@/components/ui/navigation';
import { BottomNavigation } from '@/components/ui/bottom-navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FeaturedOffersCarousel } from '@/components/FeaturedOffersCarousel';
import { RecentOffersCarousel } from '@/components/RecentOffersCarousel';
import { FeaturedRaffles } from '@/components/FeaturedRaffles';
import { FeaturedCampaigns } from '@/components/FeaturedCampaigns';
import { SocialProof } from '@/components/SocialProof';
import { VideoPopup } from '@/components/VideoPopup';
import { WelcomeBonusModal } from '@/components/WelcomeBonusModal';
import { OffersProximityRadar } from '@/components/OffersProximityRadar';
import { MapPin, Zap, Users, Star, Tag, Heart } from 'lucide-react';
import { FEATURED_CATEGORIES } from '@/lib/categories';
import { SupportModals } from '@/components/SupportModals';
import { supabase } from '@/integrations/supabase/client';
import heroImage from '@/assets/hero-image.jpg';
import featuresIcon from '@/assets/features-icon.jpg';
import { SEOHead } from '@/components/SEOHead';
import { useAuth } from '@/hooks/useAuth';
const Home = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // Fetch custom hero background from platform settings
  const {
    data: customHeroUrl
  } = useQuery({
    queryKey: ['hero-background'],
    queryFn: async () => {
      const {
        data,
        error
      } = await supabase.from('platform_settings').select('setting_value').eq('setting_key', 'hero_background_url').eq('is_active', true).maybeSingle();
      if (error) throw error;
      return (data?.setting_value as any)?.url || null;
    },
    staleTime: 0,
    refetchOnWindowFocus: true,
    refetchOnMount: true
  });

  // Real-time subscription for hero background updates
  useEffect(() => {
    const channel = supabase.channel('hero-background-updates').on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'platform_settings',
      filter: 'setting_key=eq.hero_background_url'
    }, () => {
      console.log('Hero background updated, refreshing...');
      queryClient.invalidateQueries({
        queryKey: ['hero-background']
      });
    }).subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);
  const heroBackgroundSrc = customHeroUrl || heroImage;
  return <>
      <SEOHead title="Ofertas e sorteios na sua cidade" description="Descubra ofertas incríveis em negócios locais, acumule pontos e participe de sorteios exclusivos com o Ofertivo." image={typeof heroBackgroundSrc === 'string' ? heroBackgroundSrc : undefined} type="website" url="/" />
      
      {/* Video Popup */}
      <VideoPopup />
      
      <div className="min-h-screen bg-background pb-20 md:pb-0">
      {/* Header */}
      <header className="border-b sticky top-0 bg-background/95 backdrop-blur-sm z-50">
        <div className="container mx-auto px-3 sm:px-4 py-3 sm:py-4">
          <Navigation />
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative min-h-[35vh] sm:min-h-[40vh] flex items-center justify-center overflow-hidden py-6 sm:py-8">
        <img src={heroBackgroundSrc} alt="Background" loading="eager" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-r from-primary/80 to-secondary/60" />
        
        <div className="relative z-10 text-center text-white max-w-4xl mx-auto px-4 w-full">
          <h1 className="text-2xl xs:text-3xl sm:text-4xl md:text-5xl font-bold mb-3 sm:mb-4 animate-fade-in">
            Descubra ofertas
            <span className="block bg-gradient-points bg-clip-text text-transparent">
              incríveis na Cidade
            </span>
          </h1>
          <p className="text-sm sm:text-lg md:text-xl mb-4 sm:mb-6 text-white/90 animate-fade-in px-2" style={{
            animationDelay: '0.2s'
          }}>
            Conecte-se com negócios locais, ganhe pontos e participe de sorteios exclusivos
          </p>
          <div className="flex flex-col gap-3 sm:gap-4 sm:flex-row justify-center animate-fade-in px-2" style={{
            animationDelay: '0.4s'
          }}>
            <Button variant="hero" size="lg" className="text-base sm:text-lg px-8 sm:px-10 py-4 sm:py-5 w-full sm:w-auto font-semibold shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300 border-2 border-primary-foreground/20" onClick={() => navigate('/cadastro/consumidor')}>
              Começar agora
            </Button>
            <Button variant="outline" size="lg" className="text-base sm:text-lg px-8 sm:px-10 py-4 sm:py-5 bg-white/15 border-2 border-white text-white hover:bg-white/30 hover:scale-105 transition-all duration-300 w-full sm:w-auto font-semibold shadow-xl backdrop-blur-sm" onClick={() => navigate('/cadastro/negocio')}>
              Sou um comerciante
            </Button>
          </div>

          {/* Scroll indicator */}
          <div className="hidden md:flex justify-center mt-6 animate-fade-in" style={{
            animationDelay: '0.6s'
          }}>
            <a href="#categorias" className="text-white/90 hover:text-white transition-colors text-sm">
              <span className="block mb-1">Descubra mais</span>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mx-auto" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
              </svg>
            </a>
          </div>
        </div>
      </section>

      {/* Active Advertisers Bar */}
      <ActiveAdvertisersBar />

      {/* Categories Section */}
      <section id="categorias" className="py-8 sm:py-16 bg-background">
        <div className="container mx-auto px-2 sm:px-4">
          <h2 className="text-2xl sm:text-3xl font-bold mb-4 sm:mb-6 text-center text-foreground">Categorias Populares</h2>
          
          {/* Quick Actions */}
          <div className="flex flex-col xs:flex-row justify-center gap-2 sm:gap-4 mb-6 sm:mb-8 px-2">
            <Button size="default" className="bg-gradient-primary hover:shadow-glow transition-all duration-300 px-4 sm:px-8 text-sm sm:text-base w-full xs:w-auto" onClick={() => navigate('/mapa')}>
              <MapPin className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
              Próximo a mim
            </Button>
            <Button variant="outline" size="default" className="border-primary/30 hover:bg-primary/10 px-4 sm:px-8 text-sm sm:text-base w-full xs:w-auto" onClick={() => navigate('/ofertas')}>
              <Tag className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
              Todas as Ofertas
            </Button>
          </div>
          
          <div className="relative group">
            {/* Fade indicators for scroll */}
            <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-background to-transparent z-10 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-background to-transparent z-10 pointer-events-none" />
            
            <div className="overflow-x-auto scrollbar-hide -mx-4 px-4 snap-x snap-mandatory">
              <div className="flex gap-2 sm:gap-3 pb-3 w-max py-1">
                {FEATURED_CATEGORIES.map(({ icon: Icon, shortLabel, value }) => (
                  <Button
                    key={value}
                    variant="outline"
                    onClick={() => navigate(`/ofertas?categoria=${value}`)}
                    className="snap-start rounded-full border-border/60 bg-card hover:bg-primary/10 hover:border-primary/40 text-foreground cursor-pointer whitespace-nowrap flex-shrink-0 text-xs sm:text-sm px-3 sm:px-5 py-2 sm:py-2.5 h-auto shadow-sm hover:shadow-md transition-all duration-200 hover:scale-105 active:scale-95"
                  >
                    <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2 text-primary" />
                    {shortLabel}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Welcome Bonus Modal (shows only for new users) */}
      <WelcomeBonusModal />

      {/* Recent Offers Carousel */}
      <RecentOffersCarousel />

      {/* Proximity Radar */}
      <OffersProximityRadar />

      {/* Featured Offers Carousel */}
      <FeaturedOffersCarousel />

      {/* Featured Raffles */}
      <FeaturedRaffles />

      {/* Featured Campaigns */}
      <FeaturedCampaigns />

      {/* Features Section */}
      <section className="py-10 sm:py-20 bg-muted/30">
        <div className="container mx-auto px-2 sm:px-4">
          <div className="text-center mb-8 sm:mb-16">
            <h2 className="text-2xl sm:text-4xl font-bold mb-3 sm:mb-4 text-foreground">
              Como funciona o Ofertivo
            </h2>
            <p className="text-base sm:text-xl text-muted-foreground max-w-3xl mx-auto px-2">
              Uma plataforma completa que conecta você às melhores ofertas da sua cidade
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-8">
            <Card className="border-0 bg-card shadow-card hover:shadow-glow transition-all duration-300 transform hover:scale-105">
              <CardHeader className="text-center p-3 sm:p-6">
                <div className="w-10 h-10 sm:w-16 sm:h-16 bg-gradient-primary rounded-full flex items-center justify-center mx-auto mb-2 sm:mb-4">
                  <MapPin className="w-5 h-5 sm:w-8 sm:h-8 text-white" />
                </div>
                <CardTitle className="text-sm sm:text-xl">Localização</CardTitle>
              </CardHeader>
              <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0">
                <CardDescription className="text-center text-xs sm:text-sm">
                  Encontre ofertas próximas a você com nossa tecnologia de geolocalização
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="border-0 bg-card shadow-card hover:shadow-glow transition-all duration-300 transform hover:scale-105">
              <CardHeader className="text-center p-3 sm:p-6">
                <div className="w-10 h-10 sm:w-16 sm:h-16 bg-gradient-secondary rounded-full flex items-center justify-center mx-auto mb-2 sm:mb-4">
                  <Zap className="w-5 h-5 sm:w-8 sm:h-8 text-white" />
                </div>
                <CardTitle className="text-sm sm:text-xl">Check-in</CardTitle>
              </CardHeader>
              <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0">
                <CardDescription className="text-center text-xs sm:text-sm">
                  Use QR codes para validar suas compras e ganhar pontos automaticamente
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="border-0 bg-card shadow-card hover:shadow-glow transition-all duration-300 transform hover:scale-105">
              <CardHeader className="text-center p-3 sm:p-6">
                <div className="w-10 h-10 sm:w-16 sm:h-16 bg-gradient-points rounded-full flex items-center justify-center mx-auto mb-2 sm:mb-4">
                  <Star className="w-5 h-5 sm:w-8 sm:h-8 text-accent-foreground" />
                </div>
                <CardTitle className="text-sm sm:text-xl">Gamificação</CardTitle>
              </CardHeader>
              <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0">
                <CardDescription className="text-center text-xs sm:text-sm">
                  Acumule pontos por engajamento e participe de sorteios exclusivos
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="border-0 bg-card shadow-card hover:shadow-glow transition-all duration-300 transform hover:scale-105">
              <CardHeader className="text-center p-3 sm:p-6">
                <div className="w-10 h-10 sm:w-16 sm:h-16 bg-gradient-primary rounded-full flex items-center justify-center mx-auto mb-2 sm:mb-4">
                  <Users className="w-5 h-5 sm:w-8 sm:h-8 text-white" />
                </div>
                <CardTitle className="text-sm sm:text-xl">Comunidade</CardTitle>
              </CardHeader>
              <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0">
                <CardDescription className="text-center text-xs sm:text-sm">
                  Conecte-se com outros usuários, compartilhe e descubra novas ofertas
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="border-0 bg-card shadow-card hover:shadow-glow transition-all duration-300 transform hover:scale-105 col-span-2 md:col-span-1">
              <CardHeader className="text-center p-3 sm:p-6">
                <div className="w-10 h-10 sm:w-16 sm:h-16 bg-gradient-to-br from-destructive to-destructive/70 rounded-full flex items-center justify-center mx-auto mb-2 sm:mb-4">
                  <Heart className="w-5 h-5 sm:w-8 sm:h-8 text-white fill-white" />
                </div>
                <CardTitle className="text-sm sm:text-xl">Vaquinhas Digitais</CardTitle>
              </CardHeader>
              <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0">
                <CardDescription className="text-center text-xs sm:text-sm">
                  Doe seus pontos para causas importantes. Cada 100 pontos equivale a R$1 de desconto real
                </CardDescription>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Social Proof */}
      <SocialProof />

      {/* Stats Section */}
      <section className="py-10 sm:py-20 bg-primary text-white">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-3 gap-4 sm:gap-8 text-center">
            <div className="animate-fade-in">
              <div className="text-2xl sm:text-5xl font-bold mb-1 sm:mb-2 text-accent">29+</div>
              <div className="text-xs sm:text-xl text-white/90">Negócios parceiros</div>
            </div>
            <div className="animate-fade-in" style={{
              animationDelay: '0.2s'
            }}>
              <div className="text-2xl sm:text-5xl font-bold mb-1 sm:mb-2 text-accent">1k+</div>
              <div className="text-xs sm:text-xl text-white/90">Usuários ativos</div>
            </div>
            <div className="animate-fade-in" style={{
              animationDelay: '0.4s'
            }}>
              <div className="text-2xl sm:text-5xl font-bold mb-1 sm:mb-2 text-accent">2k+</div>
              <div className="text-xs sm:text-xl text-white/90">Ofertas encontradas</div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Anunciantes */}
      <section className="py-12 sm:py-20 bg-card border-t border-b">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-center gap-8 md:gap-12">
            <div className="flex-1 text-center md:text-left">
              <span className="inline-block px-3 py-1 rounded-full bg-accent/20 text-accent text-xs font-bold uppercase tracking-wider mb-4">
                Para negócios
              </span>
              <h2 className="text-2xl sm:text-4xl font-bold mb-4 text-foreground">
                Leve seu negócio para o <span className="text-primary">próximo nível</span>
              </h2>
              <p className="text-base sm:text-lg text-muted-foreground mb-6 max-w-lg">
                Alcance milhares de clientes na sua região com ofertas inteligentes, CRM integrado e analytics em tempo real. Comece grátis hoje!
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center md:justify-start">
                <Button variant="hero" size="lg" className="text-base sm:text-lg px-8 py-4 animate-pulse hover:animate-none" onClick={() => navigate('/anuncie')}>
                  🔥 Anuncie no Ofertivo
                </Button>
                <Button variant="outline" size="lg" className="text-base px-6 py-4" onClick={() => navigate('/anuncie')}>
                  Ver planos
                </Button>
              </div>
            </div>
            <div className="flex-shrink-0 grid grid-cols-2 gap-4 text-center">
              <div className="bg-primary/10 rounded-2xl p-4 sm:p-6">
                <div className="text-2xl sm:text-3xl font-bold text-primary">+300%</div>
                <div className="text-xs sm:text-sm text-muted-foreground mt-1">Mais visibilidade</div>
              </div>
              <div className="bg-accent/10 rounded-2xl p-4 sm:p-6">
                <div className="text-2xl sm:text-3xl font-bold text-accent">Grátis</div>
                <div className="text-xs sm:text-sm text-muted-foreground mt-1">Para começar</div>
              </div>
              <div className="bg-emerald-500/10 rounded-2xl p-4 sm:p-6">
                <div className="text-2xl sm:text-3xl font-bold text-emerald-500">CRM</div>
                <div className="text-xs sm:text-sm text-muted-foreground mt-1">Integrado</div>
              </div>
              <div className="bg-purple-500/10 rounded-2xl p-4 sm:p-6">
                <div className="text-2xl sm:text-3xl font-bold text-purple-500">IA</div>
                <div className="text-xs sm:text-sm text-muted-foreground mt-1">Marketing</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-10 sm:py-20 bg-gradient-hero text-white">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-2xl sm:text-4xl md:text-5xl font-bold mb-4 sm:mb-6">
            Pronto para começar?
          </h2>
          <p className="text-base sm:text-xl mb-6 sm:mb-8 text-white/90 max-w-2xl mx-auto px-2">
            Junte-se à maior comunidade de ofertas da sua cidade e comece a economizar hoje mesmo
          </p>
          <Button variant="points" size="lg" className="text-base sm:text-lg px-6 sm:px-8 py-3 sm:py-4" onClick={() => navigate('/cadastro/consumidor')}>
            Criar conta grátis
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-foreground text-background py-8 sm:py-12 pb-24 sm:pb-12">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8">
            <div>
              <h3 className="text-2xl font-bold mb-4 bg-gradient-primary bg-clip-text text-transparent">
                Ofertivo
              </h3>
              <p className="text-muted">A plataforma que conecta a cidade através de ofertas e recompensas.</p>
            </div>
            <div>
              <SupportModals type="users">
                <button className="text-left">
                  <h4 className="font-semibold mb-4">Para usuários</h4>
                </button>
              </SupportModals>
              <ul className="space-y-2 text-muted">
                <li>
                  <SupportModals type="users">
                    <button className="hover:text-background text-left">Como funciona</button>
                  </SupportModals>
                </li>
                <li>
                  <SupportModals type="users">
                    <button className="hover:text-background text-left">Ganhar pontos</button>
                  </SupportModals>
                </li>
                <li>
                  <SupportModals type="users">
                    <button className="hover:text-background text-left">Sorteios</button>
                  </SupportModals>
                </li>
              </ul>
            </div>
            <div>
              <SupportModals type="business">
                <button className="text-left">
                  <h4 className="font-semibold mb-4">Para negócios</h4>
                </button>
              </SupportModals>
              <ul className="space-y-2 text-muted">
                <li>
                  <Link to="/anuncie" className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-accent text-accent-foreground font-semibold text-sm hover:bg-accent/80 transition-colors">
                    🔥 Anunciar
                  </Link>
                </li>
                <li>
                  <SupportModals type="business">
                    <button className="hover:text-background text-left">CRM</button>
                  </SupportModals>
                </li>
                <li>
                  <SupportModals type="business">
                    <button className="hover:text-background text-left">Analytics</button>
                  </SupportModals>
                </li>
              </ul>
            </div>
            <div>
              <SupportModals type="support">
                <button className="text-left">
                  <h4 className="font-semibold mb-4">Suporte</h4>
                </button>
              </SupportModals>
              <ul className="space-y-2 text-muted">
                <li>
                  <SupportModals type="support">
                    <button className="hover:text-background text-left">Central de ajuda</button>
                  </SupportModals>
                </li>
                <li>
                  <SupportModals type="support">
                    <button className="hover:text-background text-left">Contato</button>
                  </SupportModals>
                </li>
                <li>
                  <SupportModals type="support">
                    <button className="hover:text-background text-left">Termos</button>
                  </SupportModals>
                </li>
              </ul>
            </div>
          </div>
          <div className="border-t border-muted mt-8 pt-8 text-center text-muted">
            {/* App Store Badges */}
            <div className="flex flex-wrap gap-3 justify-center mb-6">
              <a href="#" aria-label="Baixar na App Store" className="hover:opacity-80 transition-opacity bg-black rounded-lg px-1 py-0.5">
                <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/3/3c/Download_on_the_App_Store_Badge.svg/1280px-Download_on_the_App_Store_Badge.svg.png" alt="Disponível na App Store" className="h-10 w-auto" loading="lazy" />
              </a>
              <a href="#" aria-label="Baixar na Google Play" className="hover:opacity-80 transition-opacity bg-black rounded-lg px-1 py-0.5">
                <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/7/78/Google_Play_Store_badge_EN.svg/1024px-Google_Play_Store_badge_EN.svg.png" alt="Disponível na Google Play" className="h-10 w-auto" loading="lazy" />
              </a>
            </div>
            <p>&copy; 2025 Ofertivo. Todos os direitos reservados.</p>
          </div>
        </div>
      </footer>
      <BottomNavigation />
    </div>
  </>;
};
export default Home;