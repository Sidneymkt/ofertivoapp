import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  HelpCircle, 
  Star, 
  Gift, 
  Megaphone, 
  BarChart3, 
  Users, 
  MessageSquare, 
  Phone, 
  Mail, 
  FileText,
  MapPin,
  Zap,
  TrendingUp
} from 'lucide-react';

interface SupportModalsProps {
  children: React.ReactNode;
  type: 'users' | 'business' | 'support';
}

export const SupportModals: React.FC<SupportModalsProps> = ({ children, type }) => {
  const [open, setOpen] = useState(false);

  const handleClose = () => setOpen(false);

  const openWhatsApp = () => {
    const message = 'Olá! Preciso de ajuda com o Ofertivo.';
    const phone = '5592999999999';
    const whatsappUrl = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  const openEmail = () => {
    const email = 'suporte@ofertivo.com.br';
    const subject = 'Solicitação de Suporte - Ofertivo';
    const body = 'Olá equipe Ofertivo,\n\nPreciso de ajuda com:\n\n[Descreva seu problema aqui]\n\nObrigado!';
    const mailtoUrl = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.open(mailtoUrl);
  };

  const renderUsersContent = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <HelpCircle className="w-5 h-5 text-primary" />
          Como funciona
        </h3>
        <div className="grid gap-4">
          <Card className="border-primary/20">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <MapPin className="w-5 h-5 text-primary" />
                <CardTitle className="text-base">1. Descubra ofertas próximas</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Use nossa tecnologia de geolocalização para encontrar as melhores ofertas ao seu redor
              </CardDescription>
            </CardContent>
          </Card>
          
          <Card className="border-secondary/20">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-secondary" />
                <CardTitle className="text-base">2. Faça check-in e valide</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Apresente o QR Code da oferta no estabelecimento e valide sua compra
              </CardDescription>
            </CardContent>
          </Card>
          
          <Card className="border-accent/20">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Star className="w-5 h-5 text-accent" />
                <CardTitle className="text-base">3. Ganhe pontos e recompensas</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Acumule pontos por cada interação e troque por prêmios incríveis
              </CardDescription>
            </CardContent>
          </Card>
        </div>
      </div>

      <Separator />

      <div>
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Star className="w-5 h-5 text-accent" />
          Ganhar pontos
        </h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-accent/10 rounded-lg">
            <span className="text-sm">Check-in em ofertas</span>
            <Badge variant="secondary">+50 pontos</Badge>
          </div>
          <div className="flex items-center justify-between p-3 bg-accent/10 rounded-lg">
            <span className="text-sm">Compartilhar ofertas</span>
            <Badge variant="secondary">+10 pontos</Badge>
          </div>
          <div className="flex items-center justify-between p-3 bg-accent/10 rounded-lg">
            <span className="text-sm">Indicar amigos</span>
            <Badge variant="secondary">+100 pontos</Badge>
          </div>
          <div className="flex items-center justify-between p-3 bg-accent/10 rounded-lg">
            <span className="text-sm">Avaliar estabelecimentos</span>
            <Badge variant="secondary">+25 pontos</Badge>
          </div>
        </div>
      </div>

      <Separator />

      <div>
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Gift className="w-5 h-5 text-primary" />
          Sorteios
        </h3>
        <Card className="bg-gradient-primary text-white border-0">
          <CardHeader>
            <CardTitle className="text-base">Participe de sorteios exclusivos!</CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription className="text-white/90">
              Use seus pontos para comprar bilhetes e concorrer a prêmios incríveis como smartphones, viagens e muito mais.
            </CardDescription>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  const renderBusinessContent = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Megaphone className="w-5 h-5 text-primary" />
          Anunciar
        </h3>
        <div className="grid gap-4">
          <Card className="border-primary/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Crie ofertas atrativas</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Monte promoções personalizadas com nossa inteligência artificial e atraia mais clientes
              </CardDescription>
            </CardContent>
          </Card>
          
          <Card className="border-secondary/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Geolocalização inteligente</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Suas ofertas aparecem automaticamente para usuários próximos ao seu estabelecimento
              </CardDescription>
            </CardContent>
          </Card>
        </div>
      </div>

      <Separator />

      <div>
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Users className="w-5 h-5 text-accent" />
          CRM
        </h3>
        <Card className="bg-accent/10 border-accent/20">
          <CardContent className="pt-6">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-accent rounded-full"></div>
                <span className="text-sm">Gerencie leads e clientes</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-accent rounded-full"></div>
                <span className="text-sm">Histórico de compras detalhado</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-accent rounded-full"></div>
                <span className="text-sm">Segmentação de clientes</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-accent rounded-full"></div>
                <span className="text-sm">Campanhas direcionadas</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Separator />

      <div>
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-primary" />
          Analytics
        </h3>
        <Card className="bg-gradient-secondary text-white border-0">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Métricas em tempo real
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-white/70">Visualizações</div>
                <div className="font-semibold">1.2k</div>
              </div>
              <div>
                <div className="text-white/70">Resgates</div>
                <div className="font-semibold">342</div>
              </div>
              <div>
                <div className="text-white/70">Taxa conversão</div>
                <div className="font-semibold">28.5%</div>
              </div>
              <div>
                <div className="text-white/70">ROI</div>
                <div className="font-semibold">+156%</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  const renderSupportContent = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-primary" />
          Central de ajuda
        </h3>
        <Card className="border-primary/20">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground mb-4">
              Encontre respostas rápidas para as perguntas mais frequentes ou entre em contato conosco.
            </p>
            <div className="flex flex-col gap-2">
              <Button variant="outline" className="justify-start h-auto p-3" onClick={handleClose}>
                <div className="text-left">
                  <div className="font-medium text-sm">Como criar minha primeira oferta?</div>
                  <div className="text-xs text-muted-foreground">Passo a passo completo</div>
                </div>
              </Button>
              <Button variant="outline" className="justify-start h-auto p-3" onClick={handleClose}>
                <div className="text-left">
                  <div className="font-medium text-sm">Como os pontos funcionam?</div>
                  <div className="text-xs text-muted-foreground">Sistema de gamificação</div>
                </div>
              </Button>
              <Button variant="outline" className="justify-start h-auto p-3" onClick={handleClose}>
                <div className="text-left">
                  <div className="font-medium text-sm">Política de reembolso</div>
                  <div className="text-xs text-muted-foreground">Termos e condições</div>
                </div>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <Separator />

      <div>
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Phone className="w-5 h-5 text-secondary" />
          Contato
        </h3>
        <div className="grid gap-3">
          <Button 
            onClick={openWhatsApp}
            className="justify-start h-auto p-4 bg-green-600 hover:bg-green-700 text-white"
          >
            <div className="flex items-center gap-3">
              <Phone className="w-5 h-5" />
              <div className="text-left">
                <div className="font-medium">WhatsApp</div>
                <div className="text-sm text-green-100">Atendimento rápido</div>
              </div>
            </div>
          </Button>
          
          <Button 
            onClick={openEmail}
            variant="outline" 
            className="justify-start h-auto p-4"
          >
            <div className="flex items-center gap-3">
              <Mail className="w-5 h-5" />
              <div className="text-left">
                <div className="font-medium">E-mail</div>
                <div className="text-sm text-muted-foreground">suporte@ofertivo.com.br</div>
              </div>
            </div>
          </Button>
        </div>
        
        <div className="mt-4 p-3 bg-muted/50 rounded-lg">
          <p className="text-sm font-medium mb-2">Horários de atendimento</p>
          <div className="text-xs text-muted-foreground space-y-1">
            <div>Segunda a Sexta: 8h às 18h</div>
            <div>Sábado: 8h às 14h</div>
            <div>Domingo: WhatsApp 24h</div>
          </div>
        </div>
      </div>

      <Separator />

      <div>
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <FileText className="w-5 h-5 text-accent" />
          Termos
        </h3>
        <Card className="bg-muted/30 border-muted">
          <CardContent className="pt-6">
            <div className="space-y-3 text-sm">
              <Button variant="link" className="p-0 h-auto text-left justify-start">
                Termos de Uso do Aplicativo
              </Button>
              <Button variant="link" className="p-0 h-auto text-left justify-start">
                Política de Privacidade
              </Button>
              <Button variant="link" className="p-0 h-auto text-left justify-start">
                Termos Comerciais para Anunciantes
              </Button>
              <Button variant="link" className="p-0 h-auto text-left justify-start">
                Política de Cookies
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  const getModalContent = () => {
    switch (type) {
      case 'users':
        return {
          title: 'Para usuários',
          description: 'Tudo sobre como aproveitar ao máximo o Ofertivo',
          content: renderUsersContent()
        };
      case 'business':
        return {
          title: 'Para negócios',
          description: 'Ferramentas para fazer seu negócio crescer',
          content: renderBusinessContent()
        };
      case 'support':
        return {
          title: 'Suporte',
          description: 'Central de ajuda e atendimento',
          content: renderSupportContent()
        };
      default:
        return null;
    }
  };

  const modalContent = getModalContent();
  if (!modalContent) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-2xl w-[95vw] sm:w-full max-h-[85vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="text-xl">{modalContent.title}</DialogTitle>
          <DialogDescription>{modalContent.description}</DialogDescription>
        </DialogHeader>
        {modalContent.content}
      </DialogContent>
    </Dialog>
  );
};