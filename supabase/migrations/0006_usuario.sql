-- 0006: login por usuário. Cada perfil tem um usuário único (sem diferenciar maiúsculas).
-- Perfis criados sem usuário recebem um a partir do e-mail da conta (parte antes do @).
alter table perfis add column if not exists usuario text;

create or replace function public.usuario_sugerido(email text) returns text
language plpgsql volatile set search_path = public as $$
declare
  base text := left(lower(regexp_replace(coalesce(split_part(email, '@', 1), ''), '[^a-zA-Z0-9._-]', '', 'g')), 27);
  n int;
  cand text;
begin
  if base = '' then base := 'usuario'; end if;
  if length(base) >= 3 and not exists (select 1 from perfis where lower(usuario) = base) then return base; end if;
  n := case when length(base) < 3 then 1 else 2 end;
  loop
    cand := base || n;
    if length(cand) >= 3 and not exists (select 1 from perfis where lower(usuario) = cand) then return cand; end if;
    n := n + 1;
  end loop;
end $$;

create or replace function public.perfis_usuario_padrao() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.usuario is null then
    new.usuario := usuario_sugerido((select email from auth.users where id = new.user_id));
  else
    new.usuario := lower(trim(new.usuario));
  end if;
  return new;
end $$;

drop trigger if exists perfis_usuario_padrao on perfis;
create trigger perfis_usuario_padrao before insert or update of usuario on perfis
  for each row execute function public.perfis_usuario_padrao();

-- Perfis que já existem (um por vez, para numerar repetidos).
do $$
declare r record;
begin
  for r in select p.user_id from perfis p where p.usuario is null order by p.user_id loop
    update perfis set usuario = null where user_id = r.user_id; -- dispara o gatilho
  end loop;
end $$;

alter table perfis alter column usuario set not null;
alter table perfis drop constraint if exists perfis_usuario_formato;
alter table perfis add constraint perfis_usuario_formato check (usuario ~ '^[a-z0-9._-]{3,30}$');
create unique index if not exists perfis_usuario_idx on perfis (lower(usuario));
