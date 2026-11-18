# Como colocar o Banho e Tosa no ar

São três peças:

| Peça | Onde roda | O que faz |
|---|---|---|
| Sistema (telas) | **Vercel** | O que a recepção e a dona usam no navegador |
| Banco e login | **Supabase** | Dados da loja, usuários, fotos |
| WhatsApp + worker | **VPS pequena** (1 vCPU, 1–2 GB) | Conecta o número da loja e envia lembretes e avisos |

Custo aproximado: Supabase e Vercel no plano gratuito aguentam uma loja; a VPS custa de R$ 30 a 60/mês.

---

## 1. Supabase (banco e login)

1. Crie um projeto em https://supabase.com (região **São Paulo**).
2. No seu computador, na pasta do projeto:
   ```bash
   npx supabase login
   npx supabase link --project-ref SEU_PROJECT_REF
   npx supabase db push
   ```
   Isso cria todas as tabelas (pasta `supabase/migrations`). **Não** rode `supabase/local/shim.sql`: ele só serve para testes.
3. **Storage** › crie um bucket público chamado `fotos` (fotos dos pets).
4. **Authentication › Users** › *Add user* para a dona e para a recepção (e-mail e senha).
5. **SQL Editor** › crie a loja e ligue os usuários a ela (troque os e-mails e o telefone):
   ```sql
   insert into lojas (nome, telefone_dona) values ('Nome da Loja', '+5511999999999') returning id;
   -- use o id devolvido acima:
   insert into configuracoes (loja_id, whatsapp_instancia) values ('ID_DA_LOJA', 'banho-e-tosa');
   insert into perfis (user_id, loja_id, nome, papel)
     select id, 'ID_DA_LOJA', 'Nome da dona', 'dona' from auth.users where email = 'dona@sualoja.com.br';
   insert into perfis (user_id, loja_id, nome, papel)
     select id, 'ID_DA_LOJA', 'Nome da recepcionista', 'recepcao' from auth.users where email = 'recepcao@sualoja.com.br';
   ```
   Depois disso, novos usuários podem ser convidados pela tela **Configurações › Usuários**.

## 2. Vercel (sistema)

1. Importe o repositório `banho_tosa` em https://vercel.com/new.
2. Em *Environment Variables*, preencha:

   | Variável | Valor |
   |---|---|
   | `AUTH_MODE` | `supabase` |
   | `NEXT_PUBLIC_SUPABASE_URL` | Supabase › Project Settings › API › Project URL |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase › API › `anon` key |
   | `SUPABASE_SERVICE_ROLE_KEY` | Supabase › API › `service_role` key (só para convites) |
   | `DATABASE_URL` | Supabase › Database › Connection string › **Transaction pooler** |
   | `SUPABASE_SERVICE_DATABASE_URL` | a mesma connection string |
   | `WHATSAPP_PROVIDER` | `evolution` |
   | `EVOLUTION_URL` | endereço público da Evolution (passo 3) |
   | `EVOLUTION_API_KEY` | a mesma chave do `.env.vps` |
   | `EVOLUTION_INSTANCE` | `banho-e-tosa` |
   | `WEBHOOK_SECRET` | o mesmo segredo do `.env.vps` |

   Nunca defina `APP_NOW` nem `AUTH_MODE=dev` em produção.
3. *Deploy*. Anote o endereço (ex.: `https://banho-e-tosa.vercel.app`).

## 3. VPS (WhatsApp + worker)

1. Contrate uma VPS com Ubuntu 24.04 e instale o Docker:
   ```bash
   curl -fsSL https://get.docker.com | sh
   ```
2. Clone o repositório e prepare o arquivo de ambiente:
   ```bash
   git clone https://github.com/JoaoVD/banho_tosa.git && cd banho_tosa
   cp deploy/.env.vps.example deploy/.env.vps && nano deploy/.env.vps
   ```
3. Suba tudo:
   ```bash
   docker compose -f deploy/docker-compose.vps.yml --env-file deploy/.env.vps up -d --build
   ```
4. **HTTPS para a Evolution**: o sistema na Vercel precisa falar com a Evolution pela internet. O jeito mais simples é o Caddy, que pega o certificado sozinho. Aponte um subdomínio (ex.: `whatsapp.sualoja.com.br`) para o IP da VPS e:
   ```bash
   sudo apt install -y caddy
   echo 'whatsapp.sualoja.com.br { reverse_proxy 127.0.0.1:8080 }' | sudo tee /etc/caddy/Caddyfile
   sudo systemctl reload caddy
   ```
5. A VPS precisa conseguir acessar: o Supabase (porta 6543), o endereço da Vercel (webhook) e os servidores do WhatsApp. Não precisa abrir nenhuma porta além de 80/443.

## 4. Conectar o WhatsApp da loja

1. Entre no sistema como **dona** › **Configurações › WhatsApp**.
2. No celular da loja: WhatsApp › **Aparelhos conectados** › **Conectar um aparelho** › leia o QR code.
3. Pronto: o ponto ao lado de "WhatsApp" na barra fica verde. O número continua funcionando no celular.

## Dia a dia

- Ver o worker: `docker compose -f deploy/docker-compose.vps.yml logs -f worker`
- Atualizar depois de uma nova versão: `git pull && docker compose -f deploy/docker-compose.vps.yml --env-file deploy/.env.vps up -d --build`
- Os limites de envio (horário, teto diário, intervalo) ficam em **Configurações › Lembretes, envio e caixa**.
