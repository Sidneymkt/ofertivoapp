import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Gift, Calendar, Users, Ticket, ArrowRight } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface FeaturedRaffle {
  id: string;
  title: string;
  description: string;
  prize: string;
  entry_cost: number;
  current_participants: number;
  max_participants: number | null;
  end_date: string;
  image_url: string | null;
  business: {
    id: string;
    name: string;
    logo_url: string | null;
    category: string;
  } | null;
}

export const FeaturedRaffles = () => {
  const [raffles, setRaffles] = useState<FeaturedRaffle[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchFeaturedRaffles();
  }, []);

  const fetchFeaturedRaffles = async () => {
    try {
      const { data, error } = await supabase
        .from('raffles')
        .select(`
          id,
          title,
          description,
          prize,
          entry_cost,
          current_participants,
          max_participants,
          end_date,
          image_url,
          business:businesses!business_id (
            id,
            name,
            logo_url,
            category
          )
        `)
        .eq('is_active', true)
        .gt('end_date', new Date().toISOString())
        .order('current_participants', { ascending: false })
        .limit(3);

      if (error) throw error;
      setRaffles(data || []);
    } catch (error) {
      console.error('Erro ao buscar sorteios:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatTimeRemaining = (endDate: string) => {
    try {
      return formatDistanceToNow(new Date(endDate), { 
        locale: ptBR,
        addSuffix: true
      });
    } catch (error) {
      return 'Data inválida';
    }
  };

  const getBusinessInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  if (loading) {
    return (
      <section className="py-16 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
          </div>
        </div>
      </section>
    );
  }

  if (raffles.length === 0) {
    return null;
  }

  return (
    <section className="py-16 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Gift className="w-8 h-8 text-points" />
            <h2 className="text-4xl font-bold text-foreground">
              Sorteios em Destaque
            </h2>
          </div>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Participe dos sorteios mais populares usando seus pontos e concorra a prêmios incríveis
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {raffles.map((raffle) => (
            <Card 
              key={raffle.id} 
              className="border-0 bg-card shadow-card hover:shadow-glow transition-all duration-300 transform hover:scale-105 cursor-pointer overflow-hidden"
              onClick={() => navigate('/sorteios')}
            >
              {raffle.image_url && (
                <div className="relative h-48 overflow-hidden">
                  <img
                    src={raffle.image_url}
                    alt={raffle.title}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-4 right-4">
                    <Badge className="bg-points text-points-foreground font-bold">
                      {raffle.entry_cost} pontos
                    </Badge>
                  </div>
                </div>
              )}
              
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <CardTitle className="text-xl text-card-foreground line-clamp-2">
                    {raffle.title}
                  </CardTitle>
                  {raffle.business && (
                    <Avatar className="h-10 w-10 border-2 border-primary/20">
                      <AvatarImage src={raffle.business.logo_url || ''} alt={`Logo de ${raffle.business.name}`} />
                      <AvatarFallback className="bg-gradient-secondary text-white text-xs">
                        {getBusinessInitials(raffle.business.name)}
                      </AvatarFallback>
                    </Avatar>
                  )}
                </div>

                {raffle.business && (
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {raffle.business.category}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      {raffle.business.name}
                    </span>
                  </div>
                )}
              </CardHeader>

              <CardContent className="pt-0">
                <div className="mb-4">
                  <h4 className="font-semibold text-lg text-secondary mb-1">
                    🏆 {raffle.prize}
                  </h4>
                  <CardDescription className="text-sm line-clamp-2">
                    {raffle.description}
                  </CardDescription>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Users className="w-4 h-4" />
                      <span>
                        {raffle.current_participants} participantes
                        {raffle.max_participants && ` / ${raffle.max_participants}`}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 text-sm text-warning">
                    <Calendar className="w-4 h-4" />
                    <span>Termina {formatTimeRemaining(raffle.end_date)}</span>
                  </div>

                  {raffle.max_participants && (
                    <div className="w-full bg-muted rounded-full h-2">
                      <div
                        className="bg-gradient-points h-2 rounded-full transition-all duration-300"
                        style={{
                          width: `${Math.min((raffle.current_participants / raffle.max_participants) * 100, 100)}%`
                        }}
                      />
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="text-center">
          <Button 
            variant="outline" 
            size="lg"
            className="border-points/30 text-points hover:bg-points/10"
            onClick={() => navigate('/sorteios')}
          >
            <Ticket className="w-5 h-5 mr-2" />
            Ver Todos os Sorteios
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </div>
    </section>
  );
};