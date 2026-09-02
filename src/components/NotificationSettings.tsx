import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Bell, Volume2, MessageSquare, Tag, Smartphone, Fish, Gift, MapPin, Megaphone } from 'lucide-react';
import { useNotificationPreferences } from '@/hooks/useNotificationPreferences';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';

export const NotificationSettings = () => {
  const { 
    preferences, 
    isLoaded,
    togglePreference,
    toggleSoundEnabled,
    toggleMessagesSound,
    toggleNewOffersSound,
    toggleBrowserNotifications
  } = useNotificationPreferences();
  const { toast } = useToast();

  const requestBrowserPermission = async () => {
    if ('Notification' in window) {
      try {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
          toast({
            title: "Notificações ativadas! ✅",
            description: "Você receberá alertas no navegador e no app instalado",
          });
          if (!preferences.browserNotifications) {
            toggleBrowserNotifications();
          }
        } else if (permission === 'denied') {
          toast({
            title: "Notificações bloqueadas",
            description: "Para ativar, acesse as configurações do seu navegador e permita notificações para este site",
            variant: "destructive",
          });
        }
      } catch (error) {
        console.error('Error requesting notification permission:', error);
      }
    }
  };

  const browserPermission = typeof window !== 'undefined' && 'Notification' in window 
    ? Notification.permission 
    : 'default';

  const badgingSupported = 'setAppBadge' in navigator;

  if (!isLoaded) return null;

  return (
    <div className="space-y-4">
      {/* Main Notifications Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Bell className="h-5 w-5" />
            Notificações
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Browser/PWA Notifications */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Smartphone className="h-5 w-5 text-muted-foreground" />
              <div>
                <Label htmlFor="browser-notifications" className="font-medium">
                  Notificações do App
                </Label>
                <p className="text-xs text-muted-foreground">
                  Push e badge no ícone do app
                </p>
              </div>
            </div>
            {browserPermission === 'granted' ? (
              <Switch
                id="browser-notifications"
                checked={preferences.browserNotifications}
                onCheckedChange={toggleBrowserNotifications}
              />
            ) : (
              <Button size="sm" variant="outline" onClick={requestBrowserPermission}>
                Permitir
              </Button>
            )}
          </div>

          {browserPermission === 'denied' && (
            <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/30">
              <p className="text-xs text-destructive font-medium">
                ⚠️ Notificações bloqueadas pelo navegador.
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Configurações do navegador → Permissões → Notificações → Permitir
              </p>
            </div>
          )}

          {badgingSupported && browserPermission === 'granted' && (
            <div className="flex items-center gap-2 p-2 rounded-lg bg-primary/5 border border-primary/20">
              <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/30">
                PWA
              </Badge>
              <p className="text-xs text-muted-foreground">
                Badge no ícone do app ativo ✓
              </p>
            </div>
          )}

          {/* Notification Types */}
          <div className="border-t pt-4 space-y-3">
            <p className="text-sm font-medium text-muted-foreground">Tipos de notificação</p>

            <NotifToggle
              icon={<MessageSquare className="h-4 w-4" />}
              label="Mensagens"
              desc="Novas mensagens de anunciantes e usuários"
              checked={preferences.notifyMessages}
              onChange={() => togglePreference('notifyMessages')}
            />
            <NotifToggle
              icon={<Tag className="h-4 w-4" />}
              label="Ofertas"
              desc="Novas ofertas relevantes perto de você"
              checked={preferences.notifyOffers}
              onChange={() => togglePreference('notifyOffers')}
            />
            <NotifToggle
              icon={<Gift className="h-4 w-4" />}
              label="Sorteios"
              desc="Atualizações e resultados de sorteios"
              checked={preferences.notifyRaffles}
              onChange={() => togglePreference('notifyRaffles')}
            />
            <NotifToggle
              icon={<Megaphone className="h-4 w-4" />}
              label="Promoções"
              desc="Promoções especiais e destaques"
              checked={preferences.notifyPromotions}
              onChange={() => togglePreference('notifyPromotions')}
            />
            <NotifToggle
              icon={<MapPin className="h-4 w-4" />}
              label="Check-ins"
              desc="Confirmações e pontos de check-in"
              checked={preferences.notifyCheckins}
              onChange={() => togglePreference('notifyCheckins')}
            />
          </div>
        </CardContent>
      </Card>

      {/* Pesca Digital Card */}
      <Card className="border-primary/20">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Fish className="h-5 w-5 text-primary" />
            Pesca Digital
            <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/30">
              Novo
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Receba propostas personalizadas e ofertas baseadas nos seus interesses e localização, direto dos anunciantes.
          </p>
          
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="pesca-digital" className="font-medium">
                Ativar Pesca Digital
              </Label>
              <p className="text-xs text-muted-foreground">
                Permite que anunciantes enviem propostas relevantes
              </p>
            </div>
            <Switch
              id="pesca-digital"
              checked={preferences.pescaDigitalEnabled}
              onCheckedChange={() => togglePreference('pescaDigitalEnabled')}
            />
          </div>

          {preferences.pescaDigitalEnabled && (
            <div className="p-3 rounded-lg bg-primary/5 border border-primary/10 space-y-1">
              <p className="text-xs font-medium text-primary">🎣 Pesca Digital ativa</p>
              <p className="text-xs text-muted-foreground">
                Você receberá notificações de propostas personalizadas e ofertas por localização/interesse. O badge no ícone do app refletirá essas interações.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Sound Settings Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Volume2 className="h-5 w-5" />
            Sons
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="sound-enabled" className="font-medium">
                Sons de Notificação
              </Label>
              <p className="text-xs text-muted-foreground">
                Ativar/desativar todos os sons
              </p>
            </div>
            <Switch
              id="sound-enabled"
              checked={preferences.soundEnabled}
              onCheckedChange={toggleSoundEnabled}
            />
          </div>

          {preferences.soundEnabled && (
            <div className="pl-4 space-y-3 border-l-2 border-muted">
              <NotifToggle
                icon={<MessageSquare className="h-4 w-4" />}
                label="Mensagens"
                desc="Som ao receber mensagens"
                checked={preferences.messagesSound}
                onChange={toggleMessagesSound}
              />
              <NotifToggle
                icon={<Tag className="h-4 w-4" />}
                label="Ofertas"
                desc="Som ao receber ofertas próximas"
                checked={preferences.newOffersSound}
                onChange={toggleNewOffersSound}
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

// Reusable toggle row
const NotifToggle = ({
  icon,
  label,
  desc,
  checked,
  onChange,
}: {
  icon: React.ReactNode;
  label: string;
  desc: string;
  checked: boolean;
  onChange: () => void;
}) => (
  <div className="flex items-center justify-between">
    <div className="flex items-center gap-3">
      <span className="text-muted-foreground">{icon}</span>
      <div>
        <Label className="font-medium text-sm">{label}</Label>
        <p className="text-xs text-muted-foreground">{desc}</p>
      </div>
    </div>
    <Switch checked={checked} onCheckedChange={onChange} />
  </div>
);
