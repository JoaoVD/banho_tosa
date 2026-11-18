-- 0003: pagamentos, pacotes, pontos e fechamento do caixa.

create table pagamentos (
  id uuid primary key default gen_random_uuid(),
  loja_id uuid not null references lojas(id) on delete cascade,
  tutor_id uuid not null references tutores(id),
  forma text not null check (forma in ('pix', 'credito', 'debito', 'dinheiro', 'pacote')),
  total_centavos int not null check (total_centavos >= 0),
  pontos_ganhos int not null default 0,
  pontos_usados int not null default 0,
  dia_caixa date not null,
  recebido_em timestamptz not null default now(),
  usuario_id uuid,
  idempotency_key uuid not null unique,
  estornado_em timestamptz,
  estorno_motivo text
);
create index pagamentos_dia_idx on pagamentos (loja_id, dia_caixa);

create table pagamento_itens (
  id uuid primary key default gen_random_uuid(),
  loja_id uuid not null references lojas(id) on delete cascade,
  pagamento_id uuid not null references pagamentos(id) on delete cascade,
  agendamento_id uuid references agendamentos(id),
  descricao text not null,
  valor_centavos int not null check (valor_centavos >= 0),
  ajuste_motivo text
);
create index pagamento_itens_ag_idx on pagamento_itens (agendamento_id);

create table pacotes_modelo (
  id uuid primary key default gen_random_uuid(),
  loja_id uuid not null references lojas(id) on delete cascade,
  nome text not null,
  preco_centavos int not null check (preco_centavos >= 0),
  banhos int not null check (banhos > 0),
  servico_id uuid not null references servicos(id),
  porte text check (porte in ('mini', 'pequeno', 'medio', 'grande', 'gigante')),
  validade_dias int not null check (validade_dias > 0),
  ativo boolean not null default true
);

create table pacotes_cliente (
  id uuid primary key default gen_random_uuid(),
  loja_id uuid not null references lojas(id) on delete cascade,
  tutor_id uuid not null references tutores(id) on delete cascade,
  modelo_id uuid references pacotes_modelo(id),
  nome text not null,
  servico_id uuid not null references servicos(id),
  porte text,
  total int not null check (total > 0),
  saldo int not null check (saldo >= 0),
  valido_ate date not null,
  vendido_em timestamptz not null default now(),
  aviso_renovacao_em timestamptz
);
create index pacotes_cliente_tutor_idx on pacotes_cliente (tutor_id);

create table movimentos_pacote (
  id bigint generated always as identity primary key,
  loja_id uuid not null references lojas(id) on delete cascade,
  pacote_cliente_id uuid not null references pacotes_cliente(id) on delete cascade,
  delta int not null,
  agendamento_id uuid references agendamentos(id),
  pagamento_id uuid references pagamentos(id),
  em timestamptz not null default now()
);

create table premios (
  id uuid primary key default gen_random_uuid(),
  loja_id uuid not null references lojas(id) on delete cascade,
  nome text not null,
  pontos int not null check (pontos > 0),
  servico_id uuid references servicos(id),
  ativo boolean not null default true
);

create table movimentos_pontos (
  id bigint generated always as identity primary key,
  loja_id uuid not null references lojas(id) on delete cascade,
  tutor_id uuid not null references tutores(id) on delete cascade,
  delta int not null,
  motivo text not null,
  pagamento_id uuid references pagamentos(id),
  em timestamptz not null default now()
);
create index movimentos_pontos_tutor_idx on movimentos_pontos (tutor_id);

create view saldo_pontos with (security_invoker = true) as
  select tutor_id, loja_id, coalesce(sum(delta), 0)::int as saldo from movimentos_pontos group by tutor_id, loja_id;

create table caixa_dias (
  loja_id uuid not null references lojas(id) on delete cascade,
  dia date not null,
  fechado_em timestamptz,
  fechado_por uuid,
  contado_centavos int,
  esperado_centavos int,
  diferenca_centavos int,
  reaberto_em timestamptz,
  primary key (loja_id, dia)
);

do $$
declare t text;
begin
  foreach t in array array['pagamentos', 'pagamento_itens', 'pacotes_cliente', 'movimentos_pacote', 'movimentos_pontos', 'caixa_dias'] loop
    execute format('alter table %1$s enable row level security', t);
    execute format('create policy %1$s_loja on %1$s for all to authenticated using (loja_id = loja_atual()) with check (loja_id = loja_atual())', t);
  end loop;
  -- Catálogo de pacotes e prêmios: todos leem, só a dona altera.
  foreach t in array array['pacotes_modelo', 'premios'] loop
    execute format('alter table %1$s enable row level security', t);
    execute format('create policy %1$s_ler on %1$s for select to authenticated using (loja_id = loja_atual())', t);
    execute format('create policy %1$s_dona on %1$s for all to authenticated using (loja_id = loja_atual() and e_dona()) with check (loja_id = loja_atual() and e_dona())', t);
  end loop;
end $$;

grant select, insert, update, delete on pagamentos, pagamento_itens, pacotes_modelo, pacotes_cliente, movimentos_pacote,
  premios, movimentos_pontos, caixa_dias to authenticated, service_role;
grant select on saldo_pontos to authenticated, service_role;
