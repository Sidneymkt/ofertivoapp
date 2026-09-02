import { Link } from 'react-router-dom';
import { SEOHead } from '@/components/SEOHead';
import {
  Rocket, TrendingUp, Users, MapPin, Star, Zap, BarChart3, Gift,
  CheckCircle2, ArrowRight, Shield, Clock, Target, Sparkles, MessageCircle,
  Store, ChevronRight, Award, Heart, ArrowLeft, Coins, QrCode, Trophy,
  Megaphone, HandHeart, DollarSign, ShoppingBag, Timer, UserPlus, Eye,
  Handshake, Globe, Anchor, LayoutDashboard, Bell, Fish
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import anunciantesImg from '@/assets/anunciantes-manaus-1.jpg';
import anuncianteFelizImg from '@/assets/dona-maria-anunciante.png';
import featurePontosImg from '@/assets/feature-pontos-oficial.png';
import featureOfertasImg from '@/assets/feature-ofertas-oficial.png';
import featureSorteiosImg from '@/assets/feature-sorteios-oficial.png';
import featureCheckinImg from '@/assets/feature-checkin-oficial.png';
import featureVaquinhasImg from '@/assets/feature-vaquinhas-oficial.png';
import featureComunidadeImg from '@/assets/feature-comunidade-oficial.png';
import featureCrmImg from '@/assets/feature-crm-oficial.png';
import featurePatrocinioImg from '@/assets/feature-patrocinio-oficial.png';
import featurePescaImg from '@/assets/feature-pesca-oficial.png';

const AnuncieAqui = () => {
  const scrollToPlanos = () => {
    document.getElementById('planos')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <>
      <SEOHead
        title="Anuncie no Ofertivo | Atraia Mais Clientes Para Seu Negócio"
        description="Descubra como o Ofertivo pode transformar seu negócio local. Atraia novos clientes, fidelize os atuais e aumente suas vendas com ofertas inteligentes e geolocalização."
      />

      <div className="min-h-screen bg-background">
        {/* ===== BACK BUTTON BAR ===== */}
        <div className="bg-background border-b sticky top-0 z-50">
          <div className="container mx-auto px-4 py-3">
            <Button variant="ghost" size="sm" asChild>
              <Link to="/" className="flex items-center gap-2">
                <ArrowLeft className="w-4 h-4" />
                Voltar para o Site
              </Link>
            </Button>
          </div>
        </div>

        {/* ===== HERO SECTION ===== */}
        <section className="relative overflow-hidden bg-gradient-hero text-primary-foreground">
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-20 left-10 w-72 h-72 bg-white rounded-full blur-3xl animate-float" />
            <div className="absolute bottom-20 right-10 w-96 h-96 bg-white rounded-full blur-3xl animate-float" style={{ animationDelay: '1.5s' }} />
          </div>

          <div className="container mx-auto px-4 py-16 md:py-24 relative z-10">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center max-w-6xl mx-auto">
              <div className="space-y-6 text-center lg:text-left">
              <Badge className="bg-white/20 text-white border-white/30 text-sm px-4 py-1.5 backdrop-blur-sm">
                <Sparkles className="w-4 h-4 mr-1.5" />
                Plataforma #1 de ofertas locais na sua cidade
              </Badge>

              <h1 className="text-3xl xs:text-4xl md:text-5xl lg:text-6xl font-extrabold leading-tight tracking-tight">
                Seu negócio merece ser{' '}
                <span className="underline decoration-accent decoration-4 underline-offset-4">
                  descoberto
                </span>{' '}
                por milhares de clientes
              </h1>

              <p className="text-lg md:text-xl text-white/90 max-w-2xl mx-auto leading-relaxed">
                Pare de depender apenas de quem passa na porta. Com o Ofertivo, seu estabelecimento aparece 
                para <strong>consumidores ativos</strong> que estão buscando exatamente o que você oferece — 
                no momento certo, no lugar certo.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
                <Button
                  size="lg"
                  className="bg-accent text-accent-foreground hover:bg-accent/90 text-base font-bold px-8 py-6 shadow-lg transform hover:scale-105 transition-all"
                  onClick={scrollToPlanos}
                >
                  Quero Atrair Mais Clientes
                  <ArrowRight className="w-5 h-5 ml-1" />
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="border-white/40 text-white hover:bg-white/10 text-base px-8 py-6"
                  asChild
                >
                  <a href="https://wa.me/5592991812914?text=Olá! Quero saber mais sobre o Ofertivo para meu negócio" target="_blank" rel="noopener noreferrer">
                    <MessageCircle className="w-5 h-5 mr-1" />
                    Falar com Consultor
                  </a>
                </Button>
              </div>

              {/* Urgency */}
              <div className="flex items-center justify-center lg:justify-start gap-2 text-sm text-white/80 pt-2">
                <Clock className="w-4 h-4" />
                <span>Vagas limitadas para novos anunciantes na sua região</span>
              </div>
              </div>

              {/* Hero Image */}
              <div>
                <img 
                  src={anunciantesImg} 
                  alt="Anunciantes felizes usando o Ofertivo na sua cidade" 
                  className="rounded-2xl shadow-2xl w-full object-cover max-h-[280px] lg:max-h-[420px] border-4 border-white/20 mx-auto"
                  loading="lazy"
                />
              </div>
            </div>
          </div>

          {/* Wave divider */}
          <div className="absolute bottom-0 left-0 right-0">
            <svg viewBox="0 0 1440 80" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M0,40 C360,80 720,0 1080,40 C1260,60 1380,50 1440,40 L1440,80 L0,80 Z" fill="hsl(var(--background))" />
            </svg>
          </div>
        </section>

        {/* ===== PAIN POINTS / PROBLEM SECTION ===== */}
        <section className="py-16 md:py-20 bg-background">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto text-center space-y-4 mb-12">
              <h2 className="text-2xl md:text-3xl font-bold text-foreground">
                Você se identifica com algum desses problemas?
              </h2>
              <p className="text-muted-foreground">Se a resposta for "sim" para pelo menos um, o Ofertivo foi feito para você.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
              {[
                { icon: Users, text: 'Poucos clientes novos entrando no seu negócio' },
                { icon: TrendingUp, text: 'Dificuldade em medir o retorno do marketing' },
                { icon: Target, text: 'Investiu em panfletos e redes sociais sem resultado' },
                { icon: MapPin, text: 'Pessoas passam perto e não sabem que você existe' },
                { icon: Star, text: 'Clientes vêm uma vez e não voltam mais' },
                { icon: BarChart3, text: 'Não sabe quem são seus melhores clientes' },
              ].map((item, i) => (
                <Card key={i} className="border-destructive/20 bg-destructive/5 hover:shadow-md transition-shadow">
                  <CardContent className="p-5 flex items-start gap-3">
                    <item.icon className="w-6 h-6 text-destructive shrink-0 mt-0.5" />
                    <p className="text-sm font-medium text-foreground">{item.text}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* ===== SOLUTION / HOW IT WORKS ===== */}
        <section className="py-16 md:py-20 bg-muted/50">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto text-center space-y-4 mb-14">
              <Badge variant="secondary" className="text-sm px-4 py-1">
                <Rocket className="w-4 h-4 mr-1" />
                Como Funciona
              </Badge>
              <h2 className="text-2xl md:text-3xl font-bold text-foreground">
                3 passos simples para lotar seu negócio
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
              {[
                {
                  step: '01',
                  icon: Store,
                  title: 'Cadastre seu negócio',
                  desc: 'Em poucos minutos, crie seu perfil comercial completo com fotos, localização e categoria.'
                },
                {
                  step: '02',
                  icon: Zap,
                  title: 'Crie ofertas irresistíveis',
                  desc: 'Use nossa IA para criar títulos e descrições que convertem. Publique ofertas em segundos.'
                },
                {
                  step: '03',
                  icon: TrendingUp,
                  title: 'Receba clientes reais',
                  desc: 'Consumidores próximos veem suas ofertas, visitam seu negócio e você acompanha tudo em tempo real.'
                },
              ].map((item, i) => (
                <div key={i} className="relative group">
                  <Card className="border-none shadow-card hover:shadow-primary transition-all duration-300 h-full">
                    <CardContent className="p-6 text-center space-y-4">
                      <div className="w-14 h-14 rounded-2xl bg-gradient-hero flex items-center justify-center mx-auto text-primary-foreground shadow-primary">
                        <item.icon className="w-7 h-7" />
                      </div>
                      <span className="text-xs font-bold text-primary tracking-widest uppercase">Passo {item.step}</span>
                      <h3 className="text-lg font-bold text-foreground">{item.title}</h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
                    </CardContent>
                  </Card>
                  {i < 2 && (
                    <div className="hidden md:flex absolute top-1/2 -right-6 transform -translate-y-1/2 z-10">
                      <ChevronRight className="w-8 h-8 text-primary/30" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ===== BENEFITS / FEATURES ===== */}
        <section className="py-16 md:py-20 bg-background">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto text-center space-y-4 mb-14">
              <h2 className="text-2xl md:text-3xl font-bold text-foreground">
                Tudo que você precisa para{' '}
                <span className="text-primary">vender mais</span>
              </h2>
              <p className="text-muted-foreground">Ferramentas poderosas que grandes empresas usam, agora acessíveis para o seu negócio.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
              {[
                { icon: MapPin, title: 'Geolocalização Inteligente', desc: 'Seus anúncios aparecem para quem está perto do seu negócio, no momento ideal.' },
                { icon: BarChart3, title: 'Dashboard Completo', desc: 'Veja visualizações, cliques, check-ins e conversões em tempo real.' },
                { icon: Users, title: 'CRM de Clientes', desc: 'Saiba quem são seus clientes, quando voltam e o que preferem.' },
                { icon: Gift, title: 'Sistema de Pontos', desc: 'Fidelização automática: clientes ganham pontos e voltam para usar.' },
                { icon: Zap, title: 'IA para Ofertas', desc: 'Nossa IA cria títulos e descrições que aumentam suas conversões.' },
                { icon: Award, title: 'Sorteios e Gamificação', desc: 'Engaje seus clientes com sorteios exclusivos e conquistas.' },
              ].map((item, i) => (
                <Card key={i} className="group hover:shadow-primary hover:border-primary/30 transition-all duration-300">
                  <CardContent className="p-6 space-y-3">
                    <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                      <item.icon className="w-5 h-5" />
                    </div>
                    <h3 className="font-bold text-foreground">{item.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* ===== ANUNCIANTES IMAGE SECTION ===== */}
        <section className="py-12 md:py-16 bg-background">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center max-w-5xl mx-auto">
              <div>
                <img 
                  src={anuncianteFelizImg} 
                  alt="Dona Maria, artesã do Amazonas, mostrando o app Ofertivo em sua loja" 
                  className="rounded-2xl shadow-lg w-full object-cover max-h-[400px]"
                  loading="lazy"
                />
              </div>
              <div className="space-y-4">
                <h2 className="text-2xl md:text-3xl font-bold text-foreground">
                  Comerciantes da sua cidade já estão{' '}
                  <span className="text-primary">vendendo mais</span>
                </h2>
                <p className="text-muted-foreground leading-relaxed">
                  De mercadinhos de bairro a hamburgueiras artesanais, empreendedores de toda a sua cidade estão usando 
                  o Ofertivo para atrair clientes novos, fidelizar os antigos e aumentar o faturamento — 
                  tudo de forma simples e acessível.
                </p>
                <Button size="lg" className="font-bold" asChild>
                  <Link to="/cadastro/negocio">
                    Cadastrar Meu Negócio
                    <ArrowRight className="w-5 h-5 ml-1" />
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* ===== SOCIAL PROOF / TESTIMONIALS ===== */}
        <section className="py-16 md:py-20 bg-muted/50">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto text-center space-y-4 mb-14">
              <Badge variant="outline" className="text-sm px-4 py-1">
                <Heart className="w-4 h-4 mr-1 text-destructive fill-destructive" />
                Prova Social
              </Badge>
              <h2 className="text-2xl md:text-3xl font-bold text-foreground">
                Quem usa, recomenda
              </h2>
              <p className="text-muted-foreground">Veja o que outros empreendedores da sua cidade estão dizendo.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
              {[
                {
                  name: 'Luciana R.',
                  business: 'Café & Coworking',
                  quote: 'Em 2 semanas, tive mais clientes novos do que em 3 meses de panfletagem. O mapa do Ofertivo é genial!',
                  rating: 5,
                },
                {
                  name: 'Carlos M.',
                  business: 'Mercadinho Boa Esperança',
                  quote: 'Achei que seria difícil de usar, mas é muito simples. Meus clientes adoram os pontos e voltam sempre.',
                  rating: 5,
                },
                {
                  name: 'Diego C.',
                  business: 'Hamburgueria Artesanal',
                  quote: 'Os sorteios foram um sucesso! Aumentei meu faturamento em 40% no primeiro mês. Recomendo demais.',
                  rating: 5,
                },
              ].map((t, i) => (
                <Card key={i} className="border-none shadow-card">
                  <CardContent className="p-6 space-y-4">
                    <div className="flex gap-0.5">
                      {Array.from({ length: t.rating }).map((_, j) => (
                        <Star key={j} className="w-4 h-4 text-accent fill-accent" />
                      ))}
                    </div>
                    <p className="text-sm text-foreground italic leading-relaxed">"{t.quote}"</p>
                    <div className="pt-2 border-t border-border">
                      <p className="font-semibold text-sm text-foreground">{t.name}</p>
                      <p className="text-xs text-muted-foreground">{t.business}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Stats bar */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto mt-14">
              {[
                { value: '500+', label: 'Negócios cadastrados' },
                { value: '15.000+', label: 'Usuários ativos' },
                { value: '98%', label: 'Satisfação' },
                { value: '3x', label: 'Mais clientes em média' },
              ].map((s, i) => (
                <div key={i} className="text-center">
                  <p className="text-2xl md:text-3xl font-extrabold text-primary">{s.value}</p>
                  <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ===== PLATFORM FEATURES DEEP DIVE ===== */}
        <section className="py-16 md:py-24 bg-background">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto text-center space-y-4 mb-16">
              <Badge variant="secondary" className="text-sm px-4 py-1.5">
                <Sparkles className="w-4 h-4 mr-1" />
                Ecossistema Completo
              </Badge>
              <h2 className="text-2xl md:text-3xl font-bold text-foreground">
                Conheça tudo que o Ofertivo oferece
              </h2>
              <p className="text-muted-foreground max-w-xl mx-auto">
                Uma plataforma completa que conecta consumidores e negócios locais com inteligência, gamificação e transparência.
              </p>
            </div>

            <div className="space-y-16 max-w-5xl mx-auto">

              {/* --- Sistema de Pontos --- */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                      <Coins className="w-5 h-5 text-primary" />
                    </div>
                    <h3 className="text-xl font-bold text-foreground">🎯 Sistema de Pontos</h3>
                  </div>
                  <p className="text-muted-foreground leading-relaxed">
                    O consumidor acumula pontos ao realizar check-ins, comentar, avaliar estabelecimentos, participar de sorteios, compartilhar promoções, indicar amigos ou apoiar vaquinhas.
                  </p>
                  <p className="text-muted-foreground leading-relaxed">
                    Os pontos funcionam como moeda digital interna (<strong className="text-foreground">100 pontos = R$1</strong>) e podem ser usados para sorteios, benefícios exclusivos ou doações para campanhas sociais.
                  </p>
                </div>
                <div className="flex justify-center">
                  <img src={featurePontosImg} alt="Tela oficial do sistema de pontos do app Ofertivo" className="w-full max-w-[380px] object-contain drop-shadow-2xl" loading="lazy" />
                </div>
              </div>

              <Separator />

              {/* --- Criação de Ofertas --- */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                <div className="order-2 md:order-1 flex justify-center">
                  <img src={featureOfertasImg} alt="Tela oficial de detalhe da oferta no app Ofertivo" className="w-full max-w-[380px] object-contain drop-shadow-2xl" loading="lazy" />
                </div>
                <div className="order-1 md:order-2 space-y-4">
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
                      <Megaphone className="w-5 h-5 text-accent" />
                    </div>
                    <h3 className="text-xl font-bold text-foreground">🛍️ Criação de Ofertas</h3>
                  </div>
                  <p className="text-muted-foreground leading-relaxed">
                    O anunciante publica promoções de forma rápida e inteligente, com apoio de <strong className="text-foreground">Inteligência Artificial</strong> para textos persuasivos. Defina tipo, imagens (até 4 fotos), prazo, limite de uso e ative check-in com QR Code.
                  </p>
                  <p className="text-muted-foreground leading-relaxed">
                    Cada oferta aparece no feed e no <strong className="text-foreground">mapa interativo por geolocalização</strong>, com métricas em tempo real de visualizações, cliques e conversões.
                  </p>
                </div>
              </div>

              <Separator />

              {/* --- Sistema de Sorteios --- */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 rounded-xl bg-secondary/10 flex items-center justify-center">
                      <Gift className="w-5 h-5 text-secondary" />
                    </div>
                    <h3 className="text-xl font-bold text-foreground">🎉 Sorteios Inteligentes</h3>
                  </div>
                  <p className="text-muted-foreground leading-relaxed">
                    Empresas criam sorteios personalizados vinculados às suas ofertas, definindo prêmio, duração e regras. Usuários participam com pontos acumulados, incentivando engajamento contínuo.
                  </p>
                  <p className="text-muted-foreground leading-relaxed">
                    O sistema executa seleção automática, <strong className="text-foreground">auditável e justa</strong>, com visualização de participantes em tempo real e exibição instantânea do vencedor.
                  </p>
                </div>
                <div className="flex justify-center">
                  <img src={featureSorteiosImg} alt="Tela oficial do sistema de sorteios do app Ofertivo" className="w-full max-w-[380px] object-contain drop-shadow-2xl" loading="lazy" />
                </div>
              </div>

              <Separator />

              {/* --- Check-in --- */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                <div className="order-2 md:order-1 flex justify-center">
                  <img src={featureCheckinImg} alt="Tela oficial de check-in confirmado no app Ofertivo" className="w-full max-w-[380px] object-contain drop-shadow-2xl" loading="lazy" />
                </div>
                <div className="order-1 md:order-2 space-y-4">
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                      <QrCode className="w-5 h-5 text-primary" />
                    </div>
                    <h3 className="text-xl font-bold text-foreground">📍 Check-in de Ofertas</h3>
                  </div>
                  <p className="text-muted-foreground leading-relaxed">
                    Quando o cliente chega ao estabelecimento, realiza o check-in por <strong className="text-foreground">QR Code exclusivo</strong> ou código validado pelo anunciante. Cada check-in gera um registro único, evitando fraudes.
                  </p>
                  <p className="text-muted-foreground leading-relaxed">
                    O usuário recebe pontos de recompensa e o anunciante visualiza conversões, fluxo de clientes e desempenho da campanha — tudo integrado ao painel.
                  </p>
                </div>
              </div>

              <Separator />

              {/* --- Vaquinhas --- */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 rounded-xl bg-secondary/10 flex items-center justify-center">
                      <HandHeart className="w-5 h-5 text-secondary" />
                    </div>
                    <h3 className="text-xl font-bold text-foreground">💚 Vaquinhas com PIX</h3>
                  </div>
                  <p className="text-muted-foreground leading-relaxed">
                    Usuários e instituições verificados criam campanhas para arrecadar apoio via <strong className="text-foreground">PIX</strong>. Após confirmação automática, o valor é convertido em pontos (<strong className="text-foreground">100 pts = R$1</strong>).
                  </p>
                  <p className="text-muted-foreground leading-relaxed">
                    Cada vaquinha exibe meta, prazo, progresso em tempo real e lista de apoiadores (com opção de anonimato). Transparência total no histórico de transações.
                  </p>
                </div>
                <div className="flex justify-center">
                  <img src={featureVaquinhasImg} alt="Tela oficial de vaquinhas em destaque na Comunidade Ofertivo" className="w-full max-w-[380px] object-contain drop-shadow-2xl" loading="lazy" />
                </div>
              </div>

              <Separator />

              {/* --- Patrocínio --- */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                <div className="order-2 md:order-1 flex justify-center">
                  <img src={featurePatrocinioImg} alt="Tela oficial de Patrocínios via PIX no app Ofertivo" className="w-full max-w-[380px] object-contain drop-shadow-2xl" loading="lazy" />
                </div>
                <div className="order-1 md:order-2 space-y-4">
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
                      <Handshake className="w-5 h-5 text-accent" />
                    </div>
                    <h3 className="text-xl font-bold text-foreground">💼 Patrocínio via PIX</h3>
                  </div>
                  <p className="text-muted-foreground leading-relaxed">
                    Empresas apoiam campanhas e ações da comunidade via <strong className="text-foreground">PIX</strong>. O valor investido é convertido em créditos e vantagens estratégicas dentro da plataforma.
                  </p>
                  <p className="text-muted-foreground leading-relaxed">
                    O anunciante acompanha métricas como alcance, cliques e engajamento, garantindo <strong className="text-foreground">retorno estratégico</strong> sobre o valor patrocinado.
                  </p>
                </div>
              </div>

              <Separator />

              {/* --- Tipos de Promoções --- */}
              <div className="space-y-6">
                <div className="text-center space-y-2">
                  <h3 className="text-xl font-bold text-foreground">🔥 Tipos de Promoções</h3>
                  <p className="text-sm text-muted-foreground">Cada tipo de oferta foi pensado para uma estratégia diferente</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {[
                    { icon: Timer, title: 'Oferta Relâmpago', desc: 'Tempo extremamente limitado para gerar urgência e aumentar o fluxo rápido.', color: 'text-destructive' },
                    { icon: UserPlus, title: 'Primeiro Uso', desc: 'Desconto exclusivo para a primeira compra, convertendo novos usuários em clientes.', color: 'text-primary' },
                    { icon: QrCode, title: 'Check-in Premiado', desc: 'Pontos e benefícios ao validar presença via QR Code e geolocalização.', color: 'text-secondary' },
                    { icon: ShoppingBag, title: 'Combo Econômico', desc: '"Leve mais por menos" — eleva o ticket médio e estimula compras em grupo.', color: 'text-accent' },
                    { icon: DollarSign, title: 'Compra Acima de Valor', desc: 'Benefício liberado ao atingir valor mínimo, estimulando upgrades no pedido.', color: 'text-primary' },
                  ].map((item, i) => (
                    <Card key={i} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-4 space-y-2">
                        <div className="flex items-center gap-2">
                          <item.icon className={`w-5 h-5 ${item.color}`} />
                          <h4 className="font-bold text-sm text-foreground">{item.title}</h4>
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed">{item.desc}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              <Separator />

              {/* --- Comunidade --- */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                      <Globe className="w-5 h-5 text-primary" />
                    </div>
                    <h3 className="text-xl font-bold text-foreground">🤝 Comunidade Ofertivo</h3>
                  </div>
                  <p className="text-muted-foreground leading-relaxed">
                    Consumidores e anunciantes conectados em um ambiente interativo. Crie perfil público, interaja via comentários, acompanhe negócios, apoie vaquinhas e troque pontos.
                  </p>
                  <p className="text-muted-foreground leading-relaxed">
                    Anunciantes publicam novidades, respondem clientes e oferecem recompensas exclusivas. Tudo com moderação, transparência e foco em <strong className="text-foreground">economia colaborativa local</strong>.
                  </p>
                </div>
                <div className="flex justify-center">
                  <img src={featureComunidadeImg} alt="Tela oficial do feed da Comunidade Ofertivo" className="w-full max-w-[380px] object-contain drop-shadow-2xl" loading="lazy" />
                </div>
              </div>

              <Separator />

              {/* --- Pesca Digital --- */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                <div className="order-2 md:order-1 flex justify-center">
                  <img src={featurePescaImg} alt="Tela oficial da Pesca Digital com radar de clientes próximos" className="w-full max-w-[380px] object-contain drop-shadow-2xl" loading="lazy" />
                </div>
                <div className="order-1 md:order-2 space-y-4">
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                      <Anchor className="w-5 h-5 text-primary" />
                    </div>
                    <h3 className="text-xl font-bold text-foreground">🎣 Pesca Digital</h3>
                  </div>
                  <p className="text-muted-foreground leading-relaxed">
                    Enquanto muitos negócios esperam o cliente aparecer, a <strong className="text-foreground">Pesca Digital vai até ele</strong>. Sua empresa deixa de depender do boca a boca e passa a ser encontrada por quem realmente está pronto para comprar no seu bairro.
                  </p>
                  <p className="text-muted-foreground leading-relaxed">
                    Com ofertas inteligentes, sistema de recompensas, notificações e presença digital ativa, você atrai, engaja e fideliza clientes de forma automática. Chega de invisibilidade — <strong className="text-foreground">o cliente já está perto, falta você aparecer</strong>.
                  </p>
                </div>
              </div>

              <Separator />

              {/* --- CRM Kanban --- */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
                      <LayoutDashboard className="w-5 h-5 text-accent" />
                    </div>
                    <h3 className="text-xl font-bold text-foreground">💼 CRM com Kanban</h3>
                  </div>
                  <p className="text-muted-foreground leading-relaxed">
                    Organize e acompanhe todos os <strong className="text-foreground">leads gerados pelas ofertas e sorteios</strong> com um funil visual Kanban. Acompanhe cada etapa: Novo Lead, Interessado, Cliente e Perdido.
                  </p>
                  <p className="text-muted-foreground leading-relaxed">
                    Integrado às campanhas da plataforma, o sistema mostra desempenho, conversões e oportunidades em tempo real. <strong className="text-foreground">Transforme engajamento em faturamento</strong> com gestão estratégica.
                  </p>
                </div>
                <div className="flex justify-center">
                  <img src={featureCrmImg} alt="Tela oficial do CRM Kanban no app Ofertivo" className="w-full max-w-[380px] object-contain drop-shadow-2xl" loading="lazy" />
                </div>
              </div>

            </div>
          </div>
        </section>


        <section id="planos" className="py-16 md:py-20 bg-background scroll-mt-8">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto text-center space-y-4 mb-14">
              <h2 className="text-2xl md:text-3xl font-bold text-foreground">
                Planos que cabem no bolso do seu negócio
              </h2>
              <p className="text-muted-foreground">Comece grátis. Escale quando quiser. Sem surpresas.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
              {[
                {
                  name: 'Start',
                  price: 'R$ 9,99',
                  period: '/mês',
                  desc: 'Pacote de teste inicial',
                  isTestPackage: true,
                  popular: false,
                  credits: '1.000',
                  features: [
                    '1 oferta ativa',
                    '1 sorteio ativo',
                    'Perfil no mapa',
                    'Check-in por QR Code',
                    'Estatísticas básicas',
                  ],
                },
                {
                  name: 'Essencial',
                  price: 'R$ 29,99',
                  period: '/mês',
                  desc: 'Para crescer com consistência',
                  popular: false,
                  credits: '5.000',
                  features: [
                    '5 ofertas ativas',
                    '2 sorteios ativos',
                    'Suporte básico',
                    'Estatísticas básicas',
                    'Dashboard completo',
                  ],
                },
                {
                  name: 'Pro',
                  price: 'R$ 59,99',
                  period: '/mês',
                  desc: 'Para escalar com inteligência',
                  popular: true,
                  credits: '12.000',
                  features: [
                    '15 ofertas ativas',
                    '5 sorteios ativos',
                    'CRM avançado',
                    'Estatísticas detalhadas',
                    'Suporte prioritário',
                    'IA para ofertas',
                  ],
                },
                {
                  name: 'Premium',
                  price: 'R$ 129,99',
                  period: '/mês',
                  desc: 'Para dominar sua região',
                  popular: false,
                  credits: '30.000',
                  features: [
                    '30 ofertas ativas',
                    '10 sorteios ativos',
                    'CRM completo',
                    'IA para otimização',
                    'Suporte 24/7',
                    'Análises avançadas',
                  ],
                },
              ].map((plan, i) => (
                <Card
                  key={i}
                  className={`relative overflow-hidden transition-all duration-300 hover:shadow-lg ${
                    plan.popular ? 'border-primary shadow-primary ring-2 ring-primary/20 scale-[1.02]' : ''
                  } ${(plan as any).isTestPackage ? 'opacity-90 border-dashed' : ''}`}
                >
                  {plan.popular && (
                    <div className="absolute top-0 right-0 bg-primary text-primary-foreground text-xs font-bold px-3 py-1 rounded-bl-lg">
                      MAIS POPULAR
                    </div>
                  )}
                  {(plan as any).isTestPackage && (
                    <div className="absolute top-0 left-0 bg-muted-foreground/80 text-background text-xs font-bold px-3 py-1 rounded-br-lg">
                      PACOTE TESTE
                    </div>
                  )}
                  <CardContent className="p-6 space-y-5">
                    <div>
                      <h3 className="font-bold text-lg text-foreground">{plan.name}</h3>
                      <p className="text-xs text-muted-foreground">{plan.desc}</p>
                    </div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-extrabold text-foreground">{plan.price}</span>
                      {plan.period && <span className="text-sm text-muted-foreground">{plan.period}</span>}
                    </div>
                    <div className="flex items-center gap-1.5 bg-primary/10 rounded-lg px-3 py-1.5">
                      <Zap className="w-4 h-4 text-primary" />
                      <span className="text-sm font-bold text-primary">{plan.credits} créditos</span>
                      <span className="text-xs text-muted-foreground">/mês</span>
                    </div>
                    <Separator />
                    <ul className="space-y-2.5">
                      {plan.features.map((f, j) => (
                        <li key={j} className="flex items-start gap-2 text-sm text-foreground">
                          <CheckCircle2 className="w-4 h-4 text-secondary shrink-0 mt-0.5" />
                          {f}
                        </li>
                      ))}
                    </ul>
                    <Button
                      className={`w-full font-bold ${
                        plan.popular ? 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-primary' : ''
                      }`}
                      variant={plan.popular ? 'default' : 'outline'}
                      size="lg"
                      asChild
                    >
                      <Link to="/cadastro/negocio">
                        Começar Agora
                        <ArrowRight className="w-4 h-4 ml-1" />
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* ===== GUARANTEE / OBJECTION HANDLING ===== */}
        <section className="py-16 md:py-20 bg-muted/50">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto text-center space-y-8">
              <div className="w-16 h-16 rounded-full bg-secondary/10 flex items-center justify-center mx-auto">
                <Shield className="w-8 h-8 text-secondary" />
              </div>
              <h2 className="text-2xl md:text-3xl font-bold text-foreground">
                Sem risco. Sem compromisso.
              </h2>
              <p className="text-muted-foreground max-w-xl mx-auto leading-relaxed">
                Comece com o plano gratuito e veja os resultados antes de investir. 
                Nos planos pagos, você pode cancelar a qualquer momento — sem multa, sem burocracia.
                <strong> Se não gostar nos primeiros 7 dias, devolvemos seu dinheiro.</strong>
              </p>

              <div className="flex flex-wrap justify-center gap-6 pt-4">
                {[
                  { icon: Shield, text: 'Garantia de 7 dias' },
                  { icon: Clock, text: 'Cancele quando quiser' },
                  { icon: CheckCircle2, text: 'Sem taxa de adesão' },
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm text-foreground font-medium">
                    <item.icon className="w-5 h-5 text-secondary" />
                    {item.text}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ===== FAQ ===== */}
        <section className="py-16 md:py-20 bg-background">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto text-center space-y-4 mb-12">
              <h2 className="text-2xl md:text-3xl font-bold text-foreground">Perguntas Frequentes</h2>
            </div>

            <div className="max-w-2xl mx-auto space-y-4">
              {[
                { q: 'Preciso saber mexer com tecnologia?', a: 'Não! O Ofertivo foi criado para ser simples. Se você sabe usar WhatsApp, consegue usar o Ofertivo. E ainda temos suporte para te ajudar.' },
                { q: 'Quanto tempo leva para ver resultados?', a: 'Muitos negócios veem os primeiros clientes já na primeira semana. Depende da atratividade da oferta e localização.' },
                { q: 'Posso cancelar a qualquer momento?', a: 'Sim! Sem multa, sem carência. Você só paga enquanto usa. E o plano gratuito é para sempre.' },
                { q: 'O Ofertivo funciona para qualquer tipo de negócio?', a: 'Sim! Restaurantes, salões, mercados, academias, oficinas, clínicas... qualquer negócio que atenda clientes localmente.' },
                { q: 'Como os clientes encontram minhas ofertas?', a: 'Através do mapa interativo, feed personalizado, notificações e compartilhamento entre usuários. Tudo baseado em geolocalização.' },
              ].map((item, i) => (
                <Card key={i} className="border-none shadow-card">
                  <CardContent className="p-5">
                    <h4 className="font-bold text-foreground mb-2">{item.q}</h4>
                    <p className="text-sm text-muted-foreground leading-relaxed">{item.a}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* ===== FINAL CTA ===== */}
        <section className="py-16 md:py-24 bg-gradient-hero text-primary-foreground relative overflow-hidden">
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-10 right-20 w-64 h-64 bg-white rounded-full blur-3xl animate-float" />
          </div>

          <div className="container mx-auto px-4 relative z-10">
            <div className="max-w-3xl mx-auto text-center space-y-6">
              <h2 className="text-2xl md:text-4xl font-extrabold leading-tight">
                Não fique invisível enquanto seus concorrentes crescem
              </h2>
              <p className="text-lg text-white/90 max-w-xl mx-auto">
                Cada dia sem o Ofertivo é um dia que clientes estão escolhendo outros negócios. 
                Comece agora — é grátis.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
                <Button
                  size="lg"
                  className="bg-accent text-accent-foreground hover:bg-accent/90 text-base font-bold px-10 py-6 shadow-lg transform hover:scale-105 transition-all"
                  asChild
                >
                  <Link to="/cadastro/negocio">
                    <Rocket className="w-5 h-5 mr-1" />
                    Cadastrar Meu Negócio Grátis
                  </Link>
                </Button>
              </div>

              <p className="text-sm text-white/70 pt-2">
                ✓ Sem cartão de crédito &nbsp; ✓ Ativação imediata &nbsp; ✓ Suporte incluso
              </p>
            </div>
          </div>
        </section>

        {/* ===== MINI FOOTER ===== */}
        <footer className="py-6 bg-card border-t">
          <div className="container mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-muted-foreground">
            <p>© {new Date().getFullYear()} Ofertivo. Todos os direitos reservados.</p>
            <div className="flex gap-4">
              <Link to="/" className="hover:text-primary transition-colors">Plataforma</Link>
              <Link to="/termos" className="hover:text-primary transition-colors">Termos de Uso</Link>
              <Link to="/suporte" className="hover:text-primary transition-colors">Suporte</Link>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
};

export default AnuncieAqui;
