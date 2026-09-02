import { useEffect, useLayoutEffect } from 'react';
import { useLocation } from 'react-router-dom';

export const ScrollToTop = () => {
  const { pathname } = useLocation();

  // useLayoutEffect para scroll antes do paint
  useLayoutEffect(() => {
    // Scroll instantâneo e forçado
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, [pathname]);

  // Backup com useEffect para garantir após hydration
  useEffect(() => {
    // Scroll imediato
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    
    // Retry após um pequeno delay para componentes assíncronos
    const timeoutId = setTimeout(() => {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    }, 50);
    
    return () => clearTimeout(timeoutId);
  }, [pathname]);

  return null;
};