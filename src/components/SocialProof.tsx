import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Star, Quote, Users, TrendingUp, ShoppingBag, Award } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface UserTestimonial {
  id: string;
  name: string;
  avatar: string;
  city: string;
  rating: number;
  comment: string;
  points: number;
  badges: number;
}

interface BusinessTestimonial {
  id: string;
  businessName: string;
  ownerName: string;
  logo: string;
  category: string;
  growth: string;
  comment: string;
  offers: number;
}

const userTestimonials: UserTestimonial[] = [
  {
    id: '1',
    name: 'Maria Silva',
    avatar: '',
    city: 'Centro',
    rating: 5,
    comment: 'Já economizei mais de R$ 500 usando o Ofertivo! As ofertas são realmente incríveis e sempre próximas de mim.',
    points: 2500,
    badges: 8
  },
  {
    id: '2',
    name: 'João Santos',
    avatar: '',
    city: 'Adrianópolis',
    rating: 5,
    comment: 'O sistema de pontos é viciante! Já ganhei vários prêmios nos sorteios e descobri lugares incríveis.',
    points: 1850,
    badges: 5
  },
  {
    id: '3',
    name: 'Ana Costa',
    avatar: '',
    city: 'Ponta Negra',
    rating: 5,
    comment: 'Perfeito para quem ama explorar a cidade! Sempre encontro promoções dos meus restaurantes favoritos.',
    points: 3200,
    badges: 12
  },
  {
    id: '4',
    name: 'Carlos Ferreira',
    avatar: '',
    city: 'Cidade Nova',
    rating: 4,
    comment: 'App muito bem feito e intuitivo. As notificações de ofertas próximas são muito úteis!',
    points: 980,
    badges: 3
  }
];

const businessTestimonials: BusinessTestimonial[] = [
  {
    id: '1',
    businessName: 'Pizzaria Bella Napoli',
    ownerName: 'Giuseppe Romano',
    logo: '',
    category: 'Restaurante',
    growth: '+40%',
    comment: 'O Ofertivo triplicou nosso movimento nos fins de semana. A ferramenta de CRM nos ajuda muito!',
    offers: 24
  },
  {
    id: '2',
    businessName: 'Café & Cia',
    ownerName: 'Laura Mendes',
    logo: '',
    category: 'Cafeteria',
    growth: '+60%',
    comment: 'Conseguimos fidelizar muitos clientes novos. O sistema de pontos incentiva o retorno!',
    offers: 18
  },
  {
    id: '3',
    businessName: 'Academia FitLife',
    ownerName: 'Ricardo Oliveira',
    logo: '',
    category: 'Academia',
    growth: '+25%',
    comment: 'As campanhas direcionadas nos ajudaram a atingir nosso público-alvo com precisão.',
    offers: 12
  },
  {
    id: '4',
    businessName: 'Boutique Moderna',
    ownerName: 'Fernanda Lima',
    logo: '',
    category: 'Moda',
    growth: '+35%',
    comment: 'A visibilidade que ganhamos foi incrível. Nossos produtos chegam aos clientes certos!',
    offers: 30
  }
];

export const SocialProof = () => {
  const [currentUserIndex, setCurrentUserIndex] = useState(0);
  const [currentBusinessIndex, setCurrentBusinessIndex] = useState(0);

  // Auto-rotate testimonials
  useEffect(() => {
    const userInterval = setInterval(() => {
      setCurrentUserIndex((prev) => (prev + 1) % userTestimonials.length);
    }, 5000);

    const businessInterval = setInterval(() => {
      setCurrentBusinessIndex((prev) => (prev + 1) % businessTestimonials.length);
    }, 6000);

    return () => {
      clearInterval(userInterval);
      clearInterval(businessInterval);
    };
  }, []);

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`w-4 h-4 ${
          i < rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
        }`}
      />
    ));
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n.charAt(0))
      .join('')
      .toUpperCase();
  };

  return (
    <section className="py-20 bg-gradient-to-b from-background to-muted/20">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <div className="text-center mb-16">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Users className="w-8 h-8 text-primary" />
            <h2 className="text-4xl font-bold text-foreground">
              O que dizem sobre nós
            </h2>
          </div>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Milhares de usuários e centenas de negócios já fazem parte da família Ofertivo
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-12 max-w-7xl mx-auto">
          {/* User Testimonials */}
          <div>
            <div className="flex items-center gap-3 mb-8">
              <div className="w-12 h-12 bg-gradient-primary rounded-full flex items-center justify-center">
                <ShoppingBag className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-foreground">Usuários Satisfeitos</h3>
                <p className="text-muted-foreground">Descobrindo ofertas incríveis todos os dias</p>
              </div>
            </div>

            {/* Main User Testimonial */}
            <Card className="border border-primary/20 shadow-card hover:shadow-glow transition-all duration-500 mb-6 bg-card/95 backdrop-blur-sm">
              <CardContent className="p-8">
                <div className="flex items-start gap-4 mb-6">
                  <Avatar className="w-16 h-16 border-2 border-primary/30">
                    <AvatarImage src={userTestimonials[currentUserIndex].avatar} />
                    <AvatarFallback className="bg-gradient-primary text-white font-bold text-lg">
                      {getInitials(userTestimonials[currentUserIndex].name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <h4 className="font-bold text-lg text-card-foreground">
                      {userTestimonials[currentUserIndex].name}
                    </h4>
                    <p className="text-muted-foreground text-sm mb-2">
                      {userTestimonials[currentUserIndex].city}
                    </p>
                    <div className="flex items-center gap-1">
                      {renderStars(userTestimonials[currentUserIndex].rating)}
                    </div>
                  </div>
                  <Quote className="w-8 h-8 text-primary/50" />
                </div>

                <blockquote className="text-card-foreground text-lg leading-relaxed italic mb-6 font-medium">
                  "{userTestimonials[currentUserIndex].comment}"
                </blockquote>

                <div className="flex items-center gap-4 pt-4 border-t border-border">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-primary" />
                    <span className="text-sm font-medium text-card-foreground">
                      {userTestimonials[currentUserIndex].points.toLocaleString()} pontos
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Award className="w-4 h-4 text-secondary" />
                    <span className="text-sm font-medium text-card-foreground">
                      {userTestimonials[currentUserIndex].badges} selos
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* User Navigation Dots */}
            <div className="flex justify-center gap-2">
              {userTestimonials.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentUserIndex(index)}
                  aria-label={`Ver depoimento do usuário ${index + 1} de ${userTestimonials.length}`}
                  className={`w-3 h-3 rounded-full transition-all duration-300 ${
                    index === currentUserIndex 
                      ? 'bg-primary scale-125' 
                      : 'bg-muted-foreground/30 hover:bg-muted-foreground/50'
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Business Testimonials */}
          <div>
            <div className="flex items-center gap-3 mb-8">
              <div className="w-12 h-12 bg-gradient-secondary rounded-full flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-foreground">Negócios em Crescimento</h3>
                <p className="text-muted-foreground">Expandindo seu alcance e vendas</p>
              </div>
            </div>

            {/* Main Business Testimonial */}
            <Card className="border border-secondary/20 shadow-card hover:shadow-glow transition-all duration-500 mb-6 bg-card/95 backdrop-blur-sm">
              <CardContent className="p-8">
                <div className="flex items-start gap-4 mb-6">
                  <div className="w-16 h-16 rounded-full bg-gradient-secondary flex items-center justify-center text-white font-bold text-2xl">
                    {businessTestimonials[currentBusinessIndex].logo || 
                     businessTestimonials[currentBusinessIndex].businessName.charAt(0)}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-bold text-lg text-card-foreground">
                      {businessTestimonials[currentBusinessIndex].businessName}
                    </h4>
                    <p className="text-muted-foreground text-sm mb-1">
                      {businessTestimonials[currentBusinessIndex].ownerName}
                    </p>
                    <Badge variant="outline" className="text-xs border-secondary/30 text-secondary">
                      {businessTestimonials[currentBusinessIndex].category}
                    </Badge>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-success">
                      {businessTestimonials[currentBusinessIndex].growth}
                    </div>
                    <div className="text-xs text-muted-foreground">crescimento</div>
                  </div>
                </div>

                <blockquote className="text-card-foreground text-lg leading-relaxed italic mb-6 font-medium">
                  "{businessTestimonials[currentBusinessIndex].comment}"
                </blockquote>

                <div className="flex items-center gap-4 pt-4 border-t border-border">
                  <div className="flex items-center gap-2">
                    <ShoppingBag className="w-4 h-4 text-secondary" />
                    <span className="text-sm font-medium text-card-foreground">
                      {businessTestimonials[currentBusinessIndex].offers} ofertas ativas
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Business Navigation Dots */}
            <div className="flex justify-center gap-2">
              {businessTestimonials.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentBusinessIndex(index)}
                  aria-label={`Ver depoimento do negócio ${index + 1} de ${businessTestimonials.length}`}
                  className={`w-3 h-3 rounded-full transition-all duration-300 ${
                    index === currentBusinessIndex 
                      ? 'bg-secondary scale-125' 
                      : 'bg-muted-foreground/30 hover:bg-muted-foreground/50'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Trust Indicators */}
        <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          <div>
            <div className="text-3xl font-bold text-primary mb-2">98%</div>
            <div className="text-sm text-muted-foreground">Satisfação dos usuários</div>
          </div>
          <div>
            <div className="text-3xl font-bold text-secondary mb-2">4.8</div>
            <div className="text-sm text-muted-foreground">Avaliação média</div>
          </div>
          <div>
            <div className="text-3xl font-bold text-green-600 mb-2">+35%</div>
            <div className="text-sm text-muted-foreground">Crescimento médio dos negócios</div>
          </div>
          <div>
            <div className="text-3xl font-bold text-amber-600 mb-2">24/7</div>
            <div className="text-sm text-muted-foreground">Suporte disponível</div>
          </div>
        </div>
      </div>
    </section>
  );
};