import type { BestOf, EsportsGame, Format, Sport } from '../types'
import { CHAMPIONSHIP_PRESETS } from './championships'

// Presets de temporada: atalhos que montam a sequência de campeonatos de um ano
// e os times de CADA campeonato (cada um com seu próprio elenco). Reaproveitam
// os modelos de campeonato (`championships.ts`) como blocos.

export interface SeasonPresetSlot {
  name: string
  format: Format
  game?: EsportsGame
  config: {
    homeAndAway?: boolean
    bestOf?: BestOf
    groupCount?: number
    qualifiersPerGroup?: number
    swissRounds?: number
  }
  teamIds: string[]
  /**
   * Vagas por classificação dinâmica, referenciando outro slot DESTE preset
   * pelo índice em `slots` (o id real só nasce no wizard). SOMA aos `teamIds`.
   * `offset` (0-based) permite faixas fora do topo (ex.: 3º e 4º da liga).
   */
  qualifiesFrom?: { slot: number; count: number; offset?: number }[]
  /** rótulo de fase pra agrupar a sequência no Hub (presets grandes, tipo VCT) */
  phaseLabel?: string
  /** vagas extras por consistência no ano — ver `SeasonSlot.vctConsistencyWildcards` */
  vctConsistencyWildcards?: {
    count: number
    regions: { kickoff: number; stage1: number; stage2Playoffs: number; stage2PlayIns: number }[]
  }
  /** bye vindo do ano anterior — ver `SeasonSlot.previousYearBye` (índice do slot-fonte) */
  previousYearBye?: { fromSlot: number }
}

export interface SeasonPreset {
  id: string
  label: string
  emoji: string
  sport: Sport
  game?: EsportsGame
  group: string
  description: string
  period: number
  slots: SeasonPresetSlot[]
}

/** monta um slot de temporada a partir de um modelo de campeonato existente */
function fromChamp(id: string, overrideName?: string): SeasonPresetSlot {
  const c = CHAMPIONSHIP_PRESETS.find((x) => x.id === id)
  if (!c) return { name: overrideName ?? id, format: 'league', config: {}, teamIds: [] }
  return { name: overrideName ?? c.label, format: c.format, game: c.game, config: c.config, teamIds: c.teamIds }
}

// Copa do Brasil — mata-mata com 16 clubes brasileiros (chave limpa)
const COPA_BRASIL: SeasonPresetSlot = {
  name: 'Copa do Brasil',
  format: 'cup',
  config: {},
  teamIds: [
    'flamengo', 'palmeiras', 'atletico-mg', 'fluminense', 'sao-paulo', 'corinthians', 'internacional',
    'gremio', 'botafogo', 'cruzeiro', 'athletico-pr', 'santos', 'vasco', 'bahia', 'fortaleza', 'bragantino'
  ]
}

const CHAMPIONS = (): SeasonPresetSlot => fromChamp('champions-liga', 'Champions League')

// ─────────────── Pirâmide sul-americana (circuito completo) ───────────────
// As 10 ligas nacionais rodam de verdade e classificam como na realidade:
// melhores de cada país → Libertadores (grupos de 32); faixa de baixo das
// vagas → Pré-Libertadores (mata-mata de 16, 4 sobem). O campeão continental
// encara o campeão da Champions na Copa Intercontinental.
const SUL_AMERICANA_SLOTS: SeasonPresetSlot[] = [
  fromChamp('brasileirao'),                              // 0
  fromChamp('liga-argentina'),                           // 1
  fromChamp('liga-chilena'),                             // 2
  fromChamp('liga-uruguaia'),                            // 3
  fromChamp('liga-colombiana'),                          // 4
  fromChamp('liga-equatoriana'),                         // 5
  fromChamp('liga-peruana'),                             // 6
  fromChamp('liga-paraguaia'),                           // 7
  fromChamp('liga-boliviana'),                           // 8
  fromChamp('liga-venezuelana'),                         // 9
  {
    name: 'Pré-Libertadores',
    format: 'cup',
    config: {},
    teamIds: [],
    // 3º e 4º de cada liga fora BR/ARG — 16 clubes, mata-mata, 4 vagas
    qualifiesFrom: [2, 3, 4, 5, 6, 7, 8, 9].map((slot) => ({ slot, count: 2, offset: 2 }))
  },
  {
    name: 'Libertadores',
    format: 'groups',
    config: { groupCount: 8, qualifiersPerGroup: 2 },
    teamIds: [],
    qualifiesFrom: [
      { slot: 0, count: 6 }, // Brasil: G-6 do Brasileirão
      { slot: 1, count: 6 }, // Argentina: top 6
      ...[2, 3, 4, 5, 6, 7, 8, 9].map((slot) => ({ slot, count: 2 })), // top 2 dos demais
      { slot: 10, count: 4 } // 4 melhores da Pré-Libertadores
    ]
  },
  CHAMPIONS(),                                           // 12
  {
    name: 'Copa Intercontinental',
    format: 'cup',
    config: {},
    teamIds: [],
    qualifiesFrom: [
      { slot: 11, count: 1 }, // campeão da Libertadores
      { slot: 12, count: 1 }  // campeão da Champions
    ]
  }
]

// VCT — circuito profissional completo (Kickoff → Masters 1 → Stage 1 →
// Masters 2 → Stage 2 → Champions), as 4 ligas regionais rodando de verdade.
// 25 campeonatos/ano — bem mais que os outros presets, por isso o Hub agrupa
// a sequência por fase (`phaseLabel`). Ver notas técnicas na documentação do
// projeto (Simulador - Modo Temporada) pra decisões de fidelidade x simplicidade.
const VCT_AMERICAS_TEAMS = [
  'hundred-thieves', 'cloud9', 'eg', 'furia', 'kru', 'leviatan', 'loud', 'mibr', 'nrg', 'sentinels', 'g2', 'envy'
]
const VCT_EMEA_TEAMS = [
  'bbl-esports', 'fnatic', 'fut-esports', 'karmine', 'navi', 'heretics', 'liquid', 'vitality',
  'giantx', 'm8', 'pcific', 'eternal-fire'
]
const VCT_PACIFIC_TEAMS = [
  'detonation', 'drx', 'geng', 'global-esports', 'paper-rex', 'rrq', 't1', 'team-secret',
  'zeta-division', 'full-sense', 'nongshim', 'varrel'
]
const VCT_CHINA_TEAMS = [
  'all-gamers', 'bilibili-gaming', 'edg', 'funplus-phoenix', 'jd-gaming', 'nova-esports',
  'titan-esports', 'trace-esports', 'tyloo', 'wolves-esports', 'dragon-ranger', 'xlg-esports'
]
const VCT_REGIONS = [
  { label: 'Americas', teams: VCT_AMERICAS_TEAMS },
  { label: 'EMEA', teams: VCT_EMEA_TEAMS },
  { label: 'Pacific', teams: VCT_PACIFIC_TEAMS },
  { label: 'China', teams: VCT_CHINA_TEAMS }
]

function vctMastersStage(
  label: string,
  sourceSlots: number[], // 4 slots-fonte (1 por região) desta rodada de qualificação
  phaseLabel: string
): SeasonPresetSlot[] {
  return [
    {
      name: `${label} — Fase Classificatória`,
      format: 'groups',
      game: 'valorant',
      config: { groupCount: 2, qualifiersPerGroup: 2, bestOf: 3 },
      teamIds: [],
      phaseLabel,
      // 2º e 3º colocados de cada região (8 times, 2 grupos cruzados)
      qualifiesFrom: sourceSlots.map((slot) => ({ slot, count: 2, offset: 1 }))
    },
    {
      name: `${label} — Playoffs`,
      format: 'double-elim',
      game: 'valorant',
      config: { bestOf: 3 },
      teamIds: [],
      phaseLabel,
      qualifiesFrom: [
        ...sourceSlots.map((slot) => ({ slot, count: 1 })), // 1º de cada região — bye direto
        { slot: sourceSlots[sourceSlots.length - 1] + 1, count: 4 } // top-4 da fase classificatória (slot logo acima)
      ]
    }
  ]
}

const VALORANT_SLOTS: SeasonPresetSlot[] = [
  // ── Kickoff (0-3) — mata-mata tripla eliminação, todas as 12 franquias ──
  ...VCT_REGIONS.map(
    (r): SeasonPresetSlot => ({
      name: `VCT ${r.label} — Kickoff`,
      format: 'triple-elim',
      game: 'valorant',
      config: { bestOf: 3 },
      teamIds: r.teams,
      phaseLabel: 'Kickoff',
      // a partir do 2º ano, os 4 representantes da região no Champions
      // anterior entram com vantagem de semeadura (viram o bye ao completar
      // a chave até 16); sem efeito no 1º ano (não há Champions anterior)
      previousYearBye: { fromSlot: 24 }
    })
  ),
  // ── Masters 1 (4-5) — 12 times: bye pros líderes do Kickoff + classificatória ──
  ...vctMastersStage('Masters 1', [0, 1, 2, 3], 'Masters 1'),
  // ── Stage 1 (6-9) — grupos + playoffs (top-4/grupo), todas as 12 franquias ──
  ...VCT_REGIONS.map(
    (r): SeasonPresetSlot => ({
      name: `VCT ${r.label} — Stage 1`,
      format: 'groups',
      game: 'valorant',
      config: { groupCount: 2, qualifiersPerGroup: 4, bestOf: 3 },
      teamIds: r.teams,
      phaseLabel: 'Stage 1'
    })
  ),
  // ── Masters 2 (10-11) — mesmo molde do Masters 1, agora a partir do Stage 1 ──
  ...vctMastersStage('Masters 2', [6, 7, 8, 9], 'Masters 2'),
  // ── Stage 2 (12-23) — grupos, depois Play-Ins e Playoffs, por região ──
  ...VCT_REGIONS.map(
    (r): SeasonPresetSlot => ({
      name: `VCT ${r.label} — Stage 2 · Grupos`,
      format: 'groups',
      game: 'valorant',
      config: { groupCount: 2, qualifiersPerGroup: 2, bestOf: 3 },
      teamIds: r.teams,
      phaseLabel: 'Stage 2'
    })
  ),
  ...VCT_REGIONS.map(
    (r, i): SeasonPresetSlot => ({
      name: `VCT ${r.label} — Stage 2 · Play-Ins`,
      format: 'double-elim',
      game: 'valorant',
      config: { bestOf: 3 },
      teamIds: [],
      phaseLabel: 'Stage 2',
      // os 4 que fizeram o mini-mata-mata do top-2/grupo ficam nas 4 primeiras
      // posições da classificação (índices 0-3); os outros 8 (3º-6º de cada
      // grupo) vêm em seguida, ordenados só pela posição no grupo
      qualifiesFrom: [{ slot: 12 + i, count: 8, offset: 4 }]
    })
  ),
  ...VCT_REGIONS.map(
    (r, i): SeasonPresetSlot => ({
      name: `VCT ${r.label} — Stage 2 · Playoffs`,
      format: 'cup',
      game: 'valorant',
      config: { bestOf: 3 },
      teamIds: [],
      phaseLabel: 'Stage 2',
      qualifiesFrom: [
        { slot: 12 + i, count: 4 }, // top-2/grupo direto (4)
        { slot: 16 + i, count: 4 } // sobreviventes dos Play-Ins (4)
      ]
    })
  ),
  // ── Champions (24) — 16 times: 2 finalistas do Stage 2 + 2 por consistência, por região ──
  {
    name: 'VCT Champions',
    format: 'groups',
    game: 'valorant',
    config: { groupCount: 4, qualifiersPerGroup: 2, bestOf: 3 },
    teamIds: [],
    phaseLabel: 'Champions',
    qualifiesFrom: [20, 21, 22, 23].map((slot) => ({ slot, count: 2 })), // finalistas do Stage 2 Playoffs
    vctConsistencyWildcards: {
      count: 2,
      regions: [0, 1, 2, 3].map((kickoff, i) => ({
        kickoff,
        stage1: 6 + i,
        stage2Playoffs: 20 + i,
        stage2PlayIns: 16 + i
      }))
    }
  }
]

// Eliminatórias CONMEBOL → Copa América (6 melhores + convidadas)
const ELIMINATORIAS_SLOTS: SeasonPresetSlot[] = [
  {
    name: 'Eliminatórias CONMEBOL',
    format: 'league',
    config: { homeAndAway: true },
    teamIds: [
      'brasil', 'argentina', 'uruguai', 'colombia', 'equador',
      'chile', 'peru', 'paraguai', 'bolivia', 'venezuela'
    ]
  },
  {
    name: 'Copa América',
    format: 'groups',
    config: { groupCount: 2, qualifiersPerGroup: 2 },
    teamIds: ['mexico', 'eua'], // convidadas
    qualifiesFrom: [{ slot: 0, count: 6 }] // 6 melhores das Eliminatórias
  }
]

export const SEASON_PRESETS: SeasonPreset[] = [
  // ───────────── Ligas europeias (liga nacional + Champions) ─────────────
  {
    id: 'sea-inglesa', label: 'Temporada Inglesa', emoji: '🦁', sport: 'football',
    group: 'Ligas europeias', period: 10,
    description: 'Premier League + Champions League, todo ano.',
    slots: [fromChamp('premier-league'), CHAMPIONS()]
  },
  {
    id: 'sea-espanhola', label: 'Temporada Espanhola', emoji: '🇪🇸', sport: 'football',
    group: 'Ligas europeias', period: 10,
    description: 'La Liga + Champions League, todo ano.',
    slots: [fromChamp('la-liga'), CHAMPIONS()]
  },
  {
    id: 'sea-italiana', label: 'Temporada Italiana', emoji: '🇮🇹', sport: 'football',
    group: 'Ligas europeias', period: 10,
    description: 'Serie A + Champions League, todo ano.',
    slots: [fromChamp('serie-a'), CHAMPIONS()]
  },
  {
    id: 'sea-alema', label: 'Temporada Alemã', emoji: '🇩🇪', sport: 'football',
    group: 'Ligas europeias', period: 10,
    description: 'Bundesliga + Champions League, todo ano.',
    slots: [fromChamp('bundesliga'), CHAMPIONS()]
  },
  {
    id: 'sea-francesa', label: 'Temporada Francesa', emoji: '🇫🇷', sport: 'football',
    group: 'Ligas europeias', period: 10,
    description: 'Ligue 1 + Champions League, todo ano.',
    slots: [fromChamp('ligue-1'), CHAMPIONS()]
  },
  // ───────────── Brasil ─────────────
  {
    id: 'sea-brasil', label: 'Temporada Brasileira', emoji: '🇧🇷', sport: 'football',
    group: 'Brasil', period: 10,
    description: 'Brasileirão + Copa do Brasil + Libertadores, todo ano.',
    slots: [fromChamp('brasileirao'), COPA_BRASIL, fromChamp('libertadores')]
  },
  // ───────────── América do Sul ─────────────
  {
    id: 'sea-sul-americana', label: 'Circuito Sul-Americano', emoji: '🌎', sport: 'football',
    group: 'América do Sul', period: 10,
    description:
      'As 10 ligas nacionais classificam como na realidade: Pré-Libertadores, Libertadores e Intercontinental contra o campeão da Champions.',
    slots: SUL_AMERICANA_SLOTS
  },
  {
    id: 'sea-eliminatorias', label: 'Eliminatórias & Copa América', emoji: '🏆', sport: 'football',
    group: 'América do Sul', period: 8,
    description: 'Eliminatórias CONMEBOL em pontos corridos; os 6 melhores + convidadas jogam a Copa América.',
    slots: ELIMINATORIAS_SLOTS
  },
  // ───────────── Seleções ─────────────
  {
    id: 'sea-selecoes', label: 'Temporada de Seleções', emoji: '🌍', sport: 'football',
    group: 'Seleções', period: 8,
    description: 'Eurocopa + Copa América + Copa do Mundo, todo ano.',
    slots: [fromChamp('eurocopa'), fromChamp('copa-america'), fromChamp('copa-mundo')]
  },
  // ───────────── E-sports ─────────────
  {
    id: 'sea-cs2', label: 'Temporada CS2', emoji: '🔫', sport: 'esports', game: 'cs2',
    group: 'E-sports', period: 10,
    description: 'CS Major + IEM/BLAST, todo ano.',
    slots: [fromChamp('cs-major'), fromChamp('iem-blast')]
  },
  {
    id: 'sea-valorant', label: 'Temporada Valorant', emoji: '🎯', sport: 'esports', game: 'valorant',
    group: 'E-sports', period: 10,
    description:
      'Circuito completo: Kickoff → Masters 1 → Stage 1 → Masters 2 → Stage 2 → Champions, nas 4 ligas regionais. 25 campeonatos por ano.',
    slots: VALORANT_SLOTS
  }
]

export function seasonPresetsForSport(sport: Sport): SeasonPreset[] {
  return SEASON_PRESETS.filter((p) => p.sport === sport)
}

/** presets de temporada agrupados por categoria (`group`) */
export function seasonPresetsGrouped(sport: Sport): Array<{ group: string; items: SeasonPreset[] }> {
  const out: Array<{ group: string; items: SeasonPreset[] }> = []
  for (const p of seasonPresetsForSport(sport)) {
    let bucket = out.find((b) => b.group === p.group)
    if (!bucket) {
      bucket = { group: p.group, items: [] }
      out.push(bucket)
    }
    bucket.items.push(p)
  }
  return out
}
