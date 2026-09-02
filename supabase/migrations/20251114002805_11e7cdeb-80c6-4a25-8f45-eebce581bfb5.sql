-- Adicionar campos de transparência e auditoria aos sorteios
ALTER TABLE public.raffles
ADD COLUMN IF NOT EXISTS draw_date timestamp with time zone,
ADD COLUMN IF NOT EXISTS draw_hash text,
ADD COLUMN IF NOT EXISTS draw_audit_log jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS winning_ticket_number integer,
ADD COLUMN IF NOT EXISTS total_tickets_at_draw integer;

-- Criar índice para busca rápida por hash
CREATE INDEX IF NOT EXISTS idx_raffles_draw_hash ON public.raffles(draw_hash);

-- Comentários para documentação
COMMENT ON COLUMN public.raffles.draw_date IS 'Data e hora exata da realização do sorteio';
COMMENT ON COLUMN public.raffles.draw_hash IS 'Hash SHA-256 para verificação de autenticidade do sorteio';
COMMENT ON COLUMN public.raffles.draw_audit_log IS 'Log completo de auditoria do processo de sorteio';
COMMENT ON COLUMN public.raffles.winning_ticket_number IS 'Número do bilhete sorteado';
COMMENT ON COLUMN public.raffles.total_tickets_at_draw IS 'Total de bilhetes vendidos no momento do sorteio';