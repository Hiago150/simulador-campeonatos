# 🏆 Simulador de Campeonatos

App desktop (Electron + React + TypeScript) para criar e simular campeonatos de **futebol** e **e-sports**, com múltiplos formatos, times reais ou personalizados, e o botão de **aleatorizar resultados**.

![tema](https://img.shields.io/badge/tema-vermelho%20sangue-e01b1b) ![stack](https://img.shields.io/badge/stack-Electron%20%2B%20React%20%2B%20TS-101012)

## Funcionalidades

- **2 esportes** — Futebol (gols, posse, finalizações, cartões) e E-sports (mapas, KDA, MVP), com **CS2 e Valorant** (elencos reais distintos por jogo).
- **6 formatos** — Pontos Corridos, Mata-Mata (com opção **ida e volta** / placar agregado), Grupos + Mata-Mata, Sistema Suíço e **Liga + Playoffs**.
- **Times** — ~100 clubes (Europa + Brasil + várias ligas), seleções e ~46 orgs de e-sports, todos com **escudo/logo e elenco reais**; além de **criação de times** (nome, força 1–100 em 3 setores, cor e logo opcional) e edição de qualquer time/elenco.
- **20 modelos de campeonato** que já auto-selecionam os clubes (Champions, Copa do Mundo, Brasileirão, Libertadores, CS Major, VCT…).
- **Fator zebra** — 4 níveis (Realista / Equilibrado / Caótico / Loteria) regulam o quanto a sorte pesa sobre a força; **Forma/embalo** opcional (🔥/❄️).
- **Simulação flexível** — simule **uma partida**, **uma rodada**, **a fase** ou **tudo de uma vez**; **prorrogação + pênaltis** no mata-mata, com chaveamento visual e zoom.
- **Monte Carlo** — re-simula o campeonato N vezes (1×…100×) e mostra um ranking de campeões.
- **Modo Temporada** — acompanhe times por vários anos numa sequência de campeonatos, com evolução de força, **Hall da Fama** (recordes gerais e por temporada) e cerimônia de encerramento.
- **Narrativa** — feed de lances na partida, manchetes e jogo/zebra da rodada e resumo narrado do torneio.
- **Estatísticas** — evolução de pontos, corrida do ranking animada e confrontos diretos.
- **Histórico acumulado**, **biblioteca local** e **salvar / carregar** em arquivo JSON.
- Interface em **português (PT-BR)**, visual **"Placar"** — dark vermelho + preto estilo app de resultados, com verde de vitória, dourado de título e **tab bar no celular**; instalável como **PWA** na versão web.

## Como rodar (desenvolvimento)

```bash
npm install
npm run dev
```

> Abre a janela do app com hot-reload.

## Gerar build / instalador

```bash
npm run build        # compila main + preload + renderer
npm run dist:win     # gera o instalador Windows (electron-builder)
```

## Estrutura

```
src/
  main/        Processo principal do Electron (janela + IPC salvar/abrir)
  preload/     Ponte segura (window.desktop)
  renderer/
    src/
      data/        Times pré-definidos
      engine/      Motor de simulação (partidas, formatos, classificação, chaveamento)
      store/       Estado global (Zustand) + histórico persistido
      components/  UI reutilizável (cards, tabelas, bracket, modais)
      screens/     Telas (Início, Setup, Torneio, Histórico, Meus Times)
```

## Notas de simulação

- **Futebol:** gols via distribuição de Poisson ponderada pela diferença de força; artilheiros são atribuídos a jogadores gerados por time.
- **E-sports:** séries em melhor de 1/3/5; vencedor de cada mapa por probabilidade logística; KDA e MVP por série.
- **Suíço / mata-mata:** pareamentos e avanço de fases gerados automaticamente a cada rodada.
