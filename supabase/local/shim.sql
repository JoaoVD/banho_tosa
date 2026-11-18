-- Imita o que o Supabase já oferece, para rodar as migrations num Postgres comum.
-- NÃO é aplicado em produção.
do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon nologin noinherit; end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated nologin noinherit; end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then create role service_role nologin noinherit bypassrls; end if;
end $$;

create schema if not exists auth;
grant usage on schema auth to anon, authenticated, service_role;

create table if not exists auth.users (
  id uuid primary key,
  email text unique
);

create or replace function auth.uid() returns uuid
language sql stable as $$
  select nullif(current_setting('request.jwt.claims', true)::json->>'sub', '')::uuid
$$;

create or replace function auth.role() returns text
language sql stable as $$
  select current_setting('request.jwt.claims', true)::json->>'role'
$$;

grant execute on function auth.uid(), auth.role() to anon, authenticated, service_role;
