import { Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useOfferLikes } from '@/hooks/useOfferLikes';
import { cn } from '@/lib/utils';

interface LikeButtonProps {
  offerId: string;
  variant?: 'default' | 'compact';
  showCount?: boolean;
  className?: string;
}

export const LikeButton = ({ 
  offerId, 
  variant = 'default',
  showCount = true,
  className 
}: LikeButtonProps) => {
  const { isLiked, likesCount, loading, toggleLike } = useOfferLikes(offerId);

  const isCompact = variant === 'compact';

  return (
    <Button
      variant="ghost"
      size={isCompact ? "sm" : "default"}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggleLike();
      }}
      disabled={loading}
      className={cn(
        "group transition-all duration-300",
        isLiked && "text-red-500 hover:text-red-600",
        className
      )}
    >
      <Heart
        className={cn(
          "transition-all duration-300",
          isCompact ? "w-4 h-4" : "w-5 h-5",
          isLiked && "fill-current scale-110",
          !isLiked && "group-hover:scale-110"
        )}
      />
      {showCount && likesCount > 0 && (
        <span className={cn(
          "ml-1.5 font-medium",
          isCompact ? "text-xs" : "text-sm"
        )}>
          {likesCount}
        </span>
      )}
    </Button>
  );
};
