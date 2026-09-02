import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Download, Smartphone, CheckCircle2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { BackButton } from '@/components/BackButton';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const Install = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    // Verificar se já está instalado
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    // Capturar evento de instalação
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handler);

    // Verificar se foi instalado
    window.addEventListener('appinstalled', () => {
      setIsInstalled(true);
      toast({
        title: "App instalado! ✅",
        description: "O Ofertivo foi instalado no seu dispositivo",
      });
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, [toast]);

  const handleInstall = async () => {
    if (!deferredPrompt) {
      toast({
        title: "Instalação não disponível",
        description: "Use o menu do navegador para instalar o app",
        variant: "destructive",
      });
      return;
    }

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      toast({
        title: "Instalando... 📲",
        description: "O Ofertivo está sendo instalado no seu dispositivo",
      });
    }
    
    setDeferredPrompt(null);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto p-4 py-8">
        <BackButton to="/" />
        
        <div className="mt-6 space-y-6">
          <div className="text-center">
            <Smartphone className="w-16 h-16 mx-auto mb-4 text-primary" />
            <h1 className="text-3xl font-bold mb-2">Instalar Ofertivo</h1>
            <p className="text-muted-foreground">
              Instale o Ofertivo no seu smartphone para uma experiência completa
            </p>
          </div>

          {isInstalled ? (
            <Card className="border-2 border-green-500">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-8 h-8 text-green-500" />
                  <div>
                    <CardTitle>App Instalado!</CardTitle>
                    <CardDescription>
                      O Ofertivo já está instalado no seu dispositivo
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Por que instalar?</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <span className="text-primary font-bold">1</span>
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">Acesso rápido</h3>
                    <p className="text-sm text-muted-foreground">
                      Abra o app direto da tela inicial, como um app nativo
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <span className="text-primary font-bold">2</span>
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">Funciona offline</h3>
                    <p className="text-sm text-muted-foreground">
                      Veja suas ofertas favoritas mesmo sem internet
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <span className="text-primary font-bold">3</span>
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">Notificações</h3>
                    <p className="text-sm text-muted-foreground">
                      Receba alertas de ofertas próximas e mensagens
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <span className="text-primary font-bold">4</span>
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">Melhor desempenho</h3>
                    <p className="text-sm text-muted-foreground">
                      App otimizado e mais rápido que o site
                    </p>
                  </div>
                </div>

                <Button 
                  onClick={handleInstall}
                  className="w-full"
                  size="lg"
                  disabled={!deferredPrompt}
                >
                  <Download className="w-5 h-5 mr-2" />
                  Instalar Agora
                </Button>

                {!deferredPrompt && (
                  <p className="text-xs text-center text-muted-foreground">
                    Para instalar, use o menu do navegador e selecione "Adicionar à tela inicial" ou "Instalar app"
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Como instalar manualmente</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <h4 className="font-semibold mb-1">No Android (Chrome):</h4>
                <p className="text-muted-foreground">
                  Menu (⋮) → "Instalar app" ou "Adicionar à tela inicial"
                </p>
              </div>
              <div>
                <h4 className="font-semibold mb-1">No iPhone (Safari):</h4>
                <p className="text-muted-foreground">
                  Botão Compartilhar → "Adicionar à Tela de Início"
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Install;
