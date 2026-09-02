ALTER TABLE public.transactions
DROP CONSTRAINT IF EXISTS transactions_gateway_check;

ALTER TABLE public.transactions
ADD CONSTRAINT transactions_gateway_check
CHECK (
  gateway IN ('abacatepay', 'mercadopago', 'cakto', 'manual')
);

ALTER TABLE public.transactions
DROP CONSTRAINT IF EXISTS transactions_payment_method_check;

ALTER TABLE public.transactions
ADD CONSTRAINT transactions_payment_method_check
CHECK (
  payment_method IS NULL OR payment_method IN ('pix', 'credit_card', 'debit_card', 'manual_admin', 'manual')
);