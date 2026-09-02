-- Adicionar coluna is_delivery na tabela offers para indicar se a oferta aceita validação no local do cliente (delivery)
ALTER TABLE public.offers ADD COLUMN IF NOT EXISTS is_delivery BOOLEAN DEFAULT false;

-- Adicionar comentário explicativo
COMMENT ON COLUMN public.offers.is_delivery IS 'Indica se a oferta permite validação de check-in no local do cliente (modo delivery), onde o entregador valida no endereço do usuário';