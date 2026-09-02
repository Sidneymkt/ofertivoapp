-- Adicionar chaves estrangeiras para garantir integridade referencial
ALTER TABLE public.favorites 
ADD CONSTRAINT fk_favorites_offer
FOREIGN KEY (offer_id) REFERENCES public.offers (id) ON DELETE CASCADE;

-- Adicionar chave estrangeira para a tabela follows
ALTER TABLE public.follows 
ADD CONSTRAINT fk_follows_business
FOREIGN KEY (business_id) REFERENCES public.businesses (id) ON DELETE CASCADE;