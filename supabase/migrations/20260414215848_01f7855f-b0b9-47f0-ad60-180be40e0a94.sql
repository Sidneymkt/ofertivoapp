
-- Add observacoes and etiquetas columns to crm_leads
ALTER TABLE public.crm_leads
ADD COLUMN IF NOT EXISTS observacoes TEXT,
ADD COLUMN IF NOT EXISTS etiquetas TEXT[] DEFAULT '{}';

-- Allow business owners to delete their own CRM leads
CREATE POLICY "Business owners can delete their crm_leads"
ON public.crm_leads
FOR DELETE
USING (
  business_id IN (
    SELECT id FROM public.businesses WHERE owner_id = auth.uid()
  )
);
