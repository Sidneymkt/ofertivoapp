-- Corrigir função que atualiza updated_at em chats para ter search_path seguro
DROP FUNCTION IF EXISTS update_chat_updated_at() CASCADE;

CREATE OR REPLACE FUNCTION update_chat_updated_at()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.chats 
  SET updated_at = now() 
  WHERE id = NEW.chat_id;
  RETURN NEW;
END;
$$;

-- Recriar trigger
CREATE TRIGGER update_chat_timestamp
  AFTER INSERT ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION update_chat_updated_at();