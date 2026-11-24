# Login por usuário — plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Entrar com usuário + senha; a dona cria usuários com senha inicial e redefine senhas.
**Architecture:** `perfis.usuario` (único, minúsculo). Login resolve usuário → e-mail interno da conta
(`auth.users`) pela conexão de serviço e chama o provedor (Supabase `signInWithPassword` / dev "dev").
**Tech Stack:** Next.js 15, postgres.js, Supabase Auth admin API, Vitest (DB), Playwright.
**Spec:** `docs/superpowers/specs/2026-11-24-login-usuario-design.md`

## Global Constraints
- Usuário: `^[a-z0-9._-]{3,30}$`, comparado em minúsculas, único no sistema.
- Erro de login único: **"Usuário ou senha incorretos."**
- Senha inicial/redefinida: mínimo **8** caracteres (modo dev ignora e usa "dev").
- E-mail interno de contas novas: `<usuario>@usuarios.banhotosa.local`.
- Demo: `dona.demo` / `recepcao.demo`, senha `demo1234`. Seed: `dona` / `recepcao`, senha `dev`.

## Review Focus
1. Usuário digitado com espaços ou maiúsculas (" Dona ") entra normalmente — teste na Task 2.
2. Usuário repetido ao criar (inclusive só mudando maiúsculas) → erro no campo, nada criado — teste na Task 3.
3. Recepção não consegue chamar criar/redefinir (ações exigem dona) — teste na Task 3.
4. Redefinir senha de usuário de outra loja é recusado — teste na Task 3 (DB/ação).
5. Migração em base com e-mails de mesma parte antes do @ gera usuários distintos — teste na Task 1.

---

### Task 1: Migração `0006_usuario.sql`, seed e demo
**Files:** Create `supabase/migrations/0006_usuario.sql`, `tests/db/usuario.test.ts`; Modify `scripts/seed.ts`, `scripts/demo.ts`
**Produces:** coluna `perfis.usuario text not null`, índice único `perfis_usuario_idx on perfis (lower(usuario))`, check `perfis_usuario_formato`.
- [ ] Testes (`usuario.test.ts`): `usuario é único sem diferenciar maiúsculas` (inserir `Ana` depois de `ana` → erro 23505); `formato inválido é recusado` (`a b`, `ab`, 31 chars → 23514); `migração preenche a partir do e-mail com sufixo em repetição` (aplicar o bloco de backfill da migração sobre dois perfis com e-mails `ana@x.com` e `ana@y.com` → `ana` e `ana2`).
- [ ] Rodar `npx vitest run -c vitest.db.config.ts tests/db/usuario.test.ts` → FAIL.
- [ ] Migração: add column nullable; backfill `lower(regexp_replace(split_part(email,'@',1),'[^a-z0-9._-]','','gi'))`, completado com `usuario` se < 3 chars e numerado (`row_number()` por base, 2, 3…) quando repete; `set not null`; índice + check. Seed: usuários `dona`/`recepcao`. Demo: `dona.demo`/`recepcao.demo`, e-mails internos.
- [ ] `npm run db:local reset`, rodar os testes → PASS; `npm run -s check` verde. Commit `feat(login): perfis.usuario`.

### Task 2: Login por usuário
**Files:** Modify `src/auth/provider.ts` (`ERRO_LOGIN`), `src/auth/supabase.ts`, `src/auth/dev.ts`, `src/app/entrar/LoginForm.tsx`, `src/app/entrar/actions.ts`, `tests/e2e/helpers.ts` (`entrar(page, usuario = 'recepcao')`, campo "Usuário"), chamadas de `entrar(page, 'dona@exemplo.dev')` → `'dona'`; `tests/e2e/login.spec.ts`
**Interfaces:** `AuthProvider.signIn(usuario: string, password: string)`; novo `emailDoUsuario(usuario: string): Promise<string | null>` em `src/auth/usuario.ts` (serviceDb: `select u.email from perfis p join auth.users u on u.id = p.user_id where lower(p.usuario) = lower(trim($1))`).
- [ ] Testes e2e: `login correto abre o Hoje` (usuário `recepcao`); `senha errada` e `usuário inexistente` mostram "Usuário ou senha incorretos."; `maiúsculas e espaços` (`  Recepcao `) entra.
- [ ] Rodar `npx playwright test --project=chromium tests/e2e/login.spec.ts --trace off` → FAIL (campo "Usuário" não existe).
- [ ] Implementar; campo `id="usuario" name="usuario" autoComplete="username" autoCapitalize="none"`.
- [ ] Rodar login + suítes chromium e celular completas → PASS. Commit `feat(login): entrar com usuário`.

### Task 3: Usuários — criar com senha e redefinir senha
**Files:** Modify `src/app/(app)/configuracoes/actions.ts` (substitui `convidarUsuario` por `criarUsuario`, adiciona `redefinirSenha`), `src/app/(app)/configuracoes/usuarios/page.tsx`, renomear `ConvidarForm.tsx` → `NovoUsuarioForm.tsx`, criar `RedefinirSenha.tsx`; Test `tests/e2e/configuracoes.spec.ts` (bloco Usuários), `tests/db/usuario.test.ts`
**Interfaces:** `criarUsuario(_: FormResult, f: FormData)` campos `nome, usuario, senha, papel`; `redefinirSenha(_: FormResult, f: FormData)` campos `userId, senha`. Ambas `requireDona()`; `redefinirSenha` confere que `userId` é da loja da dona (perfis com `loja_id = user.lojaId`) antes de chamar o Supabase.
- [ ] Testes e2e: `dona cria usuário e ele entra` (criar `carla.tosa`, sair, entrar com `carla.tosa` / `dev`); `usuário repetido mostra erro` (`RECEPCAO` → "Esse usuário já existe."); `redefinir senha mostra confirmação` ("Senha redefinida"); `senha curta mostra erro` ("Mínimo de 8 caracteres." — validado também em modo dev). Teste DB: `redefinir senha de outra loja é recusado` via função de checagem `perfilDaLoja(tx, userId)` → null.
- [ ] Rodar → FAIL. Implementar (Supabase: `auth.admin.createUser({ email, password, email_confirm: true })`, `auth.admin.updateUserById(id, { password })`; dev: insere em `auth.users`, senha ignorada). Lista mostra `nome`, `usuario`, papel e botão "Redefinir senha" (abre `Sheet` com campo Nova senha).
- [ ] Suítes completas (check, unit, chromium, celular) → PASS. Commit `feat(login): criar usuário com senha e redefinir senha`.

### Task 4: Publicar
- [ ] Aplicar `0006_usuario.sql` e a demo regenerada no Supabase pela Management API; conferir `select usuario from perfis`.
- [ ] Merge em `main`, push `main`, `feat/v1`.
