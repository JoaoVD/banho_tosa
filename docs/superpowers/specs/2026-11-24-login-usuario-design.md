# Login por usuário e senha — design (mudança pequena)

**Por quê:** a loja quer entrar com usuário e senha, sem depender de e-mail.

**Objetivo:** tela Entrar com "Usuário" + "Senha". Usuário único no sistema, sem diferenciar maiúsculas,
3–30 caracteres `[a-z0-9._-]`. Erro genérico (não diz se foi usuário ou senha).

**Fora do escopo:** recuperação por e-mail, a própria pessoa trocar a senha, remover usuários. Varredura de
velocidade e limpeza de arquivos (descartadas pelo usuário).

**Abordagens:** só uma sensata — o Supabase Auth exige e-mail, então cada conta tem um e-mail interno
invisível (`<usuario>@usuarios.banhotosa.local`, decisão minha) e o login resolve usuário → conta
(consulta de serviço em `perfis.usuario` + `auth.users.email`) e chama `signInWithPassword`.
Alternativas descartadas: e-mail derivado do usuário sem consulta (quebra contas existentes e renomeações);
outro provedor de autenticação (troca toda a base de login).

**Design:**
- Migração `0006_usuario.sql`: `perfis.usuario text`, preenchido a partir da parte do e-mail antes do @
  (com sufixo numérico se repetir), `not null`, índice único em `lower(usuario)`, check do formato.
- Login (Supabase e modo dev) pelo usuário. Modo dev continua com senha "dev".
- Configurações › Usuários (dona): lista mostra o usuário; formulário "Novo usuário" (nome, usuário,
  senha inicial ≥ 8, papel) cria a conta já confirmada (`auth.admin.createUser`) — sai o convite por e-mail;
  "Redefinir senha" por usuário (`auth.admin.updateUserById`). Em modo dev, criar insere em `auth.users`
  e a senha continua "dev".
- Demo: `dona.demo` / `recepcao.demo`, senha `demo1234`; seed: `dona` / `recepcao`.
- Aplicar a migração e a demo no Supabase do usuário pela Management API.

**Testes:** e2e de login (certo, senha errada, usuário inexistente, maiúsculas), criar usuário e redefinir
senha; testes de banco da migração (único sem diferenciar maiúsculas, formato).
