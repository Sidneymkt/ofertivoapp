import React, { Component, ReactNode } from 'react';
import { Button } from './ui/button';
import { AlertCircle } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);

    const isChunkError =
      error.message.includes('Failed to fetch dynamically imported module') ||
      error.message.includes('Importing a module script failed') ||
      error.name === 'ChunkLoadError';

    if (isChunkError) {
      console.log('[SW] Chunk error detected — limpando caches e recarregando');
      // Evita loop de reload
      const key = 'ofertivo:chunk-reload-at';
      const last = Number(sessionStorage.getItem(key) || 0);
      if (Date.now() - last < 10_000) return;
      sessionStorage.setItem(key, String(Date.now()));

      (async () => {
        try {
          if ('caches' in window) {
            const names = await caches.keys();
            await Promise.all(names.map((n) => caches.delete(n)));
          }
          const reg = await navigator.serviceWorker?.getRegistration();
          if (reg?.waiting) reg.waiting.postMessage({ type: 'SKIP_WAITING' });
          await reg?.update().catch(() => {});
        } catch {}
        window.location.reload();
      })();
    }
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      // Se for erro de módulo dinâmico, mostrar mensagem de recarregamento
      if (this.state.error?.message.includes('Failed to fetch dynamically imported module')) {
        return (
          <div className="min-h-screen flex items-center justify-center p-4">
            <div className="text-center max-w-md">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <h2 className="text-xl font-semibold mb-2">Atualizando...</h2>
              <p className="text-muted-foreground mb-4">
                Detectamos uma atualização. Recarregando automaticamente...
              </p>
            </div>
          </div>
        );
      }

      return (
        <div className="min-h-screen flex items-center justify-center p-4">
          <div className="text-center max-w-md">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Algo deu errado</h2>
            <p className="text-muted-foreground mb-4">
              Ocorreu um erro ao carregar esta página.
            </p>
            <Button onClick={this.handleReload}>
              Recarregar Página
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
