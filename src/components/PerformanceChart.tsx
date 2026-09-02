
import React from 'react';
import { TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Cell } from 'recharts';

interface PerformanceChartProps {
  totalViews: number;
  totalLikes: number;
  totalShares: number;
  totalRedemptions: number;
}

const chartConfig = {
  views: {
    label: "Visualizações",
    color: "hsl(var(--primary))",
  },
  likes: {
    label: "Curtidas", 
    color: "hsl(var(--success))",
  },
  shares: {
    label: "Compartilhamentos",
    color: "hsl(var(--secondary))",
  },
  redemptions: {
    label: "Resgates",
    color: "hsl(var(--points-gold))",
  },
};

const PerformanceChart: React.FC<PerformanceChartProps> = ({
  totalViews,
  totalLikes,
  totalShares,
  totalRedemptions,
}) => {
  const data = [
    { 
      name: "Visualizações", 
      value: totalViews,
      fill: chartConfig.views.color,
      category: "views"
    },
    { 
      name: "Curtidas", 
      value: totalLikes,
      fill: chartConfig.likes.color,
      category: "likes"
    },
    { 
      name: "Compartilhamentos", 
      value: totalShares,
      fill: chartConfig.shares.color,
      category: "shares"
    },
    { 
      name: "Resgates", 
      value: totalRedemptions,
      fill: chartConfig.redemptions.color,
      category: "redemptions"
    },
  ];

  const total = totalViews + totalLikes + totalShares + totalRedemptions;

  return (
    <Card className="bg-card border">
      <CardHeader>
        <CardTitle className="flex items-center text-base sm:text-lg">
          <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
          Distribuição de Performance
        </CardTitle>
      </CardHeader>
      <CardContent>
        {total > 0 ? (
          <ChartContainer
            config={chartConfig}
            className="h-[350px] w-full"
          >
            <BarChart
              data={data}
              margin={{
                top: 20,
                right: 30,
                left: 20,
                bottom: 5,
              }}
            >
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted/30" />
              <XAxis 
                dataKey="name" 
                className="text-xs"
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis 
                className="text-xs"
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={false}
              />
              <ChartTooltip
                cursor={{ fill: 'hsl(var(--muted))', opacity: 0.3 }}
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="rounded-lg border bg-background p-3 shadow-lg">
                        <p className="font-medium text-sm">{label}</p>
                        <p className="text-lg font-bold text-primary">
                          {payload[0].value}
                        </p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar 
                dataKey="value" 
                radius={[6, 6, 0, 0]}
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ChartContainer>
        ) : (
          <div className="flex items-center justify-center h-[350px] text-muted-foreground">
            <div className="text-center">
              <TrendingUp className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Nenhum dado disponível</p>
              <p className="text-sm">Dados aparecerão quando houver atividade</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PerformanceChart;
