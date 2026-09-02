import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  Gift, 
  Calendar, 
  Users, 
  Trophy, 
  FileText, 
  Share2, 
  Crown,
  MapPin,
  Phone,
  Mail,
  Clock,
  Star,
  CheckCircle2
} from 'lucide-react';
import { toast } from 'sonner';

interface CampaignData {
  id: string;
  title: string;
  description: string;
  regulation: string;
  startDate: string;
  endDate: string;
  drawDate: string;
  prizes: Array<{
    name: string;
    description: string;
    value: number;
    position: number;
  }>;
  winners?: Array<{
    name: string;
    prize: string;
    date: string;
    position: number;
  }>;
  totalParticipants: number;
  businessInfo: {
    name: string;
    logo: string;
    address: string;
    phone: string;
    email: string;
  };
  isActive: boolean;
}

interface ParticipationForm {
  fullName: string;
  email: string;
  phone: string;
  cpf: string;
  birthDate: string;
  address: string;
  city: string;
  state: string;
  acceptTerms: boolean;
  receiptFile?: File;
  selectedStore?: string;
}

interface CampaignHotsiteProps {
  campaign: CampaignData;
  onParticipate: (formData: ParticipationForm) => Promise<{ success: boolean; message: string; luckyNumbers?: number[] }>;
  isPreview?: boolean;
}

export const CampaignHotsite: React.FC<CampaignHotsiteProps> = ({
  campaign,
  onParticipate,
  isPreview = false
}) => {
  const [activeTab, setActiveTab] = useState('home');
  const [formData, setFormData] = useState<ParticipationForm>({
    fullName: '',
    email: '',
    phone: '',
    cpf: '',
    birthDate: '',
    address: '',
    city: '',
    state: '',
    acceptTerms: false
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [timeLeft, setTimeLeft] = useState<{
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
  } | null>(null);

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date().getTime();
      const endTime = new Date(campaign.endDate).getTime();
      const difference = endTime - now;

      if (difference > 0) {
        setTimeLeft({
          days: Math.floor(difference / (1000 * 60 * 60 * 24)),
          hours: Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
          minutes: Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60)),
          seconds: Math.floor((difference % (1000 * 60)) / 1000)
        });
      } else {
        setTimeLeft(null);
      }
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);

    return () => clearInterval(timer);
  }, [campaign.endDate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.acceptTerms) {
      toast.error('Você deve aceitar os termos e condições');
      return;
    }

    setIsSubmitting(true);
    
    try {
      const result = await onParticipate(formData);
      
      if (result.success) {
        toast.success(result.message);
        if (result.luckyNumbers) {
          toast.success(`Seus números da sorte: ${result.luckyNumbers.join(', ')}`);
        }
        // Reset form
        setFormData({
          fullName: '',
          email: '',
          phone: '',
          cpf: '',
          birthDate: '',
          address: '',
          city: '',
          state: '',
          acceptTerms: false
        });
        setActiveTab('home');
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      toast.error('Erro ao processar participação');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: keyof ParticipationForm, value: string | boolean | File) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const formatCPF = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    return numbers.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  };

  const formatPhone = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    return numbers.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <img
                src={campaign.businessInfo.logo}
                alt={campaign.businessInfo.name}
                className="h-12 w-12 rounded-lg object-cover"
              />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{campaign.title}</h1>
                <p className="text-sm text-gray-600">{campaign.businessInfo.name}</p>
              </div>
            </div>
            {!isPreview && (
              <Button variant="outline" size="sm">
                <Share2 className="h-4 w-4 mr-2" />
                Compartilhar
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-white shadow-sm">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex space-x-8">
            {[
              { id: 'home', label: 'Início', icon: Gift },
              { id: 'participate', label: 'Participar', icon: Users },
              { id: 'prizes', label: 'Prêmios', icon: Trophy },
              { id: 'winners', label: 'Ganhadores', icon: Crown },
              { id: 'regulation', label: 'Regulamento', icon: FileText }
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 py-4 border-b-2 transition-colors ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Content */}
      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Home Tab */}
        {activeTab === 'home' && (
          <div className="space-y-8">
            {/* Hero Section */}
            <Card className="overflow-hidden">
              <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-8">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
                  <div>
                    <h2 className="text-3xl font-bold mb-4">{campaign.title}</h2>
                    <p className="text-lg mb-6 text-blue-100">{campaign.description}</p>
                    <div className="flex items-center gap-4">
                      <Badge variant="secondary" className="bg-white/20 text-white border-white/30">
                        <Users className="h-4 w-4 mr-1" />
                        {campaign.totalParticipants} participantes
                      </Badge>
                      <Badge 
                        variant={campaign.isActive ? 'default' : 'secondary'}
                        className={campaign.isActive ? 'bg-green-500 hover:bg-green-600' : ''}
                      >
                        {campaign.isActive ? 'Ativo' : 'Encerrado'}
                      </Badge>
                    </div>
                  </div>
                  
                  {/* Countdown */}
                  {timeLeft && campaign.isActive && (
                    <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6">
                      <h3 className="text-lg font-semibold mb-4 text-center">Tempo Restante</h3>
                      <div className="grid grid-cols-4 gap-4 text-center">
                        <div>
                          <div className="text-2xl font-bold">{timeLeft.days}</div>
                          <div className="text-sm text-blue-200">Dias</div>
                        </div>
                        <div>
                          <div className="text-2xl font-bold">{timeLeft.hours}</div>
                          <div className="text-sm text-blue-200">Horas</div>
                        </div>
                        <div>
                          <div className="text-2xl font-bold">{timeLeft.minutes}</div>
                          <div className="text-sm text-blue-200">Min</div>
                        </div>
                        <div>
                          <div className="text-2xl font-bold">{timeLeft.seconds}</div>
                          <div className="text-sm text-blue-200">Seg</div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </Card>

            {/* Key Information */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardContent className="p-6 text-center">
                  <Calendar className="h-12 w-12 text-blue-500 mx-auto mb-4" />
                  <h3 className="font-semibold mb-2">Data do Sorteio</h3>
                  <p className="text-sm text-gray-600">
                    {new Date(campaign.drawDate).toLocaleDateString('pt-BR', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6 text-center">
                  <Gift className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
                  <h3 className="font-semibold mb-2">Total em Prêmios</h3>
                  <p className="text-2xl font-bold text-green-600">
                    R$ {campaign.prizes.reduce((sum, prize) => sum + prize.value, 0).toLocaleString('pt-BR')}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6 text-center">
                  <Users className="h-12 w-12 text-green-500 mx-auto mb-4" />
                  <h3 className="font-semibold mb-2">Participantes</h3>
                  <p className="text-2xl font-bold">{campaign.totalParticipants}</p>
                </CardContent>
              </Card>
            </div>

            {/* How to Participate */}
            <Card>
              <CardHeader>
                <CardTitle>Como Participar</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="text-center">
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <span className="text-blue-600 font-bold">1</span>
                    </div>
                    <h3 className="font-semibold mb-2">Preencha o Formulário</h3>
                    <p className="text-sm text-gray-600">
                      Complete seus dados pessoais e envie os comprovantes necessários
                    </p>
                  </div>
                  <div className="text-center">
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <span className="text-blue-600 font-bold">2</span>
                    </div>
                    <h3 className="font-semibold mb-2">Receba seus Números</h3>
                    <p className="text-sm text-gray-600">
                      Após validação, você receberá seus números da sorte por email
                    </p>
                  </div>
                  <div className="text-center">
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <span className="text-blue-600 font-bold">3</span>
                    </div>
                    <h3 className="font-semibold mb-2">Aguarde o Sorteio</h3>
                    <p className="text-sm text-gray-600">
                      O sorteio será realizado na data especificada com total transparência
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Business Info */}
            <Card>
              <CardHeader>
                <CardTitle>Sobre a Empresa</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <MapPin className="h-5 w-5 text-gray-500" />
                      <span className="text-sm">{campaign.businessInfo.address}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Phone className="h-5 w-5 text-gray-500" />
                      <span className="text-sm">{campaign.businessInfo.phone}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Mail className="h-5 w-5 text-gray-500" />
                      <span className="text-sm">{campaign.businessInfo.email}</span>
                    </div>
                  </div>
                  <div className="flex justify-center">
                    <img
                      src={campaign.businessInfo.logo}
                      alt={campaign.businessInfo.name}
                      className="h-24 w-24 rounded-lg object-cover"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Participate Tab */}
        {activeTab === 'participate' && (
          <Card>
            <CardHeader>
              <CardTitle>Formulário de Participação</CardTitle>
              <p className="text-sm text-gray-600">
                Preencha todos os campos obrigatórios para participar do sorteio
              </p>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="fullName">Nome Completo *</Label>
                    <Input
                      id="fullName"
                      value={formData.fullName}
                      onChange={(e) => handleInputChange('fullName', e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="email">E-mail *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="phone">Telefone *</Label>
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={(e) => handleInputChange('phone', formatPhone(e.target.value))}
                      placeholder="(11) 99999-9999"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="cpf">CPF *</Label>
                    <Input
                      id="cpf"
                      value={formData.cpf}
                      onChange={(e) => handleInputChange('cpf', formatCPF(e.target.value))}
                      placeholder="000.000.000-00"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="birthDate">Data de Nascimento *</Label>
                    <Input
                      id="birthDate"
                      type="date"
                      value={formData.birthDate}
                      onChange={(e) => handleInputChange('birthDate', e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="city">Cidade *</Label>
                    <Input
                      id="city"
                      value={formData.city}
                      onChange={(e) => handleInputChange('city', e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="address">Endereço Completo *</Label>
                  <Input
                    id="address"
                    value={formData.address}
                    onChange={(e) => handleInputChange('address', e.target.value)}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="receiptFile">Comprovante de Compra</Label>
                  <Input
                    id="receiptFile"
                    type="file"
                    accept="image/*,.pdf"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleInputChange('receiptFile', file);
                    }}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Formatos aceitos: JPG, PNG, PDF (máx. 5MB)
                  </p>
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="acceptTerms"
                    checked={formData.acceptTerms}
                    onChange={(e) => handleInputChange('acceptTerms', e.target.checked)}
                    className="rounded"
                  />
                  <Label htmlFor="acceptTerms" className="text-sm">
                    Li e aceito os termos e condições do regulamento *
                  </Label>
                </div>

                <Button 
                  type="submit" 
                  disabled={isSubmitting || !campaign.isActive}
                  className="w-full"
                >
                  {isSubmitting ? 'Processando...' : 'Participar do Sorteio'}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Prizes Tab */}
        {activeTab === 'prizes' && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Prêmios do Sorteio</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {campaign.prizes.map((prize, index) => (
                    <div 
                      key={index}
                      className="flex items-center justify-between p-4 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg border"
                    >
                      <div className="flex items-center gap-4">
                        <div className="flex items-center justify-center w-12 h-12 bg-yellow-500 text-white rounded-full font-bold">
                          {prize.position}º
                        </div>
                        <div>
                          <h3 className="font-semibold text-lg">{prize.name}</h3>
                          <p className="text-gray-600">{prize.description}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-green-600">
                          R$ {prize.value.toLocaleString('pt-BR')}
                        </div>
                        <div className="text-sm text-gray-500">Valor estimado</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Winners Tab */}
        {activeTab === 'winners' && (
          <Card>
            <CardHeader>
              <CardTitle>Lista de Ganhadores</CardTitle>
            </CardHeader>
            <CardContent>
              {campaign.winners && campaign.winners.length > 0 ? (
                <div className="space-y-4">
                  {campaign.winners.map((winner, index) => (
                    <div 
                      key={index}
                      className="flex items-center justify-between p-4 bg-green-50 rounded-lg border border-green-200"
                    >
                      <div className="flex items-center gap-4">
                        <Crown className="h-8 w-8 text-yellow-500" />
                        <div>
                          <h3 className="font-semibold">{winner.name}</h3>
                          <p className="text-sm text-gray-600">{winner.prize}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge variant="outline" className="mb-1">
                          {winner.position}º Lugar
                        </Badge>
                        <div className="text-sm text-gray-500">
                          {new Date(winner.date).toLocaleDateString('pt-BR')}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Trophy className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-600 mb-2">
                    Sorteio ainda não realizado
                  </h3>
                  <p className="text-gray-500">
                    Os ganhadores serão divulgados após a data do sorteio
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Regulation Tab */}
        {activeTab === 'regulation' && (
          <Card>
            <CardHeader>
              <CardTitle>Regulamento Completo</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-96 w-full">
                <div className="prose prose-sm max-w-none">
                  <div className="whitespace-pre-wrap text-sm leading-relaxed">
                    {campaign.regulation || 'Regulamento não disponível.'}
                  </div>
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12 mt-16">
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <h3 className="font-bold text-lg mb-4">
                {campaign.businessInfo.name}
              </h3>
              <p className="text-gray-400 text-sm">
                Promovendo experiências incríveis através de sorteios transparentes e prêmios exclusivos.
              </p>
            </div>
            <div>
              <h3 className="font-bold text-lg mb-4">Contato</h3>
              <div className="space-y-2 text-sm text-gray-400">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  {campaign.businessInfo.address}
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  {campaign.businessInfo.phone}
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  {campaign.businessInfo.email}
                </div>
              </div>
            </div>
            <div>
              <h3 className="font-bold text-lg mb-4">Informações Legais</h3>
              <div className="space-y-2 text-sm text-gray-400">
                <p>Sorteio autorizado e transparente</p>
                <p>CNPJ: 00.000.000/0001-00</p>
                <p>© 2024. Todos os direitos reservados.</p>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};