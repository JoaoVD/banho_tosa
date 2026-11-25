-- 0007: cadastro aberto de pet shops.
-- Enquanto o WhatsApp não é por loja, só as lojas liberadas usam o número configurado no servidor.
do $$
begin
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'lojas' and column_name = 'whatsapp_liberado') then
    alter table lojas add column whatsapp_liberado boolean not null default false;
    -- Só na primeira vez: as lojas que já existem (menos a de demonstração) continuam enviando como antes.
    update lojas set whatsapp_liberado = true where not demo;
  end if;
end $$;

-- Tentativas de cadastro (limite por IP). Só o servidor (conexão de serviço) usa.
create table if not exists cadastros_tentativas (
  ip text not null,
  em timestamptz not null default now()
);
create index if not exists cadastros_tentativas_ip_em on cadastros_tentativas (ip, em);
alter table cadastros_tentativas enable row level security;
