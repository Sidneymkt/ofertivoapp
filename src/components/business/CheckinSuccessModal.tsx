import React, { useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Trophy } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface CheckinSuccessData {
  offerTitle?: string | null;
  pointsAwarded: number;
}

interface CheckinSuccessModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: CheckinSuccessData | null;
}

const CONFETTI_COLORS = ['bg-primary', 'bg-accent', 'bg-secondary'] as const;

const CheckinSuccessModal: React.FC<CheckinSuccessModalProps> = ({ open, onOpenChange, data }) => {
  const confetti = useMemo(() => {
    if (!open) return [] as Array<{ left: string; top: string; colorClass: string; round: boolean; delay: string; duration: string }>;
    return Array.from({ length: 20 }).map((_, i) => ({
      left: `${Math.random() * 100}%`,
      top: `${Math.random() * 100}%`,
      colorClass: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
      round: i % 2 === 0,
      delay: `${Math.random() * 0.5}s`,
      duration: `${1 + Math.random()}s`,
    }));
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-primary" />
            Check-in validado
          </DialogTitle>
        </DialogHeader>

        <div className="text-center space-y-4 relative overflow-hidden py-2">
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            {confetti.map((c, i) => (
              <div
                key={i}
                className={cn('absolute h-3 w-3 animate-bounce opacity-70', c.colorClass)}
                style={{
                  left: c.left,
                  top: c.top,
                  borderRadius: c.round ? '999px' : '0px',
                  animationDelay: c.delay,
                  animationDuration: c.duration,
                }}
              />
            ))}
          </div>

          <div className="flex justify-center relative">
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="h-20 w-20 rounded-full bg-primary/10 animate-ping" />
            </div>
            <div className="h-16 w-16 rounded-full flex items-center justify-center bg-primary text-primary-foreground shadow-lg animate-in zoom-in-75 duration-300 relative z-10">
              <CheckCircle2 className="h-10 w-10" />
            </div>
          </div>

          <div className="space-y-2 relative z-10">
            {data?.offerTitle ? (
              <p className="text-sm text-muted-foreground">
                Oferta: <span className="font-medium text-foreground">{data.offerTitle}</span>
              </p>
            ) : null}

            <div className="flex items-center justify-center">
              <Badge className="text-lg px-5 py-2">
                <Trophy className="h-5 w-5 mr-2" />
                +{data?.pointsAwarded ?? 0} pontos
              </Badge>
            </div>

            <p className="text-sm text-muted-foreground">Pontos creditados para o cliente.</p>
          </div>

          <div className="pt-2">
            <Button onClick={() => onOpenChange(false)} className="w-full">
              Fechar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CheckinSuccessModal;
