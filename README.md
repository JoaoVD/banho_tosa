# Banho e Tosa

Sistema de gestão para pet shop de banho e tosa: quadro do dia, agenda, pets e tutores, pacotes, pontos, caixa e WhatsApp com lembretes de retorno.

- Design e decisões: `docs/superpowers/specs/2026-11-18-banho-e-tosa-design.md`
- Plano de desenvolvimento: `docs/superpowers/plans/2026-11-18-banho-e-tosa.md`
- Protótipo visual: `docs/prototipo/prototipo.html`
- Como colocar no ar: `deploy/README.md`

## Rodar no computador (desenvolvimento)

Requisitos: Node 22 e PostgreSQL 16 instalado (só os binários; o script cria o banco).

```bash
npm install
cp .env.example .env.local
npm run db:local up     # sobe um Postgres local que imita o Supabase
npm run seed            # dados de exemplo
npm run dev             # http://localhost:3000  (dona@exemplo.dev ou recepcao@exemplo.dev, senha: dev)
npm run worker          # opcional: fila do WhatsApp (falso) e lembretes
```

Testes: `npm run check` (tipos, lint, unitários e banco) e `npm run e2e` (telas, com Playwright).

No modo de desenvolvimento o WhatsApp é **falso**: nada é enviado de verdade. Para simular uma resposta de tutor:

```bash
curl -X POST localhost:3000/api/dev/whatsapp/inbound -H 'content-type: application/json' -d '{"from":"(11) 98765-0000","text":"Pode sim!"}'
```
