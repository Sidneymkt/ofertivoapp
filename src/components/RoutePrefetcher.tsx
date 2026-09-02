import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Prefeeds critical route chunks during browser idle time so navigation
 * feels instantaneous. Non-blocking; failures are ignored silently.
 */
const idle = (cb: () => void, timeout = 2500) => {
  const w = window as any;
  if (typeof w.requestIdleCallback === 'function') {
    w.requestIdleCallback(cb, { timeout });
  } else {
    setTimeout(cb, 300);
  }
};

// Map of route path prefix -> dynamic importer (matches App.tsx lazy imports)
const prefetchMap: Record<string, () => Promise<unknown>> = {
  '/': () => import('@/pages/Home'),
  '/mapa': () => import('@/pages/Map'),
  '/ofertas': () => import('@/pages/Offers'),
  '/pontos': () => import('@/pages/Points'),
  '/perfil': () => import('@/pages/Profile'),
  '/favoritos': () => import('@/pages/Favorites'),
  '/dashboard': () => import('@/pages/BusinessDashboard'),
  '/anunciante/painel': () => import('@/pages/BusinessDashboard'),
  '/anunciante/ofertas': () => import('@/pages/BusinessOffers'),
  '/comunidade': () => import('@/pages/Community'),
  '/sorteios': () => import('@/pages/Raffles'),
  '/vaquinhas': () => import('@/pages/Crowdfunding'),
  '/mensagens': () => import('@/pages/UserMessages'),
  '/notificacoes': () => import('@/pages/Notifications'),
};

// Rotas que são navegações mais prováveis a partir de qualquer contexto
const globalWarm: Array<() => Promise<unknown>> = [
  () => import('@/pages/Offers'),
  () => import('@/pages/Home'),
  () => import('@/pages/Points'),
];

// Sugestões de próxima rota por contexto
const contextualHints: Record<string, Array<() => Promise<unknown>>> = {
  '/': [
    () => import('@/pages/Offers'),
    () => import('@/pages/Map'),
    () => import('@/pages/OfferDetails'),
  ],
  '/ofertas': [
    () => import('@/pages/OfferDetails'),
    () => import('@/pages/Map'),
  ],
  '/dashboard': [
    () => import('@/pages/BusinessOffers'),
    () => import('@/pages/CreateOffer'),
    () => import('@/pages/BusinessCRM'),
  ],
  '/anunciante/painel': [
    () => import('@/pages/BusinessOffers'),
    () => import('@/pages/CreateOffer'),
    () => import('@/pages/BusinessCRM'),
  ],
  '/anunciante/ofertas': [
    () => import('@/pages/CreateOffer'),
    () => import('@/pages/EditOffer'),
  ],
  '/comunidade': [() => import('@/pages/PublicUserProfile')],
};

export const RoutePrefetcher = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    // Warm-up global após primeira idle
    idle(() => {
      globalWarm.forEach((imp) => imp().catch(() => {}));
    });
  }, []);

  useEffect(() => {
    // Prefetch contextual conforme o usuário navega
    const key = Object.keys(contextualHints).find((p) =>
      p === '/' ? pathname === '/' : pathname.startsWith(p)
    );
    if (!key) return;
    idle(() => {
      contextualHints[key].forEach((imp) => imp().catch(() => {}));
    });
  }, [pathname]);

  useEffect(() => {
    // Hover/touch em qualquer <a href="/rota"> dispara prefetch imediato
    const handler = (e: Event) => {
      const target = (e.target as HTMLElement | null)?.closest('a[href]');
      if (!target) return;
      const href = target.getAttribute('href') || '';
      if (!href.startsWith('/')) return;
      const match = Object.keys(prefetchMap)
        .sort((a, b) => b.length - a.length)
        .find((p) => href === p || href.startsWith(p + '/') || href.startsWith(p + '?'));
      if (match) prefetchMap[match]().catch(() => {});
    };
    document.addEventListener('mouseover', handler, { passive: true });
    document.addEventListener('touchstart', handler, { passive: true });
    return () => {
      document.removeEventListener('mouseover', handler);
      document.removeEventListener('touchstart', handler);
    };
  }, []);

  return null;
};

export default RoutePrefetcher;
