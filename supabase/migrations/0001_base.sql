-- 0001: base da loja, usuários, cadastro de serviços, tutores e pets.
create extension if not exists pgcrypto;

create table lojas (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  telefone_dona text,
  logo_url text,
  onboarding_concluido boolean not null default false,
  criado_em timestamptz not null default now()
);

create table perfis (
  user_id uuid primary key references auth.users(id) on delete cascade,
  loja_id uuid not null references lojas(id) on delete cascade,
  nome text not null,
  papel text not null check (papel in ('dona', 'recepcao'))
);

-- Loja do usuário logado. security definer evita recursão nas políticas de perfis.
create or replace function public.loja_atual() returns uuid
language sql stable security definer set search_path = public as $$
  select loja_id from perfis where user_id = auth.uid()
$$;

create or replace function public.e_dona() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select papel = 'dona' from perfis where user_id = auth.uid()), false)
$$;

grant execute on function public.loja_atual(), public.e_dona() to authenticated, service_role;

create table horarios_funcionamento (
  loja_id uuid not null references lojas(id) on delete cascade,
  dia_semana smallint not null check (dia_semana between 0 and 6),
  abre time not null,
  fecha time not null,
  primary key (loja_id, dia_semana),
  check (fecha > abre)
);

create table profissionais (
  id uuid primary key default gen_random_uuid(),
  loja_id uuid not null references lojas(id) on delete cascade,
  nome text not null,
  funcao text not null check (funcao in ('banho', 'tosa')),
  ativo boolean not null default true
);

create table servicos (
  id uuid primary key default gen_random_uuid(),
  loja_id uuid not null references lojas(id) on delete cascade,
  nome text not null,
  inclui_banho boolean not null default true,
  inclui_tosa boolean not null default false,
  ciclo_padrao_dias int not null default 15 check (ciclo_padrao_dias > 0),
  ativo boolean not null default true
);

create table precos_servico (
  servico_id uuid not null references servicos(id) on delete cascade,
  loja_id uuid not null references lojas(id) on delete cascade,
  porte text not null check (porte in ('mini', 'pequeno', 'medio', 'grande', 'gigante')),
  preco_centavos int not null check (preco_centavos >= 0),
  duracao_min int not null check (duracao_min > 0),
  primary key (servico_id, porte)
);

create table tutores (
  id uuid primary key default gen_random_uuid(),
  loja_id uuid not null references lojas(id) on delete cascade,
  nome text not null,
  telefone_e164 text not null,
  lembretes_ativos boolean not null default true,
  criado_em timestamptz not null default now(),
  unique (loja_id, telefone_e164)
);

create table pets (
  id uuid primary key default gen_random_uuid(),
  loja_id uuid not null references lojas(id) on delete cascade,
  tutor_id uuid not null references tutores(id) on delete cascade,
  nome text not null,
  especie text not null default 'cao' check (especie in ('cao', 'gato')),
  raca text,
  porte text not null check (porte in ('mini', 'pequeno', 'medio', 'grande', 'gigante')),
  nascimento date,
  cuidados text[] not null default '{}',
  observacoes text,
  foto_url text,
  ciclo_dias int check (ciclo_dias is null or ciclo_dias > 0),
  ciclo_fixo boolean not null default false,
  criado_em timestamptz not null default now()
);
create index pets_tutor_idx on pets (tutor_id);

create table configuracoes (
  loja_id uuid primary key references lojas(id) on delete cascade,
  hora_lembrete time not null default '09:00',
  envio_inicio time not null default '08:00',
  envio_fim time not null default '19:00',
  teto_diario int not null default 150 check (teto_diario >= 0),
  intervalo_min_s int not null default 20 check (intervalo_min_s >= 0),
  intervalo_max_s int not null default 90,
  fundo_troco_centavos int not null default 0 check (fundo_troco_centavos >= 0),
  check (intervalo_max_s >= intervalo_min_s),
  check (envio_fim > envio_inicio)
);

-- RLS -------------------------------------------------------------------
alter table lojas enable row level security;
alter table perfis enable row level security;
alter table horarios_funcionamento enable row level security;
alter table profissionais enable row level security;
alter table servicos enable row level security;
alter table precos_servico enable row level security;
alter table tutores enable row level security;
alter table pets enable row level security;
alter table configuracoes enable row level security;

create policy lojas_ler on lojas for select to authenticated using (id = loja_atual());
create policy lojas_dona on lojas for update to authenticated using (id = loja_atual() and e_dona()) with check (id = loja_atual());

create policy perfis_ler on perfis for select to authenticated using (loja_id = loja_atual());
create policy perfis_dona on perfis for all to authenticated
  using (loja_id = loja_atual() and e_dona()) with check (loja_id = loja_atual() and e_dona());

-- Cadastros da loja: todos leem, só a dona altera.
do $$
declare t text;
begin
  foreach t in array array['horarios_funcionamento', 'profissionais', 'servicos', 'precos_servico', 'configuracoes'] loop
    execute format('create policy %1$s_ler on %1$s for select to authenticated using (loja_id = loja_atual())', t);
    execute format('create policy %1$s_dona_ins on %1$s for insert to authenticated with check (loja_id = loja_atual() and e_dona())', t);
    execute format('create policy %1$s_dona_upd on %1$s for update to authenticated using (loja_id = loja_atual() and e_dona()) with check (loja_id = loja_atual() and e_dona())', t);
    execute format('create policy %1$s_dona_del on %1$s for delete to authenticated using (loja_id = loja_atual() and e_dona())', t);
  end loop;
  -- Operação do dia a dia: toda a equipe da loja.
  foreach t in array array['tutores', 'pets'] loop
    execute format('create policy %1$s_loja on %1$s for all to authenticated using (loja_id = loja_atual()) with check (loja_id = loja_atual())', t);
  end loop;
end $$;

grant select, insert, update, delete on all tables in schema public to authenticated, service_role;
alter default privileges in schema public grant select, insert, update, delete on tables to authenticated, service_role;
