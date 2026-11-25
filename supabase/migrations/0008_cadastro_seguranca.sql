-- 0008: com o cadastro aberto, qualquer pessoa vira dona de uma loja e recebe um token do Supabase.
-- A dona só pode alterar, pelo banco, as colunas que as telas alteram. Liberar o WhatsApp,
-- marcar demonstração ou escolher a instância do WhatsApp ficam só com o servidor.
revoke update on lojas from authenticated;
grant update (nome, telefone_dona, logo_url, onboarding_concluido) on lojas to authenticated;
revoke insert, update on configuracoes from authenticated;
grant update (hora_lembrete, envio_inicio, envio_fim, teto_diario, intervalo_min_s, intervalo_max_s, fundo_troco_centavos)
  on configuracoes to authenticated;

-- Uma instância de WhatsApp pertence a uma loja só.
create unique index if not exists configuracoes_whatsapp_instancia_unica on configuracoes (whatsapp_instancia)
  where whatsapp_instancia is not null;

-- Tentativas (qualquer envio válido) e cadastros concluídos contam separados.
alter table cadastros_tentativas add column if not exists tipo text not null default 'cadastro';
alter table cadastros_tentativas add column if not exists id bigint generated always as identity;
create index if not exists cadastros_tentativas_ip_tipo_em on cadastros_tentativas (ip, tipo, em);
