import { useState, useEffect, useCallback, useRef } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';

// Bump this on each release cycle for visible version tracking.
export const APP_VERSION = '1.1.0';

// Preferência do usuário para recarregar automaticamente ao detectar nova versão
export const AUTO_UPDATE_KEY = 'ofertivo:auto-update';
export const getAutoUpdatePreference = (): boolean => {
  try { return localStorage.getItem(AUTO_UPDATE_KEY) === '1'; } catch { return false; }
};
export const setAutoUpdatePreference = (enabled: boolean) => {
  try { localStorage.setItem(AUTO_UPDATE_KEY, enabled ? '1' : '0'); } catch {}
};

type NavigatorWithBadging = Navigator & {
  setAppBadge?: (contents?: number) => Promise<void>;
  clearAppBadge?: () => Promise<void>;
};
const getBadgingNavigator = () => navigator as NavigatorWithBadging;

// Check every 60s while app is open (balances battery vs freshness)
const UPDATE_CHECK_INTERVAL = 60 * 1000;


export function useServiceWorker() {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [isUpdating, setIsUpdating] = useState(false);
  const [lastChecked, setLastChecked] = useState<number>(Date.now());
  const registrationRef = useRef<ServiceWorkerRegistration | null>(null);

  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(swUrl, registration) {
      if (registration) registrationRef.current = registration;
      // Immediate first check after registration
      registration?.update().catch(() => {});
    },
    onRegisterError(error) {
      console.error('[SW] Erro ao registrar:', error);
    },
    onNeedRefresh() {
      getBadgingNavigator().setAppBadge?.(1).catch(() => {});
    },
  });

  const showUpdateNotification = useCallback(() => {
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    if (Notification.permission !== 'granted') return;
    // Evita duplicar a notificação para a mesma versão
    const key = 'ofertivo:update-notified-version';
    try {
      if (localStorage.getItem(key) === APP_VERSION) return;
      localStorage.setItem(key, APP_VERSION);
    } catch {}

    try {
      const notif = new Notification('Ofertivo atualizado', {
        body: 'Uma nova versão está pronta. Toque para recarregar agora.',
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        tag: `ofertivo-update-${APP_VERSION}`,
        requireInteraction: false,
      });
      notif.onclick = () => {
        window.focus();
        notif.close();
        window.dispatchEvent(new CustomEvent('ofertivo:sw-update-accepted'));
      };
    } catch (err) {
      console.warn('[SW] Falha ao exibir notificação de atualização:', err);
    }
  }, []);

  const markUpdateAvailable = useCallback(() => {
    setNeedRefresh(true);
    getBadgingNavigator().setAppBadge?.(1).catch(() => {});
    showUpdateNotification();
    if (getAutoUpdatePreference()) {
      // Pequeno delay para permitir a UI transicionar ao estado "Atualizando"
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('ofertivo:sw-update-accepted'));
      }, 300);
    }
  }, [setNeedRefresh, showUpdateNotification]);


  const updateApp = useCallback(async () => {
    if (isUpdating) return;
    setIsUpdating(true);
    getBadgingNavigator().clearAppBadge?.().catch(() => {});

    let reloaded = false;
    const doReload = () => {
      if (reloaded) return;
      reloaded = true;
      window.location.replace(window.location.href);
    };

    try {
      // Reload as soon as the new SW takes over
      navigator.serviceWorker?.addEventListener('controllerchange', doReload, { once: true });

      const registration = registrationRef.current || (await navigator.serviceWorker?.getRegistration());
      const waiting = registration?.waiting;

      if (waiting) {
        waiting.postMessage({ type: 'SKIP_WAITING' });
      } else {
        // No waiting worker yet — force update flow
        await updateServiceWorker(true);
      }

      // Fallback if controllerchange never fires (some browsers)
      setTimeout(doReload, 2500);
    } catch (error) {
      console.error('[SW] Erro ao atualizar app:', error);
      doReload();
    }
  }, [updateServiceWorker, isUpdating]);

  const checkForUpdates = useCallback(async () => {
    try {
      const registration = registrationRef.current || (await navigator.serviceWorker?.getRegistration());
      if (!registration) return;
      registrationRef.current = registration;
      await registration.update();
      setLastChecked(Date.now());
      if (registration.waiting) markUpdateAvailable();
    } catch (error) {
      // Silent fail
    }
  }, [markUpdateAvailable]);

  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      // Check for updates as soon as we're back online
      checkForUpdates();
    };
    const handleOffline = () => setIsOffline(true);

    let intervalId: number | undefined;
    let currentRegistration: ServiceWorkerRegistration | undefined;

    const handleUpdateFound = () => {
      const installing = currentRegistration?.installing;
      if (!installing) return;
      installing.addEventListener('statechange', () => {
        if (installing.state === 'installed' && navigator.serviceWorker.controller) {
          markUpdateAvailable();
        }
      });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    navigator.serviceWorker?.getRegistration().then((reg) => {
      currentRegistration = reg;
      if (reg) {
        registrationRef.current = reg;
        if (reg.waiting) markUpdateAvailable();
        reg.addEventListener('updatefound', handleUpdateFound);
      }
      checkForUpdates();
      intervalId = window.setInterval(checkForUpdates, UPDATE_CHECK_INTERVAL);
    });

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') checkForUpdates();
    };
    const handleFocus = () => checkForUpdates();

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      currentRegistration?.removeEventListener('updatefound', handleUpdateFound);
      if (intervalId) window.clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [checkForUpdates, markUpdateAvailable]);

  return {
    isUpdateAvailable: needRefresh,
    isOffline,
    isUpdating,
    lastChecked,
    updateApp,
    checkForUpdates,
    appVersion: APP_VERSION,
    dismissUpdate: () => setNeedRefresh(false),
  };
}
