import { GitFork, LayoutGrid, ListOrdered, Medal, Shuffle, Skull, Swords, type LucideIcon } from 'lucide-react'
import type { EsportsGame, Format, Sport } from '../types'

export const FORMAT_META: Record<
  Format,
  { label: string; short: string; desc: string; icon: LucideIcon }
> = {
  league: {
    label: 'Pontos Corridos',
    short: 'Liga',
    desc: 'Todos contra todos. Quem somar mais pontos leva o título.',
    icon: ListOrdered
  },
  cup: {
    label: 'Mata-Mata',
    short: 'Copa',
    desc: 'Eliminatórias diretas. Empate vai para prorrogação e pênaltis.',
    icon: GitFork
  },
  groups: {
    label: 'Grupos + Mata-Mata',
    short: 'Grupos',
    desc: 'Fase de grupos e, em seguida, chaveamento eliminatório.',
    icon: LayoutGrid
  },
  swiss: {
    label: 'Sistema Suíço',
    short: 'Suíço',
    desc: 'Rodadas pareadas por desempenho, sem eliminação imediata.',
    icon: Shuffle
  },
  'league-playoffs': {
    label: 'Liga + Playoffs',
    short: 'Playoffs',
    desc: 'Pontos corridos e, no fim, os melhores decidem o título no mata-mata.',
    icon: Medal
  },
  'double-elim': {
    label: 'Dupla Eliminação',
    short: 'Dupla elim.',
    desc: 'Chave superior e inferior: só sai quem perde duas vezes. Grande final com reset.',
    icon: Swords
  },
  'triple-elim': {
    label: 'Tripla Eliminação',
    short: 'Tripla elim.',
    desc: 'Winners, losers e última chance: o time só é eliminado após três derrotas.',
    icon: Skull
  }
}

export const SPORT_META: Record<Sport, { label: string; emoji: string; unit: string }> = {
  football: { label: 'Futebol', emoji: '⚽', unit: 'gols' },
  esports: { label: 'E-sports', emoji: '🎮', unit: 'mapas' }
}

export const FORMATS: Format[] = [
  'league',
  'cup',
  'groups',
  'swiss',
  'league-playoffs',
  'double-elim',
  'triple-elim'
]

export const GAME_META: Record<EsportsGame, { label: string; short: string; emoji: string }> = {
  cs2: { label: 'Counter-Strike 2', short: 'CS2', emoji: '🔫' },
  valorant: { label: 'Valorant', short: 'VAL', emoji: '🎯' }
}

export const ESPORTS_GAMES: EsportsGame[] = ['cs2', 'valorant']

/** formatos com fase de mata-mata (bracket) — só neles faz sentido trocar a série por fase */
export const KO_CAPABLE_FORMATS: Format[] = ['cup', 'groups', 'league-playoffs', 'double-elim', 'triple-elim']
/** opções de "a partir de qual fase" pro `bestOfKoOverride` — nº de times na rodada, rotulado via `roundName` */
export const KO_OVERRIDE_TIERS = [2, 4, 8, 16, 32, 64]
