import React, { useEffect, useState } from 'react';
import { useServiceWorker, APP_VERSION, getAutoUpdatePreference, setAutoUpdatePreference } from '@/hooks/useServiceWorker';
import { Button } from '@/components/ui/button';
import { RefreshCw, WifiOff, Sparkles, X, Loader2 } from 'lucide-react';


const DISMISS_KEY = 'ofertivo:update-dismissed-version';

/**
 * UpdatePrompt: banner discreto no topo com estados claros:
 * - Offline
 * - Nova versão disponível (com botão Atualizar + Depois)
 * - Atualizando (loading)
 * Nunca bloqueia a UI com modal.
 * A dispensa é persistida por versão para não reaparecer várias vezes.
 */
export function UpdatePrompt() {
  const { isUpdateAvailable, isOffline, isUpdating, updateApp, dismissUpdate } = useServiceWorker();
  const [dismissed, setDismissed] = useState<boolean>(() => {
    try {
      return localStorage.getItem(DISMISS_KEY) === APP_VERSION;
    } catch {
      return false;
    }
  });
  const [autoUpdate, setAutoUpdate] = useState<boolean>(() => getAutoUpdatePreference());


  // Se surgir uma versão nova diferente da já dispensada, limpa a dispensa.
  useEffect(() => {
    if (!isUpdateAvailable) return;
    try {
      const stored = localStorage.getItem(DISMISS_KEY);
      if (stored && stored !== APP_VERSION) {
        localStorage.removeItem(DISMISS_KEY);
        setDismissed(false);
      }
    } catch {}
  }, [isUpdateAvailable]);

  // Pede permissão de notificação uma única vez (silenciosamente) para que,
  // quando uma nova versão chegar, possamos avisar via Notification API.
  useEffect(() => {
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    if (Notification.permission !== 'default') return;
    const asked = (() => {
      try { return localStorage.getItem('ofertivo:notif-perm-asked') === '1'; } catch { return false; }
    })();
    if (asked) return;
    try { localStorage.setItem('ofertivo:notif-perm-asked', '1'); } catch {}
    // Só pede após um gesto/tempo — evita prompt logo no load
    const t = window.setTimeout(() => {
      Notification.requestPermission().catch(() => {});
    }, 8000);
    return () => window.clearTimeout(t);
  }, []);

  // Clique na notificação do navegador → aciona atualização automática
  useEffect(() => {
    const onAccept = () => {
      try { localStorage.removeItem(DISMISS_KEY); } catch {}
      updateApp();
    };
    window.addEventListener('ofertivo:sw-update-accepted', onAccept);
    return () => window.removeEventListener('ofertivo:sw-update-accepted', onAccept);
  }, [updateApp]);

  // Offline: indicador leve no rodapé
  if (isOffline) {
    return (
      <div className="fixed bottom-20 md:bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-auto z-[90] animate-fade-in pointer-events-none">
        <div className="bg-yellow-500/95 backdrop-blur text-white px-4 py-2.5 rounded-lg shadow-lg flex items-center gap-2 pointer-events-auto">
          <WifiOff className="h-4 w-4 flex-shrink-0" />
          <span className="text-sm font-medium">Você está offline</span>
        </div>
      </div>
    );
  }

  if (!isUpdateAvailable || dismissed) return null;

  const handleUpdate = () => {
    try { localStorage.removeItem(DISMISS_KEY); } catch {}
    updateApp();
  };

  const handleLater = () => {
    try { localStorage.setItem(DISMISS_KEY, APP_VERSION); } catch {}
    setDismissed(true);
    dismissUpdate();
  };


  return (
    <div className="fixed top-0 left-0 right-0 z-[100] animate-slide-in-top">
      <div className="bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-500 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-2.5">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              {isUpdating ? (
                <Loader2 className="h-5 w-5 flex-shrink-0 animate-spin" />
              ) : (
                <div className="relative flex-shrink-0">
                  <Sparkles className="h-5 w-5" />
                  <span className="absolute -top-1 -right-1 w-2 h-2 bg-white rounded-full animate-pulse" />
                </div>
              )}
              <div className="min-w-0">
                <p className="text-sm font-semibold leading-tight">
                  {isUpdating ? 'Atualizando o Ofertivo...' : 'Nova versão disponível!'}
                </p>
                <p className="text-xs opacity-90 leading-tight truncate">
                  {isUpdating
                    ? 'Aguarde, recarregando com as novidades'
                    : `Melhorias e correções esperando por você · v${APP_VERSION}`}
                </p>
              </div>
            </div>

            {!isUpdating && (
              <div className="flex items-center gap-2 flex-shrink-0">
                <Button
                  onClick={handleUpdate}
                  size="sm"
                  variant="secondary"
                  className="text-xs px-3 font-semibold gap-1.5 shadow-sm"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  Atualizar agora
                </Button>
                <Button
                  onClick={handleLater}
                  size="sm"
                  variant="ghost"
                  className="text-white hover:bg-white/20 h-8 w-8 p-0"
                  aria-label="Depois"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
          {!isUpdating && (
            <label className="flex items-center gap-2 mt-1.5 text-[11px] opacity-95 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={autoUpdate}
                onChange={(e) => {
                  setAutoUpdate(e.target.checked);
                  setAutoUpdatePreference(e.target.checked);
                }}
                className="h-3.5 w-3.5 rounded accent-white cursor-pointer"
              />
              Atualizar automaticamente nas próximas versões
            </label>
          )}
        </div>

      </div>
    </div>
  );
}

// Manter export legado para compatibilidade
export const UpdateBanner = UpdatePrompt;
