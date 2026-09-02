-- Adicionar política para permitir sistema criar assinaturas pendentes
CREATE POLICY "System can create pending subscriptions"
ON public.business_subscriptions
FOR INSERT
WITH CHECK (true);

-- Atualizar comentário para documentar
COMMENT ON POLICY "System can create pending subscriptions" ON public.business_subscriptions 
IS 'Permite que a Edge Function create-payment crie registros de assinatura pendentes';