# Cadastro aberto e primeiro acesso em conversa — design

## Por quê
Hoje a primeira conta de cada pet shop (a da dona) só nasce por SQL feito pelo desenvolvedor. O usuário quer
uma tela de **cadastro** onde qualquer pet shop cria a própria conta (caminho para virar SaaS), e um
**primeiro acesso em formato de conversa** que deixa a loja pronta (horários, equipe, serviços, clientes).

## Objetivos
- `/cadastro` público: nome do pet shop, seu nome, usuário, e-mail, senha (≥ 8). Cria **loja + dona**,
  já entra e cai no primeiro acesso.
- Primeiro acesso em conversa (balões estilo iMessage): horários → equipe → serviços (com preços sugeridos) →
  clientes (importar planilha ou cadastrar aos poucos) → "Pronto! 🎉 Ir para o Hoje". Retomável: ao recarregar,
  continua da primeira etapa ainda não feita (derivado do banco). Dá para tocar numa resposta e refazer a etapa.
- Login continua por **usuário e senha**; o e-mail fica como e-mail real da conta (contato / futura recuperação).

## Fora do escopo
WhatsApp por loja; confirmação de e-mail; "esqueci a senha"; cobrança/planos; painel do administrador.

## Anti-objetivos
- Uma loja nova **nunca** pode enviar mensagens pelo WhatsApp de outra loja nem receber conversas de outra.
- A loja atual da cliente e a demo continuam exatamente como estão.

## Restrições e decisões
- **WhatsApp por loja não existe ainda** (uma instância só, global). Nova coluna `lojas.whatsapp_liberado`
  (default **false**; migração marca **true** as lojas que já existem e não são demo). Worker não gera lembretes
  nem envia nada de loja não liberada. Toolbar/aba mostram WhatsApp desconectado; Mensagens mostra aviso
  "O WhatsApp ainda não está disponível para esta loja." Liberar é manual (SQL), por enquanto.
- **Webhook**: mensagem de instância desconhecida é ignorada (remove o "cai na loja mais antiga").
- **Proteção do cadastro** (decisão minha): campo invisível anti-robô (preenchido → recusa genérica) e limite de
  **5 cadastros por hora por IP** (tabela `cadastros_tentativas`). Sem confirmação de e-mail (exigiria SMTP).
- E-mail único (o Supabase já garante); usuário único (regra de 2026-11-24); mensagens de erro por campo.
- Conta no Supabase: `auth.admin.createUser({ email, password, email_confirm: true })`; se algo falhar depois,
  apaga a conta criada (sem conta órfã). Modo dev: insere em `auth.users`, senha de login "dev".
- Catálogo sugerido de serviços = os 7 do seed atual (preço e duração por porte), movido para `src/domain/catalogo.ts`.
- Presets de horário: "Seg a Sex 8h–18h, Sáb 8h–14h" | "Seg a Sáb 8h–18h" | "Outro" (escolher dias + abre/fecha).
- Equipe: ao menos 1 pessoa (nome + banho/tosa).

## Abordagens consideradas
- **A) Cadastro aberto, cada cadastro abre um pet shop — escolhida pelo usuário.**
- B) Cadastro com código de convite (recomendado antes; usuário preferiu A).
- C) Painel do administrador (mais trabalho, continua manual).
Primeiro acesso: conversa (escolhida) em vez de formulário em etapas ou tela de cartões atual.

## Como verificamos
e2e: cadastro completo → conversa inteira → Hoje com agenda funcionando (horário livre aparece); erros de campo
(usuário/e-mail repetidos, senha curta); anti-robô; limite por IP; retomar a conversa após recarregar; loja nova
não aparece nas conversas/robô de outra; worker não envia por loja não liberada (teste de banco); webhook ignora
instância desconhecida (teste de banco). Celular: conversa usável a 390 px.
