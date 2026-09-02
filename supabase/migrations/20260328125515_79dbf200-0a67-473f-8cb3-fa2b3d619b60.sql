ALTER TABLE public.business_subscriptions
DROP CONSTRAINT IF EXISTS business_subscriptions_payment_method_check;

ALTER TABLE public.business_subscriptions
ADD CONSTRAINT business_subscriptions_payment_method_check
CHECK (
  payment_method IS NULL OR payment_method IN ('pix', 'credit_card', 'debit_card', 'manual_admin', 'manual')
);