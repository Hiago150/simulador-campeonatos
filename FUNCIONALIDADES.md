# Funcionalidades — Simulador de Campeonatos

Visão geral de **tudo que o app já faz hoje**. É um simulador desktop (Electron) —
também publicado como web app (PWA) — para **criar e simular campeonatos de futebol
e e-sports**, offline e em português. Abaixo, um resumo de cada área.

---

## ⚡ Início rápido
- **Atalhos de modelo** na tela inicial (Champions, Copa do Mundo, Brasileirão,
  Premier, CS Major, VCT): um clique **cria e abre o torneio pronto pra simular**.
- **Surpreenda-me** — monta um campeonato aleatório, mas sempre válido (esporte,
  formato, times e fator zebra sorteados) e abre na hora.
- **Modo Temporada** com seção própria e CTA na Home.

## 🏟️ Esportes
- **⚽ Futebol** — placar de gols, estatísticas da partida (posse, finalizações, no
  alvo, escanteios, faltas, cartões), **prorrogação + pênaltis** no mata-mata e
  artilharia por jogador.
- **🎮 E-sports** — séries **BO1/BO3/BO5**, mapas e rounds, **KDA realista por jogador**
  (coerente com os rounds; abates de um time = mortes do outro), **saldo K−D** e **MVP**
  da série. Cada jogador tem uma **"forma do dia"** (tem quem carrega e quem afunda na
  mesma série). No detalhe, a **soma da série aparece primeiro** e há **chips por mapa**
  com o K/D/A de cada um. Escolha entre **CS2** e **Valorant** (mapas e elencos próprios).

## 🗂️ Formatos de campeonato
- **Pontos Corridos (liga)** — todos contra todos, turno único ou **ida e volta**.
- **Mata-mata (copa)** — eliminatória com chaveamento visual; opção **ida e volta**
  (placar agregado, final em jogo único).
- **Grupos + Mata-mata** — fase de grupos e depois cruzamento eliminatório.
- **Sistema Suíço** — rodadas pareadas por desempenho, sem eliminação imediata.
- **Liga + Playoffs** — pontos corridos → os **top N** decidem o título no mata-mata.
- **Dupla Eliminação** — chave superior + inferior; só sai quem **perde 2 vezes**;
  grande final com **reset**.
- **Tripla Eliminação** — winners + losers + **última chance**; só sai quem **perde 3
  vezes**. (Dupla/tripla para 8/16/32 times, futebol e e-sports, com **ressorteio** que
  evita revanches na chave inferior.)

## 👥 Times e elencos
- **~100 clubes + seleções + ~46 orgs de e-sports** pré-definidos, todos com **escudo/
  logo real** e **elenco com nomes reais**.
- **Criação de times** — nome, **força 1–100**, cor e logo.
- **Força em 3 setores** (Ataque / Meio / Defesa), editáveis ou derivados da força geral.
- **Aba "Todos os clubes"** — ver e **editar qualquer time** (com opção de reverter ao
  original).
- **Elencos de e-sports editáveis por jogo** (CS2 e Valorant separados), com salvamento
  permanente e "restaurar padrão".
- **Filtros e coleções** por liga/competição/categoria na seleção de times.

## 📋 Modelos prontos
**20 modelos de campeonato** que preenchem tudo e auto-selecionam os clubes, agrupados
por categoria (Europa, Seleções, Ligas nacionais, Américas, Mundo, CS2, Valorant) —
ex.: Champions, Copa do Mundo, Eurocopa, Premier, La Liga, Brasileirão, Libertadores,
Mundial de Clubes, CS Major, IEM/BLAST, VCT Champions/Masters.

## 🎲 Simulação
- **Fator zebra (força × sorte)** — 4 níveis: **Realista**, **Equilibrado**, **Caótico**,
  **Loteria**. Quanto mais alto, mais a sorte pesa.
- **Forma/embalo** (opcional) — times embalados ganham empurrão, os frios uma penalidade,
  com indicador **🔥/❄️**.
- **Modos** — simular **uma partida**, **uma rodada**, **a fase de grupos** ou **tudo**;
  **Refazer** (com confirmação).
- **Visão "dia de jogo"** — partidas da rodada **ao lado das tabelas**; a classificação
  muda na hora, sem rolar a página; times que não jogaram aparecem com traços; no
  mata-mata a **fase atual** fica em destaque.
- **Monte Carlo** — re-simula o campeonato **1× a 100×** e mostra um **ranking de
  campeões** (com %) numa aba dedicada; não entra no histórico.
- **Extras** — artilharia/abates **ao vivo**, rodadas colapsáveis, **mata-mata com zoom
  ajustável**, cards de partida que expandem em modal.

## 📅 Modo Temporada
Acompanhar equipes por **vários anos** (5 a 30):
- **9 presets** (Inglesa, Espanhola, Brasileira, Seleções, CS2, Valorant…) que montam a
  sequência e os times.
- **Sequência de até 10 campeonatos**, disputados um a um, repetida a cada ano.
- **Elenco próprio por campeonato**; **artilheiros do ano e all-time** separados.
- **Evolução de força entre anos** (~metade sobe / ~metade cai) + tela **"Forma da
  temporada"**.
- **Hall da Fama interativo** (títulos, recordes, cronologia ano-a-ano) e **cerimônia de
  encerramento** com pódio e recordes da era.
- **Recordes de e-sports** (mais abates numa série, maior espanço, atropelo, mais MVPs).
- **Salvar e continuar**, totalmente **isolado do histórico global**.

## 💾 Persistência e histórico
- **Biblioteca local** — galeria de vários campeonatos salvos (salvar / abrir / renomear
  / excluir).
- **Exportar/importar** campeonatos em **JSON** (diálogo nativo no desktop).
- **Histórico acumulado** entre edições (campeonatos avulsos): galeria de campeões,
  ranking por esporte, artilharia, confrontos diretos e **repetir campeonato**.
- **Dupla confirmação** em qualquer ação de limpar/excluir.

## 📊 Estatísticas
- **Evolução de pontos** por rodada (linha).
- **Corrida do ranking** — racing chart animado (play/pause + velocidade), incluindo o
  mata-mata.
- **Confrontos** — head-to-head entre dois times (torneio atual + histórico).

## 📰 Narrativa & destaques
- **Feed de lances** no modal da partida — futebol: gols com minuto, autor e placar
  correndo (marca **viradas** e o **gol do título**), cartões, pênaltis; e-sports: mapas,
  top fragger, **ace**, clutch, MVP. Chips **Tudo / Destaques (verde) / Decisivos
  (vermelho)** filtram e servem de legenda.
- **Jogo / zebra da rodada** — maior zebra + jogo mais emocionante, com manchete.
- **Resumo narrado do torneio** — parágrafo final com campeão, zebra, artilheiro e jogo
  do torneio.
- **Resumo para compartilhar** (e-sports) — bullets neutros prontos pra copiar (jogador
  + mapa + ação), pensados pra postar fora do app.

## 🎨 Interface
- Tema **"Placar"** (estilo app de resultados esportivos): vermelho + preto, verde de
  vitória, dourado de título; tipografia condensada (Oswald).
- **Responsivo e mobile-first**, com **tab bar** no celular; **PWA** instalável e offline.

---

### Como rodar
`npm install` e `npm run dev` (desktop). Testes da engine: `npm test`.
Versão web publicada via GitHub Pages. Detalhes técnicos no `README.md`.
