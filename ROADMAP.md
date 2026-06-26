# 🛠️ Roadmap — Próximas atualizações

> Documento de continuidade. Quando retomar, basta dizer **"continuar os gráficos"**.
> O app atual está **100% funcional e verificado** — não regredir nada.

---

## ✅ Já encaminhado (feito nesta sessão)

- **`src/renderer/src/engine/stats.ts`** — camada de DADOS dos gráficos (puro, aditivo, type-check OK, ainda não usado por nenhuma tela):
  - `leagueEvolution(t)` / `groupEvolution(t)` → snapshots de pontos + posição por rodada (base da linha e do racing chart).
  - `evolutionByRound(teamIds, matches)` → genérico.
  - `tournamentHeadToHead(t, aId, bId)` → confrontos no torneio (com lista de jogos).
  - `historyHeadToHead(history, aId, bId)` → confrontos acumulados entre edições.

---

## 📊 FASE 1 — Página "Estatísticas" com gráficos animados ✅ CONCLUÍDA

> **Implementada e verificada no preview.** `recharts` instalado; nova tela
> `screens/Stats.tsx` com 3 abas (Evolução em linha, Corrida do ranking animada
> com play/pause + velocidade + scrub, Confrontos com dropdowns + W-D-L do torneio
> e histórico). Link "Estatísticas" no `TopBar`. Funciona em liga/grupos/suíço;
> mata-mata mostra só Confrontos. Aviso "em progresso" quando não encerrado.

### (referência) Decisões confirmadas com o usuário

### Decisões confirmadas com o usuário
| Tópico | Decisão |
|--------|---------|
| Localização | **Página separada** com link no menu top (`TopBar`), ao lado de Início/Histórico/Meus Times |
| Biblioteca | Livre — **recomendado Recharts** (`npm i recharts`), integra com Framer Motion |
| Velocidade animação | **Média (3–5s)** por transição/rodada |
| Head-to-head | **Dropdown** para escolher 2 times |
| Export PNG | **Não** — só visualização no app |
| Racing chart — controles | **Play/Pause + velocidade (0.5x / 1x / 2x)** |
| Racing chart — formatos | **Liga** e **Grupos** (cada grupo separado) |
| Campeonato em andamento | **Mostrar parcial** com aviso "em progresso" |
| E-sports | **Sim**, adaptar eixo (kills/mapas em vez de gols/pontos) |

### Gráficos a construir
1. **Evolução de Pontos** (linha) — Liga + Grupos. Eixo X = rodadas, Y = pontos acumulados; 1 linha por time (cor do time). Hover com tooltip.
2. **Head-to-Head** — 2 dropdowns de time → card com W-D-L (torneio atual **e** histórico via `historyHeadToHead`) + tabela dos confrontos.
3. **Racing Chart** (ranking) — barras horizontais ordenadas que reordenam por rodada, com Play/Pause + controle de velocidade. Usa `leagueEvolution`/`groupEvolution`.

### Passos de implementação sugeridos
1. `npm i recharts` (no diretório `simulador-campeonatos`).
2. Novo `screens/Stats.tsx` + entrada `'stats'` no tipo `Screen` (em `store/app.ts`) e no switch do `App.tsx`.
3. Adicionar item "Estatísticas" no `components/TopBar.tsx` (ícone `BarChart3`/`LineChart`).
4. Selecionar o torneio: usar `current` do store; se `null`, `EmptyState` com CTA para criar.
5. Construir os 3 gráficos consumindo `engine/stats.ts`. Animação de barras = Framer Motion `layout` + reorder; linha = Recharts com `isAnimationActive`.
6. Aviso "em progresso" quando `t.phase !== 'finished'`.
7. **Verificar no preview** (porta 5173) cada gráfico antes de fechar.

---

## 🎨 FASE 2 — Repaginada visual (decidir prioridade depois)

Pedidos do usuário:
- Mais **minimalista e moderno**, fugindo do "cara de IA".
- Mais **contraste e legibilidade**.
- Revisar as **cores do vermelho** (tons/variações).
- Mais **animações e transições** (botões, navegação, abrir/fechar).

(Sem escopo fechado ainda — perguntar antes de executar.)

---

## ▶️ Como rodar
```bash
cd simulador-campeonatos
npm run dev     # app + hot reload (porta 5173)
```
