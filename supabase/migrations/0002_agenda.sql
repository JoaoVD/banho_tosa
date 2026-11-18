-- 0002: agendamentos, blocos de agenda por profissional (sem sobreposição) e histórico de etapas.
create extension if not exists btree_gist;

create table agendamentos (
  id uuid primary key default gen_random_uuid(),
  loja_id uuid not null references lojas(id) on delete cascade,
  pet_id uuid not null references pets(id) on delete cascade,
  servico_id uuid not null references servicos(id),
  preco_centavos int not null check (preco_centavos >= 0),
  etapa text not null default 'agendado'
    check (etapa in ('agendado', 'chegando', 'banho', 'tosa', 'pronto', 'concluido', 'cancelado', 'nao_compareceu')),
  inicio timestamptz not null,
  fim timestamptz not null,
  criado_por uuid references auth.users(id),
  criado_em timestamptz not null default now(),
  cancelado_motivo text,
  -- Atendimento histórico (importado ou registrado depois): não ocupa agenda.
  historico boolean not null default false,
  -- Aviso de "pet pronto": quando a recepção decidiu (null = ainda não) e se mandou mensagem.
  aviso_pronto_em timestamptz,
  aviso_pronto_enviado boolean,
  check (fim > inicio)
);
create index agendamentos_inicio_idx on agendamentos (loja_id, inicio);
create index agendamentos_pet_idx on agendamentos (pet_id, inicio desc);

create table agendamento_blocos (
  id uuid primary key default gen_random_uuid(),
  loja_id uuid not null references lojas(id) on delete cascade,
  agendamento_id uuid not null references agendamentos(id) on delete cascade,
  profissional_id uuid not null references profissionais(id),
  periodo tstzrange not null,
  ativo boolean not null default true,
  exclude using gist (profissional_id with =, periodo with &&) where (ativo)
);
create index agendamento_blocos_ag_idx on agendamento_blocos (agendamento_id);

create table etapas_historico (
  id bigint generated always as identity primary key,
  loja_id uuid not null references lojas(id) on delete cascade,
  agendamento_id uuid not null references agendamentos(id) on delete cascade,
  etapa text not null,
  em timestamptz not null default now(),
  usuario_id uuid
);
create index etapas_historico_ag_idx on etapas_historico (agendamento_id, em);

alter table agendamentos enable row level security;
alter table agendamento_blocos enable row level security;
alter table etapas_historico enable row level security;
create policy agendamentos_loja on agendamentos for all to authenticated using (loja_id = loja_atual()) with check (loja_id = loja_atual());
create policy agendamento_blocos_loja on agendamento_blocos for all to authenticated using (loja_id = loja_atual()) with check (loja_id = loja_atual());
create policy etapas_historico_loja on etapas_historico for all to authenticated using (loja_id = loja_atual()) with check (loja_id = loja_atual());

grant select, insert, update, delete on agendamentos, agendamento_blocos, etapas_historico to authenticated, service_role;
