import { Card, CardContent } from '@/components/ui/card';
import { Lightbulb, Zap, Gift, Share2, Star, UserPlus } from 'lucide-react';

export const TipsFooter = () => {
  const tips = [
    {
      icon: Zap,
      title: "Faça Check-ins",
      description: "Ganhe até 50 pontos por check-in em ofertas",
      color: "from-orange-500/20 to-orange-600/20 border-orange-500/30"
    },
    {
      icon: Share2,
      title: "Compartilhe Ofertas",
      description: "Ganhe 10 pontos ao compartilhar ofertas com amigos",
      color: "from-blue-500/20 to-blue-600/20 border-blue-500/30"
    },
    {
      icon: Star,
      title: "Avalie Estabelecimentos",
      description: "Receba 15 pontos por cada avaliação feita",
      color: "from-yellow-500/20 to-yellow-600/20 border-yellow-500/30"
    },
    {
      icon: UserPlus,
      title: "Indique Amigos",
      description: "Ganhe 100 pontos quando seu amigo se cadastrar",
      color: "from-green-500/20 to-green-600/20 border-green-500/30"
    },
    {
      icon: Gift,
      title: "Participe de Sorteios",
      description: "Use seus pontos para participar de sorteios exclusivos",
      color: "from-purple-500/20 to-purple-600/20 border-purple-500/30"
    }
  ];

  return (
    <div className="bg-gradient-to-br from-primary/5 via-background to-accent/5 border-t mt-8">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="flex items-center gap-3 mb-6">
          <Lightbulb className="h-6 w-6 text-primary animate-pulse" />
          <h3 className="text-xl font-bold">Dicas para Ganhar Mais Pontos</h3>
        </div>
        
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {tips.map((tip, index) => {
            const Icon = tip.icon;
            return (
              <Card 
                key={index} 
                className={`border bg-gradient-to-br ${tip.color} hover:scale-105 transition-transform duration-200`}
              >
                <CardContent className="p-4">
                  <div className="flex flex-col items-center text-center gap-3">
                    <div className="p-3 bg-background rounded-full">
                      <Icon className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-sm mb-1">{tip.title}</h4>
                      <p className="text-xs text-muted-foreground leading-tight">{tip.description}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="mt-6 text-center">
          <p className="text-sm text-muted-foreground">
            Continue participando para ganhar mais recompensas! 🎉
          </p>
        </div>
      </div>
    </div>
  );
};
