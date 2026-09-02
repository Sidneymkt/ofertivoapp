import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { usePoints } from '@/hooks/usePoints';
import { supabase } from '@/integrations/supabase/client';
import { Gift, Star, Ticket, Sparkles, PartyPopper, Coins } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const WelcomeBonusModal = () => {
  const [open, setOpen] = useState(false);
  const [awarded, setAwarded] = useState(false);
  const [animating, setAnimating] = useState(false);
  const [bonusPoints, setBonusPoints] = useState(100);
  const { user } = useAuth();
  const { awardPoints } = usePoints();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) return;
    checkAndAwardBonus();
  }, [user]);

  const checkAndAwardBonus = async () => {
    if (!user) return;

    try {
      // Check if account was created in the last 5 minutes (new user)
      const createdAt = new Date(user.created_at);
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      
      if (createdAt < fiveMinutesAgo) {
        // Not a new user — do nothing, welcome bonus is only for new signups
        return;
      }

      // New user (within 5 min)! Show the welcome modal
      // Points are already awarded by the database trigger, so just show the modal
      // Fetch actual points awarded
      const { data: signupPoints } = await supabase
        .from('user_points')
        .select('points_earned')
        .eq('user_id', user.id)
        .eq('action_type', 'signup')
        .limit(1);
      
      if (signupPoints && signupPoints.length > 0) {
        setBonusPoints(signupPoints[0].points_earned);
      }

      setAnimating(true);
      setAwarded(true);
      setOpen(true);
    } catch (error) {
      console.error('Error checking welcome bonus:', error);
    }
  };

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden border-0 bg-transparent shadow-none">
        <div className="relative bg-gradient-to-br from-primary via-primary/90 to-accent rounded-2xl p-6 text-center overflow-hidden">
          {/* Animated particles */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {[...Array(12)].map((_, i) => (
              <div
                key={i}
                className="absolute text-xl animate-bounce"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                  animationDelay: `${Math.random() * 2}s`,
                  animationDuration: `${1.5 + Math.random() * 2}s`,
                  opacity: 0.6
                }}
              >
                {['🎉', '⭐', '🎁', '✨', '🏆', '💰'][i % 6]}
              </div>
            ))}
          </div>

          <div className="relative z-10 space-y-4">
            {/* Icon */}
            <div className="mx-auto w-20 h-20 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center animate-pulse">
              <PartyPopper className="w-10 h-10 text-white" />
            </div>

            {/* Title */}
            <div>
              <h2 className="text-2xl font-bold text-white mb-1">
                Bem-vindo ao Ofertivo! 🎉
              </h2>
              <p className="text-white/80 text-sm">
                Seu bônus de entrada está pronto!
              </p>
            </div>

            {/* Bonus items */}
            <div className="space-y-3 py-2">
              <div className="flex items-center gap-3 bg-white/15 backdrop-blur-sm rounded-xl p-3 text-left">
                <div className="w-10 h-10 bg-yellow-400/30 rounded-full flex items-center justify-center flex-shrink-0">
                  <Coins className="w-5 h-5 text-yellow-300" />
                </div>
                <div>
                  <p className="text-white font-bold text-lg">+{bonusPoints} pontos</p>
                  <p className="text-white/70 text-xs">Equivalente a R$ {(bonusPoints / 100).toFixed(2).replace('.', ',')} em benefícios</p>
                </div>
              </div>

              <div className="flex items-center gap-3 bg-white/15 backdrop-blur-sm rounded-xl p-3 text-left">
                <div className="w-10 h-10 bg-green-400/30 rounded-full flex items-center justify-center flex-shrink-0">
                  <Gift className="w-5 h-5 text-green-300" />
                </div>
                <div>
                  <p className="text-white font-semibold">Ofertas exclusivas desbloqueadas</p>
                  <p className="text-white/70 text-xs">Veja ofertas especiais perto de você</p>
                </div>
              </div>

              <div className="flex items-center gap-3 bg-white/15 backdrop-blur-sm rounded-xl p-3 text-left">
                <div className="w-10 h-10 bg-purple-400/30 rounded-full flex items-center justify-center flex-shrink-0">
                  <Ticket className="w-5 h-5 text-purple-300" />
                </div>
                <div>
                  <p className="text-white font-semibold">Sorteio de boas-vindas</p>
                  <p className="text-white/70 text-xs">Você já está participando automaticamente</p>
                </div>
              </div>
            </div>

            {/* CTA */}
            <div className="space-y-2 pt-2">
              <Button
                className="w-full bg-white text-primary hover:bg-white/90 font-bold text-base py-5 rounded-xl shadow-lg"
                onClick={() => {
                  setOpen(false);
                  navigate('/ofertas');
                }}
              >
                <Sparkles className="w-5 h-5 mr-2" />
                Explorar ofertas agora
              </Button>
              <button
                className="text-white/60 text-xs hover:text-white/80 transition-colors"
                onClick={() => setOpen(false)}
              >
                Explorar depois
              </button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
