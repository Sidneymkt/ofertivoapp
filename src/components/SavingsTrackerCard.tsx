import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { TrendingDown, Wallet, ShoppingBag, Trophy } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const SavingsTrackerCard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data: savings } = useQuery({
    queryKey: ['user-savings', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      // Get checkins with offer price data
      const { data: checkins } = await supabase
        .from('offer_checkins')
        .select(`
          points_awarded,
          offers (original_price, discounted_price)
        `)
        .eq('user_id', user.id);

      const totalSaved = checkins?.reduce((sum, c: any) => {
        const offer = c.offers;
        if (offer?.original_price && offer?.discounted_price) {
          return sum + (Number(offer.original_price) - Number(offer.discounted_price));
        }
        return sum;
      }, 0) || 0;

      // Get total points
      const { data: profile } = await supabase
        .from('profiles')
        .select('total_points')
        .eq('user_id', user.id)
        .single();

      // Get this month's savings
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const { data: monthCheckins } = await supabase
        .from('offer_checkins')
        .select('offers (original_price, discounted_price)')
        .eq('user_id', user.id)
        .gte('created_at', startOfMonth.toISOString());

      const monthSaved = monthCheckins?.reduce((sum, c: any) => {
        const offer = c.offers;
        if (offer?.original_price && offer?.discounted_price) {
          return sum + (Number(offer.original_price) - Number(offer.discounted_price));
        }
        return sum;
      }, 0) || 0;

      return {
        totalSaved: Math.round(totalSaved * 100) / 100,
        monthSaved: Math.round(monthSaved * 100) / 100,
        totalCheckins: checkins?.length || 0,
        pointsValue: ((profile?.total_points || 0) * 0.01)
      };
    },
    enabled: !!user?.id,
    staleTime: 60000
  });

  if (!user || !savings) return null;

  const totalEconomy = savings.totalSaved + savings.pointsValue;

  return (
    <section className="py-4">
      <div className="container mx-auto px-3 sm:px-4">
        <Card 
          className="cursor-pointer hover:shadow-lg transition-all duration-300 overflow-hidden border-0 bg-gradient-to-r from-green-500 via-emerald-500 to-teal-500 dark:from-green-600 dark:via-emerald-600 dark:to-teal-600"
          onClick={() => navigate('/perfil')}
        >
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <Wallet className="w-4 h-4 text-white/80" />
                  <span className="text-white/80 text-xs sm:text-sm font-medium uppercase tracking-wide">
                    Sua economia no Ofertivo
                  </span>
                </div>
                <div className="text-2xl sm:text-4xl font-bold text-white mb-2">
                  R$ {totalEconomy.toFixed(2).replace('.', ',')}
                </div>
                <div className="flex flex-wrap gap-3 sm:gap-4">
                  <div className="flex items-center gap-1.5">
                    <TrendingDown className="w-3.5 h-3.5 text-green-200" />
                    <span className="text-green-100 text-xs sm:text-sm">
                      R$ {savings.monthSaved.toFixed(2).replace('.', ',')} este mês
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <ShoppingBag className="w-3.5 h-3.5 text-green-200" />
                    <span className="text-green-100 text-xs sm:text-sm">
                      {savings.totalCheckins} check-ins
                    </span>
                  </div>
                </div>
              </div>
              <div className="hidden sm:flex w-16 h-16 bg-white/15 rounded-full items-center justify-center flex-shrink-0">
                <Trophy className="w-8 h-8 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
};
