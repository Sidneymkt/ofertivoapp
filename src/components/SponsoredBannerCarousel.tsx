import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useSponsoredBanners } from '@/hooks/useSponsoredBanners';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface Props {
  category?: string;
  city?: string;
  intervalMs?: number;
  className?: string;
}

export const SponsoredBannerCarousel: React.FC<Props> = ({
  category,
  city,
  intervalMs = 6000,
  className,
}) => {
  const { banners, loading, trackView, trackClick } = useSponsoredBanners({ category, city });
  const [index, setIndex] = useState(0);
  const trackedRef = useRef<Set<string>>(new Set());
  const navigate = useNavigate();

  useEffect(() => {
    if (banners.length <= 1) return;
    const id = window.setInterval(() => {
      setIndex((i) => (i + 1) % banners.length);
    }, intervalMs);
    return () => window.clearInterval(id);
  }, [banners.length, intervalMs]);

  useEffect(() => {
    const b = banners[index];
    if (!b || trackedRef.current.has(b.id)) return;
    trackedRef.current.add(b.id);
    trackView(b.id);
  }, [index, banners, trackView]);

  if (loading) {
    return (
      <div className={cn('w-full aspect-[16/6] rounded-2xl bg-muted animate-pulse', className)} />
    );
  }
  if (!banners.length) return null;

  const current = banners[index];

  const handleClick = () => {
    trackClick(current.id);
    if (current.internal_link) navigate(current.internal_link);
    else if (current.external_link) window.open(current.external_link, '_blank', 'noopener,noreferrer');
  };

  const prev = () => setIndex((i) => (i - 1 + banners.length) % banners.length);
  const next = () => setIndex((i) => (i + 1) % banners.length);

  return (
    <div className={cn('relative w-full overflow-hidden rounded-2xl shadow-lg group', className)}>
      <div
        className="relative w-full aspect-[16/7] sm:aspect-[16/6] md:aspect-[16/5] cursor-pointer"
        onClick={handleClick}
        role="button"
        aria-label={current.title}
      >
        <img
          src={current.image_url}
          alt={current.title}
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/30 to-transparent" />
        <div className="absolute inset-0 flex flex-col justify-center gap-2 sm:gap-3 p-4 sm:p-6 md:p-10 max-w-[85%] sm:max-w-[60%] text-white">
          <h3 className="text-lg sm:text-2xl md:text-4xl font-bold leading-tight drop-shadow-lg">
            {current.title}
          </h3>
          {current.subtitle && (
            <p className="text-xs sm:text-sm md:text-base text-white/90 line-clamp-2 drop-shadow">
              {current.subtitle}
            </p>
          )}
          {current.cta_label && (
            <div>
              <Button size="sm" className="mt-1 bg-gradient-primary shadow-lg">
                {current.cta_label}
              </Button>
            </div>
          )}
        </div>
      </div>

      {banners.length > 1 && (
        <>
          <button
            onClick={(e) => { e.stopPropagation(); prev(); }}
            className="absolute left-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
            aria-label="Anterior"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); next(); }}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
            aria-label="Próximo"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
            {banners.map((b, i) => (
              <button
                key={b.id}
                onClick={(e) => { e.stopPropagation(); setIndex(i); }}
                className={cn(
                  'h-1.5 rounded-full transition-all',
                  i === index ? 'w-6 bg-white' : 'w-1.5 bg-white/60 hover:bg-white/90'
                )}
                aria-label={`Banner ${i + 1}`}
              />
            ))}
          </div>
        </>
      )}
      <div className="absolute top-2 right-2 text-[10px] uppercase tracking-wider bg-black/50 text-white px-2 py-0.5 rounded-full">
        Patrocinado
      </div>
    </div>
  );
};
