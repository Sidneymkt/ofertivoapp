-- Enable realtime for transactions table
ALTER TABLE public.transactions REPLICA IDENTITY FULL;

-- Ensure transactions table is in realtime publication
-- (this is usually done automatically, but we'll be explicit)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND schemaname = 'public' 
    AND tablename = 'transactions'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.transactions;
  END IF;
END $$;