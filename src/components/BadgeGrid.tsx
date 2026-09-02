import React from 'react';
import { BadgeCard } from './BadgeCard';
import { UserBadge } from '@/hooks/useBadges';
import { cn } from '@/lib/utils';

interface BadgeGridProps {
  badges: UserBadge[];
  title?: string;
  size?: 'sm' | 'md' | 'lg';
  showProgress?: boolean;
  className?: string;
  emptyMessage?: string;
}

export const BadgeGrid = ({ 
  badges, 
  title, 
  size = 'md', 
  showProgress = true,
  className,
  emptyMessage = "Nenhum selo encontrado"
}: BadgeGridProps) => {
  if (badges.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="text-muted-foreground">{emptyMessage}</div>
      </div>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      {title && (
        <h3 className="text-lg font-semibold">{title}</h3>
      )}
      <div className={cn(
        "grid gap-4",
        size === 'sm' && "grid-cols-6 md:grid-cols-8 lg:grid-cols-10",
        size === 'md' && "grid-cols-4 md:grid-cols-6 lg:grid-cols-8",
        size === 'lg' && "grid-cols-3 md:grid-cols-4 lg:grid-cols-6"
      )}>
        {badges.map((userBadge) => (
          <BadgeCard
            key={userBadge.id}
            userBadge={userBadge}
            size={size}
            showProgress={showProgress}
          />
        ))}
      </div>
    </div>
  );
};