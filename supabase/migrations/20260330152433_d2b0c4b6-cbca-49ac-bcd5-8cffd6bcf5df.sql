CREATE OR REPLACE FUNCTION public.alimentar_fundo_social()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_fundo_social_id UUID;
  v_percentual NUMERIC;
  v_valor_plano NUMERIC;
  v_contribuicao NUMERIC;
BEGIN
  -- Processa apenas na ativação inicial do pagamento/assinatura
  IF NEW.payment_status = 'active'
     AND (TG_OP = 'INSERT' OR COALESCE(OLD.payment_status, '') <> 'active') THEN

    -- Busca um único registro do fundo social para evitar UPDATE global sem WHERE
    SELECT id, COALESCE(percentual_receita, 10.00)
      INTO v_fundo_social_id, v_percentual
    FROM public.fundo_social
    ORDER BY created_at NULLS LAST, id
    LIMIT 1;

    -- Se não houver configuração do fundo social, não bloqueia a ativação manual
    IF v_fundo_social_id IS NULL THEN
      RETURN NEW;
    END IF;

    -- Busca valor do plano
    SELECT price_monthly
      INTO v_valor_plano
    FROM public.subscription_plans
    WHERE id = NEW.plan_id;

    IF v_valor_plano IS NOT NULL AND v_valor_plano > 0 THEN
      v_contribuicao := (v_valor_plano * v_percentual) / 100.0;

      UPDATE public.fundo_social
      SET saldo_disponivel = saldo_disponivel + v_contribuicao,
          total_arrecadado = total_arrecadado + v_contribuicao,
          updated_at = now()
      WHERE id = v_fundo_social_id;

      INSERT INTO public.fundo_social_movimentacoes (
        tipo,
        valor,
        origem,
        origem_id,
        descricao
      ) VALUES (
        'entrada',
        v_contribuicao,
        'plano_assinatura',
        NEW.id,
        'Contribuição de ' || v_percentual || '% do plano'
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;