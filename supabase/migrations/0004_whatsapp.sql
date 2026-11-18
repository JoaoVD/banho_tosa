-- 0004: WhatsApp — conversas, mensagens, fila de envio, modelos, propostas de horário e lembretes.

create table conversas (
  id uuid primary key default gen_random_uuid(),
  loja_id uuid not null references lojas(id) on delete cascade,
  telefone_e164 text not null,
  tutor_id uuid references tutores(id) on delete set null,
  nao_lidas int not null default 0,
  ultima_em timestamptz not null default now(),
  unique (loja_id, telefone_e164)
);

create table mensagens (
  id uuid primary key default gen_random_uuid(),
  loja_id uuid not null references lojas(id) on delete cascade,
  conversa_id uuid not null references conversas(id) on delete cascade,
  direcao text not null check (direcao in ('in', 'out')),
  origem text not null check (origem in ('sistema', 'celular', 'tutor')),
  tipo text,
  automatica boolean not null default false,
  texto text not null,
  provider_id text unique,
  status text not null check (status in ('fila', 'enviada', 'falhou', 'recebida')),
  em timestamptz not null default now()
);
create index mensagens_conversa_idx on mensagens (conversa_id, em);

create table fila_envio (
  id uuid primary key default gen_random_uuid(),
  loja_id uuid not null references lojas(id) on delete cascade,
  telefone_e164 text not null,
  tutor_id uuid references tutores(id) on delete set null,
  texto text not null,
  tipo text not null,
  prioridade text not null check (prioridade in ('imediata', 'lote')),
  agendar_para timestamptz not null default now(),
  tentativas int not null default 0,
  status text not null default 'pendente' check (status in ('pendente', 'enviando', 'enviada', 'falhou', 'cancelada')),
  mensagem_id uuid references mensagens(id) on delete set null,
  dedupe_key text unique,
  enviada_em timestamptz,
  erro text,
  criada_em timestamptz not null default now()
);
create index fila_envio_pendente_idx on fila_envio (loja_id, status, agendar_para);

create table modelos_mensagem (
  loja_id uuid not null references lojas(id) on delete cascade,
  tipo text not null,
  texto text not null,
  primary key (loja_id, tipo)
);

create table propostas_horario (
  id uuid primary key default gen_random_uuid(),
  loja_id uuid not null references lojas(id) on delete cascade,
  tutor_id uuid not null references tutores(id) on delete cascade,
  pet_id uuid not null references pets(id) on delete cascade,
  servico_id uuid not null references servicos(id),
  inicio timestamptz not null,
  status text not null default 'enviada' check (status in ('enviada', 'respondida', 'confirmada', 'descartada')),
  agendamento_id uuid references agendamentos(id),
  criada_em timestamptz not null default now()
);
create index propostas_tutor_idx on propostas_horario (tutor_id, criada_em desc);

create table lembretes_enviados (
  id bigint generated always as identity primary key,
  loja_id uuid not null references lojas(id) on delete cascade,
  tutor_id uuid not null references tutores(id) on delete cascade,
  enviado_em timestamptz not null default now(),
  respondido boolean not null default false
);
create index lembretes_tutor_idx on lembretes_enviados (tutor_id, enviado_em desc);

create table execucoes_diarias (
  loja_id uuid not null references lojas(id) on delete cascade,
  dia date not null,
  tipo text not null,
  em timestamptz not null default now(),
  unique (loja_id, dia, tipo)
);

-- Só desenvolvimento/testes: registro do WhatsApp falso.
create table fake_whatsapp_log (
  id bigint generated always as identity primary key,
  para text not null,
  texto text not null,
  em timestamptz not null default now()
);
create table fake_whatsapp_estado (chave text primary key, valor text not null);

alter table configuracoes add column whatsapp_instancia text;
-- "Tirar da lista" do próximo envio de lembretes (por dia).
create table lembretes_pulados (
  loja_id uuid not null references lojas(id) on delete cascade,
  tutor_id uuid not null references tutores(id) on delete cascade,
  dia date not null,
  primary key (tutor_id, dia)
);

do $$
declare t text;
begin
  foreach t in array array['conversas', 'mensagens', 'fila_envio', 'propostas_horario', 'lembretes_enviados', 'execucoes_diarias', 'lembretes_pulados'] loop
    execute format('alter table %1$s enable row level security', t);
    execute format('create policy %1$s_loja on %1$s for all to authenticated using (loja_id = loja_atual()) with check (loja_id = loja_atual())', t);
  end loop;
end $$;
alter table modelos_mensagem enable row level security;
create policy modelos_ler on modelos_mensagem for select to authenticated using (loja_id = loja_atual());
create policy modelos_dona on modelos_mensagem for all to authenticated using (loja_id = loja_atual() and e_dona()) with check (loja_id = loja_atual() and e_dona());
alter table fake_whatsapp_log enable row level security;
alter table fake_whatsapp_estado enable row level security;

grant select, insert, update, delete on lembretes_pulados, conversas, mensagens, fila_envio, modelos_mensagem, propostas_horario, lembretes_enviados, execucoes_diarias to authenticated, service_role;
grant select, insert, update, delete on fake_whatsapp_log, fake_whatsapp_estado to service_role;
