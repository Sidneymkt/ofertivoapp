import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Play } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface VideoSettings {
  youtube_url: string;
  enabled: boolean;
}

const extractYoutubeId = (url: string): string | null => {
  if (!url) return null;
  
  // Handle various YouTube URL formats
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
    /^([a-zA-Z0-9_-]{11})$/
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  
  return null;
};

export const VideoPopup: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [hasShownOnce, setHasShownOnce] = useState(false);

  const { data: videoSettings } = useQuery({
    queryKey: ['presentation-video-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('platform_settings')
        .select('setting_value')
        .eq('setting_key', 'presentation_video')
        .eq('is_active', true)
        .maybeSingle();

      if (error) throw error;
      const value = data?.setting_value as unknown as VideoSettings | null;
      return value || null;
    },
  });

  // Show popup only once per session when enabled
  useEffect(() => {
    if (videoSettings?.enabled && videoSettings?.youtube_url && !hasShownOnce) {
      const sessionKey = 'ofertivo_video_shown';
      const hasShown = sessionStorage.getItem(sessionKey);
      
      if (!hasShown) {
        // Small delay for better UX
        const timer = setTimeout(() => {
          setIsOpen(true);
          sessionStorage.setItem(sessionKey, 'true');
          setHasShownOnce(true);
        }, 1500);
        
        return () => clearTimeout(timer);
      } else {
        setHasShownOnce(true);
      }
    }
  }, [videoSettings, hasShownOnce]);

  const youtubeId = videoSettings?.youtube_url ? extractYoutubeId(videoSettings.youtube_url) : null;

  if (!youtubeId || !videoSettings?.enabled) return null;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="max-w-4xl w-[95vw] p-0 overflow-hidden bg-black border-0">
        <div className="relative">
          {/* Video embed */}
          <div className="aspect-video">
            <iframe
              src={`https://www.youtube.com/embed/${youtubeId}?autoplay=1&rel=0`}
              title="Vídeo de Apresentação"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="w-full h-full"
            />
          </div>

          {/* Optional footer with info */}
          <div className="bg-gradient-to-r from-primary to-secondary p-4 text-white text-center">
            <p className="text-sm font-medium flex items-center justify-center gap-2">
              <Play className="w-4 h-4" />
              Conheça o Ofertivo - Ofertas e recompensas para você!
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
