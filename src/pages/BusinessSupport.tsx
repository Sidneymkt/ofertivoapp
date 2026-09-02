import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { 
  ArrowLeft, 
  MessageCircle, 
  HelpCircle, 
  Send,
  Clock,
  CheckCircle,
  AlertCircle,
  Phone,
  Mail
} from 'lucide-react';

interface SupportTicket {
  id: string;
  subject: string;
  description: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  created_at: string;
  updated_at: string;
}

interface FAQ {
  id: string;
  question: string;
  answer: string;
  category: string;
}

const BusinessSupport = () => {
  const { user } = useAuth();
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [faqs] = useState<FAQ[]>([
    {
      id: '1',
      question: 'Como criar uma nova oferta?',
      answer: 'Para criar uma nova oferta, acesse o menu "Minhas Ofertas" e clique em "Nova Oferta". Preencha os dados da promoção, defina preços e validade, e publique.',
      category: 'ofertas'
    },
    {
      id: '2',
      question: 'Como funciona o sistema de pontos?',
      answer: 'O sistema de pontos permite que seus clientes ganhem pontos por interações e os usem em sorteios. Você define quantos pontos cada ação vale.',
      category: 'pontos'
    },
    {
      id: '3',
      question: 'Posso mudar meu plano a qualquer momento?',
      answer: 'Sim! Você pode fazer upgrade ou downgrade do seu plano a qualquer momento. As mudanças são aplicadas no próximo ciclo de cobrança.',
      category: 'planos'
    },
    {
      id: '4',
      question: 'Como acompanhar o desempenho das minhas ofertas?',
      answer: 'No dashboard você encontra estatísticas detalhadas de visualizações, cliques, conversões e ROI de todas as suas campanhas.',
      category: 'estatisticas'
    },
    {
      id: '5',
      question: 'Como exportar minha lista de leads?',
      answer: 'No CRM, você pode exportar sua lista de leads e clientes em formato Excel através do botão "Exportar Excel".',
      category: 'crm'
    }
  ]);
  const [newTicket, setNewTicket] = useState({
    subject: '',
    description: '',
    priority: 'medium' as const
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      loadTickets();
    }
  }, [user]);

  const loadTickets = async () => {
    try {
      // Para demo, usar dados mock
      const mockTickets: SupportTicket[] = [
        {
          id: '1',
          subject: 'Problema para criar oferta com desconto',
          description: 'Não consigo definir desconto acima de 80% na criação da oferta.',
          status: 'in_progress',
          priority: 'medium',
          created_at: '2025-01-06T10:00:00Z',
          updated_at: '2025-01-06T14:30:00Z'
        },
        {
          id: '2',
          subject: 'Dúvida sobre upgrade de plano',
          description: 'Gostaria de saber as vantagens do plano Premium em relação ao Pro.',
          status: 'resolved',
          priority: 'low',
          created_at: '2025-01-03T16:20:00Z',
          updated_at: '2025-01-04T09:15:00Z'
        }
      ];
      setTickets(mockTickets);
    } catch (error) {
      console.error('Error loading tickets:', error);
    }
  };

  const createTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTicket.subject.trim() || !newTicket.description.trim()) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    setLoading(true);
    try {
      // Para demo, apenas adicionar ao estado local
      const ticket: SupportTicket = {
        id: Date.now().toString(),
        subject: newTicket.subject,
        description: newTicket.description,
        priority: newTicket.priority,
        status: 'open',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      setTickets(prev => [ticket, ...prev]);
      setNewTicket({ subject: '', description: '', priority: 'medium' });
      toast.success('Ticket criado com sucesso! Nossa equipe entrará em contato em breve.');
    } catch (error) {
      toast.error('Erro ao criar ticket. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'open':
        return <Badge variant="outline" className="text-warning"><Clock className="w-3 h-3 mr-1" />Aberto</Badge>;
      case 'in_progress':
        return <Badge className="bg-secondary"><AlertCircle className="w-3 h-3 mr-1" />Em Andamento</Badge>;
      case 'resolved':
        return <Badge className="bg-success"><CheckCircle className="w-3 h-3 mr-1" />Resolvido</Badge>;
      case 'closed':
        return <Badge variant="secondary">Fechado</Badge>;
      default:
        return <Badge variant="outline">Status</Badge>;
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return <Badge variant="destructive">Urgente</Badge>;
      case 'high':
        return <Badge className="bg-warning">Alta</Badge>;
      case 'medium':
        return <Badge variant="outline">Média</Badge>;
      case 'low':
        return <Badge variant="secondary">Baixa</Badge>;
      default:
        return <Badge variant="outline">Prioridade</Badge>;
    }
  };

  const openWhatsApp = () => {
    const message = 'Olá! Preciso de ajuda com minha conta no Ofertivo Business.';
    const phone = '5592999999999'; // Número de suporte fictício
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link to="/anunciante/dashboard" className="flex items-center gap-2 text-muted-foreground hover:text-foreground">
                <ArrowLeft className="w-4 h-4" />
                Voltar
              </Link>
              <h1 className="text-xl font-semibold">Suporte</h1>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <Tabs defaultValue="faq" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="faq">FAQ</TabsTrigger>
            <TabsTrigger value="tickets">Meus Tickets</TabsTrigger>
            <TabsTrigger value="contact">Contato</TabsTrigger>
          </TabsList>

          <TabsContent value="faq" className="space-y-6">
            <Card className="border-0 shadow-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <HelpCircle className="w-5 h-5" />
                  Perguntas Frequentes
                </CardTitle>
                <CardDescription>
                  Encontre respostas para as dúvidas mais comuns
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Accordion type="single" collapsible className="space-y-2">
                  {faqs.map((faq) => (
                    <AccordionItem key={faq.id} value={faq.id} className="border border-border rounded-lg px-4">
                      <AccordionTrigger className="text-left">
                        {faq.question}
                      </AccordionTrigger>
                      <AccordionContent className="text-muted-foreground">
                        {faq.answer}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="tickets" className="space-y-6">
            {/* Criar Novo Ticket */}
            <Card className="border-0 shadow-card">
              <CardHeader>
                <CardTitle>Abrir Novo Ticket</CardTitle>
                <CardDescription>
                  Descreva sua dúvida ou problema detalhadamente
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={createTicket} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="md:col-span-2">
                      <Input
                        placeholder="Assunto do ticket"
                        value={newTicket.subject}
                        onChange={(e) => setNewTicket(prev => ({ ...prev, subject: e.target.value }))}
                        required
                      />
                    </div>
                    <Select value={newTicket.priority} onValueChange={(value: any) => setNewTicket(prev => ({ ...prev, priority: value }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Baixa Prioridade</SelectItem>
                        <SelectItem value="medium">Média Prioridade</SelectItem>
                        <SelectItem value="high">Alta Prioridade</SelectItem>
                        <SelectItem value="urgent">Urgente</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Textarea
                    placeholder="Descreva seu problema ou dúvida com o máximo de detalhes possível..."
                    value={newTicket.description}
                    onChange={(e) => setNewTicket(prev => ({ ...prev, description: e.target.value }))}
                    rows={4}
                    required
                  />
                  <Button type="submit" disabled={loading} className="bg-gradient-primary">
                    <Send className="w-4 h-4 mr-2" />
                    {loading ? 'Enviando...' : 'Enviar Ticket'}
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Lista de Tickets */}
            <Card className="border-0 shadow-card">
              <CardHeader>
                <CardTitle>Histórico de Tickets</CardTitle>
                <CardDescription>
                  Acompanhe o status dos seus tickets de suporte
                </CardDescription>
              </CardHeader>
              <CardContent>
                {tickets.length === 0 ? (
                  <div className="text-center py-8">
                    <MessageCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">Nenhum ticket encontrado</h3>
                    <p className="text-muted-foreground">
                      Você ainda não criou nenhum ticket de suporte.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {tickets.map((ticket) => (
                      <div key={ticket.id} className="border border-border rounded-lg p-4 space-y-3">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h3 className="font-semibold mb-1">{ticket.subject}</h3>
                            <p className="text-sm text-muted-foreground line-clamp-2">
                              {ticket.description}
                            </p>
                          </div>
                          <div className="flex gap-2 ml-4">
                            {getStatusBadge(ticket.status)}
                            {getPriorityBadge(ticket.priority)}
                          </div>
                        </div>
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>Criado em {new Date(ticket.created_at).toLocaleDateString('pt-BR')}</span>
                          <span>Atualizado em {new Date(ticket.updated_at).toLocaleDateString('pt-BR')}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="contact" className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <Card className="border-0 shadow-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MessageCircle className="w-5 h-5" />
                    WhatsApp
                  </CardTitle>
                  <CardDescription>
                    Fale conosco diretamente pelo WhatsApp
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">
                    Nosso time de suporte está disponível de segunda a sexta, das 8h às 18h.
                  </p>
                  <Button onClick={openWhatsApp} className="w-full bg-success">
                    <MessageCircle className="w-4 h-4 mr-2" />
                    Abrir WhatsApp
                  </Button>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Mail className="w-5 h-5" />
                    Email
                  </CardTitle>
                  <CardDescription>
                    Envie um email para nossa equipe
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">
                    Para questões mais complexas ou com anexos, envie um email.
                  </p>
                  <Button variant="outline" className="w-full" asChild>
                    <a href="mailto:suporte@ofertivo.com">
                      <Mail className="w-4 h-4 mr-2" />
                      suporte@ofertivo.com
                    </a>
                  </Button>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-card md:col-span-2">
                <CardHeader>
                  <CardTitle>Horários de Atendimento</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <div className="font-medium">Segunda a Sexta</div>
                      <div className="text-muted-foreground">8h às 18h</div>
                    </div>
                    <div>
                      <div className="font-medium">Sábado</div>
                      <div className="text-muted-foreground">8h às 12h</div>
                    </div>
                    <div>
                      <div className="font-medium">Domingo</div>
                      <div className="text-muted-foreground">Fechado</div>
                    </div>
                    <div>
                      <div className="font-medium">Emergências</div>
                      <div className="text-muted-foreground">24h via ticket</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default BusinessSupport;