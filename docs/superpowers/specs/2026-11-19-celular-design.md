# Uso pelo celular — design

## Por quê
O sistema foi pensado só para o PC da recepção. Agora o **tosador** e a **recepção** querem usar
pelo celular no dia a dia da loja: ver o que vem a seguir, avançar a etapa do pet, conferir a agenda,
responder o WhatsApp longe do balcão. O PC continua sendo o uso principal e não pode piorar.

## Objetivos
- No celular (iPhone/Android, ~360–430 px de largura), **Hoje, Agenda, Mensagens e Pets** ficam
  ótimos no toque: nada cortado, nada arrastando a página para o lado, alvos de toque ≥ 44 px.
- **Caixa e Pacotes** funcionam bem (leitura e ações principais), sem precisar ser perfeitos.
- Mesmo visual Apple, modo claro.

## Fora do escopo
- **Importar planilha, Boas-vindas e Configurações**: só não podem quebrar (sem rolagem lateral da
  página; tabelas largas podem rolar dentro do próprio cartão). Sem redesenho.
- App nativo, PWA/instalar na tela inicial, notificações push, modo offline.
- Novo papel "tosador": o tosador entra com um usuário de papel **recepção** (a dona cria em
  Configurações › Usuários). *Decisão minha; dá para criar um papel próprio depois.*

## Anti-objetivos
- Mudar o layout do PC (≥ 900 px continua idêntico; os e2e de desktop seguem passando sem alteração).
- Uma "versão mobile" separada com telas duplicadas — é o mesmo código, adaptado por CSS e poucos
  componentes que mudam de forma.

## Abordagens consideradas
- **A) Barra de abas embaixo, padrão iPhone — escolhida pelo usuário.** As 4 telas do dia a dia
  sempre a um toque e ao alcance do polegar; "Mais" agrupa o resto. Combina com o visual Apple.
- B) Menu escondido (☰): toda troca de tela vira dois toques, botão longe do polegar, cara de site.
- C) Menu atual numa faixa rolável: mais barato, mas gasta o topo, esconde itens e é o menos "app".

## O design

### Pontos de quebra (decisão minha)
- **≥ 900 px**: como hoje (barra lateral).
- **< 900 px** (tablet em pé e celular): barra lateral some; entra a barra de abas embaixo e o
  cabeçalho compacto. Os ajustes de tela abaixo valem a partir de **< 700 px** quando a tela não
  couber (ex.: Agenda com 2 profissionais cabe no tablet, não no celular).

### Navegação
- **Barra de abas fixa embaixo**, vidro fosco como a toolbar, respeitando `safe-area-inset-bottom`:
  Hoje · Agenda · Mensagens (com o número de não lidas) · Pets · **Mais**.
- **Mais** abre uma folha de baixo com: Pacotes e pontos, Caixa, Configurações (só dona),
  nome da loja/papel e **Sair**. Se a tela atual for uma dessas, a aba "Mais" aparece ativa.
- **Cabeçalho compacto** (no lugar da toolbar no celular): título da tela + botão de busca (🔍
  abre a busca em largura total) + botão ＋ Agendar. O indicador "WhatsApp" continua oculto no
  celular como já é hoje; se desconectado, um ponto vermelho na aba Mensagens.
- O conteúdo ganha folga embaixo para não ficar atrás da barra.

### Folhas (Agendar, Receber, Vender pacote, etc.)
- No celular, o `Sheet` vira **folha que sobe de baixo**, largura total, cantos arredondados só em
  cima, altura até ~92 % da tela com rolagem interna e botões de ação visíveis; respeita a área segura.
- Campos com fonte ≥ 16 px no celular (evita o zoom automático do iPhone ao tocar no campo).

### Hoje
- Os 4 cartões de resumo viram uma **faixa compacta 2×2** (números menores) para o quadro aparecer
  logo na primeira tela.
- **Quadro**: em vez de 4 colunas lado a lado, um seletor segmentado **Chegando · No banho · Na
  tosa · Pronto** (com contagem) e só a coluna escolhida, em largura total. Arrastar fica desligado no
  celular; avança-se pelos botões que o cartão já tem ("Mover para…", "Concluir", "Receber").
  A coluna escolhida começa na primeira com pets.
- "Linha do tempo" já é uma lista: só garantir largura total.

### Agenda
- Faixa da semana: mantém os 7 dias (já cabe), setas com alvo de 44 px.
- **Modo Dia**: um profissional por vez, escolhido num seletor segmentado no topo
  (Júlia · Marcos…), coluna em largura total. Tocar num horário livre abre o Agendar como hoje.
- **Modo Semana**: a tabela vira uma **lista por dia** (dia como título, atendimentos em linhas
  com hora, pet, serviço e profissional).

### Pets
- `/pets` mostra **só a lista** (com o filtro) em largura total.
- `/pets/[id]` mostra **só a ficha**, com um botão **‹ Pets** no topo para voltar à lista.
- Ações rápidas (Mensagem, Agendar, Vender pacote, Receber) continuam na ficha, quebrando linha se
  preciso. `/pets/novo` em coluna única.

### Mensagens
- Igual ao WhatsApp: sem conversa aberta (`?c=` ausente) mostra **só a lista**; com conversa aberta
  mostra **só a conversa**, com **‹ Conversas** no topo, campo de digitar fixo embaixo (acima da
  barra de abas, sem ser coberto pelo teclado).
- Corrige o estouro de largura atual (página com 589 px num celular de 390 px).

### Caixa e Pacotes
- Colunas lado a lado empilham; tabelas largas rolam dentro do cartão; botões principais com 44 px.

### Configurações, Importar, Boas-vindas
- Só a garantia: sem rolagem lateral da página; o resto como estiver.

## Como verificamos
- Novo projeto Playwright **"celular"** (perfil iPhone 13) com testes dos fluxos do dia a dia:
  navegar pelas abas e pelo "Mais", avançar um pet no Quadro, abrir um profissional na Agenda e
  agendar num horário livre, abrir e voltar de uma ficha de pet, abrir uma conversa e responder.
- Um teste percorre **todas** as telas no celular e falha se `scrollWidth > largura da tela`.
- Varredura de acessibilidade (axe) nas telas principais no celular.
- Os e2e de desktop existentes continuam passando sem alteração.
- Prints antes/depois em `docs/screenshots/celular/`.

## Fica para quem constrói
- Nomes de classes/componentes, se o "Mais" é rota ou folha (sugestão: folha), animações.
- Ícones das abas: reutilizar os do menu lateral.
