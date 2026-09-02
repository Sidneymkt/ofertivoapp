import React from 'react';
import { TrendingUp, Eye, Heart, Share2, Gift } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

interface BusinessPerformanceChartProps {
  totalViews: number;
  totalLikes: number;
  totalShares: number;
  totalRedemptions: number;
}

const chartConfig = {
  views: { label: 'Visualizações', color: 'hsl(217 91% 60%)', icon: Eye },
  likes: { label: 'Curtidas', color: 'hsl(160 84% 45%)', icon: Heart },
  shares: { label: 'Compartilhamentos', color: 'hsl(262 83% 65%)', icon: Share2 },
  redemptions: { label: 'Resgates', color: 'hsl(38 92% 55%)', icon: Gift },
};

const BusinessPerformanceChart: React.FC<BusinessPerformanceChartProps> = ({
  totalViews,
  totalLikes,
  totalShares,
  totalRedemptions,
}) => {
  const data = [
    { key: 'views', name: 'Visualizações', value: totalViews, fill: chartConfig.views.color },
    { key: 'likes', name: 'Curtidas', value: totalLikes, fill: chartConfig.likes.color },
    { key: 'shares', name: 'Compartilhamentos', value: totalShares, fill: chartConfig.shares.color },
    { key: 'redemptions', name: 'Resgates', value: totalRedemptions, fill: chartConfig.redemptions.color },
  ];

  const total = totalViews + totalLikes + totalShares + totalRedemptions;
  const formatNum = (n: number) => n >= 1000 ? `${(n / 1000).toFixed(1)}k` : n.toString();

  return (
    <Card className="bg-gradient-to-br from-card via-card to-card/80 border-border/50 shadow-lg overflow-hidden">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between text-base sm:text-lg">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-primary/10">
              <TrendingUp className="w-4 h-4 text-primary" />
            </div>
            <span>Distribuição de Performance</span>
          </div>
          {total > 0 && (
            <span className="text-xs font-normal text-muted-foreground">
              {formatNum(total)} interações
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-2">
        {total > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
            {/* Donut Chart */}
            <div className="relative">
              <ChartContainer config={chartConfig} className="aspect-square max-h-[240px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <defs>
                      {data.map((entry) => (
                        <linearGradient key={`grad-${entry.key}`} id={`gradient-${entry.key}`} x1="0" y1="0" x2="1" y2="1">
                          <stop offset="0%" stopColor={entry.fill} stopOpacity={1} />
                          <stop offset="100%" stopColor={entry.fill} stopOpacity={0.7} />
                        </linearGradient>
                      ))}
                    </defs>
                    <ChartTooltip
                      cursor={false}
                      content={<ChartTooltipContent hideLabel />}
                    />
                    <Pie
                      data={data}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={95}
                      innerRadius={62}
                      paddingAngle={3}
                      strokeWidth={0}
                    >
                      {data.map((entry) => (
                        <Cell key={`cell-${entry.key}`} fill={`url(#gradient-${entry.key})`} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </ChartContainer>
              {/* Center label */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-2xl sm:text-3xl font-bold text-foreground">{formatNum(total)}</span>
                <span className="text-xs text-muted-foreground">Total</span>
              </div>
            </div>

            {/* Legend with stats */}
            <div className="space-y-2">
              {data.map((entry) => {
                const Icon = chartConfig[entry.key as keyof typeof chartConfig].icon;
                const percentage = total > 0 ? ((entry.value / total) * 100).toFixed(1) : '0';
                return (
                  <div
                    key={entry.key}
                    className="flex items-center justify-between p-2.5 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors border border-border/30"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className="p-1.5 rounded-md flex-shrink-0"
                        style={{ backgroundColor: `${entry.fill}20` }}
                      >
                        <Icon className="w-3.5 h-3.5" style={{ color: entry.fill }} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-foreground truncate">{entry.name}</p>
                        <p className="text-[10px] text-muted-foreground">{percentage}%</p>
                      </div>
                    </div>
                    <span className="text-sm font-bold tabular-nums" style={{ color: entry.fill }}>
                      {formatNum(entry.value)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-[280px] text-muted-foreground">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-muted/50 flex items-center justify-center">
                <TrendingUp className="w-8 h-8 opacity-50" />
              </div>
              <p className="font-medium">Nenhum dado disponível</p>
              <p className="text-sm mt-1">Dados aparecerão quando houver atividade</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default BusinessPerformanceChart;
