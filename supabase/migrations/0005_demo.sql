-- 0005: loja de demonstração (apresentações). O worker nunca envia WhatsApp para ela.
alter table lojas add column if not exists demo boolean not null default false;
