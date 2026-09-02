import React, { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Store } from 'lucide-react';

interface ActiveBusiness {
  id: string;
  name: string;
  logo_url: string | null;
  slug: string | null;
  category: string;
}

export const ActiveAdvertisersBar = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: businesses, isLoading } = useQuery({
    queryKey: ['active-advertisers-bar'],
    queryFn: async () => {
      // Get businesses that have active offers, ordered by number of offers
      const { data, error } = await supabase
        .from('businesses')
        .select('id, name, logo_url, slug, category')
        .eq('is_active', true)
        .order('followers_count', { ascending: false })
        .limit(20);

      if (error) throw error;
      return (data || []) as ActiveBusiness[];
    },
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    const refresh = () => {
      queryClient.invalidateQueries({ queryKey: ['active-advertisers-bar'] });
    };

    window.addEventListener('business-profile-updated', refresh);

    const channel = supabase
      .channel('active-advertisers-profile-sync')
      .on(
        'postgres_changes' as any,
        { event: '*', schema: 'public', table: 'businesses' },
        refresh
      )
      .subscribe();

    return () => {
      window.removeEventListener('business-profile-updated', refresh);
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  if (isLoading || !businesses?.length) return null;

  return (
    <section className="py-4 sm:py-6 bg-muted/20 border-b border-border/30">
      <div className="container mx-auto px-2 sm:px-4">
        <h3 className="text-xs sm:text-sm font-semibold text-muted-foreground mb-3 text-center uppercase tracking-wider">
          Anunciantes em Destaque
        </h3>
        <div className="relative group">
          <div className="absolute left-0 top-0 bottom-0 w-6 bg-gradient-to-r from-muted/20 to-transparent z-10 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="absolute right-0 top-0 bottom-0 w-6 bg-gradient-to-l from-muted/20 to-transparent z-10 pointer-events-none" />

          <div className="overflow-x-auto scrollbar-hide -mx-2 px-2">
            <div className="flex gap-4 sm:gap-5 w-max py-1 px-1">
              {businesses.map((biz) => (
                <button
                  key={biz.id}
                  onClick={() => navigate(biz.slug ? `/loja/${biz.slug}` : `/negocio/${biz.id}`)}
                  className="flex flex-col items-center gap-1.5 group/item cursor-pointer flex-shrink-0 min-w-0"
                  title={biz.name}
                >
                  <div className="relative">
                    <div className="absolute -inset-0.5 rounded-full bg-gradient-to-br from-primary to-primary/50 opacity-0 group-hover/item:opacity-100 transition-opacity duration-300" />
                    <Avatar className="w-12 h-12 sm:w-14 sm:h-14 border-2 border-border/50 group-hover/item:border-primary/50 transition-all duration-300 group-hover/item:scale-110 relative">
                      {biz.logo_url ? (
                        <AvatarImage src={biz.logo_url} alt={biz.name} className="object-cover" />
                      ) : null}
                      <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                        {biz.name.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                  <span className="text-[10px] sm:text-xs text-muted-foreground group-hover/item:text-foreground transition-colors max-w-[60px] sm:max-w-[72px] truncate text-center leading-tight">
                    {biz.name}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
