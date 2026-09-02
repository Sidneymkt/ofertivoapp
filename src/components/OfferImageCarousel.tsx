import React, { useState, useRef, useCallback } from 'react';
import { ChevronLeft, ChevronRight, ZoomIn } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { useIsMobile } from '@/hooks/use-mobile';

interface OfferImageCarouselProps {
  images: string[];
  title: string;
}

const OfferImageCarousel: React.FC<OfferImageCarouselProps> = ({ images, title }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showLightbox, setShowLightbox] = useState(false);
  const isMobile = useIsMobile();
  
  // Touch handling state
  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);
  const isDragging = useRef(false);
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Minimum swipe distance to trigger navigation
  const minSwipeDistance = 50;

  // Touch event handlers
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.targetTouches[0].clientX;
    isDragging.current = false;
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!touchStartX.current) return;
    
    touchEndX.current = e.targetTouches[0].clientX;
    const diff = touchStartX.current - touchEndX.current;
    
    if (Math.abs(diff) > 10) {
      isDragging.current = true;
      // Prevent default scroll behavior when swiping
      e.preventDefault();
    }
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (!touchStartX.current || !touchEndX.current || isTransitioning) return;
    
    const diff = touchStartX.current - touchEndX.current;
    const isSwipe = Math.abs(diff) > minSwipeDistance;
    
    if (isSwipe && !isTransitioning) {
      setIsTransitioning(true);
      
      if (diff > 0) {
        // Swiped left - go to next
        goToNext();
      } else {
        // Swiped right - go to previous
        goToPrevious();
      }
      
      // Reset transition state after animation
      setTimeout(() => setIsTransitioning(false), 300);
    }
    
    touchStartX.current = null;
    touchEndX.current = null;
    isDragging.current = false;
  }, [isTransitioning]);

  // Fallback para ofertas sem imagem
  if (!images || images.length === 0) {
    return (
      <div className="w-full h-full bg-muted flex items-center justify-center">
        <div className="text-center text-muted-foreground">
          <div className="w-16 h-16 mx-auto mb-2 bg-muted-foreground/20 rounded-lg flex items-center justify-center">
            <ZoomIn className="w-8 h-8" />
          </div>
          <p className="text-sm">Sem imagens disponíveis</p>
        </div>
      </div>
    );
  }

  // Se há apenas uma imagem
  if (images.length === 1) {
    return (
      <>
        <div 
          className="relative w-full h-full cursor-pointer group"
          onClick={() => setShowLightbox(true)}
        >
          <img 
            src={images[0]} 
            alt={title}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300 flex items-center justify-center">
            <ZoomIn className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          </div>
        </div>

        {/* Lightbox */}
        <Dialog open={showLightbox} onOpenChange={setShowLightbox}>
          <DialogContent className="max-w-4xl w-[95vw] sm:w-full p-0">
            <img 
              src={images[0]} 
              alt={title}
              className="w-full h-auto max-h-[80vh] object-contain rounded-lg"
            />
          </DialogContent>
        </Dialog>
      </>
    );
  }

  const goToPrevious = useCallback(() => {
    if (images.length <= 1 || isTransitioning) return;
    setCurrentIndex(prev => prev === 0 ? images.length - 1 : prev - 1);
  }, [images.length, isTransitioning]);

  const goToNext = useCallback(() => {
    if (images.length <= 1 || isTransitioning) return;
    setCurrentIndex(prev => prev === images.length - 1 ? 0 : prev + 1);
  }, [images.length, isTransitioning]);

  const goToSlide = useCallback((index: number) => {
    if (isTransitioning || index === currentIndex) return;
    setCurrentIndex(index);
  }, [currentIndex, isTransitioning]);

  return (
    <>
      <div className="relative w-full h-full group">
        {/* Main Image */}
        <div 
          className="relative w-full h-full cursor-pointer select-none"
          onClick={(e) => {
            // Only open lightbox if not dragging on mobile
            if (isMobile && isDragging.current) {
              e.preventDefault();
              return;
            }
            setShowLightbox(true);
          }}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <img 
            src={images[currentIndex]} 
            alt={`${title} - Imagem ${currentIndex + 1}`}
            className={`w-full h-full object-cover transition-all duration-300 ${
              !isMobile ? 'group-hover:scale-105' : ''
            } ${isTransitioning ? 'transition-transform' : ''}`}
            draggable={false}
          />
          <div className={`absolute inset-0 bg-black/0 transition-colors duration-300 flex items-center justify-center ${
            !isMobile ? 'group-hover:bg-black/20' : ''
          }`}>
            <ZoomIn className={`w-8 h-8 text-white transition-opacity duration-300 ${
              !isMobile ? 'opacity-0 group-hover:opacity-100' : 'opacity-0'
            }`} />
          </div>
        </div>

        {/* Navigation Arrows - Only show on desktop or always visible on mobile when multiple images */}
        {images.length > 1 && (
          <>
            <Button
              variant="secondary"
              size="icon"
              className={`absolute left-2 top-1/2 transform -translate-y-1/2 transition-opacity bg-white/90 hover:bg-white ${
                isMobile ? 'opacity-70' : 'opacity-0 group-hover:opacity-100'
              }`}
              onClick={(e) => {
                e.stopPropagation();
                goToPrevious();
              }}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            
            <Button
              variant="secondary"
              size="icon"
              className={`absolute right-2 top-1/2 transform -translate-y-1/2 transition-opacity bg-white/90 hover:bg-white ${
                isMobile ? 'opacity-70' : 'opacity-0 group-hover:opacity-100'
              }`}
              onClick={(e) => {
                e.stopPropagation();
                goToNext();
              }}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </>
        )}

        {/* Image Counter */}
        {images.length > 1 && (
          <div className="absolute top-2 right-2 bg-black/70 text-white px-2 py-1 rounded text-xs font-medium">
            {currentIndex + 1} / {images.length}
          </div>
        )}

        {/* Thumbnail Navigation - More visible on mobile */}
        {images.length > 1 && (
          <div className={`absolute bottom-2 left-1/2 transform -translate-x-1/2 flex space-x-2 transition-opacity ${
            isMobile ? 'opacity-80' : 'opacity-0 group-hover:opacity-100'
          }`}>
            {images.map((_, index) => (
              <button
                key={index}
                className={`w-2 h-2 rounded-full transition-colors ${
                  index === currentIndex ? 'bg-white' : 'bg-white/50'
                }`}
                onClick={(e) => {
                  e.stopPropagation();
                  goToSlide(index);
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Lightbox with Carousel */}
      <Dialog open={showLightbox} onOpenChange={setShowLightbox}>
        <DialogContent className="max-w-6xl w-[95vw] sm:w-full p-0">
          <div 
            className="relative select-none"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            <img 
              src={images[currentIndex]} 
              alt={`${title} - Imagem ${currentIndex + 1}`}
              className={`w-full h-auto max-h-[85vh] object-contain rounded-lg transition-all duration-300 ${
                isTransitioning ? 'transition-transform' : ''
              }`}
              draggable={false}
            />
            
            {/* Lightbox Navigation */}
            {images.length > 1 && (
              <>
                <Button
                  variant="secondary"
                  size="icon"
                  className={`absolute left-4 top-1/2 transform -translate-y-1/2 bg-white/90 hover:bg-white transition-opacity ${
                    isMobile ? 'opacity-80' : 'opacity-100'
                  }`}
                  onClick={goToPrevious}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                
                <Button
                  variant="secondary" 
                  size="icon"
                  className={`absolute right-4 top-1/2 transform -translate-y-1/2 bg-white/90 hover:bg-white transition-opacity ${
                    isMobile ? 'opacity-80' : 'opacity-100'
                  }`}
                  onClick={goToNext}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>

                {/* Lightbox Image Counter */}
                <div className="absolute top-4 right-4 bg-black/70 text-white px-3 py-1 rounded text-sm font-medium">
                  {currentIndex + 1} de {images.length}
                </div>

                {/* Lightbox Thumbnails - Better visibility on mobile */}
                <div className={`absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-2 max-w-xs overflow-x-auto transition-opacity ${
                  isMobile ? 'opacity-90' : 'opacity-100'
                }`}>
                  {images.map((image, index) => (
                    <button
                      key={index}
                      className={`flex-shrink-0 w-12 h-12 rounded overflow-hidden border-2 transition-all duration-200 ${
                        index === currentIndex ? 'border-white scale-110' : 'border-white/30 scale-100'
                      }`}
                      onClick={() => goToSlide(index)}
                    >
                      <img 
                        src={image} 
                        alt={`Miniatura ${index + 1}`}
                        className="w-full h-full object-cover"
                        draggable={false}
                      />
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default OfferImageCarousel;