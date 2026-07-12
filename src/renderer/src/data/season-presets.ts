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
    description: 'VCT Champions + VCT Masters, todo ano.',
    slots: [fromChamp('vct-champions'), fromChamp('vct-masters')]
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
