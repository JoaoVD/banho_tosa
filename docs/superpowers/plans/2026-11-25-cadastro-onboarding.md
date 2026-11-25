# Cadastro + primeiro acesso em conversa — plano

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `/cadastro` cria loja + dona; primeiro acesso em conversa monta a loja; lojas novas isoladas do WhatsApp.
**Architecture:** server actions + serviceDb para criar loja/dona; conversa é um client component que deriva a
etapa do estado do banco (`progressoOnboarding`) e salva cada resposta por server action (withSession, RLS).
**Spec:** `docs/superpowers/specs/2026-11-25-cadastro-onboarding-design.md`

## Global Constraints
- Senha ≥ 8; usuário pela regra `USUARIO_RE` de `src/domain/usuario.ts`; erro de login inalterado.
- Limite: 5 cadastros/hora/IP. Campo anti-robô `name="site"`.
- `lojas.whatsapp_liberado` default false; existentes não-demo = true.
- Textos: título "Criar conta"; botão "Criar conta"; aviso Mensagens "O WhatsApp ainda não está disponível para esta loja."

## Review Focus
1. Cadastro com e-mail já usado → erro no campo E-mail, nenhuma loja criada (Task 2).
2. Recarregar no meio da conversa volta à etapa certa sem duplicar equipe/serviços (Task 3).
3. Loja nova não envia nem recebe WhatsApp de outra loja (Task 1, testes de banco).
4. Duplo clique em "Criar conta" não cria duas lojas (Task 2: botão ocupado + usuário único).
5. Conversa a 390 px sem rolagem lateral (Task 3, projeto celular).

---
### Task 1: Isolamento de WhatsApp e migração
Files: `supabase/migrations/0007_cadastro.sql` (lojas.whatsapp_liberado, cadastros_tentativas(ip text, em timestamptz)
com índice; update existentes não-demo = true); `src/worker/daily.ts`, `src/worker/send-queue.ts` (pular se
`not whatsapp_liberado`); `src/whatsapp/webhook.ts` (`lojaDaInstancia` sem fallback); `src/app/(app)/layout.tsx`
(whatsappOk = false se não liberada); `MensagensView` aviso. Tests `tests/db/cadastro.test.ts`:
`worker não gera nem envia para loja não liberada`, `instância desconhecida não cai em nenhuma loja`.
Seed/demo: seed `whatsapp_liberado = true`; demo continua demo.

### Task 2: Cadastro
Files: `src/domain/catalogo.ts` (CATALOGO de serviços, PRESETS de horário), `src/db/repos/cadastro.ts`
(`criarLoja(sql, {nomeLoja, nome, usuario, userId}) → lojaId` em transação: loja, perfil dona, configuracoes;
`registrarTentativa(sql, ip) → number` tentativas na última hora), `src/app/cadastro/{page,actions,CadastroForm,cadastro.module.css}`,
`src/auth/provider.ts` (`signInUser(userId)`? não: depois de criar, chama `authProvider().signIn(usuario, senha)`),
middleware PUBLICAS `/cadastro`; link "Criar conta" no Entrar. `scripts/seed.ts` passa a usar o CATALOGO.
Tests e2e `tests/e2e/cadastro.spec.ts`: cria e cai em /boas-vindas; usuário repetido; e-mail repetido; senha curta;
anti-robô; 6º cadastro na hora → "Muitos cadastros"; testes de banco de `criarLoja`.

### Task 3: Primeiro acesso em conversa
Files: `src/db/repos/onboarding.ts` (`progressoOnboarding(tx) → {horarios:boolean, equipe:number, servicos:number, concluido:boolean}`),
`src/app/boas-vindas/{page,actions,Conversa,boas-vindas.module.css}` (substitui os cartões). Ações:
`salvarHorarios(preset|dias+abre+fecha)`, `adicionarProfissional(nome, funcao)`, `salvarServicos(precos?)`
(substitui o catálogo da loja só se ela ainda não tem serviços; ajustes atualizam os preços), `concluir(destino: 'importar'|'hoje')`.
Tests e2e `tests/e2e/onboarding.spec.ts` (fluxo completo → Hoje → Agenda mostra "Livre às 08:00"; recarregar retoma;
refazer horários) e `tests/e2e/celular/onboarding.spec.ts` (largura 390).

### Task 4: Publicar
Migração 0007 no Supabase via Management API; merge em main; push.
