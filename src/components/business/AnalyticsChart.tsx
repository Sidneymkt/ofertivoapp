import React, { useMemo, useState } from 'react';
import {
  BarChart3,
  LineChart as LineIcon,
  AreaChart as AreaIcon,
  Activity,
  Columns3,
  TrendingUp,
  Eye,
  Heart,
  Share2,
  Gift,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  CartesianGrid,
  XAxis,
  YAxis,
  Cell,
  PieChart,
  Pie,
} from 'recharts';
import type { AnalyticsDayPoint, AnalyticsPeriod } from '@/hooks/useBusinessAnalyticsTimeSeries';

export type ChartKind = 'column' | 'bar' | 'line' | 'area' | 'histogram';
export type MetricKey = 'views' | 'likes' | 'checkins' | 'shares' | 'points' | 'followers';

interface DistributionTotals {
  totalViews: number;
  totalLikes: number;
  totalShares: number;
  totalRedemptions: number;
}

const DISTRIBUTION_CONFIG = {
  views: { label: 'Visualizações', color: 'hsl(217 91% 60%)', icon: Eye },
  likes: { label: 'Curtidas', color: 'hsl(160 84% 45%)', icon: Heart },
  shares: { label: 'Compartilhamentos', color: 'hsl(262 83% 65%)', icon: Share2 },
  redemptions: { label: 'Resgates', color: 'hsl(38 92% 55%)', icon: Gift },
} as const;

const METRICS: Record<MetricKey, { label: string; color: string }> = {
  views: { label: 'Visualizações', color: 'hsl(217 91% 60%)' },
  likes: { label: 'Curtidas', color: 'hsl(160 84% 45%)' },
  checkins: { label: 'Check-ins', color: 'hsl(38 92% 55%)' },
  shares: { label: 'Compartilhamentos', color: 'hsl(262 83% 65%)' },
  points: { label: 'Pontos gerados', color: 'hsl(340 82% 60%)' },
  followers: { label: 'Novos seguidores', color: 'hsl(189 94% 50%)' },
};

const CHART_OPTIONS: { value: ChartKind; label: string; icon: React.ElementType }[] = [
  { value: 'column', label: 'Colunas', icon: BarChart3 },
  { value: 'bar', label: 'Barras', icon: Columns3 },
  { value: 'line', label: 'Linhas', icon: LineIcon },
  { value: 'area', label: 'Área', icon: AreaIcon },
  { value: 'histogram', label: 'Histograma', icon: Activity },
];

interface AnalyticsChartProps {
  data: AnalyticsDayPoint[];
  loading?: boolean;
  period: AnalyticsPeriod;
  onPeriodChange: (p: AnalyticsPeriod) => void;
  distribution?: DistributionTotals;
}

const AnalyticsChart: React.FC<AnalyticsChartProps> = ({
  data,
  loading,
  period,
  onPeriodChange,
  distribution,
}) => {
  const [chartType, setChartType] = useState<ChartKind>('area');
  const [metric, setMetric] = useState<MetricKey>('checkins');

  const chartConfig = useMemo(
    () => ({
      [metric]: { label: METRICS[metric].label, color: METRICS[metric].color },
    }),
    [metric]
  );

  const total = useMemo(() => data.reduce((acc, d) => acc + (d[metric] as number), 0), [data, metric]);

  const color = METRICS[metric].color;
  const gradientId = `analytics-gradient-${metric}`;

  // Distribution donut data
  const distributionData = useMemo(() => {
    if (!distribution) return [];
    return [
      { key: 'views', name: 'Visualizações', value: distribution.totalViews, fill: DISTRIBUTION_CONFIG.views.color },
      { key: 'likes', name: 'Curtidas', value: distribution.totalLikes, fill: DISTRIBUTION_CONFIG.likes.color },
      { key: 'shares', name: 'Compartilhamentos', value: distribution.totalShares, fill: DISTRIBUTION_CONFIG.shares.color },
      { key: 'redemptions', name: 'Resgates', value: distribution.totalRedemptions, fill: DISTRIBUTION_CONFIG.redemptions.color },
    ];
  }, [distribution]);
  const distributionTotal = useMemo(
    () => distributionData.reduce((a, d) => a + d.value, 0),
    [distributionData]
  );
  const formatNum = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(1)}k` : n.toString());
  const distributionConfig = useMemo(
    () => ({
      views: { label: DISTRIBUTION_CONFIG.views.label, color: DISTRIBUTION_CONFIG.views.color },
      likes: { label: DISTRIBUTION_CONFIG.likes.label, color: DISTRIBUTION_CONFIG.likes.color },
      shares: { label: DISTRIBUTION_CONFIG.shares.label, color: DISTRIBUTION_CONFIG.shares.color },
      redemptions: { label: DISTRIBUTION_CONFIG.redemptions.label, color: DISTRIBUTION_CONFIG.redemptions.color },
    }),
    []
  );

  // Histogram: distribution of daily values into buckets
  const histogramData = useMemo(() => {
    if (chartType !== 'histogram') return [];
    const values = data.map((d) => d[metric] as number);
    const max = Math.max(1, ...values);
    const bucketCount = 6;
    const size = Math.max(1, Math.ceil(max / bucketCount));
    const buckets = Array.from({ length: bucketCount }, (_, i) => ({
      label: `${i * size}-${(i + 1) * size}`,
      count: 0,
    }));
    values.forEach((v) => {
      const idx = Math.min(bucketCount - 1, Math.floor(v / size));
      buckets[idx].count += 1;
    });
    return buckets;
  }, [data, metric, chartType]);

  const renderChart = () => {
    if (chartType === 'histogram') {
      return (
        <BarChart data={histogramData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.95} />
              <stop offset="100%" stopColor={color} stopOpacity={0.55} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
          <XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" fontSize={11} />
          <YAxis allowDecimals={false} stroke="hsl(var(--muted-foreground))" fontSize={11} />
          <ChartTooltip content={<ChartTooltipContent />} />
          <Bar dataKey="count" radius={[6, 6, 0, 0]} fill={`url(#${gradientId})`}>
            {histogramData.map((_, i) => (
              <Cell key={i} fill={`url(#${gradientId})`} />
            ))}
          </Bar>
        </BarChart>
      );
    }

    if (chartType === 'line') {
      return (
        <LineChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
          <XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" fontSize={11} />
          <YAxis allowDecimals={false} stroke="hsl(var(--muted-foreground))" fontSize={11} />
          <ChartTooltip content={<ChartTooltipContent />} />
          <Line
            type="monotone"
            dataKey={metric}
            stroke={color}
            strokeWidth={2.5}
            dot={{ r: 3, fill: color }}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      );
    }

    if (chartType === 'area') {
      return (
        <AreaChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.6} />
              <stop offset="100%" stopColor={color} stopOpacity={0.05} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
          <XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" fontSize={11} />
          <YAxis allowDecimals={false} stroke="hsl(var(--muted-foreground))" fontSize={11} />
          <ChartTooltip content={<ChartTooltipContent />} />
          <Area
            type="monotone"
            dataKey={metric}
            stroke={color}
            strokeWidth={2.5}
            fill={`url(#${gradientId})`}
          />
        </AreaChart>
      );
    }

    if (chartType === 'bar') {
      return (
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 8, right: 16, left: 8, bottom: 0 }}
        >
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor={color} stopOpacity={0.95} />
              <stop offset="100%" stopColor={color} stopOpacity={0.55} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
          <XAxis type="number" allowDecimals={false} stroke="hsl(var(--muted-foreground))" fontSize={11} />
          <YAxis
            type="category"
            dataKey="label"
            stroke="hsl(var(--muted-foreground))"
            fontSize={10}
            width={48}
            interval={Math.max(0, Math.floor(data.length / 10) - 1)}
          />
          <ChartTooltip content={<ChartTooltipContent />} />
          <Bar dataKey={metric} radius={[0, 6, 6, 0]} fill={`url(#${gradientId})`} />
        </BarChart>
      );
    }

    // column (default)
    return (
      <BarChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.95} />
            <stop offset="100%" stopColor={color} stopOpacity={0.55} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
        <XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" fontSize={11} />
        <YAxis allowDecimals={false} stroke="hsl(var(--muted-foreground))" fontSize={11} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Bar dataKey={metric} radius={[6, 6, 0, 0]} fill={`url(#${gradientId})`} />
      </BarChart>
    );
  };

  return (
    <Card className="bg-gradient-to-br from-card via-card to-card/80 border-border/50 shadow-lg overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex flex-col gap-3">
          <CardTitle className="flex items-center justify-between text-base sm:text-lg">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-primary/10">
                <TrendingUp className="w-4 h-4 text-primary" />
              </div>
              <span>Análise Avançada</span>
            </div>
            <span className="text-xs font-normal text-muted-foreground">
              Total: <span className="font-bold text-foreground">{total.toLocaleString('pt-BR')}</span>
            </span>
          </CardTitle>

          {/* Controls */}
          <div className="flex flex-wrap items-center gap-2">
            <Select value={metric} onValueChange={(v) => setMetric(v as MetricKey)}>
              <SelectTrigger className="h-9 w-[180px] text-xs">
                <SelectValue placeholder="Métrica" />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(METRICS) as MetricKey[]).map((k) => (
                  <SelectItem key={k} value={k} className="text-xs">
                    {METRICS[k].label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={String(chartType)} onValueChange={(v) => setChartType(v as ChartKind)}>
              <SelectTrigger className="h-9 w-[170px] text-xs">
                <SelectValue placeholder="Tipo de Visualização" />
              </SelectTrigger>
              <SelectContent>
                {CHART_OPTIONS.map((opt) => {
                  const Icon = opt.icon;
                  return (
                    <SelectItem key={opt.value} value={opt.value} className="text-xs">
                      <span className="flex items-center gap-2">
                        <Icon className="w-3.5 h-3.5" />
                        {opt.label}
                      </span>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>

            <ToggleGroup
              type="single"
              value={String(period)}
              onValueChange={(v) => v && onPeriodChange(Number(v) as AnalyticsPeriod)}
              className="ml-auto"
            >
              <ToggleGroupItem value="7" className="h-9 px-3 text-xs">7d</ToggleGroupItem>
              <ToggleGroupItem value="30" className="h-9 px-3 text-xs">30d</ToggleGroupItem>
              <ToggleGroupItem value="90" className="h-9 px-3 text-xs">90d</ToggleGroupItem>
            </ToggleGroup>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-2">
        <div className={`grid grid-cols-1 ${distribution && distributionTotal > 0 ? 'md:grid-cols-2' : ''} gap-4 items-center`}>
          {distribution && distributionTotal > 0 && (
            <div className="relative">
              <ChartContainer config={distributionConfig} className="aspect-square max-h-[280px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <defs>
                      {distributionData.map((entry) => (
                        <linearGradient key={`grad-${entry.key}`} id={`dist-gradient-${entry.key}`} x1="0" y1="0" x2="1" y2="1">
                          <stop offset="0%" stopColor={entry.fill} stopOpacity={1} />
                          <stop offset="100%" stopColor={entry.fill} stopOpacity={0.7} />
                        </linearGradient>
                      ))}
                    </defs>
                    <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
                    <Pie
                      data={distributionData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      innerRadius={68}
                      paddingAngle={3}
                      strokeWidth={0}
                    >
                      {distributionData.map((entry) => (
                        <Cell key={`cell-${entry.key}`} fill={`url(#dist-gradient-${entry.key})`} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </ChartContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-2xl sm:text-3xl font-bold text-foreground">{formatNum(distributionTotal)}</span>
                <span className="text-xs text-muted-foreground">Total</span>
              </div>
            </div>
          )}

          <ChartContainer config={chartConfig} className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              {loading ? (
                <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
                  Carregando dados...
                </div>
              ) : (
                renderChart()
              )}
            </ResponsiveContainer>
          </ChartContainer>
        </div>
      </CardContent>
    </Card>
  );
};

export default AnalyticsChart;
