# Banho e Tosa (v1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build v1 of the grooming-salon management system described in the spec: daily board, agenda, pets and tutors (with spreadsheet import), receiving payments, packages, points, cash desk and WhatsApp automations for return visits. UI language is pt-BR.

**Architecture:** One Next.js (App Router) app holds every screen and the server actions. A separate Node worker runs on the VPS next to the Evolution API; it drains the send queue and fires the daily reminders. Both talk to the same Supabase Postgres. Business rules live in pure TypeScript modules (`src/domain`) with unit tests. Data access goes through `withSession()`, which sets the same role and JWT claims Supabase sets, so the RLS policies on `loja_id` apply identically in local tests and in production.

**Tech Stack:** Next.js 15 (App Router, Server Actions), TypeScript (strict), Tailwind CSS 4, Radix primitives (dialog), dnd-kit core 6, zod 4, postgres.js, Supabase (Postgres, Auth via `@supabase/ssr`, Storage), Vitest 4 + Testing Library, Playwright (`@playwright/test@1.63.0`, matching the browser preinstalled in the build container), `@axe-core/playwright`, exceljs + papaparse (import), libphonenumber-js, Evolution API (Docker) on a VPS.

**Spec:** `docs/superpowers/specs/2026-11-18-banho-e-tosa-design.md`. The visual reference is `docs/prototipo/prototipo.html`. Read both before starting. Screens, copy, component behaviour and tokens are taken from the prototype.

## Global Constraints

- All UI copy in pt-BR. Button and menu labels exactly as in the prototype: "Hoje", "Agenda", "Mensagens", "Pets e tutores", "Pacotes e pontos", "Caixa", "Agendar", "Começar banho", "Levar para tosa", "Marcar como pronto", "Concluir", "Receber R$ X", "Confirmar", "Outro horário", "Fechar caixa", "Desfazer".
- Time zone `America/Sao_Paulo` for every "day" concept (today, cash day, 9h reminders). Store `timestamptz`; never compare naive dates.
- Money is stored as integer cents (`*_centavos int`). Display with `Intl.NumberFormat('pt-BR', {style:'currency', currency:'BRL'})`.
- Phones are stored in E.164 (`+55…`) and are unique per `loja_id` for tutors.
- Every business table has `loja_id uuid not null` and RLS enabled. Policies use `public.loja_atual()`. Nothing in the app uses the service role except the worker and the WhatsApp webhook.
- No message is sent from a screen. Everything goes through `fila_envio` (spec §8.2).
- Anti-ban defaults (spec §7.2), configurable per store:
  - batch messages are spaced 20–90 s apart at random;
  - daily cap of automatic messages is 150;
  - sending only between 08:00 and 19:00 local time;
  - at most 1 return reminder every 7 days per tutor, and at most 2 unanswered in a row;
  - opt-out is honoured immediately.
- Light theme only (no dark-mode CSS). Design tokens copied from the prototype:
  - surfaces and text: `--bg #F5F5F7`, `--surface #FFFFFF`, `--ink #1D1D1F`, `--ink2 #6E6E73`;
  - accent: `--tint #00877C`;
  - state colours: orange `#FF9500` (fill) and `#C25E00` (text), green `#34C759`, red `#C9241B`;
  - base font size 16px;
  - font stack `-apple-system, BlinkMacSystemFont, "SF Pro Text", "Inter", …`.
- Accessibility floor:
  - text contrast 4.5:1 and a visible focus ring;
  - every drag has a button alternative;
  - dialogs trap focus and close on Esc;
  - field errors appear under the field;
  - async buttons show a busy state;
  - respect `prefers-reduced-motion` and `prefers-reduced-transparency`.
- Skills `ui-ux-pro-max` and `design-taste-frontend` live in `.claude/skills/` and are consulted for any UI decision the prototype does not cover (e.g. Configurações).
- `npm run check` (typecheck, lint, unit and DB tests) must pass before every commit.

## Review Focus

1. **Day boundaries in São Paulo.** A payment at 23:50 local (02:50 UTC next day) belongs to the local day. The 9h reminder run uses local 9h. Covered in Task 3 (`dayKeySP`) and Task 17 (cash day).
2. **Phone formats.** These inputs must all normalise to `+5511987654321`, and import and webhook must match the same tutor:
   - `(11) 98765-4321`, `11987654321`, `+55 11 98765-4321`, `5511987654321`;
   - the WhatsApp JID `5511987654321@s.whatsapp.net`.
   An 8-digit mobile without the 9th digit (`(11) 8765-4321`, i.e. a legacy format) normalises to the same number. Covered in Task 3 and Task 22.
3. **Double submits.** A double click on "Receber" or "Confirmar" (proposal) creates exactly one payment or appointment. Enforced with an idempotency key (Task 15) and a status check (Task 23).
4. **Slot taken between suggestion and confirmation.** Confirming must never double-book. A DB exclusion constraint does the enforcing (Task 10), and Confirm offers the next free slot (Task 23).
5. **Money typed by hand.** `1.234,56`, `80`, `80,5`, ` 80,50 ` and `R$ 80,50` must parse to the right cents, and `abc` must be rejected with a field error. Covered in Task 3; used by the cash drawer (Task 17) and the price adjustment (Task 15).

---

## File Structure

```
banho-e-tosa/
  .claude/skills/{ui-ux-pro-max,design-taste-frontend}/   copied skills
  .env.example
  package.json  tsconfig.json  next.config.ts  vitest.config.ts  playwright.config.ts  eslint.config.mjs
  supabase/
    migrations/0001_base.sql 0002_agenda.sql 0003_caixa.sql 0004_whatsapp.sql
    local/shim.sql                      roles + auth schema so plain Postgres behaves like Supabase
  scripts/
    db-local.sh                         init/start/reset local Postgres 16 in .tmp/pg, apply shim + migrations
    seed.ts                             example data (from the prototype)
  src/
    domain/                             pure functions only, no IO
      types.ts money.ts time.ts phone.ts stages.ts pricing.ts slots.ts cycle.ts
      points.ts packages.ts cash.ts templates.ts optout.ts reminders.ts
      import/{parse.ts,map.ts,validate.ts}
    db/
      client.ts session.ts
      repos/{loja,config,tutores,pets,servicos,agenda,pagamentos,pacotes,pontos,caixa,mensagens,fila,importacao}.ts
    auth/{provider.ts,dev.ts,supabase.ts,current.ts}
    whatsapp/{provider.ts,fake.ts,evolution.ts,webhook.ts,enqueue.ts}
    worker/{index.ts,send-queue.ts,daily.ts,clock.ts}
    ui/                                 design system (client components)
      tokens.css Sidebar.tsx Toolbar.tsx Button.tsx Segmented.tsx Switch.tsx Sheet.tsx
      Toast.tsx Mono.tsx Ring.tsx GroupList.tsx Chip.tsx Widget.tsx EmptyState.tsx Field.tsx icons.tsx
    app/
      layout.tsx  globals.css
      entrar/page.tsx  boas-vindas/page.tsx
      (app)/layout.tsx  hoje/  agenda/  pets/  pets/[id]/  mensagens/  pacotes/  caixa/  configuracoes/
      api/whatsapp/webhook/route.ts
  tests/
    db/helpers.ts  db/*.test.ts
    e2e/*.spec.ts  e2e/fixtures/*
  deploy/
    docker-compose.vps.yml  worker.Dockerfile  README.md
```

---

## Phase 1: Base

### Task 1: Project scaffold

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `eslint.config.mjs`, `vitest.config.ts`, `playwright.config.ts`, `.env.example`, `src/app/layout.tsx`, `src/app/globals.css`, `src/app/page.tsx` (redirects to `/hoje`), `tests/smoke.test.ts`
- Create: `.claude/skills/` (copy `~/.claude/skills/ui-ux-pro-max` and `~/.claude/skills/design-taste-frontend` verbatim)

**Interfaces:**
- Produces scripts:
  - `dev`, `build`, `start`, `lint`, `typecheck`;
  - `test` (vitest unit), `test:db` (vitest `tests/db`), `e2e` (playwright);
  - `check` = `typecheck && lint && test && test:db`;
  - `db:local` (scripts/db-local.sh), `seed`, `worker`.
- `.env.example` keys:
  - `DATABASE_URL`, `AUTH_MODE` (`dev` | `supabase`);
  - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_DATABASE_URL`;
  - `WHATSAPP_PROVIDER` (`fake` | `evolution`), `EVOLUTION_URL`, `EVOLUTION_API_KEY`, `EVOLUTION_INSTANCE`;
  - `WEBHOOK_SECRET`.

- [ ] **Step 1:** `npx create-next-app@15` with TypeScript, App Router, `src/`, Tailwind, ESLint, no Turbopack flags. Set `"strict": true`. Add vitest, @testing-library/react, jsdom and `@playwright/test@1.63.0`.
- [ ] **Step 2:** Write `tests/smoke.test.ts`: `expect(1 + 1).toBe(2)`. Configure vitest so that `tests/db/**` runs only under `test:db` and `tests/e2e/**` is excluded.
- [ ] **Step 3:** Configure `playwright.config.ts`:
  - `webServer` runs `npm run dev` with `AUTH_MODE=dev WHATSAPP_PROVIDER=fake`;
  - `use.trace: 'off'`, base URL `http://localhost:3000`.
- [ ] **Step 4:** Run `npm run check && npm run build`. Expected: both succeed.
- [ ] **Step 5:** Commit `chore: scaffold Next.js app, test tooling and design skills`.

### Task 2: Local Postgres that behaves like Supabase

**Files:**
- Create: `scripts/db-local.sh`, `supabase/local/shim.sql`, `tests/db/helpers.ts`, `tests/db/shim.test.ts`

**Interfaces:**
- `scripts/db-local.sh up|reset|down`:
  - uses `/usr/lib/postgresql/16/bin` (or `pg_config --bindir`) to `initdb` into `.tmp/pg` and starts the server on port 54329;
  - applies `supabase/local/shim.sql`, then `supabase/migrations/*.sql` in order;
  - prints `DATABASE_URL=postgres://postgres@localhost:54329/postgres`.
- `shim.sql` creates:
  - roles `anon`, `authenticated`, `service_role`;
  - schema `auth` with table `auth.users(id uuid pk, email text)`;
  - `auth.uid() returns uuid`, which reads `current_setting('request.jwt.claims', true)::json->>'sub'`. This is the same contract as Supabase.
- `tests/db/helpers.ts`:
  - `resetDb(): Promise<void>` truncates all public tables;
  - `sql`: a service connection;
  - `asUser(userId: string, fn: (tx) => Promise<T>): Promise<T>` runs `fn` inside a transaction with `set local role authenticated` and claims `{sub: userId, role: 'authenticated'}`.

- [ ] **Step 1:** Write test `auth.uid() returns the claim sub inside asUser`: create a user id, `asUser(id, tx => tx\`select auth.uid() as u\`)`, expect `u === id`.
- [ ] **Step 2:** Run `npm run db:local up && npm run test:db`. Expected: FAIL (shim missing).
- [ ] **Step 3:** Write `shim.sql`, `db-local.sh` and `helpers.ts`.
- [ ] **Step 4:** Run `npm run test:db`. Expected: PASS.
- [ ] **Step 5:** Commit `chore: local Postgres harness mirroring Supabase auth`.

### Task 3: Domain primitives: money, São Paulo time, phone

**Files:**
- Create: `src/domain/types.ts`, `src/domain/money.ts`, `src/domain/time.ts`, `src/domain/phone.ts`
- Test: `src/domain/money.test.ts`, `src/domain/time.test.ts`, `src/domain/phone.test.ts`

**Interfaces:**
- `types.ts`:
  - `type Porte = 'mini'|'pequeno'|'medio'|'grande'|'gigante'`;
  - `type Etapa = 'agendado'|'chegando'|'banho'|'tosa'|'pronto'|'concluido'|'cancelado'|'nao_compareceu'`;
  - `type FormaPagamento = 'pix'|'credito'|'debito'|'dinheiro'|'pacote'`;
  - `type Papel = 'dona'|'recepcao'`.
- `money.ts`:
  - `parseBRL(input: string): number | null` returns cents;
  - `formatBRL(cents: number): string`.
- `time.ts`:
  - `TZ = 'America/Sao_Paulo'`;
  - `dayKeySP(d: Date): string` returns `'YYYY-MM-DD'` local;
  - `atSP(dayKey: string, hhmm: string): Date`;
  - `startOfDaySP(d: Date): Date`;
  - `addDaysKey(dayKey: string, n: number): string`.
- `phone.ts`: `normalizePhone(raw: string): string | null` returns E.164 BR, or null if invalid.
  - Accepts the WhatsApp JID suffix `@s.whatsapp.net`.
  - Inserts the 9th digit for 8-digit mobiles starting 6–9.
  - Landlines (starting 2–5) are kept as they are.

- [ ] **Step 1:** Write the tests.
  - money:
    - `parseBRL('1.234,56') === 123456`, `parseBRL('80') === 8000`, `parseBRL('80,5') === 8050`;
    - `parseBRL(' 80,50 ') === 8050`, `parseBRL('R$ 80,50') === 8050`;
    - `parseBRL('abc') === null`, `parseBRL('') === null`;
    - `formatBRL(7000) === 'R$ 70,00'`; compare after replacing NBSP with a space.
  - time:
    - `dayKeySP(new Date('2026-11-19T02:50:00Z')) === '2026-11-18'`;
    - `atSP('2026-11-19','09:00').toISOString() === '2026-11-19T12:00:00.000Z'`.
  - phone:
    - each of `(11) 98765-4321`, `11987654321`, `+55 11 98765-4321`, `5511987654321`, `5511987654321@s.whatsapp.net` gives `'+5511987654321'`;
    - `normalizePhone('(11) 8765-4321') === '+5511987654321'`;
    - `normalizePhone('(11) 3456-7890') === '+551134567890'`;
    - `normalizePhone('123') === null`.
- [ ] **Step 2:** Run `npx vitest run src/domain`. Expected: FAIL (modules missing).
- [ ] **Step 3:** Implement with `Intl.DateTimeFormat` (timeZone `TZ`) and libphonenumber-js (`parsePhoneNumberFromString(x, 'BR')`), adding the 9th-digit rule before parsing.
- [ ] **Step 4:** Run `npx vitest run src/domain`. Expected: PASS.
- [ ] **Step 5:** Commit `feat(domain): money, São Paulo time and phone normalisation`.

### Task 4: Base schema and tenant isolation

**Files:**
- Create: `supabase/migrations/0001_base.sql`
- Test: `tests/db/rls-base.test.ts`

**Interfaces:**
- Tables:
  - `lojas(id, nome, telefone_dona, logo_url, criado_em)`;
  - `perfis(user_id uuid pk references auth.users, loja_id, nome, papel text check in ('dona','recepcao'))`;
  - `horarios_funcionamento(loja_id, dia_semana 0-6, abre time, fecha time)`;
  - `profissionais(id, loja_id, nome, funcao text check in ('banho','tosa'), ativo)`;
  - `servicos(id, loja_id, nome, inclui_banho bool, inclui_tosa bool, ciclo_padrao_dias int, ativo)`;
  - `precos_servico(servico_id, porte, preco_centavos int, duracao_min int, pk(servico_id, porte))`;
  - `tutores(id, loja_id, nome, telefone_e164, lembretes_ativos bool default true, criado_em, unique(loja_id, telefone_e164))`;
  - `pets(id, loja_id, tutor_id, nome, especie text check in ('cao','gato'), raca, porte, nascimento date null, cuidados text[] default '{}', observacoes, foto_url, ciclo_dias int null, ciclo_fixo bool default false)`;
  - `configuracoes(loja_id pk, hora_lembrete time default '09:00', envio_inicio time default '08:00', envio_fim time default '19:00', teto_diario int default 150, intervalo_min_s int default 20, intervalo_max_s int default 90, fundo_troco_centavos int default 0)`.
- Functions:
  - `public.loja_atual() returns uuid`: `select loja_id from perfis where user_id = auth.uid()`, security definer, stable;
  - `public.e_dona() returns bool`.
- Policies:
  - every table: select/insert/update/delete where `loja_id = loja_atual()`;
  - `configuracoes`, `horarios_funcionamento`, `profissionais`, `servicos` and `precos_servico`: write only when `e_dona()`;
  - grant to `authenticated`.

- [ ] **Step 1:** Write the tests.
  - `user of loja A cannot see tutores of loja B`: seed two stores with one tutor each; `asUser(a)` selects tutores and gets length 1.
  - `recepcao cannot update configuracoes`: the update affects 0 rows or raises.
  - `dona can update configuracoes`.
  - `duplicate phone in same loja is rejected; same phone in another loja is allowed`.
- [ ] **Step 2:** Run `npm run db:local reset && npm run test:db`. Expected: FAIL.
- [ ] **Step 3:** Write `0001_base.sql`.
- [ ] **Step 4:** Run `npm run db:local reset && npm run test:db`. Expected: PASS.
- [ ] **Step 5:** Commit `feat(db): base schema with per-store RLS`.

### Task 5: Sessions, auth and login

**Files:**
- Create: `src/db/client.ts`, `src/db/session.ts`, `src/auth/provider.ts`, `src/auth/dev.ts`, `src/auth/supabase.ts`, `src/auth/current.ts`, `src/middleware.ts`, `src/app/entrar/page.tsx`, `scripts/seed.ts`
- Test: `tests/db/session.test.ts`, `tests/e2e/login.spec.ts`

**Interfaces:**
- `client.ts`: `db` (postgres.js pool from `DATABASE_URL`).
- `session.ts`: `withSession<T>(user: SessionUser, fn: (tx: Sql) => Promise<T>): Promise<T>`. It uses the same mechanism as Task 2's `asUser`.
- `provider.ts`: `type SessionUser = { id: string; lojaId: string; papel: Papel; nome: string }` and `interface AuthProvider { currentUser(): Promise<SessionUser | null>; signIn(email: string, password: string): Promise<{ ok: boolean; error?: string }>; signOut(): Promise<void> }`.
- `dev.ts` (`AUTH_MODE=dev`):
  - stores a signed cookie with a seed user id;
  - accepts `dona@exemplo.dev` and `recepcao@exemplo.dev` with password `dev`;
  - throws at startup if `NODE_ENV === 'production'`.
- `supabase.ts`: `@supabase/ssr` email/password; maps `auth.users.id` to `perfis`.
- `current.ts`:
  - `getUser(): Promise<SessionUser>`, which redirects to `/entrar` when absent;
  - `requireDona(): Promise<SessionUser>`.
- `seed.ts`: one store, "Renata" (recepção) and "Dona" (dona), the prototype's professionals (Júlia banho, Marcos tosa), services with prices and durations per size, and the 6 prototype pets with tutors.
- `/entrar`:
  - an Apple-style centred card with the app icon, "Banho e Tosa" and e-mail/password fields with visible labels;
  - the error "E-mail ou senha incorretos." appears under the form.

- [ ] **Step 1:** Write the tests.
  - `withSession enforces RLS`: same scenario as the Task 4 isolation test, but through `withSession`.
  - e2e `login`: wrong password shows "E-mail ou senha incorretos."; correct login lands on `/hoje`; `/hoje` without a cookie redirects to `/entrar`.
- [ ] **Step 2:** Run `npm run test:db -- session` and `npm run e2e -- login`. Expected: FAIL.
- [ ] **Step 3:** Implement the files above. Middleware protects everything except `/entrar` and `/api/whatsapp/webhook`.
- [ ] **Step 4:** Run `npm run seed && npm run test:db && npm run e2e -- login`. Expected: PASS.
- [ ] **Step 5:** Commit `feat(auth): sessions with RLS, dev and Supabase auth, login screen`.

### Task 6: Design system and app shell

**Files:**
- Create: everything in `src/ui/` and `src/app/(app)/layout.tsx`
- Test: `src/ui/Sheet.test.tsx`, `src/ui/Toast.test.tsx`, `src/ui/Switch.test.tsx`, `tests/e2e/shell.spec.ts`

**Interfaces** (all client components; visuals copied from the prototype CSS):
- `tokens.css`: the prototype `:root` light tokens only.
- `Button`: props `{variant?: 'primary'|'gray'|'tinted'|'orange'; size?: 'sm'|'md'|'lg'; busy?: boolean; busyLabel?: string}`. When `busy`, it shows a spinner plus `busyLabel` and `aria-busy`.
- `Segmented`: `{options: {value: string; label: string}[]; value: string; onChange(v): void; label: string}`.
- `Switch`: `{checked; onChange; label: string}`. It renders a native `input[type=checkbox][role=switch]`.
- `Sheet`: `{open; onClose; title: string; children}`. It uses a Radix Dialog: centred, spring animation, focus trap, Esc closes, focus returns to the opener.
- Toast:
  - `ToastProvider` + `useToast(): (msg: string, opts?: {undo?: () => void}) => void`;
  - shows at the top centre, with "Desfazer" when `undo` is given;
  - auto-dismisses after 5 s with undo, 3.2 s without.
- Small components:
  - `Mono`: `{initials; gradient: 1|2|3|4|5|6; size?: 'sm'|'md'|'xl'}`;
  - `Ring`: `{percent: number; label: string; tone?: 'tint'|'orange'}` with `role="img"` and `aria-label`;
  - `GroupList` / `GroupRow`, `Chip` (`tone`), `Widget`, `EmptyState` (`icon`, `text`, `action?`);
  - `Field`: label, input, help and error, wired with `aria-describedby` and `aria-invalid`;
  - `icons.tsx`: the prototype's SVG symbols as components.
- `Sidebar`:
  - items with coloured tiles: Hoje (orange), Agenda (red), Mensagens (green, unread count), Pets e tutores (blue), Pacotes e pontos (pink), Caixa (teal);
  - Configurações appears only for `dona`.
- `Toolbar`: current title, global search (submits to `/pets?q=`), WhatsApp status dot, "+" opening Novo agendamento.

- [ ] **Step 1:** Write the tests.
  - Sheet: Esc calls `onClose`; Tab cycles inside; focus returns to the trigger.
  - Toast: undo button calls `undo`; the toast disappears after 5000 ms (fake timers).
  - Switch: has `role="switch"` and toggles `aria-checked`.
  - e2e shell:
    - logged in as recepção, the sidebar shows the 6 items and no "Configurações";
    - as dona, "Configurações" is visible;
    - clicking each item changes the toolbar title;
    - `@axe-core/playwright` reports no serious or critical violations on `/hoje`.
- [ ] **Step 2:** Run `npx vitest run src/ui && npm run e2e -- shell`. Expected: FAIL.
- [ ] **Step 3:** Implement. Placeholder pages for each route render the large title only.
- [ ] **Step 4:** Run the same commands. Expected: PASS.
- [ ] **Step 5:** Commit `feat(ui): design system and app shell from the approved prototype`.

### Task 7: Configurações (store owner)

**Files:**
- Create: `src/db/repos/config.ts`, `src/db/repos/servicos.ts`, `src/app/(app)/configuracoes/**`
- Test: `tests/db/config.test.ts`, `tests/e2e/configuracoes.spec.ts`

**Interfaces:**
- `getConfig(tx): Promise<Config>` and `updateConfig(tx, patch: Partial<Config>)`.
- `listServicos(tx): Promise<ServicoComPrecos[]>` and `upsertServico(tx, s: ServicoInput)`. `ServicoInput` holds `{nome, incluiBanho, incluiTosa, cicloPadraoDias, precos: Record<Porte, {precoCentavos, duracaoMin}>}`.
- `listProfissionais` / `upsertProfissional`; `setHorarios(tx, horarios: {diaSemana, abre, fecha}[])`.
- `listUsuarios` / `convidarUsuario(email, papel)`. In supabase mode this calls the admin invite through a server-only service client; in dev mode it inserts a perfil.
- Screens use the iOS Settings layout (GroupList sections):
  - Loja: nome, telefone da dona, logo;
  - Horários;
  - Profissionais;
  - Serviços: price and duration table per size;
  - Lembretes e envio: hora do lembrete, janela de envio, teto diário, intervalo;
  - Caixa: fundo de troco;
  - Usuários.
  - WhatsApp and Mensagens automáticas are added in Task 24, Importar planilha in Task 9.

- [ ] **Step 1:** Write the tests.
  - db: `upsertServico` saves 5 sizes and `listServicos` returns them; recepção calling `upsertServico` throws.
  - e2e: dona changes "Banho" price for "Pequeno" to `R$ 75,00`, reloads and sees `R$ 75,00`; recepção opening `/configuracoes` gets redirected to `/hoje`.
- [ ] **Step 2:** Run. Expected: FAIL.
- [ ] **Step 3:** Implement the repos, server actions (zod-validated, `requireDona()`) and pages.
- [ ] **Step 4:** Run. Expected: PASS.
- [ ] **Step 5:** Commit `feat(config): store settings, services with per-size prices, staff and users`.

### Task 8: Pets e tutores

**Files:**
- Create: `src/db/repos/tutores.ts`, `src/db/repos/pets.ts`, `src/app/(app)/pets/page.tsx`, `src/app/(app)/pets/[id]/page.tsx`, `src/app/(app)/pets/novo/**`
- Test: `tests/db/tutores.test.ts`, `tests/e2e/pets.spec.ts`

**Interfaces:**
- `searchPets(tx, q: string): Promise<PetListItem[]>` matches pet name, tutor name or phone digits. `PetListItem` holds `{id, nome, tutorNome, iniciais, gradiente}`.
- `getPetFicha(tx, petId): Promise<PetFicha>`. The ring and history fields are filled by later tasks; start with tutor, care notes and basics.
- `upsertTutor(tx, {nome, telefone}): Promise<{id: string; criado: boolean}>`. It normalises with `normalizePhone`, returns the existing tutor on a phone conflict, and throws `TelefoneInvalido` on null.
- `createPet(tx, input: PetInput)`, `updatePet(tx, id, patch)`, `setLembretesAtivos(tx, tutorId, ativo: boolean)`.
- `gradientFor(id: string): 1..6` is a stable hash.
- Ficha layout follows the prototype:
  - hero with a large monogram and the shortcuts Mensagem, Agendar and Receber;
  - Tutor GroupList with the "Lembretes automáticos" switch;
  - editable Cuidados chips; "Atendimentos" list.
  - Pet photo upload appears only when `NEXT_PUBLIC_SUPABASE_URL` is set (Supabase Storage bucket `fotos`); otherwise the monogram is shown.
- The toolbar search `/pets?q=` pre-fills the filter. An empty result shows "Nenhum pet ou tutor com “q”." with "Cadastrar pet".

- [ ] **Step 1:** Write the tests.
  - db: `upsertTutor` with `(11) 98765-4321`, then with `11987654321`, returns the same id with `criado=false`; `searchPets('98765')` finds the pet.
  - e2e: register tutor "Ana Souza" `(11) 98765-4321` with pet "Thor" (Shih-tzu, Pequeno), filter "Thor", open the ficha and see "Shih-tzu, porte pequeno"; toggle "Lembretes automáticos" off and confirm it persists after reload.
- [ ] **Step 2:** Run. Expected: FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Run. Expected: PASS.
- [ ] **Step 5:** Commit `feat(pets): tutors and pets, search, pet profile`.

### Task 9: Primeiro acesso e importação de planilha

**Files:**
- Create: `src/domain/import/parse.ts`, `src/domain/import/map.ts`, `src/domain/import/validate.ts`, `src/db/repos/importacao.ts`, `src/app/boas-vindas/page.tsx`, `src/app/(app)/configuracoes/importar/**`, `tests/e2e/fixtures/clientes.csv`, `tests/e2e/fixtures/clientes.xlsx`
- Test: `src/domain/import/import.test.ts`, `tests/db/importacao.test.ts`, `tests/e2e/importar.spec.ts`

**Interfaces:**
- `parseSheet(file: ArrayBuffer, filename: string): Promise<{headers: string[]; rows: string[][]}>` uses exceljs for .xlsx and papaparse for .csv (`;` or `,`).
- `type CampoImport = 'tutor'|'telefone'|'pet'|'especie'|'raca'|'porte'|'ultima_visita'|'servico'|'pacote'|'pacote_saldo'|'pacote_validade'|'pontos'|'ignorar'`.
- `guessMapping(headers: string[]): Record<number, CampoImport>` matches pt-BR header words case- and accent-insensitively.
- `validateRows(rows, mapping): {ok: LinhaImport[]; erros: {linha: number; motivo: string}[]}`.
  - Parses dates `dd/mm/aaaa` and `aaaa-mm-dd`.
  - Maps sizes: `mini|pequeno|p|médio|medio|m|grande|g|gigante`.
  - Phones go through `normalizePhone`.
  - Rows of the same tutor phone are grouped.
- `commitImport(tx, linhas: LinhaImport[]): Promise<{tutores: number; pets: number; historicos: number; pacotes: number; ignorados: number}>`.
  - Upserts tutors by phone, creates pets, and creates a `concluido` historical appointment at `ultima_visita`. This needs the agenda table, so Task 9 runs after Task 10. It is listed here for the feature grouping.
  - Creates `pacotes_cliente` and points movements once Task 14 exists. Before that, those columns stay in the preview but are marked "importa após a fase 3". The importer is completed in Task 16.
- `/boas-vindas`:
  - shown to the dona on first access, when the store has no tutors and `lojas.onboarding_concluido` is false;
  - two large cards, "Importar planilha" and "Começar do zero";
  - "Começar do zero" sets the flag and goes to `/hoje`.
- Import screen steps: file upload, then column mapping (one select per column with the guess pre-selected), then a preview with counts and errors, then "Importar N clientes", then a summary.

- [ ] **Step 1:** Write the tests.
  - domain:
    - `guessMapping(['Nome do tutor','Celular','Pet','Porte','Último banho'])` maps to `tutor, telefone, pet, porte, ultima_visita`;
    - two rows with phones `(11) 98765-4321` and `11987654321` and pets Thor and Luna give one tutor with 2 pets;
    - a row with phone `123` lands in `erros` with motivo "Telefone inválido" and does not block the others.
  - db: committing twice does not duplicate tutors or pets (same phone, same pet name).
  - e2e: upload `clientes.csv` (5 rows, 1 invalid) and see "4 clientes prontos para importar, 1 linha com erro"; import; the summary shows the counts; the pets appear in `/pets`.
- [ ] **Step 2:** Run. Expected: FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Run. Expected: PASS.
- [ ] **Step 5:** Commit `feat(import): first-run choice and spreadsheet import`.

> Order note: execute Task 10 before Task 9 (Task 9 needs `agendamentos`). The numbering keeps the features grouped.

---

## Phase 2: Agenda e quadro do dia

### Task 10: Appointments schema and scheduling rules

**Files:**
- Create: `supabase/migrations/0002_agenda.sql`, `src/domain/stages.ts`, `src/domain/pricing.ts`, `src/domain/slots.ts`
- Test: `src/domain/stages.test.ts`, `src/domain/pricing.test.ts`, `src/domain/slots.test.ts`, `tests/db/agenda.test.ts`

**Interfaces:**
- Migration:
  - `create extension if not exists btree_gist`;
  - `agendamentos(id, loja_id, pet_id, servico_id, preco_centavos, etapa Etapa default 'agendado', inicio timestamptz, fim timestamptz, criado_por, cancelado_motivo)`;
  - `agendamento_blocos(id, loja_id, agendamento_id, profissional_id, periodo tstzrange, exclude using gist (profissional_id with =, periodo with &&) where (ativo))`. A "banho + tosa" appointment has two blocks, bather then groomer;
  - `etapas_historico(agendamento_id, etapa, em timestamptz, usuario_id)`.
- `stages.ts`:
  - `BOARD_STAGES = ['chegando','banho','tosa','pronto'] as const`;
  - `nextStage(etapa: Etapa, servico: {incluiBanho: boolean; incluiTosa: boolean}): Etapa | null` (banho goes to tosa only if `incluiTosa`, otherwise to pronto; tosa goes to pronto; pronto gives null);
  - `stageVerb(etapa)` gives `'Começar banho' | 'Levar para tosa' | 'Marcar como pronto'`;
  - `boardEtapa(a: {etapa: Etapa; inicio: Date}, today: string)` turns `agendado` into `chegando` when `dayKeySP(inicio) === today`.
- `pricing.ts`:
  - `priceFor(servico, porte): number`;
  - `durationFor(servico, porte): number`;
  - `blocksFor(servico, porte, inicio: Date, profs: {banho: string; tosa: string}): {profissionalId: string; inicio: Date; fim: Date}[]`. For "banho + tosa", the duration is split 60 % bath and 40 % grooming, rounded to 5 min. This is the design's call, made configurable later if needed.
- `slots.ts`:
  - `freeSlots(input: {dia: string; abre: string; fecha: string; ocupados: {inicio: Date; fim: Date}[]; duracaoMin: number; passoMin?: number}): Date[]` with a default step of 30 min;
  - `pickDistinctSlots(candidates: Date[][], n: number): (Date | null)[]` gives each requester a different slot, first come first served.

- [ ] **Step 1:** Write the tests.
  - stages:
    - `nextStage('banho', {incluiBanho: true, incluiTosa: false}) === 'pronto'`;
    - `nextStage('banho', {incluiBanho: true, incluiTosa: true}) === 'tosa'`;
    - `boardEtapa({etapa: 'agendado', inicio: atSP('2026-11-18','10:00')}, '2026-11-18') === 'chegando'`.
  - slots:
    - opening 08:00–18:00 with occupied 10:00–11:00 and a 60-min service: 10:00 and 10:30 are excluded; 09:00 and 11:00 are included;
    - `pickDistinctSlots([[a,b],[a,b],[a]], 3)` gives `[a,b,null]`.
  - db: inserting two active blocks for the same professional overlapping 10:00–11:00 and 10:30–11:30 raises an exclusion violation (code `23P01`).
- [ ] **Step 2:** Run. Expected: FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Run. Expected: PASS.
- [ ] **Step 5:** Commit `feat(agenda): appointments schema with overlap protection and scheduling rules`.

### Task 11: Agenda screen and booking

**Files:**
- Create: `src/db/repos/agenda.ts`, `src/app/(app)/agenda/**`, `src/app/(app)/_components/NovoAgendamentoSheet.tsx`
- Test: `tests/db/agenda-repo.test.ts`, `tests/e2e/agenda.spec.ts`

**Interfaces:**
- `listDia(tx, dia: string): Promise<{profissionais: {id, nome, funcao}[]; blocos: BlocoAgenda[]; livres: Record<profissionalId, Date[]>}>`.
- `criarAgendamento(tx, input: {petId, servicoId, inicio: Date, confirmarWhatsApp: boolean}): Promise<{id: string} | {erro: 'horario_ocupado'; proximo: Date | null}>`.
  - It catches `23P01` and returns the next free slot.
  - It enqueues the confirmation in Task 20; until then the flag is stored and ignored.
- `remarcar(tx, id, inicio)`, `cancelar(tx, id, motivo)`, `marcarNaoCompareceu(tx, id)`.
- Screen (prototype "Agenda"):
  - large title with the month, a Dia/Semana segmented control and a week strip;
  - day view with one lane per professional (08h–18h from `horarios_funcionamento`), 66 px per hour and a red now-line;
  - blocks styled done/now/next; free slots are dashed buttons "Livre às HH:MM" that open the sheet pre-filled;
  - Semana is a simple grid of days × professionals with appointment counts and the first free time;
  - clicking a block opens actions Remarcar, Cancelar and Não compareceu.
- `NovoAgendamentoSheet`:
  - fields Pet (required, error "Escolha o pet para agendar."), Serviço, Dia, Horário livre;
  - Switch "Confirmar pelo WhatsApp" (on by default) and button "Agendar";
  - toast "{Pet} agendado, {hora} com {profissional}".

- [ ] **Step 1:** Write the tests.
  - db: `criarAgendamento` on an occupied slot returns `{erro:'horario_ocupado', proximo}` with `proximo` set to the next free time.
  - e2e:
    - on 2026-11-20, click "Livre às 12:30", pick Thor, click "Agendar"; the block "Thor" appears at 12:30;
    - submitting without a pet shows "Escolha o pet para agendar." under the field.
- [ ] **Step 2:** Run. Expected: FAIL.
- [ ] **Step 3:** Implement. E2E tests freeze time with `page.clock.setFixedTime(new Date('2026-11-18T13:40:00Z'))` (10:40 local).
- [ ] **Step 4:** Run. Expected: PASS.
- [ ] **Step 5:** Commit `feat(agenda): day and week views, booking, reschedule and cancel`.

### Task 12: Hoje: widgets and the board

**Files:**
- Create: `src/app/(app)/hoje/**`, `src/db/repos/hoje.ts`
- Test: `tests/db/hoje.test.ts`, `tests/e2e/hoje.spec.ts`

**Interfaces:**
- `getHoje(tx, dia: string): Promise<{saudacao: string; widgets: {emAtendimento; agendados; paraReceber: {nome}[]; respostas; recebidoCentavos; pagamentos}; colunas: Record<BoardStage, CardPet[]>; noPontoDeVoltar: {iniciais, gradiente}[]}>`.
  - The widgets `respostas`, `recebido` and `noPontoDeVoltar` return 0 or empty until Tasks 13, 17 and 22.
  - `saudacao` is "Bom dia" before 12h, "Boa tarde" before 18h and "Boa noite" after, followed by the first name.
- `moverEtapa(tx, agendamentoId, para: BoardStage): Promise<{de: Etapa}>`. It records `etapas_historico`; moving to `pronto` returns a flag so the UI shows the notice.
- Board UI:
  - dnd-kit with `KeyboardSensor` plus the next-stage button (`stageVerb`);
  - a toast "{Pet} em “{coluna}”" with "Desfazer", which calls `moverEtapa` back;
  - empty columns show the prototype texts ("Ninguém chegando agora.", "Banheira livre. Arraste um pet para cá.", "Mesa de tosa livre.", "Nenhum pet esperando o tutor.");
  - the `pronto` notice: "{Pet} terminou. Avisar {Tutor}?", Switch "Mensagem no WhatsApp" (default on), button "Concluir". The message itself is enqueued in Task 20.
- Auto refresh: `router.refresh()` every 15 s while the tab is visible. This replaces Supabase Realtime in v1 (same user-visible result, works without the Realtime service).

- [ ] **Step 1:** Write the tests.
  - db: `moverEtapa` writes one `etapas_historico` row per move.
  - e2e (clock 10:40 local, seed data):
    - the widget "Em atendimento" shows 2;
    - click "Marcar como pronto" on Pipoca: the card moves to "Pronto para buscar" and the toast shows "Desfazer";
    - click "Desfazer": Pipoca is back in "Na tosa";
    - keyboard: focus Bob's drag handle, press Space, ArrowRight, Space, and Bob is in "No banho".
- [ ] **Step 2:** Run. Expected: FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Run. Expected: PASS.
- [ ] **Step 5:** Commit `feat(hoje): widgets and daily board with drag, buttons and undo`.

### Task 13: Return cycle on the pet profile

**Files:**
- Create: `src/domain/cycle.ts`
- Modify: `src/db/repos/pets.ts` (`getPetFicha`), `src/db/repos/hoje.ts` (`noPontoDeVoltar`), `src/app/(app)/pets/[id]/page.tsx`
- Test: `src/domain/cycle.test.ts`, `tests/db/cycle.test.ts`

**Interfaces:**
- `suggestCycle(visitas: Date[], padrao: number): number` returns the median of the intervals in days when there are 3 or more completed visits; otherwise it returns `padrao`.
- `cycleStatus(input: {ultimaVisita: Date | null; cicloDias: number; temAgendamentoFuturo: boolean; hoje: string}): {diasDesde: number | null; voltaEm: number | null; noPonto: boolean}`.
  - `noPonto` is true when `diasDesde >= cicloDias` and there is no future appointment.
- Ficha ring 1 shows `{diasDesde}d`, with the text "Hora de voltar", "Volta amanhã" or "Volta em N dias" and "Ciclo de N dias".
  - The ring tone is orange when `voltaEm <= 1`.
  - The cycle is editable through "Fixar ciclo", which sets `ciclo_fixo`.

- [ ] **Step 1:** Write the tests.
  - `suggestCycle([d0, d0+14, d0+28, d0+45], 15)` returns 14 (median of 14, 14, 17).
  - `suggestCycle([d0, d0+10], 15)` returns 15.
  - `cycleStatus` with the last visit 15 days ago, cycle 15 and no future appointment gives `noPonto: true`; with a future appointment, `noPonto: false`.
  - Cancelled and no-show appointments are ignored by the db query.
- [ ] **Step 2:** Run. Expected: FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Run. Expected: PASS.
- [ ] **Step 5:** Commit `feat(pets): return cycle suggestion and status`.

---

## Phase 3: Receber, pacotes, pontos e caixa

### Task 14: Money schema, points and package rules

**Files:**
- Create: `supabase/migrations/0003_caixa.sql`, `src/domain/points.ts`, `src/domain/packages.ts`
- Test: `src/domain/points.test.ts`, `src/domain/packages.test.ts`, `tests/db/caixa-schema.test.ts`

**Interfaces:**
- Migration:
  - `pagamentos(id, loja_id, tutor_id, forma FormaPagamento, total_centavos, pontos_ganhos, pontos_usados, dia_caixa date, recebido_em, usuario_id, idempotency_key uuid unique, estornado_em, estorno_motivo)`;
  - `pagamento_itens(pagamento_id, agendamento_id null, descricao, valor_centavos, ajuste_motivo)`;
  - `pacotes_modelo(id, loja_id, nome, preco_centavos, banhos int, servico_id, porte null, validade_dias, ativo)`;
  - `pacotes_cliente(id, loja_id, tutor_id, modelo_id, saldo int, valido_ate date, vendido_em)`;
  - `movimentos_pacote(pacote_cliente_id, delta int, agendamento_id, em)`;
  - `premios(id, loja_id, nome, pontos int, servico_id null)`;
  - `movimentos_pontos(id, loja_id, tutor_id, delta int, motivo, pagamento_id, em)`;
  - view `saldo_pontos(tutor_id, saldo)`;
  - `caixa_dias(loja_id, dia date, fechado_em, fechado_por, contado_centavos, esperado_centavos, diferenca_centavos, reaberto_em, pk(loja_id, dia))`.
- `points.ts`:
  - `pointsEarned(paidCentavos: number): number` is `floor(cents/100)`;
  - `availablePrizes(saldo: number, premios: Premio[]): Premio[]`.
- `packages.ts`:
  - `usablePackage(pacotes: PacoteCliente[], ctx: {servicoId; porte; hoje: string}): PacoteCliente | null` picks the earliest-expiring package that is valid, has `saldo > 0`, and matches the service and size when set;
  - `isExpired(p, hoje)`.

- [ ] **Step 1:** Write the tests.
  - `pointsEarned(7050) === 70`.
  - A package expired yesterday is not usable.
  - A package for size `grande` is not usable for `pequeno`.
  - With two packages, the one with the earliest `valido_ate` is picked.
  - db: inserting two `pagamentos` with the same `idempotency_key` fails with `23505`.
- [ ] **Step 2:** Run. Expected: FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Run. Expected: PASS.
- [ ] **Step 5:** Commit `feat(caixa): payments, packages and points schema and rules`.

### Task 15: Receber (receive payment)

**Files:**
- Create: `src/db/repos/pagamentos.ts`, `src/app/(app)/_components/ReceberSheet.tsx`
- Test: `tests/db/receber.test.ts`, `tests/e2e/receber.spec.ts`

**Interfaces:**
- `previewRecebimento(tx, agendamentoIds: string[]): Promise<{tutor; itens: {agendamentoId; descricao; valorCentavos}[]; pacoteUsavel: PacoteCliente | null; saldoPontos: number; premiosDisponiveis: Premio[]; outrosProntosDoTutor: {agendamentoId; petNome}[]}>`.
- `receber(tx, input: {idempotencyKey: string; agendamentoIds: string[]; usarPacote: boolean; premioId?: string; forma: Exclude<FormaPagamento,'pacote'> | null; ajustes?: {agendamentoId; valorCentavos; motivo}[]}): Promise<{pagamentoId: string; totalCentavos: number; pontosGanhos: number}>`. In one transaction it:
  - uses the package (`saldo - 1` and a `movimentos_pacote` row) for one bath item;
  - redeems the prize (a negative points movement);
  - sets the appointments to `concluido` with history;
  - sets `dia_caixa` with `businessDayFor` (Task 17; until then `dayKeySP(now)`).
  - A repeated `idempotencyKey` returns the existing payment.
  - An adjustment without a motivo raises `AjusteSemMotivo`.
- Sheet (prototype "Receber de {Tutor}"):
  - the total in large type and "{Pet} ganha N pontos" or "Banho do pacote, sem cobrança";
  - Switches "Usar banho do pacote" (restam X de Y) and "Trocar N pontos";
  - an "Incluir {outro pet}" checkbox row for other ready pets of the same tutor;
  - the four payment tiles Pix, Crédito, Débito, Dinheiro (hidden when the total is 0);
  - "Ajustar preço" opens a money field plus a required motivo;
  - button "Receber R$ X" or "Confirmar uso do pacote" with a busy state.
  - The idempotency key is generated when the sheet opens.

- [ ] **Step 1:** Write the tests.
  - db:
    - Luna R$ 70 by pix gives total 7000, pontosGanhos 70 and the appointment `concluido`;
    - Thor using the package: total 0, package saldo goes from 1 to 0, 0 points;
    - calling `receber` twice with the same key gives one payment row (Review Focus 3);
    - two appointments of the same tutor (Mel and another pet) give one payment with 2 itens.
  - e2e:
    - open Receber on Luna, choose Dinheiro and confirm: the card shows "Pago" and the widget "Recebido hoje" increases by R$ 70;
    - double-click "Receber R$ 70,00" quickly: the Caixa shows one Luna payment.
- [ ] **Step 2:** Run. Expected: FAIL.
- [ ] **Step 3:** Implement. Wire "Receber" on board cards and on the pet profile shortcut.
- [ ] **Step 4:** Run. Expected: PASS.
- [ ] **Step 5:** Commit `feat(caixa): receive payments with packages, points and multi-pet`.

### Task 16: Pacotes e pontos screen, package sales, and finishing the import

**Files:**
- Create: `src/db/repos/pacotes.ts`, `src/db/repos/pontos.ts`, `src/app/(app)/pacotes/**`
- Modify: `src/db/repos/importacao.ts` (packages and points), `ReceberSheet.tsx` ("Vender pacote")
- Test: `tests/db/pacotes.test.ts`, `tests/e2e/pacotes.spec.ts`

**Interfaces:**
- `listModelos` / `upsertModelo` (dona only).
- `venderPacote(tx, {idempotencyKey, tutorId, modeloId, forma}): Promise<{pacoteClienteId; pagamentoId}>`. It creates the payment (counts on the sale day) and earns points on the price.
- `listAcabando(tx): Promise<{pacoteClienteId; petNome; tutorNome; validoAte; avisado: boolean}[]>` returns the packages with `saldo = 1`.
- `estenderValidade(tx, pacoteClienteId, novaData)`.
- `listPremios` / `upsertPremio` (dona).
- Screen (prototype):
  - Wallet-style cards per model (teal, blue and graphite gradients cycling) with the active count;
  - GroupList "Acabando, com 1 banho restante" with "Avisar no WhatsApp", which is wired in Task 20 (until then disabled with the help text "Disponível quando o WhatsApp estiver conectado");
  - GroupList "Pontos: cada R$ 1 pago vira 1 ponto" listing the prizes.
- Import: `pacote`, `pacote_saldo`, `pacote_validade` and `pontos` columns now commit (`pacotes_cliente` rows, and a points movement with motivo "Importação").

- [ ] **Step 1:** Write the tests.
  - db:
    - selling "4 banhos no mês" (R$ 260) by pix gives saldo 4, a R$ 260 payment and 260 points;
    - after 3 uses, `listAcabando` contains it;
    - importing a row with pacote "4 banhos no mês", saldo 2 and pontos 120 gives a package with saldo 2 and points balance 120.
  - e2e: dona creates the model "2 banhos e 1 tosa" for R$ 290 and sees the card.
- [ ] **Step 2:** Run. Expected: FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Run. Expected: PASS.
- [ ] **Step 5:** Commit `feat(pacotes): package models and sales, prizes, import of balances`.

### Task 17: Caixa

**Files:**
- Create: `src/domain/cash.ts`, `src/db/repos/caixa.ts`, `src/app/(app)/caixa/**`
- Test: `src/domain/cash.test.ts`, `tests/db/caixa.test.ts`, `tests/e2e/caixa.spec.ts`

**Interfaces:**
- `businessDayFor(now: Date, fechados: Set<string>): string` returns `dayKeySP(now)`, or the next day key when that day is closed and not reopened.
- `summarizeDay(pagamentos: {forma; totalCentavos; estornado: boolean}[]): {totalCentavos; porForma: Record<'pix'|'credito'|'debito'|'dinheiro', number>}`. Refunded payments are excluded.
- `drawerDiff(esperadoDinheiro: number, fundoTroco: number, contado: number): {diferenca: number; estado: 'confere'|'sobra'|'falta'}`.
- `getCaixaDia(tx, dia)`, `fecharCaixa(tx, {dia, contadoCentavos})`, `reabrirCaixa(tx, dia)` (dona) and `estornar(tx, pagamentoId, motivo)`.
  - `fecharCaixa` enqueues the summary to the dona in Task 20.
- Screen (prototype "Caixa"):
  - "Recebido hoje" in large type, a stacked bar with legend Pix #30A6C7, Crédito #007AFF, Débito #FF9500, Dinheiro #34C759;
  - a GroupList of payments (time, pet, service, form, value; refunded ones struck through with a "Estornado" chip);
  - "Conferir a gaveta": esperado em dinheiro, an input "Contado na gaveta" (`parseBRL`) and "Diferença" live ("Confere" / "Sobram R$ X" / "Faltam R$ X");
  - "Fechar caixa" and the help text "O resumo vai para o WhatsApp da dona da loja.";
  - after closing: the chip "Fechado às HH:MM" and a read-only view; dona sees "Reabrir caixa".
  - An invalid amount shows "Digite um valor como 80,00" under the field.

- [ ] **Step 1:** Write the tests.
  - `businessDayFor(new Date('2026-11-19T02:50:00Z'), new Set())` gives `'2026-11-18'`.
  - `businessDayFor(new Date('2026-11-18T22:00:00Z'), new Set(['2026-11-18']))` gives `'2026-11-19'`.
  - `drawerDiff(7000, 0, 7000)` gives `confere`; `drawerDiff(7000, 0, 6500)` gives `{diferenca: -500, estado: 'falta'}`.
  - db: after `fecharCaixa`, a new `receber` lands on the next day; `estornar` excludes the payment from the summary.
  - e2e: type `65` in the drawer field and see "Faltam R$ 5,00"; type `abc` and see the error; close the cash desk and see "Fechado às".
- [ ] **Step 2:** Run. Expected: FAIL.
- [ ] **Step 3:** Implement. Replace the temporary `dayKeySP(now)` in `receber` with `businessDayFor`.
- [ ] **Step 4:** Run. Expected: PASS.
- [ ] **Step 5:** Commit `feat(caixa): daily summary, drawer check, close, reopen and refunds`.

---

## Phase 4: WhatsApp

### Task 18: Messaging schema and rules

**Files:**
- Create: `supabase/migrations/0004_whatsapp.sql`, `src/domain/templates.ts`, `src/domain/optout.ts`, `src/domain/reminders.ts`
- Test: `src/domain/templates.test.ts`, `src/domain/optout.test.ts`, `src/domain/reminders.test.ts`

**Interfaces:**
- Migration:
  - `conversas(id, loja_id, telefone_e164, tutor_id null, nao_lidas int, ultima_em, unique(loja_id, telefone_e164))`;
  - `mensagens(id, loja_id, conversa_id, direcao 'in'|'out', origem 'sistema'|'celular'|'tutor', tipo text null, automatica bool, texto, provider_id text unique null, status 'fila'|'enviada'|'falhou'|'recebida', em)`;
  - `fila_envio(id, loja_id, telefone_e164, texto, tipo, prioridade 'imediata'|'lote', agendar_para timestamptz, tentativas int, status 'pendente'|'enviando'|'enviada'|'falhou'|'cancelada', mensagem_id, dedupe_key text unique null)`;
  - `modelos_mensagem(loja_id, tipo, texto, pk(loja_id, tipo))`;
  - `propostas_horario(id, loja_id, tutor_id, pet_id, servico_id, inicio timestamptz, status 'enviada'|'respondida'|'confirmada'|'descartada', criada_em)`;
  - `lembretes_enviados(tutor_id, enviado_em, respondido bool)`;
  - seed default templates per store.
- `type TipoMensagem = 'lembrete_retorno'|'confirmacao'|'vespera'|'pronto'|'pacote_acabando'|'resumo_caixa'`.
- Default texts (editable later):
  - `lembrete_retorno`: "Oi {tutor}! O {pet} já está no ponto do banho. Temos {dia} às {hora}, pode ser?"
  - `confirmacao`: "Agendado! {pet} na {dia}, às {hora}. Até lá!"
  - `vespera`: "Oi {tutor}! Confirmando o banho do {pet} amanhã às {hora}. Responda SIM para confirmar."
  - `pronto`: "Oi {tutor}! O {pet} está pronto e cheiroso. Pode vir buscar quando quiser."
  - `pacote_acabando`: "Oi {tutor}! O pacote do {pet} tem só 1 banho restante. Quer renovar?"
  - `resumo_caixa`: "Caixa de {dia}: {total}. Pix {pix}, crédito {credito}, débito {debito}, dinheiro {dinheiro}. Gaveta: {gaveta}."
- `renderTemplate(texto: string, vars: Record<string,string>): string` leaves unknown variables visible as `{x}`.
- `TEMPLATE_VARS: Record<TipoMensagem, string[]>`.
- `isOptOut(texto: string): boolean`: the trimmed, lower-cased, accent-free text equals `parar|pare|sair|cancelar|stop`.
- `canSendReminder(hist: {enviadoEm: Date; respondido: boolean}[], now: Date): boolean` returns false when the last one was under 7 days ago, or when the last 2 are both unanswered.
- `selectReminderCandidates(pets: {petId; tutorId; lembretesAtivos; status: CycleStatus}[], hist: Map<tutorId, Hist[]>, now): {petId; tutorId}[]` picks one pet per tutor (the most overdue).

- [ ] **Step 1:** Write the tests.
  - `renderTemplate('Oi {tutor}! {x}', {tutor:'Ana'}) === 'Oi Ana! {x}'`.
  - `isOptOut(' Parar ')`, `isOptOut('SAIR')` and `isOptOut('pare')` are true; `isOptOut('pode parar aqui às 10?')` is false.
  - `canSendReminder` is false with the last reminder 3 days ago, false with the last two unanswered 20 and 10 days ago, and true with 10 days ago answered.
  - A tutor with 2 overdue pets yields 1 candidate; a tutor with `lembretesAtivos=false` yields none.
- [ ] **Step 2:** Run. Expected: FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Run. Expected: PASS.
- [ ] **Step 5:** Commit `feat(whatsapp): messaging schema, templates, opt-out and reminder limits`.

### Task 19: WhatsApp provider interface, fake and Evolution API

**Files:**
- Create: `src/whatsapp/provider.ts`, `src/whatsapp/fake.ts`, `src/whatsapp/evolution.ts`, `tests/fixtures/evolution/*.json`
- Test: `src/whatsapp/evolution.test.ts`, `src/whatsapp/fake.test.ts`

**Interfaces:**
- `interface WhatsAppProvider { sendText(toE164: string, text: string): Promise<{providerId: string}>; connection(): Promise<{state: 'open'|'connecting'|'close'; qrCodeDataUrl?: string}>; parseWebhook(body: unknown): InboundEvent[] }`.
- `type InboundEvent = {kind: 'message'; providerId: string; fromE164: string; fromMe: boolean; text: string; at: Date; isGroup: boolean} | {kind: 'connection'; state: string}`.
- `getProvider(): WhatsAppProvider` reads `WHATSAPP_PROVIDER`.
- `FakeProvider`:
  - keeps `sent: {to; text}[]` in memory and in table `fake_whatsapp_log`, so e2e tests can read it;
  - `simulateInbound(fromE164, text)` is exposed through the dev-only route `/api/dev/whatsapp/inbound`, which returns 404 in production.
- `EvolutionProvider`:
  - `POST {EVOLUTION_URL}/message/sendText/{instance}` with header `apikey` and body `{number, text}`;
  - `GET /instance/connectionState/{instance}` and `GET /instance/connect/{instance}` for the QR;
  - `parseWebhook` handles the `messages.upsert` and `connection.update` events and normalises `remoteJid` with `normalizePhone`.

- [ ] **Step 1:** Write the tests (fixtures saved from Evolution API v2 docs examples).
  - A `messages.upsert` with `key.fromMe=false` and `remoteJid "5511987654321@s.whatsapp.net"` gives `fromE164 '+5511987654321'`, `fromMe false`.
  - `fromMe=true` gives `fromMe true`.
  - A group JID `…@g.us` gives `isGroup true`.
  - `sendText` calls `fetch` with the expected URL, header and body (`fetch` mocked).
- [ ] **Step 2:** Run. Expected: FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Run. Expected: PASS.
- [ ] **Step 5:** Commit `feat(whatsapp): provider interface with fake and Evolution API implementations`.

### Task 20: Enqueue messages from the app's actions

**Files:**
- Create: `src/whatsapp/enqueue.ts`
- Modify:
  - `src/db/repos/agenda.ts` (`criarAgendamento` with `confirmarWhatsApp`);
  - `src/db/repos/hoje.ts` (the "Concluir" handler);
  - `src/db/repos/pacotes.ts` ("Avisar no WhatsApp");
  - `src/db/repos/caixa.ts` (`fecharCaixa`).
- Test: `tests/db/enqueue.test.ts`

**Interfaces:**
- `enqueueMessage(tx, input: {tutorId?: string; telefoneE164?: string; tipo: TipoMensagem | 'manual'; vars?: Record<string,string>; texto?: string; prioridade: 'imediata'|'lote'; agendarPara?: Date; dedupeKey?: string}): Promise<{filaId: string} | {ignorado: 'optout'|'sem_telefone'|'duplicado'}>`.
  - It renders the store template, or uses `texto` for `manual`.
  - It skips `lembrete_retorno`, `vespera` and `pacote_acabando` when `lembretes_ativos=false`.
  - `confirmacao`, `pronto` and `resumo_caixa` are sent only because the user turned the switch on, so they ignore the opt-out flag.
  - It inserts a `mensagens` row with status `fila` in the tutor's conversation, so the message appears in the inbox immediately.
- Wiring:
  - booking with the switch on enqueues `confirmacao` (`imediata`);
  - "Concluir" with the switch on enqueues `pronto` (`imediata`) and sets the card note to "Tutor avisado às HH:MM", otherwise "Tutor não avisado";
  - "Avisar no WhatsApp" enqueues `pacote_acabando` (`imediata`, dedupe `pacote:{id}`);
  - closing the cash desk enqueues `resumo_caixa` to `lojas.telefone_dona`.

- [ ] **Step 1:** Write the tests.
  - Booking with the switch on gives 1 `fila_envio` row of type `confirmacao` whose text contains "Thor".
  - `pacote_acabando` for a tutor with reminders off gives `{ignorado:'optout'}`.
  - Calling twice with the same dedupeKey gives `duplicado`.
  - No module outside `src/worker` imports `getProvider().sendText`. Enforce with a grep-based test over `src/app` and `src/db`.
- [ ] **Step 2:** Run. Expected: FAIL.
- [ ] **Step 3:** Implement. Enable the "Avisar no WhatsApp" button.
- [ ] **Step 4:** Run. Expected: PASS.
- [ ] **Step 5:** Commit `feat(whatsapp): enqueue transactional messages from app actions`.

### Task 21: Worker: send queue and daily jobs

**Files:**
- Create: `src/worker/clock.ts`, `src/worker/send-queue.ts`, `src/worker/daily.ts`, `src/worker/index.ts`
- Test: `tests/db/worker.test.ts`

**Interfaces:**
- `interface Clock { now(): Date; sleep(ms: number): Promise<void> }` plus `realClock` and `fakeClock(start)`.
- `drainOnce(deps: {sql; provider; clock; random: () => number; lojaId}): Promise<{enviadas: number; adiadas: number}>`.
  - Within one store: `imediata` items go first with 2–5 s spacing, then `lote` items with `intervalo_min_s`–`intervalo_max_s` spacing.
  - Only inside `envio_inicio`–`envio_fim` local. Outside the window, items wait for the next window start.
  - Stops at `teto_diario` sent automatic messages per local day; the rest wait.
  - Re-checks opt-out at send time for reminder types.
  - On failure: `tentativas+1` and retry after 1, 5 and 15 min, then `falhou`.
  - Updates `mensagens.status` and `provider_id`.
- `runDaily(deps, dia: string): Promise<{lembretes: number; vesperas: number}>`, at `hora_lembrete` local and at most once per store per day (table `execucoes_diarias(loja_id, dia, tipo)` unique):
  - **return reminders:** builds candidates (`selectReminderCandidates`), computes free slots over the next 2 business days with `freeSlots`, and assigns distinct slots (`pickDistinctSlots`). Each candidate gets a `propostas_horario` row and an enqueued `lembrete_retorno` (`lote`). Candidates with no slot are skipped and logged;
  - **eve-of-visit:** `vespera` for tomorrow's appointments of tutors with reminders on.
- `index.ts`: loops every 30 s, calling `runDaily` when due and then `drainOnce`. Runs with the service connection (`SUPABASE_SERVICE_DATABASE_URL`).

- [ ] **Step 1:** Write the tests (fake clock, fake provider, `random` returning 0).
  - 3 `lote` items at 10:00 local are sent with 20 s gaps.
  - Items at 19:30 local stay `pendente` (outside the window).
  - With `teto_diario=2`, the 3rd item stays `pendente` until the next day.
  - The provider failing once means the item is retried and sent.
  - `runDaily` twice the same day enqueues reminders once.
  - Two overdue tutors get different suggested times.
  - A tutor whose last reminder was 3 days ago is not contacted.
- [ ] **Step 2:** Run. Expected: FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Run. Expected: PASS.
- [ ] **Step 5:** Commit `feat(worker): paced send queue with daily cap and daily reminder jobs`.

### Task 22: Webhook for inbound messages

**Files:**
- Create: `src/whatsapp/webhook.ts`, `src/app/api/whatsapp/webhook/route.ts`
- Test: `tests/db/webhook.test.ts`

**Interfaces:**
- `handleInbound(sql, lojaId, events: InboundEvent[]): Promise<void>`:
  - ignores groups;
  - is idempotent on `provider_id`;
  - upserts `conversas` by phone and links `tutor_id` when a tutor has that phone;
  - for `fromMe` events (sent from the shop's phone): stores a message with `direcao='out'` and `origem='celular'`, and does not increment unread;
  - for tutor events: stores the message with `origem='tutor'`, increments `nao_lidas`, marks the latest `lembretes_enviados.respondido=true` and the latest open `propostas_horario` (status `enviada`) as `respondida`;
  - when `isOptOut(text)`, sets `tutores.lembretes_ativos=false` and enqueues no reply.
- `POST /api/whatsapp/webhook?secret=…` checks `WEBHOOK_SECRET` (401 otherwise), maps the instance to a store (single store in v1: first `lojas` row; the instance name is stored in `configuracoes.whatsapp_instancia`) and calls `handleInbound` with the service connection.

- [ ] **Step 1:** Write the tests.
  - Inbound "Pode sim!" from `5511987654321@s.whatsapp.net` attaches to Ana's conversation, sets `nao_lidas=1` and marks the proposal `respondida`.
  - The same `providerId` twice stores one message.
  - `fromMe` from the phone adds an out message with `origem 'celular'` and leaves `nao_lidas` unchanged.
  - "PARAR" sets `lembretes_ativos=false`.
  - A message from an unknown number creates a conversation with `tutor_id null`.
  - A wrong secret returns 401.
- [ ] **Step 2:** Run. Expected: FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Run. Expected: PASS.
- [ ] **Step 5:** Commit `feat(whatsapp): inbound webhook with tutor matching and opt-out`.

### Task 23: Mensagens screen

**Files:**
- Create: `src/db/repos/mensagens.ts`, `src/app/(app)/mensagens/**`
- Modify: `src/db/repos/hoje.ts` (widget `respostas`, `noPontoDeVoltar`), `src/ui/Sidebar.tsx` (unread count)
- Test: `tests/db/mensagens.test.ts`, `tests/e2e/mensagens.spec.ts`

**Interfaces:**
- `listConversas(tx, filtro: 'tutores'|'outros')` and `getConversa(tx, id)`, which marks it read.
- `responder(tx, conversaId, texto)` enqueues `manual` / `imediata`.
- `confirmarProposta(tx, propostaId): Promise<{agendamentoId} | {erro:'horario_ocupado'; proximo: Date | null}>` checks the status (only `respondida` or `enviada`; a second call returns the existing appointment, per Review Focus 3), creates the appointment through `criarAgendamento` with `confirmarWhatsApp: true`, and sets the status to `confirmada`.
- `listLembretesAmanha(tx)`, `removerDaFila(tx, tutorId, dia)` and the text editing link go to Configurações › Mensagens automáticas.
- Screen (prototype "Mensagens"):
  - GroupList of conversations with a "Tutores / Outros" segmented control, unread dots and the "Cadastrar tutor" action for unknown numbers;
  - thread with iMessage bubbles and labels "HH:MM, automática" / "HH:MM, pelo celular";
  - proposal card with the mini-calendar, "Confirmar" and "Outro horário" (opens NovoAgendamentoSheet pre-filled);
  - if the slot was taken: "Esse horário foi ocupado. Próximo livre: {dia} às {hora}." with "Confirmar {hora}";
  - compose field and send button;
  - header button "Lembretes de amanhã (N)" opens a Sheet listing tutors with a "Tirar da lista" action.

- [ ] **Step 1:** Write the tests.
  - db: `confirmarProposta` twice gives one appointment; after occupying the slot, it returns `horario_ocupado` with `proximo`.
  - e2e (fake provider):
    - simulate inbound "Pode sim!" from Ana: the sidebar badge shows 1;
    - open the conversation and click "Confirmar": the card shows "Thor agendado para quinta às 10:00" and the fake log contains a `confirmacao` text;
    - simulate a message from an unknown number: it appears only under "Outros".
- [ ] **Step 2:** Run. Expected: FAIL.
- [ ] **Step 3:** Implement. Fill the Hoje widgets "Respostas no WhatsApp" and the "N pets no ponto de voltar" strip.
- [ ] **Step 4:** Run. Expected: PASS.
- [ ] **Step 5:** Commit `feat(mensagens): inbox, proposals confirmation and reminders preview`.

### Task 24: WhatsApp settings and message templates

**Files:**
- Create: `src/app/(app)/configuracoes/whatsapp/**`, `src/app/(app)/configuracoes/mensagens/**`
- Test: `tests/e2e/config-whatsapp.spec.ts`

**Interfaces:**
- WhatsApp page:
  - connection state from `getProvider().connection()`;
  - when `close`/`connecting`, the QR code image with the instructions "No celular da loja: WhatsApp › Aparelhos conectados › Conectar um aparelho";
  - polls every 5 s until `open`;
  - the toolbar dot is green for `open` and orange otherwise, with the label "WhatsApp" or "WhatsApp desconectado".
- Mensagens automáticas page:
  - one GroupList row per `TipoMensagem`;
  - opens a Sheet with a textarea, variable chips from `TEMPLATE_VARS` (click to insert) and a live preview with example values;
  - saving rejects unknown variables with "Variável desconhecida: {x}".

- [ ] **Step 1:** Write the tests (e2e).
  - Edit `pronto` to "Oi {tutor}, {pet} pronto!" and save; reload and see it.
  - Type `{foo}` and see the error.
  - With the fake provider set to `close`, the QR area is visible.
- [ ] **Step 2:** Run. Expected: FAIL.
- [ ] **Step 3:** Implement. `FakeProvider.connection()` reads a dev toggle stored in `fake_whatsapp_log` settings.
- [ ] **Step 4:** Run. Expected: PASS.
- [ ] **Step 5:** Commit `feat(config): WhatsApp connection and editable message templates`.

---

## Phase 5: Delivery

### Task 25: Deployment kit

**Files:**
- Create: `deploy/docker-compose.vps.yml`, `deploy/worker.Dockerfile`, `deploy/README.md`, `deploy/.env.vps.example`

**Interfaces:**
- `docker-compose.vps.yml` services:
  - `evolution` (image `atendai/evolution-api`, pinned to a v2 tag, volume for instances, `AUTHENTICATION_API_KEY`, webhook URL pointing to `https://<app>/api/whatsapp/webhook?secret=…` with events `MESSAGES_UPSERT`, `CONNECTION_UPDATE`);
  - `worker` (built from `worker.Dockerfile`: node 22-alpine, `npm ci --omit=dev`, `npx tsx src/worker/index.ts`).
- `deploy/README.md` (pt-BR), step by step:
  1. create the Supabase project and run `npx supabase db push`;
  2. create the users (dona, recepção) and their `perfis`;
  3. connect Vercel with the env vars;
  4. VPS: install Docker, copy `.env.vps`, `docker compose up -d`;
  5. open Configurações › WhatsApp and scan the QR.
  It includes the network allowlist of hosts the worker needs.

- [ ] **Step 1:** Run `docker compose -f deploy/docker-compose.vps.yml config` (needs the docker CLI only). Expected: valid output, no errors. If no Docker daemon is available, at least validate the YAML with `npx yaml-lint` or a node YAML parse.
- [ ] **Step 2:** Run `npm run build && npx tsc -p . --noEmit`. Expected: success.
- [ ] **Step 3:** Commit `chore(deploy): VPS compose for Evolution API and worker, deployment guide`.

### Task 26: Full-day acceptance run and accessibility pass

**Files:**
- Create: `tests/e2e/dia-na-loja.spec.ts`

**Interfaces:**
- Consumes everything above.

- [ ] **Step 1:** Write `dia-na-loja.spec.ts`. With the clock fixed at 2026-11-18 08:00 local, on the seed data:
  1. move Bob through Começar banho, Marcar como pronto and Concluir (with WhatsApp on);
  2. receive with "Usar banho do pacote";
  3. receive Luna by Dinheiro R$ 70;
  4. simulate Ana's "Pode sim!" and confirm the proposal;
  5. book Nina at a free slot;
  6. type the drawer amount equal to the expected cash and close the cash desk.

  Assertions:
  - Caixa total equals the sum of the payments;
  - the fake WhatsApp log has exactly the messages `pronto`, `confirmacao` x2 and `resumo_caixa`, and no reminder (8:00 is before `hora_lembrete`).
- [ ] **Step 2:** Add an axe scan to every main route (`/hoje`, `/agenda`, `/pets`, `/pets/[id]`, `/mensagens`, `/pacotes`, `/caixa`, `/configuracoes`). Expected: no serious or critical violations.
- [ ] **Step 3:** Run `npm run check && npm run e2e`. Expected: all PASS.
- [ ] **Step 4:** Take 1440×900 screenshots of each main screen at `deviceScaleFactor: 2` into `docs/screenshots/` and compare them side by side with the prototype. Fix visible deviations in spacing, colour or copy.
- [ ] **Step 5:** Commit `test: full-day acceptance run, accessibility pass and screenshots`.

---

## Execution order

1–8, **10**, 9, 11–26. Task 9 needs `agendamentos` from Task 10. Each phase ends with working software:
- after Task 13: agenda and board;
- after Task 17: cash desk;
- after Task 24: WhatsApp;
- after Task 26: ready to deploy.
