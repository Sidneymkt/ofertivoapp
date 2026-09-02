import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Trash2, HardDrive, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

type Report = Record<string, { total: number; orphans: number; deleted: number; sample: string[] }>;

export const StorageCleanupCard = () => {
  const [loading, setLoading] = useState<'scan' | 'delete' | null>(null);
  const [report, setReport] = useState<Report | null>(null);
  const [lastWasDryRun, setLastWasDryRun] = useState(true);

  const run = async (dry_run: boolean) => {
    setLoading(dry_run ? 'scan' : 'delete');
    try {
      const { data, error } = await supabase.functions.invoke('cleanup-orphan-storage', {
        body: { dry_run },
      });
      if (error) throw error;
      setReport(data?.report ?? null);
      setLastWasDryRun(dry_run);
      toast.success(dry_run ? 'Análise concluída' : 'Limpeza concluída');
    } catch (e: any) {
      toast.error(e?.message || 'Erro ao executar limpeza');
    } finally {
      setLoading(null);
    }
  };

  const totalOrphans = report
    ? Object.values(report).reduce((s, r) => s + r.orphans, 0)
    : 0;

  return (
    <Card className="mt-6 border-orange-500/30">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <HardDrive className="w-5 h-5" />
          Limpeza de Storage (arquivos órfãos)
        </CardTitle>
        <CardDescription>
          Identifica e remove arquivos do Storage que não estão mais referenciados no banco de dados
          (ex.: imagens de ofertas excluídas). Liberará espaço significativo no seu plano.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={() => run(true)}
            disabled={loading !== null}
          >
            {loading === 'scan' ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <HardDrive className="w-4 h-4 mr-2" />
            )}
            Analisar (dry-run)
          </Button>
          <Button
            variant="destructive"
            onClick={() => {
              if (!confirm(`Excluir ${totalOrphans} arquivos órfãos? Esta ação é permanente.`)) return;
              run(false);
            }}
            disabled={loading !== null || !report || totalOrphans === 0}
          >
            {loading === 'delete' ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Trash2 className="w-4 h-4 mr-2" />
            )}
            Excluir órfãos
          </Button>
        </div>

        {report && (
          <div className="space-y-2">
            <div className="text-sm text-muted-foreground">
              {lastWasDryRun ? 'Resultado da análise:' : 'Resultado da exclusão:'}
            </div>
            <div className="rounded-md border divide-y">
              {Object.entries(report).map(([bucket, r]) => (
                <div key={bucket} className="flex items-center justify-between p-3 text-sm">
                  <div className="font-medium">{bucket}</div>
                  <div className="flex gap-2 items-center">
                    <Badge variant="outline">{r.total} total</Badge>
                    <Badge variant={r.orphans > 0 ? 'destructive' : 'secondary'}>
                      {r.orphans} órfãos
                    </Badge>
                    {r.deleted > 0 && (
                      <Badge className="bg-green-600">{r.deleted} excluídos</Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
