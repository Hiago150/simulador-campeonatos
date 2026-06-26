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
