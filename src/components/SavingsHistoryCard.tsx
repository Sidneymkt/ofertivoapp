import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { TrendingDown, Calendar, PiggyBank, Target, ArrowUpRight } from 'lucide-react';

export const SavingsHistoryCard = () => {
  const { user } = useAuth();

  const { data: history } = useQuery({
    queryKey: ['savings-history', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      // Get all checkins with savings data, grouped by month
      const { data: checkins } = await supabase
        .from('offer_checkins')
        .select('created_at, offers (original_price, discounted_price, title)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      // Group by month
      const monthlyData: Record<string, { saved: number; count: number }> = {};
      let totalSaved = 0;
      let bestMonth = { key: '', saved: 0 };

      (checkins || []).forEach((c: any) => {
        const offer = c.offers;
        if (!offer?.original_price || !offer?.discounted_price) return;
        
        const saved = Number(offer.original_price) - Number(offer.discounted_price);
        if (saved <= 0) return;

        const date = new Date(c.created_at);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

        if (!monthlyData[monthKey]) {
          monthlyData[monthKey] = { saved: 0, count: 0 };
        }
        monthlyData[monthKey].saved += saved;
        monthlyData[monthKey].count++;
        totalSaved += saved;

        if (monthlyData[monthKey].saved > bestMonth.saved) {
          bestMonth = { key: monthKey, saved: monthlyData[monthKey].saved };
        }
      });

      // Get last 6 months
      const months = Object.entries(monthlyData)
        .sort((a, b) => b[0].localeCompare(a[0]))
        .slice(0, 6);

      // Monthly average
      const monthCount = months.length || 1;
      const avgMonthly = totalSaved / monthCount;

      // Projection: at this rate, how much in 12 months
      const yearProjection = avgMonthly * 12;

      return {
        totalSaved: Math.round(totalSaved * 100) / 100,
        months,
        bestMonth,
        avgMonthly: Math.round(avgMonthly * 100) / 100,
        yearProjection: Math.round(yearProjection * 100) / 100,
        totalCheckins: (checkins || []).length,
      };
    },
    enabled: !!user?.id,
    staleTime: 60000,
  });

  if (!user || !history) return null;

  const formatMonth = (key: string) => {
    const [year, month] = key.split('-');
    const date = new Date(Number(year), Number(month) - 1);
    return date.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
  };

  const maxSaved = Math.max(...history.months.map(([_, d]) => d.saved), 1);

  return (
    <Card className="border-0 shadow-card overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <PiggyBank className="w-5 h-5 text-green-600" />
            <CardTitle className="text-base sm:text-lg">Modo Economia</CardTitle>
          </div>
          <Badge className="bg-green-500/10 text-green-700 border-green-200 text-xs">
            <ArrowUpRight className="w-3 h-3 mr-1" />
            R$ {history.totalSaved.toFixed(2).replace('.', ',')} total
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="p-4 space-y-4">
        {/* Stats Summary */}
        <div className="grid grid-cols-3 gap-2">
          <div className="text-center p-2 rounded-lg bg-green-50 dark:bg-green-950/20">
            <TrendingDown className="w-4 h-4 mx-auto text-green-600 mb-1" />
            <p className="text-sm font-bold text-green-700 dark:text-green-400">
              R$ {history.avgMonthly.toFixed(0).replace('.', ',')}
            </p>
            <p className="text-[10px] text-muted-foreground">Média/mês</p>
          </div>
          <div className="text-center p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/20">
            <Target className="w-4 h-4 mx-auto text-emerald-600 mb-1" />
            <p className="text-sm font-bold text-emerald-700 dark:text-emerald-400">
              R$ {history.yearProjection.toFixed(0).replace('.', ',')}
            </p>
            <p className="text-[10px] text-muted-foreground">Projeção/ano</p>
          </div>
          <div className="text-center p-2 rounded-lg bg-teal-50 dark:bg-teal-950/20">
            <Calendar className="w-4 h-4 mx-auto text-teal-600 mb-1" />
            <p className="text-sm font-bold text-teal-700 dark:text-teal-400">
              {history.totalCheckins}
            </p>
            <p className="text-[10px] text-muted-foreground">Check-ins</p>
          </div>
        </div>

        {/* Monthly Bar Chart */}
        {history.months.length > 0 && (
          <div>
            <p className="text-xs text-muted-foreground mb-2 font-medium">Economia mensal</p>
            <div className="flex items-end gap-1 h-20">
              {history.months.reverse().map(([key, data]) => {
                const height = (data.saved / maxSaved) * 100;
                const isBest = key === history.bestMonth.key;
                return (
                  <div key={key} className="flex-1 flex flex-col items-center gap-1">
                    <span className="text-[9px] text-muted-foreground">
                      R${data.saved.toFixed(0)}
                    </span>
                    <div
                      className={`w-full rounded-t-sm transition-all ${
                        isBest
                          ? 'bg-gradient-to-t from-green-500 to-emerald-400'
                          : 'bg-green-300 dark:bg-green-700'
                      }`}
                      style={{ height: `${Math.max(height, 8)}%` }}
                    />
                    <span className="text-[9px] text-muted-foreground">{formatMonth(key)}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {history.months.length === 0 && (
          <div className="text-center py-4 text-muted-foreground">
            <PiggyBank className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm">Faça check-ins para começar a economizar!</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
