import type { EsportsGame } from '../types'
import data from './esports-rosters.json'

// Elencos reais por jogo (IGNs públicos dos titulares), empacotados offline.
// O mesmo time tem line-up diferente em cada jogo (ex.: FURIA no CS2 ≠ no
// Valorant). Times sem entrada aqui caem no gerador procedural de nomes.
//
// Fonte única pros dois jogos: Liquipedia (CC-BY-SA 3.0), via
// scripts/fetch-esports-rosters.mjs — `npm run esports-rosters`. Antes o CS2
// era copiado à mão da Liquipedia e o Valorant do VLR.gg; hoje os dois saem
// da mesma pipeline. Só titulares: técnico, analista e reserva ficam de fora.
//
// É uma "foto" do dia em que o script rodou — envelhece com o tempo. Times em
// transição podem ter 4 nomes (o gerador completa o 5º procedural).
export const ESPORTS_ROSTERS = data as Record<EsportsGame, Record<string, string[]>>

export function getEsportsRoster(game: EsportsGame, teamId: string): string[] | undefined {
  const roster = ESPORTS_ROSTERS[game]?.[teamId]
  // aceita 4+ (time em transição sem o 5º anunciado); o gerador completa o resto
  return roster && roster.length >= 4 ? roster : undefined
}

/** chave de armazenamento dos elencos editados pelo usuário (por jogo + time) */
export function rosterKey(game: EsportsGame, teamId: string): string {
  return `${game}::${teamId}`
}
