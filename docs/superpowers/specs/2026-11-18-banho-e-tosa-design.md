# Sistema de gestão de banho e tosa: documento de design

Data: 18/11/2026
Referência visual: `docs/prototipo/prototipo.html` (protótipo clicável aprovado, versão clara)

Convenção: o que o cliente decidiu aparece sem marcação. O que foi decisão de quem escreveu este documento está marcado **(decisão do design)** e pode ser revisto.

---

## 1. Intenção e porquê

Um pet shop específico, que só faz banho e tosa (não vende produtos), encomendou um sistema de gestão. O dono do projeto quer que ele fique tão bom que possa virar um SaaS para outros pet shops no futuro.

**O porquê central é a recorrência.** O sistema existe para fazer o cliente voltar. Hoje a loja manda lembretes e avisos manualmente pelo WhatsApp. O sistema automatiza isso e acrescenta pacotes, assinaturas e pontos. Agenda, quadro do dia e caixa são a base; o diferencial é trazer o tutor de volta no momento certo.

**Sucesso significa:**
- a recepção para de mandar lembretes e avisos à mão;
- tutores voltam no ciclo certo do pet, e a dona consegue ver isso;
- o fechamento do caixa do dia leva poucos minutos e bate com a gaveta;
- o sistema é bonito e agradável a ponto de servir de vitrine para um futuro SaaS.

## 2. Quem usa e como

- A loja tem 3 pessoas: **1 recepcionista, 1 banhista, 1 tosador**.
- **Só a recepção usa o sistema, no computador** (desktop). Banhista e tosador não usam o sistema na v1: avisam a recepção, que move o pet de etapa.
- A **dona** recebe o resumo do caixa no WhatsApp. **(decisão do design)** Ela também tem login, com acesso às configurações e ao histórico do caixa.
- Os **tutores** nunca entram no sistema. Eles interagem só pelo WhatsApp.

## 3. Objetivos, não-objetivos e anti-objetivos

**Objetivos da v1**
1. Quadro do dia com as etapas de cada pet e aviso automático ao tutor quando o pet fica pronto.
2. Agenda por profissional (banho e tosa), com horários livres e agendamento rápido.
3. Ficha de pets e tutores: dados, cuidados, histórico, ciclo de retorno, pacote e pontos.
4. Lembretes automáticos de retorno pelo WhatsApp, no ciclo do pet, com sugestão de horário.
5. Caixa de entrada de mensagens do WhatsApp, onde a recepção vê as respostas e confirma o agendamento com um clique.
6. Pacotes (ex.: 4 banhos no mês) com saldo, validade e aviso de renovação.
7. Pontos (R$ 1 = 1 ponto) com prêmios configuráveis.
8. Caixa simplificado: receber por atendimento e fechar o dia com conferência da gaveta.

**Não-objetivos da v1** (podem vir depois)
- Tela no celular para banhista e tosador.
- Página pública para o tutor escolher o horário sozinho (autoagendamento).
- Venda de produtos, estoque, nota fiscal, contas a pagar.
- Cobrança e assinatura recorrente automáticas no cartão. O pacote é pago no balcão.
- Várias lojas, planos e cobrança do SaaS. Só a base de dados nasce preparada para isso (ver seção 8).
- Modo escuro. O cliente pediu explicitamente só a versão clara.

**Anti-objetivos** (o que tornaria o sistema um fracasso mesmo funcionando)
- O número de WhatsApp da loja ser bloqueado por excesso de mensagens automáticas.
- Lembretes chatos ou repetidos, que façam o tutor bloquear a loja.
- Agenda com conflito de horários, ou pet "sumindo" do quadro.
- Caixa que não bate e a recepção não entende por quê.
- Visual genérico de "sistema de gestão". O cliente quer algo premium, no padrão de um app da Apple.

## 4. Restrições

- Idioma: português do Brasil. Fuso horário: America/Sao_Paulo. Moeda: BRL.
- Uso principal em computador desktop. As telas precisam funcionar bem a partir de 1280px de largura e não quebrar em telas menores.
- Integração com WhatsApp **pelo recurso do WhatsApp Web (aparelho conectado via QR code), sem Z-API**. O número da loja **continua sendo usado no celular** ao mesmo tempo. O cliente ainda pode migrar para a API oficial da Meta no futuro, então trocar de provedor tem que ser barato.
- Prazo: **2 meses** a partir de 18/11/2026, com entregas por fase.
- As contas de Supabase e Vercel ainda não existem; o cliente vai criar. O desenvolvimento não pode depender delas para começar.
- LGPD: o sistema guarda nome e telefone de tutores. O tutor precisa poder parar de receber mensagens automáticas.

## 5. Abordagens consideradas

### 5.1 Tecnologia

| Opção | Troca | Situação |
|---|---|---|
| **Next.js + Supabase** (TypeScript de ponta a ponta) | Melhor resultado visual, isolamento de dados por loja pronto no banco (RLS), sem servidor para manter. Contra: dois ou três serviços para configurar. | **Escolhida pelo cliente** |
| Laravel em VPS própria | Tudo num lugar, barato, fácil de achar quem mantenha. Contra: manter servidor, isolamento por loja mais manual. | Descartada |
| Sem código (Bubble + n8n) | Rápido para protótipo. Contra: trava o visual premium e o futuro SaaS. | Descartada |

### 5.2 Provedor de WhatsApp

| Opção | Troca | Situação |
|---|---|---|
| Z-API (serviço pago que faz a conexão WhatsApp Web) | Sem servidor próprio. Contra: mensalidade por número. | Descartada pelo cliente |
| **Conexão WhatsApp Web própria** via **Evolution API** (código aberto, roda em Docker) | Sem mensalidade, número continua no celular, suporta várias instâncias (bom para o SaaS). Contra: precisa de um servidor sempre ligado (VPS pequena) e tem o mesmo risco de bloqueio de qualquer conexão não oficial. | **Escolhida** (Evolution API é decisão do design; o cliente decidiu "WhatsApp Web sem Z-API") |
| API oficial da Meta | Estável, sem risco de bloqueio. Contra: cobra por mensagem e exige modelos aprovados. | Em aberto com a dona; o sistema deve permitir migrar |

### 5.3 Como o tutor marca depois do lembrete

| Opção | Troca | Situação |
|---|---|---|
| **Tutor responde no WhatsApp e a recepção confirma num clique** | Simples, a loja mantém controle, não muda o hábito de ninguém. | **Escolhida** |
| Link público de autoagendamento | Mais "uau", menos trabalho para a recepção. Contra: muito mais regras para não estourar a agenda. | Evolução futura |

### 5.4 Direção visual

Foram exploradas e descartadas pelo cliente três direções anteriores ("Água e espuma", "Girassol", "Boutique noturna") e duas versões de protótipo. A direção aprovada é **"app da Apple", moderna e premium, só no modo claro** (seção 9).

## 6. Funcionalidades (v1)

Os nomes de menu e de botões abaixo são os do protótipo e devem ser mantidos.

### 6.1 Hoje (tela inicial)
- Saudação com data ("Bom dia, Renata").
- Quatro widgets: **Em atendimento**, **Para receber** (prontos e sem pagamento), **Respostas no WhatsApp** (não lidas), **Recebido hoje**.
- **Quadro do dia** com quatro colunas: Chegando → No banho → Na tosa → Pronto para buscar.
  - Cada cartão mostra: pet (monograma, nome, raça), horário, serviço, uma observação (ex.: cuidado ou situação), e o saldo do pacote quando houver.
  - O pet muda de etapa **arrastando o cartão** ou pelo **botão da próxima etapa** ("Começar banho", "Levar para tosa", "Marcar como pronto"). O botão é obrigatório (acessibilidade e precisão).
  - Pets sem tosa no serviço podem pular de "No banho" para "Pronto para buscar". **(decisão do design)** O botão no cartão mostra a próxima etapa que faz sentido para o serviço; o arrastar permite qualquer coluna.
  - Toda mudança de etapa mostra um aviso com **"Desfazer"** por 5 segundos.
  - Ao chegar em **Pronto para buscar**, o cartão mostra "X terminou. Avisar [tutor]?" com uma chave **"Mensagem no WhatsApp"** (ligada por padrão) e o botão **Concluir**. Com a chave ligada, envia a mensagem de "pet pronto".
  - Cartões prontos e não pagos mostram **Receber R$ X**. Depois de pago, mostram "Pago".
  - Colunas vazias mostram uma orientação (ex.: "Banheira livre. Arraste um pet para cá.").
- Faixa **"N pets no ponto de voltar"**, com os monogramas e o botão "Revisar", que leva aos lembretes de amanhã.
- O botão de segmento "Quadro / Linha do tempo" leva à Agenda do dia.
- **(decisão do design)** O quadro mostra os agendamentos do dia. Um agendamento entra em "Chegando" automaticamente no dia marcado. Não há check-in separado na v1.
- **(decisão do design)** O quadro se atualiza sozinho se outra sessão (ex.: a dona) mudar algo, via Supabase Realtime.

### 6.2 Agenda
- Seletor de dia (faixa da semana) e segmento **Dia / Semana**. A visão de semana pode ser uma grade simples na v1.
- Visão de dia em colunas **por profissional** (Júlia, banho; Marcos, tosa), hora a hora, das 8h às 18h (configurável), com linha vermelha da hora atual.
- Blocos de atendimento com três estados visuais: concluído, agora e próximo.
- **Horários livres** aparecem como blocos tracejados clicáveis ("Livre às 12:30") e abrem o agendamento já preenchido.
- **Novo agendamento** (janela central): pet (obrigatório, com erro embaixo do campo), serviço, dia, horário livre e a chave **"Confirmar pelo WhatsApp"** (ligada por padrão, envia a confirmação).
- **Duração do atendimento:** vem do serviço e do porte do pet (tabela configurável). O sistema não oferece horários que se sobreponham na agenda do profissional.
- **(decisão do design)** Cada serviço tem um profissional padrão (banho → banhista, tosa → tosador). Um serviço "banho + tosa" ocupa o banhista e, em seguida, o tosador. Se isso complicar demais a v1, o construtor pode simplificar para "um atendimento ocupa um profissional", desde que o quadro continue mostrando as etapas.
- Remarcar e cancelar a partir do bloco na agenda. Cancelamentos não contam para o ciclo de retorno.

### 6.3 Pets e tutores
- Lista com filtro (pet, tutor ou telefone) e estado vazio com "Cadastrar pet". A busca da barra superior leva para cá com o filtro aplicado.
- **Ficha do pet:**
  - Cabeçalho: monograma grande, nome, raça, idade e porte, com atalhos Mensagem, Agendar e Receber.
  - Três anéis: **ciclo de retorno** (dias desde o último banho em relação ao ciclo), **pacote** (banhos restantes e validade) e **pontos** (progresso até o próximo prêmio).
  - Bloco **Tutor**: nome, WhatsApp e a chave **"Lembretes automáticos"** (opt-out da LGPD).
  - **Cuidados**: etiquetas de alerta, editáveis (ex.: "Sensível nas orelhas").
  - **Atendimentos**: histórico com data, serviço, valor (ou "Pacote") e profissional.
- **Cadastro e edição** de tutor e pet. Um tutor pode ter vários pets. Campos do pet: nome, espécie (cão/gato), raça, porte (mini, pequeno, médio, grande, gigante), data de nascimento aproximada, cuidados e observações. **(decisão do design)** Foto do pet é opcional; sem foto, aparece o monograma.
- **Começar do zero ou importar.** No primeiro acesso, a dona escolhe entre **"Importar planilha"** e **"Começar do zero"**. A importação também fica disponível depois, nas Configurações.
  - Aceita .xlsx e .csv. A dona liga as colunas da planilha aos campos (tutor, telefone, pet, raça, porte, data da última visita, pacote e saldo restante, pontos), vê uma prévia e só então confirma.
  - O sistema normaliza telefones (E.164, DDI 55), junta pets do mesmo tutor pelo telefone, aponta linhas com erro sem travar o resto e evita duplicar quem já existe.
  - A **data da última visita** importada vira um atendimento histórico, para os lembretes de retorno funcionarem desde o primeiro dia.
  - **(decisão do design)** Tutores importados entram com lembretes automáticos ligados. No primeiro dia, o envio respeita o teto diário, então a fila acumulada sai ao longo de vários dias.
- **Pontos e pacotes são do tutor, não do pet** **(decisão do design)**: um tutor com dois cães soma pontos numa conta só e pode usar o pacote em qualquer um deles, a menos que o pacote seja de porte específico. A ficha do pet mostra o saldo do tutor.

### 6.4 Mensagens (WhatsApp)
- Caixa de entrada com as conversas dos tutores (não lidas destacadas; contador no menu).
- Conversa em balões, com a etiqueta "automática" nas mensagens enviadas pelo sistema.
- Quando a última mensagem automática foi uma **proposta de horário** e o tutor respondeu, aparece um cartão de proposta com mini calendário e os botões **Confirmar** e **Outro horário**. Confirmar cria o agendamento e envia a confirmação ao tutor. Outro horário abre o agendamento.
- **(decisão do design)** O sistema não tenta entender a resposta do tutor automaticamente na v1. Ele só destaca a conversa e mostra a proposta; quem decide é a recepção.
- Campo para responder manualmente.
- Botão **"Lembretes de amanhã (N)"**: lista de quem vai receber lembrete no próximo envio, com a opção de tirar alguém da lista e de editar o texto padrão.
- **O número também é usado no celular.** Mensagens enviadas pelo celular chegam ao sistema e aparecem na conversa como enviadas pela loja (sem a etiqueta "automática"), e contam como resposta da loja.
- **(decisão do design)** A caixa de entrada mostra por padrão só conversas com tutores cadastrados. Conversas de outros números (pessoais, fornecedores) ficam num filtro **"Outros"**, recolhido, com a opção de cadastrar como tutor. Grupos são ignorados.
- **(decisão do design)** O limite de "2 lembretes sem resposta" considera resposta qualquer mensagem do tutor, venha ela pelo sistema ou pelo celular.

### 6.5 Pacotes e pontos
- Pacotes como cartões no estilo Wallet: nome, preço, descrição, validade em dias, quantidade e tipo de serviço incluído, porte (opcional) e número de clientes ativos.
- Venda de pacote: pela ficha do pet ou no momento de receber. É paga no balcão e entra no caixa **do dia da venda**. O uso de um banho do pacote entra no caixa como R$ 0.
- Lista **"Acabando, com 1 banho restante"**, com o botão **"Avisar no WhatsApp"** (mensagem de renovação).
- Pacote vencido com saldo: **(decisão do design)** o saldo expira, e a recepção pode estender a validade manualmente na ficha.
- **Pontos:** cada R$ 1 pago vira 1 ponto. Banhos de pacote não geram pontos. A venda do pacote gera pontos sobre o valor pago **(decisão do design)**. Prêmios configuráveis (ex.: 300, perfume e laço; 500, hidratação; 800, banho grátis). O resgate acontece na tela de receber.
- **(decisão do design)** Pontos não expiram na v1.

### 6.6 Caixa
- **Receber** (janela central a partir do cartão ou da ficha):
  - Mostra o total grande e quantos pontos o pet vai ganhar.
  - Chave **"Usar banho do pacote"** quando houver saldo (o total vira R$ 0).
  - Chave **"Trocar N pontos"** quando houver pontos suficientes para algum prêmio.
  - Forma de pagamento: **Pix, Crédito, Débito, Dinheiro**.
  - Botão "Receber R$ X" ou "Confirmar uso do pacote".
- **Tela Caixa:** total recebido no dia, barra dividida por forma de pagamento com legenda, lista de pagamentos (hora, pet, serviço, forma, valor).
- **Conferir a gaveta:** esperado em dinheiro, campo "Contado na gaveta" e diferença ao vivo ("Confere", "Sobram R$ X", "Faltam R$ X").
- **Fechar caixa:** registra o fechamento (contado, diferença, quem fechou e quando) e envia o resumo para o WhatsApp da dona. Depois de fechado, o dia fica só leitura. **(decisão do design)** Um pagamento recebido depois do fechamento entra no dia seguinte, e a dona pode reabrir o caixa.
- **(decisão do design)** Sem troco inicial na gaveta na v1. Se a loja usar fundo de troco, entra como um valor configurável somado ao "esperado".
- Estorno de um pagamento com motivo, visível no caixa do dia.
- **Um pagamento pode cobrir vários atendimentos do mesmo tutor (decisão do design)**, por exemplo, dois cães buscados juntos e pagos num Pix só. A tela de receber, a partir de um cartão, oferece incluir os outros pets do mesmo tutor que estão prontos.

### 6.7 Configurações (só a dona)
Não aparece no protótipo; deve seguir o mesmo estilo (listas agrupadas, como nos Ajustes do iPhone).
- Dados da loja (nome, logo, telefone da dona para o resumo do caixa).
- Horário de funcionamento por dia da semana.
- Profissionais e o que cada um faz.
- Serviços, com **preço e duração por porte**.
- Pacotes e prêmios de pontos.
- **Textos das mensagens automáticas**, com variáveis ({tutor}, {pet}, {dia}, {hora}).
- Regras dos lembretes (ver 7.2).
- Usuários: dona (administradora) e recepção.
- Conexão do WhatsApp (status e QR code).

## 7. Regras de negócio

### 7.1 Ciclo de retorno
- Cada pet tem um **ciclo de retorno em dias**.
- Valor inicial: o ciclo padrão do serviço principal (configurável; ex.: banho, 15 dias; tosa, 30 dias).
- **(decisão do design)** Depois de 3 atendimentos, o sistema sugere a mediana dos intervalos reais entre visitas. A recepção pode fixar um valor manualmente.
- "No ponto de voltar" = dias desde o último atendimento concluído ≥ ciclo, e nenhum agendamento futuro.

### 7.2 Lembretes e mensagens automáticas
Tipos de mensagem automática na v1:
1. **Lembrete de retorno**, com sugestão de horário livre.
2. **Confirmação de agendamento** (ao agendar, se a chave estiver ligada).
3. **Lembrete na véspera** ("Responda SIM para confirmar").
4. **Pet pronto** (ao concluir, se a chave estiver ligada).
5. **Pacote acabando** (manual, pelo botão).
6. **Resumo do caixa** para a dona.

Regras:
- **Lembretes de retorno** saem uma vez por dia, às 9h (horário configurável), para quem entrou "no ponto de voltar". A sugestão de horário é o primeiro horário livre adequado ao serviço do pet nos próximos 2 dias úteis.
- **(decisão do design)** No máximo um lembrete de retorno a cada 7 dias por tutor, e no máximo 2 sem resposta seguidos. Depois disso o tutor sai da fila até voltar à loja.
- Tutores com "Lembretes automáticos" desligado não recebem os tipos 1, 3 e 5. Os tipos 2 e 4 só saem se a chave da ação estiver ligada.
- **Proteção contra bloqueio do número (obrigatória):**
  - intervalo aleatório entre envios (ex.: 20 a 90 segundos);
  - teto diário de mensagens automáticas, configurável;
  - envio só em horário comercial;
  - fila de envio com novas tentativas em caso de falha;
  - respeito imediato ao opt-out.
- Se o tutor responder "PARAR" ou "SAIR", os lembretes automáticos dele são desligados **(decisão do design)**.
- **Horário sugerido não fica reservado (decisão do design).** No mesmo envio diário, cada tutor recebe um horário livre diferente, sem repetir. Ao clicar em **Confirmar**, o sistema checa se o horário ainda está livre. Se não estiver, oferece o próximo livre em vez de criar conflito.
- **Textos como modelos (decisão do design).** Toda mensagem automática é um modelo com variáveis fixas ({tutor}, {pet}, {dia}, {hora}, {servico}), guardado por tipo. Assim a migração para a API oficial da Meta, que exige modelos aprovados, não muda o modelo de dados.

### 7.3 Etapas do atendimento
Estados: agendado → chegando (no dia) → no banho → na tosa → pronto → concluído (pago). Também existem cancelado e não compareceu.
- Uma mudança de etapa registra horário e usuário.
- "Concluído" só acontece com o pagamento registrado (ou o uso de pacote).
- Só atendimentos concluídos contam para o ciclo de retorno e para o histórico.

### 7.4 Dinheiro
- Valores em centavos (inteiros) no banco.
- O preço do serviço vem da tabela por porte e pode ser ajustado no momento de receber, com motivo **(decisão do design)**.

## 8. Arquitetura e dados

### 8.1 Pilha
- **Next.js (App Router) + TypeScript**, hospedado na **Vercel**.
- **Supabase**: Postgres, Auth (e-mail e senha), Storage (fotos e logo), Realtime (quadro do dia) e agendamento de tarefas (pg_cron + Edge Functions, ou equivalente) para lembretes e fila de envio.
- **WhatsApp**: Evolution API em Docker numa VPS pequena (ex.: 1 vCPU, 1 a 2 GB), sempre ligada, porque a Vercel não mantém conexões abertas. É o único servidor próprio do projeto.
- **(decisão do design)** UI com Tailwind CSS e componentes próprios sobre primitivos acessíveis (Radix). O arrastar do quadro usa dnd-kit, com suporte a teclado.

### 8.2 Camada de WhatsApp
- **Uma interface única de provedor** (enviar texto, receber via webhook, status da conexão e QR code), com a implementação para Evolution API. Z-API e API oficial da Meta entram como novas implementações sem mexer no resto do sistema.
- Para desenvolver e testar sem WhatsApp real, existe um **provedor falso** que registra os envios e simula respostas.
- Webhook de entrada protegido por segredo, gravando mensagens recebidas e associando-as ao tutor pelo telefone (normalizado no formato E.164).
- Todo envio passa pela fila (seção 7.2). Nada envia direto de uma tela.

### 8.3 Preparado para várias lojas
- Toda tabela de negócio tem `loja_id`, e as políticas de RLS do Supabase isolam os dados por loja desde o primeiro dia.
- Na v1 existe uma loja só. Não há tela de cadastro de loja nem cobrança.

### 8.4 Entidades principais (nomes indicativos)
loja, usuario (papel: dona | recepcao), profissional, servico, preco_servico (servico × porte: preço, duração), tutor, pet, agendamento (pet, serviço, profissional, início, fim, etapa, histórico de etapas), pagamento (agendamento opcional, valor, forma, pontos ganhos e usados, estornado), pacote_modelo, pacote_cliente (tutor, saldo, validade), movimento_pacote, movimento_pontos, premio, caixa_dia (fechamento), conversa, mensagem (direção, tipo, automática, status de envio), fila_envio, proposta_horario (tutor, horário sugerido, status), configuracao.

O construtor tem liberdade para modelar os detalhes, desde que respeite as regras das seções 6 e 7.

## 9. Design visual (aprovado)

A referência é o protótipo `docs/prototipo/prototipo.html`. Telas, textos, componentes e comportamentos devem segui-lo.

- **Estilo:** app de Mac/iOS, moderno e premium, **só modo claro**.
- **Estrutura:**
  - barra lateral translúcida com ícones em quadradinhos coloridos, como nos Ajustes da Apple (Hoje laranja, Agenda vermelho, Mensagens verde, Pets e tutores azul, Pacotes rosa, Caixa azul-piscina);
  - barra superior de vidro com título da tela, busca, status do WhatsApp e botão "+";
  - títulos grandes.
- **Cores:**
  - fundo #F5F5F7, superfícies brancas, texto #1D1D1F e #6E6E73;
  - **cor de destaque única: menta #00877C**;
  - cores de sistema só para estado: laranja para "precisa de ação", verde para concluído, vermelho para erro e falta no caixa.
- **Tipografia:** fonte do sistema da Apple (SF Pro) com Inter como alternativa; texto base de 16px.
- **Componentes:**
  - **Visual:** monogramas em degradê no estilo Contatos, anéis de progresso no estilo Saúde, listas agrupadas no estilo Ajustes, cartões de pacote no estilo Wallet e balões no estilo iMessage.
  - **Controles e retorno:** chaves liga/desliga do iOS, controles segmentados, janelas centrais com animação de mola e avisos no topo com "Desfazer".
- **Vidro translúcido** só na barra lateral, na barra superior e nos avisos. Respeitar "reduzir transparência" e "reduzir movimento" do sistema.
- **Acessibilidade (obrigatória):**
  - contraste mínimo de 4,5:1;
  - foco visível;
  - tudo operável por teclado, incluindo alternativa ao arrastar;
  - rótulos visíveis nos campos e erro embaixo do campo;
  - janelas com foco preso e fechamento com Esc;
  - botões mostram estado de carregamento ("Enviando…") em ações que demoram.
- As skills `ui-ux-pro-max` e `design-taste-frontend` foram usadas para chegar nessa direção e devem ficar disponíveis no repositório (`.claude/skills/`) para a construção.

## 10. Fora do escopo da v1 (lista de evolução)
Tela do banhista e do tosador no celular; autoagendamento por link; API oficial do WhatsApp; cobrança automática de assinatura; várias lojas e planos (SaaS); relatórios avançados de recorrência; modo escuro; nota fiscal.

## 10.1 Ordem de entrega (decisão do design)
A v1 é construída em fases, cada uma utilizável:
1. Base: login, cadastro de tutores, pets, serviços, configurações e importação de planilha.
2. Agenda e quadro do dia.
3. Receber, pacotes, pontos e caixa.
4. WhatsApp: conexão, fila de envio com proteções, mensagens automáticas, caixa de entrada e confirmação de propostas.

## 11. Deixado para o construtor
- Estrutura de pastas, nomes de tabelas e colunas, e organização dos componentes.
- Como implementar a fila de envio e o agendador dentro do Supabase.
- Estratégia de testes, desde que as regras de negócio das seções 7.1 a 7.4 tenham testes automatizados.
- Dados de exemplo para desenvolvimento (podem reaproveitar os do protótipo).
- Como rodar o ambiente de desenvolvimento antes de as contas reais existirem (Supabase local, projeto de teste, etc.).
- Visão "Semana" da agenda: formato livre, desde que siga o estilo.

## 12. Decisões do design para o cliente conferir
1. A dona tem login próprio, com configurações e histórico do caixa.
2. Um agendamento do dia entra direto em "Chegando", sem check-in.
3. "Banho + tosa" ocupa o banhista e, em seguida, o tosador.
4. Pontos e pacotes pertencem ao tutor, não ao pet.
5. Sem leitura automática das respostas do WhatsApp na v1. A recepção confirma.
6. Limite de lembretes: 1 a cada 7 dias e no máximo 2 sem resposta seguidos.
7. Pacote vencido perde o saldo, com extensão manual possível.
8. Venda de pacote gera pontos. Pontos não expiram.
9. Pagamento depois do fechamento vai para o dia seguinte. A dona pode reabrir o caixa.
10. Preço pode ser ajustado no balcão, com motivo.
11. O horário sugerido no lembrete não fica reservado. Cada tutor recebe um horário diferente, e o sistema checa conflito ao confirmar.
12. Um pagamento pode cobrir vários pets do mesmo tutor.
13. Entrega em 4 fases, com o WhatsApp por último.
14. WhatsApp Web pela Evolution API, numa VPS pequena.
15. Caixa de entrada mostra só tutores; outros números ficam em "Outros".
16. Tutores importados já entram com lembretes ligados.
