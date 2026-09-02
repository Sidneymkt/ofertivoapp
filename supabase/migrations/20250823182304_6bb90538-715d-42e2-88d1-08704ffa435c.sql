
-- 1) Criar bucket público para imagens de sorteios (idempotente)
insert into storage.buckets (id, name, public)
values ('raffle-images', 'raffle-images', true)
on conflict (id) do nothing;

-- 2) Políticas de RLS no storage.objects para o bucket "raffle-images"
-- Regra: usuário autenticado pode inserir/atualizar/excluir arquivos
-- apenas dentro da pasta "<business_id>/*" e somente se for dono daquele negócio.

-- Helper: criamos as políticas de forma idempotente
do $$
begin
  -- INSERT
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'Raffle images - insert by business owner'
  ) then
    execute $policy$
      create policy "Raffle images - insert by business owner"
      on storage.objects
      for insert
      to authenticated
      with check (
        bucket_id = 'raffle-images'
        and exists (
          select 1
          from public.businesses b
          where b.owner_id = auth.uid()
            -- o arquivo precisa começar com o id do negócio + "/"
            and split_part(name, '/', 1) = b.id::text
        )
      );
    $policy$;
  end if;

  -- UPDATE
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'Raffle images - update by business owner'
  ) then
    execute $policy$
      create policy "Raffle images - update by business owner"
      on storage.objects
      for update
      to authenticated
      using (
        bucket_id = 'raffle-images'
        and exists (
          select 1
          from public.businesses b
          where b.owner_id = auth.uid()
            and split_part(name, '/', 1) = b.id::text
        )
      )
      with check (
        bucket_id = 'raffle-images'
        and exists (
          select 1
          from public.businesses b
          where b.owner_id = auth.uid()
            and split_part(name, '/', 1) = b.id::text
        )
      );
    $policy$;
  end if;

  -- DELETE
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'Raffle images - delete by business owner'
  ) then
    execute $policy$
      create policy "Raffle images - delete by business owner"
      on storage.objects
      for delete
      to authenticated
      using (
        bucket_id = 'raffle-images'
        and exists (
          select 1
          from public.businesses b
          where b.owner_id = auth.uid()
            and split_part(name, '/', 1) = b.id::text
        )
      );
    $policy$;
  end if;

  -- (Opcional) SELECT via SQL não é necessário para leitura pública,
  -- pois o bucket é público e as URLs públicas já funcionam sem SELECT.
end
$$;

-- 3) Garantir Realtime nas tabelas de sorteios (idempotente)

-- REPLICA IDENTITY FULL
do $$
begin
  begin
    execute 'alter table public.raffles replica identity full';
  exception when others then
    -- ignora se já estiver configurado
    null;
  end;

  begin
    execute 'alter table public.raffle_entries replica identity full';
  exception when others then
    null;
  end;
end
$$;

-- Adicionar tabelas à publicação supabase_realtime
do $$
begin
  begin
    execute 'alter publication supabase_realtime add table public.raffles';
  exception when others then
    -- já existe
    null;
  end;

  begin
    execute 'alter publication supabase_realtime add table public.raffle_entries';
  exception when others then
    null;
  end;
end
$$;
