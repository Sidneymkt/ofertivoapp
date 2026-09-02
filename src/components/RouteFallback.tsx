/**
 * Skeleton mostrado enquanto o chunk da rota carrega.
 * Mais leve que um spinner central: preenche o layout esperado
 * (header + cards) para reduzir a sensação de tela branca.
 */
export const RouteFallback = () => (
  <div className="min-h-screen bg-background">
    <div className="page-container-wide px-4 pt-6 pb-24 animate-pulse">
      <div className="h-8 w-1/2 max-w-xs rounded-md bg-muted mb-3" />
      <div className="h-4 w-1/3 max-w-[220px] rounded-md bg-muted/70 mb-8" />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 rounded-xl bg-muted/60" />
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-40 rounded-xl bg-muted/50" />
        ))}
      </div>
    </div>
  </div>
);

export default RouteFallback;
