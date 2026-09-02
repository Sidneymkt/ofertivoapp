import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Navigation } from '@/components/ui/navigation';
import { BottomNavigation } from '@/components/ui/bottom-navigation';
import { 
  ArrowLeft, 
  HelpCircle, 
  MessageSquare, 
  Phone, 
  Mail, 
  Clock,
  Send,
  ExternalLink,
  Smartphone,
  MapPin,
  Star,
  Gift,
  Users,
  Zap
} from 'lucide-react';

interface FAQ {
  id: string;
  question: string;
  answer: string;
  category: string;
}

const Support = () => {
  const [contactForm, setContactForm] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  });

  const faqs: FAQ[] = [
    {
      id: '1',
      question: 'Como criar minha conta no Ofertivo?',
      answer: 'Para criar sua conta, clique em "Cadastrar" na tela inicial, preencha seus dados básicos como nome, e-mail e telefone. Você receberá um código de verificação por SMS para confirmar sua conta.',
      category: 'conta'
    },
    {
      id: '2',
      question: 'Como funciona o sistema de pontos?',
      answer: 'Você ganha pontos por várias atividades: check-in em ofertas (+50 pts), compartilhar ofertas (+10 pts), indicar amigos (+100 pts) e avaliar estabelecimentos (+25 pts). Os pontos podem ser trocados por recompensas ou usados para comprar bilhetes de sorteios.',
      category: 'pontos'
    },
    {
      id: '3',
      question: 'Como fazer check-in em uma oferta?',
      answer: 'Após chegar ao estabelecimento, abra a oferta no app, toque em "Check-in" e apresente o QR Code para o comerciante. Após a validação, você receberá os pontos automaticamente.',
      category: 'ofertas'
    },
    {
      id: '4',
      question: 'Como participar dos sorteios?',
      answer: 'Use seus pontos para comprar bilhetes dos sorteios ativos. Cada sorteio tem um preço específico em pontos. Quanto mais bilhetes, maiores suas chances de ganhar!',
      category: 'sorteios'
    },
    {
      id: '5',
      question: 'Não consigo ver ofertas próximas a mim',
      answer: 'Verifique se você permitiu o acesso à localização no seu dispositivo. Vá em Configurações > Apps > Ofertivo > Permissões > Localização e selecione "Permitir sempre" ou "Permitir apenas durante o uso do app".',
      category: 'tecnico'
    },
    {
      id: '6',
      question: 'Como indicar um amigo?',
      answer: 'No seu perfil, toque em "Indicar Amigos" e compartilhe seu código de indicação. Quando seu amigo se cadastrar usando seu código e fizer seu primeiro check-in, vocês dois ganham 100 pontos!',
      category: 'indicacao'
    },
    {
      id: '7',
      question: 'Posso usar uma oferta mais de uma vez?',
      answer: 'Depende do tipo de oferta. Ofertas regulares podem ter múltiplos usos, enquanto ofertas especiais como "Primeira Compra" são limitadas. Verifique sempre os termos de cada oferta.',
      category: 'ofertas'
    },
    {
      id: '8',
      question: 'Como atualizar meus dados pessoais?',
      answer: 'Vá em "Perfil" > "Editar Perfil" e atualize suas informações. Lembre-se de confirmar alterações no e-mail ou telefone através dos códigos enviados.',
      category: 'conta'
    }
  ];

  const handleContactSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Implementar envio do formulário
    console.log('Formulário enviado:', contactForm);
    alert('Mensagem enviada com sucesso! Retornaremos em até 24 horas.');
    setContactForm({ name: '', email: '', subject: '', message: '' });
  };

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

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b sticky top-0 bg-background/95 backdrop-blur-sm z-50">
        <div className="container mx-auto px-4 py-4">
          <Navigation />
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Back button and header */}
        <div className="flex items-center gap-4 mb-6">
          <Link to="/">
            <Button variant="ghost" size="sm" className="gap-2">
              <ArrowLeft className="w-4 h-4" />
              Voltar
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Central de Ajuda</h1>
            <p className="text-muted-foreground">
              Encontre respostas rápidas ou entre em contato conosco
            </p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid md:grid-cols-3 gap-4 mb-8">
          <Card className="border-primary/20 hover:border-primary/40 transition-colors cursor-pointer"
                onClick={openWhatsApp}>
            <CardHeader className="text-center pb-3">
              <Phone className="w-8 h-8 text-green-600 mx-auto mb-2" />
              <CardTitle className="text-lg">WhatsApp</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <CardDescription>
                Atendimento rápido via WhatsApp
              </CardDescription>
              <Badge variant="secondary" className="mt-2">Disponível 24h</Badge>
            </CardContent>
          </Card>

          <Card className="border-secondary/20 hover:border-secondary/40 transition-colors cursor-pointer"
                onClick={openEmail}>
            <CardHeader className="text-center pb-3">
              <Mail className="w-8 h-8 text-secondary mx-auto mb-2" />
              <CardTitle className="text-lg">E-mail</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <CardDescription>
                suporte@ofertivo.com.br
              </CardDescription>
              <Badge variant="outline" className="mt-2">Resposta em 24h</Badge>
            </CardContent>
          </Card>

          <Link to="/termos">
            <Card className="border-accent/20 hover:border-accent/40 transition-colors cursor-pointer h-full">
              <CardHeader className="text-center pb-3">
                <ExternalLink className="w-8 h-8 text-accent mx-auto mb-2" />
                <CardTitle className="text-lg">Termos e Políticas</CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <CardDescription>
                  Termos de uso e privacidade
                </CardDescription>
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="faq" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="faq" className="flex items-center gap-2">
              <HelpCircle className="w-4 h-4" />
              Perguntas Frequentes
            </TabsTrigger>
            <TabsTrigger value="contact" className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              Fale Conosco
            </TabsTrigger>
            <TabsTrigger value="guides" className="flex items-center gap-2">
              <Smartphone className="w-4 h-4" />
              Guias
            </TabsTrigger>
          </TabsList>

          {/* FAQ Tab */}
          <TabsContent value="faq" className="space-y-6">
            <div>
              <h2 className="text-2xl font-semibold mb-4">Perguntas Frequentes</h2>
              <Accordion type="single" collapsible className="w-full">
                {faqs.map((faq) => (
                  <AccordionItem key={faq.id} value={faq.id}>
                    <AccordionTrigger className="text-left">
                      {faq.question}
                    </AccordionTrigger>
                    <AccordionContent className="text-muted-foreground">
                      {faq.answer}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          </TabsContent>

          {/* Contact Tab */}
          <TabsContent value="contact" className="space-y-6">
            <div>
              <h2 className="text-2xl font-semibold mb-4">Fale Conosco</h2>
              
              {/* Contact Form */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Send className="w-5 h-5" />
                    Enviar Mensagem
                  </CardTitle>
                  <CardDescription>
                    Descreva sua dúvida ou problema e nossa equipe responderá em até 24 horas
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleContactSubmit} className="space-y-4">
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="name">Nome completo</Label>
                        <Input
                          id="name"
                          value={contactForm.name}
                          onChange={(e) => setContactForm({...contactForm, name: e.target.value})}
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="email">E-mail</Label>
                        <Input
                          id="email"
                          type="email"
                          value={contactForm.email}
                          onChange={(e) => setContactForm({...contactForm, email: e.target.value})}
                          required
                        />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="subject">Assunto</Label>
                      <Input
                        id="subject"
                        value={contactForm.subject}
                        onChange={(e) => setContactForm({...contactForm, subject: e.target.value})}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="message">Mensagem</Label>
                      <Textarea
                        id="message"
                        rows={5}
                        value={contactForm.message}
                        onChange={(e) => setContactForm({...contactForm, message: e.target.value})}
                        placeholder="Descreva sua dúvida ou problema..."
                        required
                      />
                    </div>
                    <Button type="submit" className="w-full">
                      <Send className="w-4 h-4 mr-2" />
                      Enviar Mensagem
                    </Button>
                  </form>
                </CardContent>
              </Card>

              {/* Contact Info */}
              <Card className="bg-muted/30">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="w-5 h-5" />
                    Horários de Atendimento
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Segunda a Sexta:</span>
                      <span className="font-medium">8h às 18h</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Sábado:</span>
                      <span className="font-medium">8h às 14h</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Domingo:</span>
                      <span className="font-medium">WhatsApp 24h</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Guides Tab */}
          <TabsContent value="guides" className="space-y-6">
            <div>
              <h2 className="text-2xl font-semibold mb-4">Guias de Uso</h2>
              
              <div className="grid md:grid-cols-2 gap-6">
                <Card className="border-primary/20">
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-gradient-primary rounded-full flex items-center justify-center">
                        <MapPin className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">Como encontrar ofertas</CardTitle>
                        <CardDescription>Descubra promoções próximas</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    <div className="flex items-start gap-2">
                      <div className="w-6 h-6 bg-primary/20 rounded-full flex items-center justify-center mt-0.5">
                        <span className="text-xs font-medium text-primary">1</span>
                      </div>
                      <div>Permita acesso à localização quando solicitado</div>
                    </div>
                    <div className="flex items-start gap-2">
                      <div className="w-6 h-6 bg-primary/20 rounded-full flex items-center justify-center mt-0.5">
                        <span className="text-xs font-medium text-primary">2</span>
                      </div>
                      <div>Navegue pelo feed ou use o mapa interativo</div>
                    </div>
                    <div className="flex items-start gap-2">
                      <div className="w-6 h-6 bg-primary/20 rounded-full flex items-center justify-center mt-0.5">
                        <span className="text-xs font-medium text-primary">3</span>
                      </div>
                      <div>Use filtros para encontrar o que procura</div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-secondary/20">
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-gradient-secondary rounded-full flex items-center justify-center">
                        <Zap className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">Como fazer check-in</CardTitle>
                        <CardDescription>Valide compras e ganhe pontos</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    <div className="flex items-start gap-2">
                      <div className="w-6 h-6 bg-secondary/20 rounded-full flex items-center justify-center mt-0.5">
                        <span className="text-xs font-medium text-secondary">1</span>
                      </div>
                      <div>Chegue ao estabelecimento da oferta</div>
                    </div>
                    <div className="flex items-start gap-2">
                      <div className="w-6 h-6 bg-secondary/20 rounded-full flex items-center justify-center mt-0.5">
                        <span className="text-xs font-medium text-secondary">2</span>
                      </div>
                      <div>Abra a oferta e toque em "Check-in"</div>
                    </div>
                    <div className="flex items-start gap-2">
                      <div className="w-6 h-6 bg-secondary/20 rounded-full flex items-center justify-center mt-0.5">
                        <span className="text-xs font-medium text-secondary">3</span>
                      </div>
                      <div>Apresente o QR Code ao comerciante</div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-accent/20">
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-gradient-points rounded-full flex items-center justify-center">
                        <Star className="w-6 h-6 text-accent-foreground" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">Sistema de pontos</CardTitle>
                        <CardDescription>Maximize suas recompensas</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span>Check-in em ofertas</span>
                      <Badge variant="secondary">+50 pts</Badge>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span>Compartilhar ofertas</span>
                      <Badge variant="secondary">+10 pts</Badge>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span>Indicar amigos</span>
                      <Badge variant="secondary">+100 pts</Badge>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-primary/20">
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-gradient-primary rounded-full flex items-center justify-center">
                        <Gift className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">Sorteios e recompensas</CardTitle>
                        <CardDescription>Troque pontos por prêmios</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="text-sm space-y-2">
                    <p>Use seus pontos acumulados para:</p>
                    <ul className="space-y-1 ml-4">
                      <li>• Comprar bilhetes de sorteios</li>
                      <li>• Trocar por descontos exclusivos</li>
                      <li>• Concorrer a prêmios incríveis</li>
                    </ul>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <BottomNavigation />
    </div>
  );
};

export default Support;