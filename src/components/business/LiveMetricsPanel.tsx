import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Eye, Heart, QrCode, Share2, Users, MapPin, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LiveMetricsPanelProps {
  totalViews: number;
  totalLikes: number;
  totalShares: number;
  totalCheckins: number;
  todayCheckins: number;
  followersCount: number;
  liveUsers: number;
}

export const LiveMetricsPanel = ({
  totalViews,
  totalLikes,
  totalShares,
  totalCheckins,
  todayCheckins,
  followersCount,
  liveUsers,
}: LiveMetricsPanelProps) => {
  const navigate = useNavigate();
  const metrics = [
    { 
      label: 'Visualizações', 
      value: totalViews, 
      icon: Eye, 
      color: 'from-blue-500 to-blue-600',
      iconColor: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
    },
    { 
      label: 'Curtidas', 
      value: totalLikes, 
      icon: Heart, 
      color: 'from-rose-500 to-rose-600',
      iconColor: 'text-rose-500',
      bgColor: 'bg-rose-500/10',
    },
    { 
      label: 'Check-ins', 
      value: totalCheckins, 
      icon: QrCode, 
      color: 'from-emerald-500 to-emerald-600',
      iconColor: 'text-emerald-500',
      bgColor: 'bg-emerald-500/10',
      badge: todayCheckins > 0 ? `+${todayCheckins} hoje` : undefined,
    },
    { 
      label: 'Compartilhamentos', 
      value: totalShares, 
      icon: Share2, 
      color: 'from-amber-500 to-amber-600',
      iconColor: 'text-amber-500',
      bgColor: 'bg-amber-500/10',
    },
    { 
      label: 'Seguidores', 
      value: followersCount, 
      icon: Users, 
      color: 'from-purple-500 to-purple-600',
      iconColor: 'text-purple-500',
      bgColor: 'bg-purple-500/10',
      fullWidthMobile: true,
    },
    { 
      label: 'Radar de Clientes', 
      value: liveUsers, 
      icon: MapPin, 
      color: 'from-primary to-primary/80',
      iconColor: 'text-primary',
      bgColor: 'bg-primary/10',
      live: true,
      clickable: true,
      highlighted: true,
    },
  ];

  return (
    <Card className="border-0 shadow-lg overflow-hidden">
      <CardHeader className="pb-3 bg-gradient-to-r from-foreground to-foreground/90 text-background">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base sm:text-lg flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Performance do Negócio
          </CardTitle>
          <Badge className="bg-green-500/20 text-green-300 border-green-500/40 animate-pulse">
            🔴 Ao vivo
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="p-3 sm:p-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {metrics.map(({ label, value, icon: Icon, iconColor, bgColor, badge, live, clickable, highlighted, fullWidthMobile }) => (
            <div
              key={label}
              className={cn(
                'relative flex flex-col items-center p-3 rounded-xl transition-all hover:scale-105',
                bgColor,
                clickable && 'cursor-pointer',
                (highlighted || fullWidthMobile) && 'col-span-2 sm:col-span-1',
                highlighted 
                  ? 'ring-2 ring-primary shadow-lg shadow-primary/20 bg-gradient-to-br from-primary/15 to-primary/5 hover:shadow-xl hover:shadow-primary/30' 
                  : clickable 
                    ? 'ring-1 ring-primary/20 hover:ring-primary/50' 
                    : ''
              )}
              onClick={clickable ? () => navigate('/anunciante/radar-clientes') : undefined}
            >
              {live && (
                <span className="absolute top-1.5 right-1.5 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500" />
                </span>
              )}
              {highlighted && (
                <Badge className="absolute -top-2 left-1/2 -translate-x-1/2 text-[8px] px-1.5 py-0 bg-primary text-primary-foreground border-0 whitespace-nowrap">
                  📍 Ver no Mapa
                </Badge>
              )}
              <Icon className={cn('w-5 h-5 mb-1.5', highlighted ? 'text-primary w-6 h-6' : iconColor)} />
              <span className={cn("font-bold", highlighted ? "text-2xl sm:text-3xl text-primary" : "text-xl sm:text-2xl")}>{value.toLocaleString('pt-BR')}</span>
              <span className={cn("text-center leading-tight", highlighted ? "text-xs sm:text-sm font-medium text-foreground" : "text-[10px] sm:text-xs text-muted-foreground")}>{label}</span>
              {badge && (
                <Badge className="mt-1 text-[9px] px-1.5 py-0 bg-green-500/20 text-green-700 dark:text-green-400 border-0">
                  {badge}
                </Badge>
              )}
            </div>
          ))}
        </div>

        {/* Impactful phrase */}
        {totalViews > 0 && (
          <div className="mt-4 text-center p-3 bg-muted/50 rounded-lg">
            <p className="text-sm font-medium text-foreground">
              🎯 Hoje <span className="text-primary font-bold">{todayCheckins > 0 ? todayCheckins : totalViews}</span> pessoas{' '}
              {todayCheckins > 0 ? 'fizeram check-in' : 'viram suas ofertas'}
              {liveUsers > 0 && (
                <> e <span className="text-primary font-bold">{liveUsers}</span> estão próximas agora</>
              )}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
