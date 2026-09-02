DROP POLICY IF EXISTS "System can create pending subscriptions" ON public.business_subscriptions;
DROP POLICY IF EXISTS "System can insert notifications" ON public.notifications;
DROP POLICY IF EXISTS "System can insert payment logs" ON public.payment_logs;

CREATE POLICY "System can create pending subscriptions"
ON public.business_subscriptions
FOR INSERT
TO service_role
WITH CHECK (true);

CREATE POLICY "System can insert notifications"
ON public.notifications
FOR INSERT
TO service_role
WITH CHECK (true);

CREATE POLICY "System can insert payment logs"
ON public.payment_logs
FOR INSERT
TO service_role
WITH CHECK (true);