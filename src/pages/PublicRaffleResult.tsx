import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Trophy, 
  Users, 
  Calendar, 
  Hash, 
  CheckCircle,
  Eye,
  Download,
  Shield,
  ArrowLeft,
  ExternalLink,
  Share2
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { SEOHead } from '@/components/SEOHead';

interface RaffleResult {
  id: string;
  title: string;
  description: string | null;
  prize: string;
  end_date: string;
  winner_id: string | null;
  image_url: string | null;
  business: {
    id: string;
    name: string;
    logo_url: string | null;
  };
  winner: {
    full_name: string;
  } | null;
  total_participants: number;
  total_tickets: number;
}

export default function PublicRaffleResult() {
  const { id } = useParams<{ id: string }>();
  const [raffle, setRaffle] = useState<RaffleResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      fetchRaffleResult();
    }
  }, [id]);

  const fetchRaffleResult = async () => {
    try {
      setLoading(true);

      // Buscar dados do sorteio
      const { data: raffleData, error: raffleError } = await supabase
        .from('raffles')
        .select(`
          id,
          title,
          description,
          prize,
          end_date,
          winner_id,
          image_url,
          business:businesses(id, name, logo_url)
        `)
        .eq('id', id)
        .single();

      if (raffleError) throw raffleError;

      // Buscar dados do ganhador usando view pública para evitar problemas de RLS
      let winnerData = null;
      if (raffleData.winner_id) {
        // Tentar primeiro com profiles_public (view pública)
        const { data: winner, error: winnerError } = await supabase
          .from('profiles_public')
          .select('full_name')
          .eq('user_id', raffleData.winner_id)
          .single();

        if (!winnerError && winner?.full_name) {
          winnerData = winner;
        } else {
          // Fallback: tentar com profiles diretamente
          const { data: profileWinner } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('user_id', raffleData.winner_id)
            .single();
          
          if (profileWinner?.full_name) {
            winnerData = profileWinner;
          }
        }
      }

      // Contar participantes únicos
      const { data: entries, error: entriesError } = await supabase
        .from('raffle_entries')
        .select('user_id, number_of_entries')
        .eq('raffle_id', id);

      if (entriesError) throw entriesError;

      const totalParticipants = new Set(entries?.map(e => e.user_id) || []).size;
      const totalTickets = entries?.reduce((sum, e) => sum + e.number_of_entries, 0) || 0;

      setRaffle({
        ...(raffleData as any),
        winner: winnerData,
        total_participants: totalParticipants,
        total_tickets: totalTickets
      } as any);

    } catch (error: any) {
      console.error('Error fetching raffle result:', error);
      toast.error('Erro ao carregar resultado do sorteio');
    } finally {
      setLoading(false);
    }
  };

  const shareResult = () => {
    const url = window.location.href;
    const text = `Confira o resultado do sorteio "${raffle?.title}" no Ofertivo!`;
    
    if (navigator.share) {
      navigator.share({ title: raffle?.title, text, url });
    } else {
      navigator.clipboard.writeText(url);
      toast.success('Link copiado para a área de transferência!');
    }
  };

  const shareOnWhatsApp = () => {
    const url = window.location.href;
    const text = `🎉 Confira o resultado do sorteio "${raffle?.title}" no Ofertivo!`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text + '\n' + url)}`, '_blank');
  };

  const shareOnFacebook = () => {
    const url = window.location.href;
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, '_blank');
  };

  const shareOnTwitter = () => {
    const url = window.location.href;
    const text = `🎉 Confira o resultado do sorteio "${raffle?.title}" no Ofertivo!`;
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`, '_blank');
  };

  const copyLink = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    toast.success('Link copiado para a área de transferência!');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#0E0E10] to-[#1C1C1E] flex items-center justify-center p-4">
        <div className="animate-pulse space-y-4 w-full max-w-2xl">
          <div className="h-8 bg-gray-700 rounded w-1/3"></div>
          <div className="h-64 bg-gray-700 rounded"></div>
        </div>
      </div>
    );
  }

  if (!raffle) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#0E0E10] to-[#1C1C1E] flex items-center justify-center p-4">
        <Card className="max-w-md w-full bg-[#1C1C1E] border-gray-700">
          <CardContent className="p-8 text-center">
            <Trophy className="h-16 w-16 text-gray-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-white mb-2">
              Sorteio não encontrado
            </h2>
            <p className="text-gray-400 mb-6">
              O sorteio que você procura não existe ou foi removido.
            </p>
            <Link to="/sorteios">
              <Button variant="outline">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Ver Sorteios Ativos
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <>
      <SEOHead
        title={`Resultado: ${raffle.title}`}
        description={`Veja o resultado do sorteio ${raffle.title}. Prêmio: ${raffle.prize}${raffle.winner ? ` - Ganhador: ${raffle.winner.full_name}` : ''}`}
        image={raffle.image_url || undefined}
        type="article"
      />
      <div className="min-h-screen bg-gradient-to-b from-[#0E0E10] to-[#1C1C1E] py-8 px-4">
      <div className="container mx-auto max-w-4xl">
        {/* Header */}
        <div className="mb-6">
          <Link to="/sorteios">
            <Button variant="ghost" className="text-gray-400 hover:text-white mb-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar aos Sorteios
            </Button>
          </Link>
        </div>

        {/* Main Card */}
        <Card className="bg-[#1C1C1E] border-[#28A745]/30 overflow-hidden">
          <CardHeader className="border-b border-gray-800">
            <div className="flex items-center gap-2 text-[#28A745] mb-2">
              <Shield className="h-5 w-5" />
              <span className="text-sm font-semibold">Resultado Oficial</span>
            </div>
            <CardTitle className="text-2xl md:text-3xl text-white">
              {raffle.title}
            </CardTitle>
            <CardDescription className="text-gray-400">
              {raffle.description}
            </CardDescription>
          </CardHeader>

          <CardContent className="p-6 space-y-6">
            {/* Image */}
            {raffle.image_url && (
              <div className="relative rounded-xl overflow-hidden">
                <img 
                  src={raffle.image_url} 
                  alt={raffle.title}
                  className="w-full h-64 object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
              </div>
            )}

            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="bg-[#0E0E10] border-gray-800 p-4">
                <div className="flex flex-col items-center">
                  <Trophy className="h-6 w-6 text-yellow-500 mb-2" />
                  <p className="text-sm text-gray-400">Prêmio</p>
                  <p className="font-bold text-white text-center">{raffle.prize}</p>
                </div>
              </Card>

              <Card className="bg-[#0E0E10] border-gray-800 p-4">
                <div className="flex flex-col items-center">
                  <Users className="h-6 w-6 text-blue-500 mb-2" />
                  <p className="text-sm text-gray-400">Participantes</p>
                  <p className="font-bold text-white">{raffle.total_participants}</p>
                </div>
              </Card>

              <Card className="bg-[#0E0E10] border-gray-800 p-4">
                <div className="flex flex-col items-center">
                  <Hash className="h-6 w-6 text-green-500 mb-2" />
                  <p className="text-sm text-gray-400">Bilhetes</p>
                  <p className="font-bold text-white">{raffle.total_tickets}</p>
                </div>
              </Card>

              <Card className="bg-[#0E0E10] border-gray-800 p-4">
                <div className="flex flex-col items-center">
                  <Calendar className="h-6 w-6 text-purple-500 mb-2" />
                  <p className="text-sm text-gray-400">Data</p>
                  <p className="font-bold text-white text-xs">
                    {format(new Date(raffle.end_date), 'dd/MM/yyyy', { locale: ptBR })}
                  </p>
                </div>
              </Card>
            </div>

            {/* Winner Section */}
            {raffle.winner_id && raffle.winner ? (
              <Link to={`/usuario/${raffle.winner_id}`}>
                <Card className="bg-gradient-to-r from-yellow-900/20 to-orange-900/20 border-yellow-600/30 p-6 cursor-pointer hover:border-yellow-500/50 transition-all">
                  <div className="text-center space-y-4">
                    <div className="flex justify-center">
                      <div className="bg-yellow-500/20 p-4 rounded-full">
                        <Trophy className="h-12 w-12 text-yellow-400" />
                      </div>
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold text-yellow-400 mb-2">
                        🎉 Ganhador(a)
                      </h3>
                      <p className="text-3xl font-bold text-white mb-2">
                        {raffle.winner.full_name}
                      </p>
                      <Badge className="bg-green-600">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Sorteio Finalizado
                      </Badge>
                    </div>
                  </div>
                </Card>
              </Link>
            ) : (
              <Card className="bg-yellow-900/20 border-yellow-600/30 p-6">
                <div className="text-center text-yellow-400">
                  <Trophy className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="font-semibold">
                    Sorteio ainda não foi realizado
                  </p>
                </div>
              </Card>
            )}

            {/* Business Info */}
            <div className="flex items-center justify-between p-4 bg-[#0E0E10] rounded-lg border border-gray-800">
              <div className="flex items-center gap-3">
                {raffle.business.logo_url ? (
                  <img 
                    src={raffle.business.logo_url} 
                    alt={raffle.business.name}
                    className="w-12 h-12 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#28A745] to-green-600 flex items-center justify-center">
                    <span className="text-white font-bold text-lg">
                      {raffle.business.name.charAt(0)}
                    </span>
                  </div>
                )}
                <div>
                  <p className="text-sm text-gray-400">Realizado por</p>
                  <p className="font-semibold text-white">{raffle.business.name}</p>
                </div>
              </div>
              <Link to={`/negocio/${raffle.business.id}`}>
                <Button variant="outline" size="sm">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Ver Perfil
                </Button>
              </Link>
            </div>

            {/* Share Section */}
            <div className="space-y-3 pt-4 border-t border-gray-800">
              <div className="flex items-center gap-2 text-gray-400">
                <Share2 className="h-4 w-4" />
                <span className="text-sm font-semibold">Compartilhar Resultado</span>
              </div>
              
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <Button 
                  onClick={shareOnWhatsApp} 
                  className="bg-[#25D366] hover:bg-[#25D366]/90 text-white"
                >
                  <svg className="h-4 w-4 mr-2" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                  </svg>
                  WhatsApp
                </Button>

                <Button 
                  onClick={shareOnFacebook} 
                  className="bg-[#1877F2] hover:bg-[#1877F2]/90 text-white"
                >
                  <svg className="h-4 w-4 mr-2" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                  </svg>
                  Facebook
                </Button>

                <Button 
                  onClick={shareOnTwitter} 
                  className="bg-[#1DA1F2] hover:bg-[#1DA1F2]/90 text-white"
                >
                  <svg className="h-4 w-4 mr-2" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
                  </svg>
                  Twitter
                </Button>

                <Button 
                  onClick={copyLink} 
                  variant="outline"
                  className="border-gray-700 text-gray-300 hover:bg-gray-800"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Copiar Link
                </Button>
              </div>
            </div>

            {/* View Other Raffles */}
            <Link to="/sorteios" className="block">
              <Button variant="default" className="w-full bg-[#28A745] hover:bg-[#28A745]/90">
                <Eye className="h-4 w-4 mr-2" />
                Ver Outros Sorteios
              </Button>
            </Link>

            {/* Transparency Note */}
            <div className="flex items-start gap-2 p-4 bg-blue-900/20 border border-blue-600/30 rounded-lg">
              <Shield className="h-5 w-5 text-blue-400 mt-0.5 flex-shrink-0" />
              <div className="text-sm">
                <p className="font-semibold text-blue-400 mb-1">
                  Transparência e Segurança
                </p>
                <p className="text-blue-200/80">
                  Este sorteio foi realizado de forma transparente e auditável. 
                  Todos os participantes tiveram chances iguais baseadas no número de bilhetes adquiridos.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
    </>
  );
}
