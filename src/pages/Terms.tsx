import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Navigation } from '@/components/ui/navigation';
import { BottomNavigation } from '@/components/ui/bottom-navigation';
import { 
  ArrowLeft, 
  FileText, 
  Shield, 
  Cookie, 
  Briefcase,
  Calendar,
  ExternalLink
} from 'lucide-react';

const Terms = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b sticky top-0 bg-background/95 backdrop-blur-sm z-50">
        <div className="container mx-auto px-4 py-4">
          <Navigation />
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Back button and header */}
        <div className="flex items-center gap-4 mb-6">
          <Link to="/">
            <Button variant="ghost" size="sm" className="gap-2">
              <ArrowLeft className="w-4 h-4" />
              Voltar
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Termos e Políticas</h1>
            <p className="text-muted-foreground">
              Documentos legais e políticas do Ofertivo
            </p>
          </div>
        </div>

        {/* Quick Access Cards */}
        <div className="grid md:grid-cols-2 gap-4 mb-8">
          <Card className="border-primary/20">
            <CardHeader className="flex flex-row items-center gap-3 pb-3">
              <FileText className="w-6 h-6 text-primary" />
              <div>
                <CardTitle className="text-lg">Termos de Uso</CardTitle>
                <CardDescription>Regras de uso da plataforma</CardDescription>
              </div>
            </CardHeader>
          </Card>

          <Card className="border-secondary/20">
            <CardHeader className="flex flex-row items-center gap-3 pb-3">
              <Shield className="w-6 h-6 text-secondary" />
              <div>
                <CardTitle className="text-lg">Política de Privacidade</CardTitle>
                <CardDescription>Como tratamos seus dados</CardDescription>
              </div>
            </CardHeader>
          </Card>

          <Card className="border-accent/20">
            <CardHeader className="flex flex-row items-center gap-3 pb-3">
              <Briefcase className="w-6 h-6 text-accent" />
              <div>
                <CardTitle className="text-lg">Termos Comerciais</CardTitle>
                <CardDescription>Para anunciantes e negócios</CardDescription>
              </div>
            </CardHeader>
          </Card>

          <Card className="border-muted">
            <CardHeader className="flex flex-row items-center gap-3 pb-3">
              <Cookie className="w-6 h-6 text-muted-foreground" />
              <div>
                <CardTitle className="text-lg">Política de Cookies</CardTitle>
                <CardDescription>Uso de cookies e tecnologias</CardDescription>
              </div>
            </CardHeader>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="terms" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="terms" className="text-xs">
              Termos de Uso
            </TabsTrigger>
            <TabsTrigger value="privacy" className="text-xs">
              Privacidade
            </TabsTrigger>
            <TabsTrigger value="commercial" className="text-xs">
              Comerciais
            </TabsTrigger>
            <TabsTrigger value="cookies" className="text-xs">
              Cookies
            </TabsTrigger>
          </TabsList>

          {/* Terms of Use */}
          <TabsContent value="terms" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="w-5 h-5" />
                    Termos de Uso do Aplicativo Ofertivo
                  </CardTitle>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="w-4 h-4" />
                    Última atualização: 21/08/2024
                  </div>
                </div>
                <CardDescription>
                  Ao usar o Ofertivo, você concorda com os seguintes termos e condições
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-3">1. Definições</h3>
                  <div className="space-y-2 text-sm text-muted-foreground">
                    <p><strong>"Ofertivo"</strong> refere-se ao aplicativo móvel e plataforma web operada pela Ofertivo Tecnologia Ltda.</p>
                    <p><strong>"Usuário"</strong> é qualquer pessoa que utiliza nossos serviços.</p>
                    <p><strong>"Anunciante"</strong> são os estabelecimentos comerciais que criam ofertas na plataforma.</p>
                    <p><strong>"Oferta"</strong> são as promoções e descontos disponibilizados pelos anunciantes.</p>
                  </div>
                </div>

                <Separator />

                <div>
                  <h3 className="text-lg font-semibold mb-3">2. Aceitação dos Termos</h3>
                  <div className="space-y-2 text-sm text-muted-foreground">
                    <p>Ao acessar e usar o Ofertivo, você aceita estes Termos de Uso integralmente.</p>
                    <p>Se você não concordar com qualquer parte destes termos, não deve usar nossos serviços.</p>
                    <p>Reservamo-nos o direito de modificar estes termos a qualquer momento.</p>
                  </div>
                </div>

                <Separator />

                <div>
                  <h3 className="text-lg font-semibold mb-3">3. Uso da Plataforma</h3>
                  <div className="space-y-2 text-sm text-muted-foreground">
                    <p>Você deve ter pelo menos 16 anos para usar o Ofertivo.</p>
                    <p>É necessário fornecer informações verdadeiras e atualizadas durante o cadastro.</p>
                    <p>Você é responsável pela segurança da sua conta e senha.</p>
                    <p>É proibido usar o serviço para atividades ilegais ou que violem direitos de terceiros.</p>
                  </div>
                </div>

                <Separator />

                <div>
                  <h3 className="text-lg font-semibold mb-3">4. Sistema de Pontos e Recompensas</h3>
                  <div className="space-y-2 text-sm text-muted-foreground">
                    <p>Os pontos são creditados conforme as atividades realizadas na plataforma.</p>
                    <p>Pontos não possuem valor monetário e não podem ser transferidos entre contas.</p>
                    <p>Reservamo-nos o direito de alterar as regras de pontuação mediante aviso prévio.</p>
                    <p>Tentativas de fraud ou manipulação do sistema podem resultar na suspensão da conta.</p>
                  </div>
                </div>

                <Separator />

                <div>
                  <h3 className="text-lg font-semibold mb-3">5. Ofertas e Promoções</h3>
                  <div className="space-y-2 text-sm text-muted-foreground">
                    <p>As ofertas são de responsabilidade exclusiva dos anunciantes.</p>
                    <p>O Ofertivo não se responsabiliza por conflitos entre usuários e estabelecimentos.</p>
                    <p>Ofertas estão sujeitas a disponibilidade e podem ser alteradas ou canceladas pelos anunciantes.</p>
                    <p>Cada oferta possui termos específicos que devem ser respeitados.</p>
                  </div>
                </div>

                <Separator />

                <div>
                  <h3 className="text-lg font-semibold mb-3">6. Responsabilidades e Limitações</h3>
                  <div className="space-y-2 text-sm text-muted-foreground">
                    <p>O Ofertivo não garante a disponibilidade ininterrupta dos serviços.</p>
                    <p>Não nos responsabilizamos por danos indiretos ou perda de lucros.</p>
                    <p>Nossa responsabilidade é limitada ao valor pago pelo usuário nos últimos 12 meses.</p>
                  </div>
                </div>

                <Separator />

                <div>
                  <h3 className="text-lg font-semibold mb-3">7. Encerramento</h3>
                  <div className="space-y-2 text-sm text-muted-foreground">
                    <p>Você pode encerrar sua conta a qualquer momento através das configurações.</p>
                    <p>Podemos suspender ou encerrar contas que violem estes termos.</p>
                    <p>Após o encerramento, alguns dados podem ser mantidos conforme exigências legais.</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Privacy Policy */}
          <TabsContent value="privacy" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="w-5 h-5" />
                    Política de Privacidade
                  </CardTitle>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="w-4 h-4" />
                    Última atualização: 21/08/2024
                  </div>
                </div>
                <CardDescription>
                  Como coletamos, usamos e protegemos suas informações pessoais
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-3">1. Informações que Coletamos</h3>
                  <div className="space-y-2 text-sm text-muted-foreground">
                    <p><strong>Dados de cadastro:</strong> Nome, e-mail, telefone, data de nascimento</p>
                    <p><strong>Localização:</strong> Coordenadas GPS para mostrar ofertas próximas</p>
                    <p><strong>Atividades:</strong> Histórico de check-ins, pontos acumulados, ofertas visualizadas</p>
                    <p><strong>Dispositivo:</strong> Tipo de dispositivo, sistema operacional, identificadores únicos</p>
                  </div>
                </div>

                <Separator />

                <div>
                  <h3 className="text-lg font-semibold mb-3">2. Como Usamos as Informações</h3>
                  <div className="space-y-2 text-sm text-muted-foreground">
                    <p>• Fornecer e melhorar nossos serviços</p>
                    <p>• Personalizar ofertas baseadas em sua localização e preferências</p>
                    <p>• Comunicar sobre atualizações e promoções</p>
                    <p>• Prevenir fraudes e garantir a segurança da plataforma</p>
                    <p>• Cumprir obrigações legais e regulamentares</p>
                  </div>
                </div>

                <Separator />

                <div>
                  <h3 className="text-lg font-semibold mb-3">3. Compartilhamento de Dados</h3>
                  <div className="space-y-2 text-sm text-muted-foreground">
                    <p>Não vendemos suas informações pessoais para terceiros.</p>
                    <p><strong>Anunciantes:</strong> Compartilhamos dados agregados e anônimos sobre o desempenho das ofertas</p>
                    <p><strong>Prestadores de serviço:</strong> Empresas que nos ajudam a operar a plataforma (hospedagem, analytics)</p>
                    <p><strong>Requisições legais:</strong> Quando exigido por lei ou ordem judicial</p>
                  </div>
                </div>

                <Separator />

                <div>
                  <h3 className="text-lg font-semibold mb-3">4. Seus Direitos (LGPD)</h3>
                  <div className="space-y-2 text-sm text-muted-foreground">
                    <p>• <strong>Acesso:</strong> Solicitar uma cópia dos seus dados</p>
                    <p>• <strong>Correção:</strong> Atualizar informações incorretas</p>
                    <p>• <strong>Exclusão:</strong> Solicitar a remoção dos seus dados</p>
                    <p>• <strong>Portabilidade:</strong> Transferir seus dados para outro serviço</p>
                    <p>• <strong>Oposição:</strong> Opor-se ao processamento dos seus dados</p>
                    <p>Para exercer esses direitos, entre em contato conosco através do e-mail: privacidade@ofertivo.com.br</p>
                  </div>
                </div>

                <Separator />

                <div>
                  <h3 className="text-lg font-semibold mb-3">5. Segurança</h3>
                  <div className="space-y-2 text-sm text-muted-foreground">
                    <p>Utilizamos criptografia para proteger dados em trânsito e em repouso.</p>
                    <p>Acesso aos dados é restrito a funcionários autorizados.</p>
                    <p>Realizamos auditorias regulares de segurança.</p>
                    <p>Em caso de violação de dados, notificaremos conforme exigido pela LGPD.</p>
                  </div>
                </div>

                <Separator />

                <div>
                  <h3 className="text-lg font-semibold mb-3">6. Retenção de Dados</h3>
                  <div className="space-y-2 text-sm text-muted-foreground">
                    <p>Mantemos seus dados apenas pelo tempo necessário para os fins descritos nesta política.</p>
                    <p>Dados de contas inativas por mais de 2 anos podem ser anonimizados ou excluídos.</p>
                    <p>Algumas informações podem ser mantidas por períodos mais longos para cumprimento de obrigações legais.</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Commercial Terms */}
          <TabsContent value="commercial" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Briefcase className="w-5 h-5" />
                    Termos Comerciais para Anunciantes
                  </CardTitle>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="w-4 h-4" />
                    Última atualização: 21/08/2024
                  </div>
                </div>
                <CardDescription>
                  Condições específicas para estabelecimentos que anunciam no Ofertivo
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-3">1. Planos de Assinatura</h3>
                  <div className="space-y-2 text-sm text-muted-foreground">
                    <p><strong>Essencial (R$ 29,00/mês):</strong> Até 5 ofertas ativas, métricas básicas</p>
                    <p><strong>Crescimento (R$ 79,00/mês):</strong> Ofertas ilimitadas, CRM básico, analytics</p>
                    <p><strong>Premium (R$ 149,00/mês):</strong> Todos os recursos + sorteios e IA</p>
                    <p>Valores são cobrados mensalmente e renovados automaticamente.</p>
                  </div>
                </div>

                <Separator />

                <div>
                  <h3 className="text-lg font-semibold mb-3">2. Criação de Ofertas</h3>
                  <div className="space-y-2 text-sm text-muted-foreground">
                    <p>Ofertas devem ser verdadeiras e estar disponíveis no estabelecimento.</p>
                    <p>É proibido criar ofertas falsas ou enganosas.</p>
                    <p>Reservamo-nos o direito de remover ofertas que violem nossas políticas.</p>
                    <p>O anunciante é responsável por honrar todas as ofertas publicadas.</p>
                  </div>
                </div>

                <Separator />

                <div>
                  <h3 className="text-lg font-semibold mb-3">3. Pagamentos e Faturamento</h3>
                  <div className="space-y-2 text-sm text-muted-foreground">
                    <p>Pagamentos são processados através do Mercado Pago.</p>
                    <p>Cobrança ocorre no mesmo dia do mês da contratação.</p>
                    <p>Atraso no pagamento pode resultar na suspensão da conta.</p>
                    <p>Reembolsos só são concedidos conforme nossa política de cancelamento.</p>
                  </div>
                </div>

                <Separator />

                <div>
                  <h3 className="text-lg font-semibold mb-3">4. Propriedade Intelectual</h3>
                  <div className="space-y-2 text-sm text-muted-foreground">
                    <p>O anunciante garante ter direitos sobre todas as imagens e conteúdos publicados.</p>
                    <p>Ao publicar conteúdo, você concede ao Ofertivo licença para usar, reproduzir e distribuir.</p>
                    <p>É proibido violar direitos autorais ou de marca de terceiros.</p>
                  </div>
                </div>

                <Separator />

                <div>
                  <h3 className="text-lg font-semibold mb-3">5. Cancelamento e Reembolso</h3>
                  <div className="space-y-2 text-sm text-muted-foreground">
                    <p>Cancelamento pode ser solicitado a qualquer momento através do painel.</p>
                    <p>Cancelamentos são efetivos no final do período de cobrança atual.</p>
                    <p>Não há reembolso proporcional para cancelamentos no meio do ciclo.</p>
                    <p>Dados podem ser mantidos por até 90 dias após o cancelamento.</p>
                  </div>
                </div>

                <Separator />

                <div>
                  <h3 className="text-lg font-semibold mb-3">6. Suporte e Relacionamento</h3>
                  <div className="space-y-2 text-sm text-muted-foreground">
                    <p>Suporte técnico está disponível de segunda a sexta, das 8h às 18h.</p>
                    <p>Treinamentos e consultoria estão inclusos nos planos Crescimento e Premium.</p>
                    <p>Feedbacks e sugestões são sempre bem-vindos através do nosso canal de suporte.</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Cookie Policy */}
          <TabsContent value="cookies" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Cookie className="w-5 h-5" />
                    Política de Cookies
                  </CardTitle>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="w-4 h-4" />
                    Última atualização: 21/08/2024
                  </div>
                </div>
                <CardDescription>
                  Como usamos cookies e tecnologias similares em nossa plataforma
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-3">1. O que são Cookies</h3>
                  <div className="space-y-2 text-sm text-muted-foreground">
                    <p>Cookies são pequenos arquivos de texto armazenados no seu dispositivo quando você visita nosso site.</p>
                    <p>Eles nos ajudam a melhorar sua experiência e entender como você usa nossa plataforma.</p>
                    <p>Cookies não contêm vírus e não podem acessar arquivos do seu dispositivo.</p>
                  </div>
                </div>

                <Separator />

                <div>
                  <h3 className="text-lg font-semibold mb-3">2. Tipos de Cookies que Usamos</h3>
                  <div className="space-y-4">
                    <div className="border rounded-lg p-3">
                      <h4 className="font-medium text-sm mb-1">Cookies Essenciais</h4>
                      <p className="text-xs text-muted-foreground">
                        Necessários para o funcionamento básico da plataforma (autenticação, segurança)
                      </p>
                    </div>
                    <div className="border rounded-lg p-3">
                      <h4 className="font-medium text-sm mb-1">Cookies de Funcionalidade</h4>
                      <p className="text-xs text-muted-foreground">
                        Melhoram sua experiência lembrando preferências e configurações
                      </p>
                    </div>
                    <div className="border rounded-lg p-3">
                      <h4 className="font-medium text-sm mb-1">Cookies de Analytics</h4>
                      <p className="text-xs text-muted-foreground">
                        Nos ajudam a entender como você usa a plataforma para melhorias
                      </p>
                    </div>
                    <div className="border rounded-lg p-3">
                      <h4 className="font-medium text-sm mb-1">Cookies de Marketing</h4>
                      <p className="text-xs text-muted-foreground">
                        Personalizam anúncios e ofertas baseados em seus interesses
                      </p>
                    </div>
                  </div>
                </div>

                <Separator />

                <div>
                  <h3 className="text-lg font-semibold mb-3">3. Controle de Cookies</h3>
                  <div className="space-y-2 text-sm text-muted-foreground">
                    <p>Você pode controlar cookies através das configurações do seu navegador.</p>
                    <p>Bloquear todos os cookies pode afetar o funcionamento da plataforma.</p>
                    <p>Cookies essenciais não podem ser desabilitados pois são necessários para o funcionamento básico.</p>
                    <p>Você pode limpar cookies existentes através das configurações do navegador.</p>
                  </div>
                </div>

                <Separator />

                <div>
                  <h3 className="text-lg font-semibold mb-3">4. Tecnologias Similares</h3>
                  <div className="space-y-2 text-sm text-muted-foreground">
                    <p><strong>Local Storage:</strong> Armazena dados localmente para melhor performance</p>
                    <p><strong>Session Storage:</strong> Mantém informações apenas durante a sessão</p>
                    <p><strong>Web Beacons:</strong> Pequenas imagens que nos ajudam a entender o uso da plataforma</p>
                    <p><strong>Pixels de Rastreamento:</strong> Medem a efetividade de campanhas de marketing</p>
                  </div>
                </div>

                <Separator />

                <div>
                  <h3 className="text-lg font-semibold mb-3">5. Cookies de Terceiros</h3>
                  <div className="space-y-2 text-sm text-muted-foreground">
                    <p><strong>Google Analytics:</strong> Para análise de tráfego e comportamento</p>
                    <p><strong>Mapbox:</strong> Para funcionalidades de mapas e geolocalização</p>
                    <p><strong>Mercado Pago:</strong> Para processamento de pagamentos</p>
                    <p>Estes serviços têm suas próprias políticas de cookies que recomendamos revisar.</p>
                  </div>
                </div>

                <Separator />

                <div>
                  <h3 className="text-lg font-semibold mb-3">6. Contato</h3>
                  <div className="space-y-2 text-sm text-muted-foreground">
                    <p>Se você tiver dúvidas sobre nossa política de cookies, entre em contato:</p>
                    <p>E-mail: privacidade@ofertivo.com.br</p>
                    <p>WhatsApp: (92) 9999-9999</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <BottomNavigation />
    </div>
  );
};

export default Terms;