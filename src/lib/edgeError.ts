import { FunctionsHttpError } from '@supabase/supabase-js';

/** Extrai a mensagem real de erro de uma Edge Function (invoke devolve mensagem genérica). */
export async function getEdgeFunctionError(error: unknown): Promise<{ status?: number; message: string }> {
  if (error instanceof FunctionsHttpError) {
    const status = error.context?.status as number | undefined;
    try {
      const body = await error.context.json();
      return { status, message: body?.error || body?.message || `Erro ${status ?? ''}`.trim() };
    } catch {
      try {
        const text = await error.context.text();
        return { status, message: text || `Erro ${status ?? ''}`.trim() };
      } catch {
        return { status, message: `Erro ${status ?? ''}`.trim() };
      }
    }
  }
  if (error instanceof Error) return { message: error.message };
  return { message: 'Erro desconhecido' };
}

/** true quando a falha veio de limite/créditos de IA. */
export function isAiQuotaError(status?: number, message?: string) {
  if (status === 402 || status === 429) return true;
  const m = (message || '').toLowerCase();
  return m.includes('crédit') || m.includes('credit') || m.includes('limite de requisi');
}
