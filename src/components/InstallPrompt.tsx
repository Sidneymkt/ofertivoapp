import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Download, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

/**
 * InstallPrompt: SOMENTE lida com instalação do PWA.
 * A lógica de atualização foi movida para useServiceWorker + UpdatePrompt
 * para evitar múltiplos registros/SKIP_WAITING conflitantes.
 */
export const InstallPrompt = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    setIsInstalled(isStandalone);

    if (isStandalone) return;

    const dismissedAt = Number(localStorage.getItem('install-prompt-dismissed-at') || 0);
    // Re-mostra após 7 dias
    if (dismissedAt && Date.now() - dismissedAt < 7 * 24 * 60 * 60 * 1000) return;

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setTimeout(() => setShowPrompt(true), 3000);
    };

    window.addEventListener('beforeinstallprompt', handler);
    window.addEventListener('appinstalled', () => {
      setIsInstalled(true);
      setShowPrompt(false);
      toast({ title: 'App instalado! ✅', description: 'O Ofertivo foi instalado no seu dispositivo' });
    });

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, [toast]);

  const handleInstall = async () => {
    if (!deferredPrompt) {
      navigate('/instalar');
      return;
    }
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      toast({ title: 'Instalando... 📲', description: 'O Ofertivo está sendo instalado' });
      setShowPrompt(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem('install-prompt-dismissed-at', String(Date.now()));
  };

  if (isInstalled || !showPrompt) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-primary to-primary/80 text-primary-foreground shadow-lg">
      <div className="max-w-7xl mx-auto px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <Download className="w-5 h-5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">Instalar Ofertivo</p>
              <p className="text-xs opacity-90 truncate">Acesso rápido e funciona offline</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Button onClick={handleInstall} size="sm" variant="secondary" className="text-xs px-3">Instalar</Button>
            <Button onClick={handleDismiss} size="sm" variant="ghost" className="text-primary-foreground hover:bg-primary-foreground/20">
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
