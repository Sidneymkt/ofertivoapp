import React from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Share2, MessageSquare, Link2, Facebook, Twitter } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { getShareableUrl, getDirectUrl, ShareableContentType } from "@/lib/shareUrls";
import { awardSharePoints } from "@/lib/pointsService";

interface ShareMenuProps {
  url: string;
  title: string;
  description?: string;
  offerId?: string;
  contentType?: ShareableContentType;
  contentId?: string;
  ogImage?: string;
  className?: string;
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "lg" | "icon";
}

export const ShareMenu: React.FC<ShareMenuProps> = ({
  url,
  title,
  description,
  offerId,
  contentType,
  contentId,
  ogImage,
  className,
  variant = "outline",
  size = "sm"
}) => {
  const { toast } = useToast();
  const { user } = useAuth();

  // For social media crawlers (WhatsApp, Facebook, Twitter) use the OG edge function URL
  // so crawlers get proper meta tags and preview images
  const ogShareUrl = contentType && contentId 
    ? getShareableUrl(contentType, contentId)
    : url.replace(/^https?:\/\/[^\/]+/, 'https://ofertivoapp.com');

  // For copy link and native share, use the direct personalized URL
  const directShareUrl = contentType && contentId
    ? getDirectUrl(contentType, contentId)
    : url.replace(/^https?:\/\/[^\/]+/, 'https://ofertivoapp.com');

  const handleAwardSharePoints = async () => {
    if (user && offerId) {
      try {
        await awardSharePoints(user.id, offerId);
        
        toast({
          title: "Pontos ganhos! 🎉",
          description: "Você ganhou pontos por compartilhar!",
        });
      } catch (error) {
        console.error('Error awarding share points:', error);
      }
    }
  };

  const awardPointsOnWindowClose = (popup: Window | null) => {
    if (!popup) return;
    const interval = setInterval(() => {
      if (popup.closed) {
        clearInterval(interval);
        handleAwardSharePoints();
      }
    }, 500);
    // Safety: stop polling after 5 minutes
    setTimeout(() => clearInterval(interval), 300000);
  };

  const handleWhatsApp = () => {
    const text = description 
      ? `${title}\n\n${description}\n\n${ogShareUrl}`
      : `${title}\n\n${ogShareUrl}`;
    const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    const popup = window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
    awardPointsOnWindowClose(popup);
  };

  const handleFacebook = () => {
    const facebookUrl = `https://www.facebook.com/sharer.php?u=${encodeURIComponent(ogShareUrl)}`;
    const popup = window.open(facebookUrl, '_blank', 'width=600,height=400');
    awardPointsOnWindowClose(popup);
  };

  const handleTwitter = () => {
    const text = description ? `${title} - ${description}` : title;
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(ogShareUrl)}`;
    const popup = window.open(twitterUrl, '_blank', 'width=600,height=400');
    awardPointsOnWindowClose(popup);
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(directShareUrl);
      toast({
        title: "Link copiado!",
        description: "O link foi copiado para a área de transferência.",
      });
    } catch (error) {
      toast({
        title: "Erro ao copiar",
        description: "Não foi possível copiar o link.",
        variant: "destructive"
      });
    }
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title,
          text: description || title,
          url: ogShareUrl
        });
        handleAwardSharePoints();
      } catch (error) {
        if ((error as Error).name !== 'AbortError') {
          console.error('Error sharing:', error);
        }
      }
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant={variant} size={size} className={className}>
          <Share2 className={size === "icon" ? "w-4 h-4" : "w-4 h-4 mr-2"} />
          {size !== "icon" && "Compartilhar"}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuItem onClick={handleWhatsApp} className="cursor-pointer">
          <MessageSquare className="w-4 h-4 mr-2 text-green-600" />
          WhatsApp
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleFacebook} className="cursor-pointer">
          <Facebook className="w-4 h-4 mr-2 text-blue-600" />
          Facebook
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleTwitter} className="cursor-pointer">
          <Twitter className="w-4 h-4 mr-2 text-sky-500" />
          Twitter / X
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleCopyLink} className="cursor-pointer">
          <Link2 className="w-4 h-4 mr-2" />
          Copiar Link
        </DropdownMenuItem>
        {navigator.share && (
          <DropdownMenuItem onClick={handleNativeShare} className="cursor-pointer">
            <Share2 className="w-4 h-4 mr-2" />
            Mais opções...
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
