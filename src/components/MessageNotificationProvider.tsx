import { useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from './ui/button';
import { Bell } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useUnifiedBadge } from '@/hooks/useUnifiedBadge';
import { useMessageNotifications } from '@/hooks/useMessageNotifications';
import { areNotificationsAllowed } from '@/hooks/useNotificationPreferences';

export const MessageNotificationProvider = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  // Initialize unified badge system
  useUnifiedBadge();

  // Global listener for new chat messages — toast + sound + browser notification
  useMessageNotifications();

  // Show permission prompt once per session
  useEffect(() => {
    if (!user) return;
    if (!('Notification' in window)) return;
    if (Notification.permission !== 'default') return;

    const promptShown = sessionStorage.getItem('notification_prompt_shown');
    if (promptShown) return;

    const timer = setTimeout(() => {
      sessionStorage.setItem('notification_prompt_shown', 'true');
      toast({
        title: "Ative as notificações 📢",
        description: "Receba alertas e badge no ícone do app em tempo real",
        action: (
          <Button 
            size="sm" 
            onClick={async (e) => {
              e.preventDefault();
              const permission = await Notification.requestPermission();
              if (permission === 'granted') {
                toast({
                  title: "Notificações ativadas! ✅",
                  description: "Você receberá alertas e o badge no ícone do app",
                });
              }
            }}
            className="shrink-0"
          >
            <Bell className="w-4 h-4 mr-2" />
            Ativar
          </Button>
        ),
        duration: 15000,
      });
    }, 5000);

    return () => clearTimeout(timer);
  }, [user]);

  return null;
};
