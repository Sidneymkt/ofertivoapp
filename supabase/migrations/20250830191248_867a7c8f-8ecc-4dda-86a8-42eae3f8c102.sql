-- Adicionar chave estrangeira para a tabela offer_views
ALTER TABLE public.offer_views 
ADD CONSTRAINT fk_offer_views_offer
FOREIGN KEY (offer_id) REFERENCES public.offers (id) ON DELETE CASCADE;