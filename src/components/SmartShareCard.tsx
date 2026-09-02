import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Share2, MessageSquare, Link2, Copy, Check, Gift } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { getShareableUrl } from '@/lib/shareUrls';
import { awardSharePoints } from '@/lib/pointsService';
import { cn } from '@/lib/utils';

interface SmartShareCardProps {
  offer: {
    id: string;
    title: string;
    description?: string | null;
    original_price: number;
    discounted_price: number;
    discount_percentage?: number | null;
    image_url?: string | null;
    business?: { name: string; logo_url?: string | null } | null;
    category?: string;
  };
  className?: string;
}

export const SmartShareCard: React.FC<SmartShareCardProps> = ({ offer, className }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const [shared, setShared] = useState(false);

  const shareUrl = getShareableUrl('offer', offer.id);
  const discount = offer.discount_percentage || Math.round((1 - offer.discounted_price / offer.original_price) * 100);
  const businessName = (offer.business as any)?.name || 'Negócio local';

  const shareText = `🔥 ${offer.title}\n💰 De R$${offer.original_price.toFixed(2)} por R$${offer.discounted_price.toFixed(2)} (-${discount}%)\n📍 ${businessName}\n\nConfira no Ofertivo 👇\n${shareUrl}`;

  const handleAwardPoints = async () => {
    if (user && !shared) {
      try {
        await awardSharePoints(user.id, offer.id);
        setShared(true);
        toast({ title: "🎉 +10 pontos!", description: "Você ganhou pontos por compartilhar!" });
      } catch (e) {
        console.error(e);
      }
    }
  };

  const handleWhatsApp = () => {
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`, '_blank');
    handleAwardPoints();
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({ title: "Copiado!", description: "Texto pronto para colar." });
      handleAwardPoints();
    } catch {
      toast({ title: "Erro", description: "Não foi possível copiar.", variant: "destructive" });
    }
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: offer.title, text: shareText, url: shareUrl });
        handleAwardPoints();
      } catch (e) {
        if ((e as Error).name !== 'AbortError') console.error(e);
      }
    }
  };

  return (
    <Card className={cn('overflow-hidden border-0 shadow-card', className)}>
      <CardContent className="p-0">
        {/* Preview Card (mimics how it looks when shared) */}
        <div className="relative bg-gradient-to-br from-primary/5 to-secondary/5 p-3 sm:p-4">
          <div className="flex gap-3">
            {/* Offer image thumbnail */}
            {offer.image_url && (
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-lg overflow-hidden shrink-0 shadow-sm">
                <img
                  src={offer.image_url}
                  alt={offer.title}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </div>
            )}
            
            <div className="flex-1 min-w-0">
              <div className="flex items-start gap-2 mb-1">
                <h4 className="font-semibold text-sm sm:text-base text-foreground line-clamp-2 flex-1">
                  {offer.title}
                </h4>
                {discount > 0 && (
                  <Badge className="bg-destructive/90 text-destructive-foreground text-[10px] sm:text-xs shrink-0">
                    -{discount}%
                  </Badge>
                )}
              </div>
              
              <p className="text-xs text-muted-foreground mb-1.5 line-clamp-1">
                📍 {businessName}
              </p>
              
              <div className="flex items-baseline gap-2">
                <span className="text-xs text-muted-foreground line-through">
                  R${offer.original_price.toFixed(2)}
                </span>
                <span className="text-sm sm:text-base font-bold text-secondary">
                  R${offer.discounted_price.toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          {/* Points badge */}
          {user && !shared && (
            <div className="absolute top-2 right-2">
              <Badge variant="outline" className="bg-accent/20 border-accent/40 text-accent-foreground text-[10px] gap-1">
                <Gift className="w-3 h-3" />
                +10 pts
              </Badge>
            </div>
          )}
        </div>

        {/* Share Actions */}
        <div className="px-3 py-2.5 sm:px-4 sm:py-3 border-t border-border/50">
          <p className="text-xs text-muted-foreground mb-2">Compartilhe e ganhe pontos:</p>
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={handleWhatsApp}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white text-xs sm:text-sm gap-1.5"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span className="hidden xs:inline">WhatsApp</span>
              <span className="xs:hidden">Zap</span>
            </Button>
            
            <Button
              size="sm"
              variant="outline"
              onClick={handleCopy}
              className="flex-1 text-xs sm:text-sm gap-1.5"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-secondary" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Copiado!' : 'Copiar'}
            </Button>

            {navigator.share && (
              <Button
                size="sm"
                variant="outline"
                onClick={handleNativeShare}
                className="text-xs sm:text-sm gap-1.5 px-3"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Mais</span>
              </Button>
            )}
          </div>

          {shared && (
            <p className="text-xs text-secondary mt-2 flex items-center gap-1">
              <Check className="w-3 h-3" /> Pontos creditados!
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
