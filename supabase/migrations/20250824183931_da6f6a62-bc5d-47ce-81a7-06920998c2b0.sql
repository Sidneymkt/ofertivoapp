
-- Habilitar RLS (idempotente)
do $$
begin
  begin
    execute 'alter table public.raffles enable row level security';
  exception when others then
    null;
  end;

  begin
    execute 'alter table public.raffle_entries enable row level security';
  exception when others then
    null;
  end;
end
$$;

-- Políticas na tabela raffles (idempotentes)
do $$
begin
  -- SELECT
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'raffles'
      and policyname = 'Business owners can select their raffles'
  ) then
    create policy "Business owners can select their raffles"
      on public.raffles
      for select
      to authenticated
      using (
        exists (
          select 1
          from public.businesses b
          where b.id = raffles.business_id
            and b.owner_id = auth.uid()
        )
      );
  end if;

  -- INSERT
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'raffles'
      and policyname = 'Business owners can insert their raffles'
  ) then
    create policy "Business owners can insert their raffles"
      on public.raffles
      for insert
      to authenticated
      with check (
        exists (
          select 1
          from public.businesses b
          where b.id = raffles.business_id
            and b.owner_id = auth.uid()
        )
      );
  end if;

  -- UPDATE
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'raffles'
      and policyname = 'Business owners can update their raffles'
  ) then
    create policy "Business owners can update their raffles"
      on public.raffles
      for update
      to authenticated
      using (
        exists (
          select 1
          from public.businesses b
          where b.id = raffles.business_id
            and b.owner_id = auth.uid()
        )
      )
      with check (
        exists (
          select 1
          from public.businesses b
          where b.id = raffles.business_id
            and b.owner_id = auth.uid()
        )
      );
  end if;

  -- DELETE
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'raffles'
      and policyname = 'Business owners can delete their raffles'
  ) then
    create policy "Business owners can delete their raffles"
      on public.raffles
      for delete
      to authenticated
      using (
        exists (
          select 1
          from public.businesses b
          where b.id = raffles.business_id
            and b.owner_id = auth.uid()
        )
      );
  end if;
end
$$;

-- Políticas na tabela raffle_entries para leitura por donos do negócio (idempotentes)
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'raffle_entries'
      and policyname = 'Business owners can view entries for their raffles'
  ) then
    create policy "Business owners can view entries for their raffles"
      on public.raffle_entries
      for select
      to authenticated
      using (
        exists (
          select 1
          from public.raffles r
          join public.businesses b on b.id = r.business_id
          where r.id = raffle_entries.raffle_id
            and b.owner_id = auth.uid()
        )
      );
  end if;
end
$$;
