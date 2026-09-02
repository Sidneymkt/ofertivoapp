import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  TrendingUp, 
  Target, 
  Users, 
  Gift, 
  Star, 
  Zap,
  Camera,
  Clock,
  Award,
  Heart
} from 'lucide-react';

const BusinessTipsFooter = () => {
  const tips = [
    {
      icon: Camera,
      title: 'Fotos de Qualidade',
      description: 'Use imagens atrativas e profissionais nas suas ofertas. Fotos de boa qualidade aumentam em até 3x o engajamento.',
      gradient: 'from-blue-500/10 to-cyan-500/10 hover:from-blue-500/20 hover:to-cyan-500/20',
    },
    {
      icon: Clock,
      title: 'Ofertas Relâmpago',
      description: 'Crie ofertas com tempo limitado para gerar senso de urgência e aumentar conversões rapidamente.',
      gradient: 'from-orange-500/10 to-red-500/10 hover:from-orange-500/20 hover:to-red-500/20',
    },
    {
      icon: Target,
      title: 'Segmente seu Público',
      description: 'Crie ofertas específicas para diferentes perfis de clientes. Personalização aumenta a taxa de resgate.',
      gradient: 'from-purple-500/10 to-pink-500/10 hover:from-purple-500/20 hover:to-pink-500/20',
    },
    {
      icon: Gift,
      title: 'Sorteios Atrativos',
      description: 'Realize sorteios periódicos para aumentar o engajamento e conquistar novos seguidores.',
      gradient: 'from-green-500/10 to-emerald-500/10 hover:from-green-500/20 hover:to-emerald-500/20',
    },
    {
      icon: Star,
      title: 'Incentive Avaliações',
      description: 'Peça feedback aos clientes após o check-in. Boas avaliações atraem mais consumidores.',
      gradient: 'from-yellow-500/10 to-amber-500/10 hover:from-yellow-500/20 hover:to-amber-500/20',
    },
    {
      icon: Users,
      title: 'Construa sua Base',
      description: 'Quanto mais seguidores, maior o alcance das suas ofertas. Incentive clientes a seguirem seu negócio.',
      gradient: 'from-indigo-500/10 to-blue-500/10 hover:from-indigo-500/20 hover:to-blue-500/20',
    },
    {
      icon: Zap,
      title: 'Publique Regularmente',
      description: 'Mantenha seu negócio ativo com ofertas frequentes. Negócios ativos aparecem mais no feed.',
      gradient: 'from-pink-500/10 to-rose-500/10 hover:from-pink-500/20 hover:to-rose-500/20',
    },
    {
      icon: TrendingUp,
      title: 'Analise os Dados',
      description: 'Acompanhe suas métricas regularmente e ajuste suas estratégias com base no desempenho.',
      gradient: 'from-cyan-500/10 to-teal-500/10 hover:from-cyan-500/20 hover:to-teal-500/20',
    },
    {
      icon: Heart,
      title: 'Fidelize Clientes',
      description: 'Crie ofertas exclusivas para quem já resgatou antes. Cliente fidelizado vale ouro!',
      gradient: 'from-red-500/10 to-pink-500/10 hover:from-red-500/20 hover:to-pink-500/20',
    },
    {
      icon: Award,
      title: 'Conquiste Emblemas',
      description: 'Complete conquistas para ganhar emblemas e destaque na plataforma. Negócios com emblemas convertem mais.',
      gradient: 'from-amber-500/10 to-orange-500/10 hover:from-amber-500/20 hover:to-orange-500/20',
    },
  ];

  return (
    <div className="mt-8 pt-8 border-t bg-gradient-to-b from-background to-muted/20">
      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h3 className="text-2xl sm:text-3xl font-bold mb-2 bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            Dicas para Crescer seu Negócio
          </h3>
          <p className="text-muted-foreground text-sm sm:text-base">
            Maximize seus resultados com estas estratégias comprovadas
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {tips.map((tip, index) => (
            <Card 
              key={index} 
              className={`group transition-all duration-300 hover:shadow-lg border bg-gradient-to-br ${tip.gradient}`}
            >
              <CardContent className="p-4">
                <div className="flex flex-col items-center text-center gap-3">
                  <div className="p-3 rounded-full bg-primary/10 group-hover:bg-primary/20 transition-colors">
                    <tip.icon className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm mb-1">{tip.title}</h4>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {tip.description}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="text-center mt-8 p-4 rounded-lg bg-primary/5 border border-primary/10">
          <p className="text-sm text-muted-foreground">
            💡 <strong>Dica Extra:</strong> Combine várias estratégias para resultados ainda melhores. 
            Negócios que aplicam essas práticas crescem até 5x mais rápido na plataforma!
          </p>
        </div>
      </div>
    </div>
  );
};

export default BusinessTipsFooter;
