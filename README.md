# 🏆 Simulador de Campeonatos

App desktop (Electron + React + TypeScript) para criar e simular campeonatos de **futebol** e **e-sports**, com múltiplos formatos, times reais ou personalizados, e o botão de **aleatorizar resultados**.

![tema](https://img.shields.io/badge/tema-vermelho%20sangue-e01b1b) ![stack](https://img.shields.io/badge/stack-Electron%20%2B%20React%20%2B%20TS-101012)

## Funcionalidades

- **2 esportes** — Futebol (gols, posse, finalizações, cartões) e E-sports (mapas, KDA, MVP).
- **4 formatos** — Pontos Corridos, Mata-Mata, Grupos + Mata-Mata e Sistema Suíço.
- **Times** — clubes europeus e brasileiros, seleções e times de e-sports pré-definidos, além de **criação de times** (nome, força 1–100, cor e logo opcional).
- **Força x sorte** — cada time tem força de 1 a 100; ative **"100% aleatório"** antes de iniciar para ignorar a força.
- **Simulação flexível** — simule **uma partida**, **uma rodada** ou **tudo de uma vez** ("Aleatorizar tudo").
- **Prorrogação + pênaltis** no mata-mata, com chaveamento visual.
- **Estatísticas** por partida (card compacto + modal com detalhes).
- **Histórico acumulado** — galeria de campeões, ranking de times, artilharia/abates e confrontos diretos.
- **Salvar / carregar** campeonatos em arquivo JSON.
- Interface em **português (PT-BR)**, tema escuro com vermelho sangue.

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
