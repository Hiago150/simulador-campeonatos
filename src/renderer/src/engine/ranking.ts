// Classificação final unificada de um torneio ENCERRADO, do melhor (índice 0)
// ao pior colocado — usada pelo acesso/descenso entre divisões da Temporada.
// Cada formato tem uma regra determinística:
//  - liga/suíço: a própria tabela final.
//  - liga+playoffs: a tabela da FASE DE LIGA (os playoffs só decidem o campeão,
//    não interferem no rebaixamento — como no futebol real).
//  - grupos/mata-mata/dupla/tripla: quem avança mais longe fica na frente
//    (campeão > vice > semifinalistas > ...); empate na mesma fase é desfeito
//    pelo desempenho geral no torneio (pontos, saldo, gols pró); eliminados na
//    fase de grupos ficam atrás de todos do mata-mata, ordenados pela posição
//    no grupo e depois pelo desempenho.
import type { StandingRow, Tournament } from '../types'
import { computeStandings } from './standings'
import { groupStandings } from './selectors'

/** ids das partidas que pertencem ao chaveamento (inclusive pernas de ida/volta) */
function bracketMatchIds(t: Tournament): Set<string> {
  const out = new Set<string>()
  for (const round of t.bracket ?? []) {
    for (const bm of round.matches) {
      if (bm.matchId) out.add(bm.matchId)
      for (const leg of bm.legIds ?? []) out.add(leg)
    }
  }
  return out
}

/** ordena por desempenho geral dentro de um recorte de standings (pontos → saldo → pró) */
function byStandings(rows: StandingRow[]): Map<string, number> {
  const order = new Map<string, number>()
  rows.forEach((r, i) => order.set(r.teamId, i))
  return order
}

function bracketRanking(t: Tournament): string[] {
  const ids = t.teams.map((x) => x.id)

  // profundidade: índice da rodada mais avançada do chaveamento em que o time apareceu
  const depth = new Map<string, number>()
  for (const round of t.bracket ?? []) {
    for (const bm of round.matches) {
      for (const teamId of [bm.homeId, bm.awayId]) {
        if (teamId) depth.set(teamId, Math.max(depth.get(teamId) ?? -1, round.index))
      }
    }
  }

  // desempate universal: desempenho geral no torneio inteiro
  const overall = byStandings(computeStandings(ids, t.matches))

  // eliminados na fase de grupos (nunca chegaram ao chaveamento): posição no grupo primeiro
  const groupPos = new Map<string, number>()
  if (t.groups?.length) {
    const byGroup = groupStandings(t)
    for (const rows of Object.values(byGroup)) {
      rows.forEach((r) => groupPos.set(r.teamId, r.rank))
    }
  }

  const score = (teamId: string): [number, number, number, number] => [
    teamId === t.champion ? 1 : 0, // campeão sempre primeiro
    depth.get(teamId) ?? -1, // mais fundo no chaveamento = melhor
    -(groupPos.get(teamId) ?? 0), // fora do chaveamento: 3º do grupo > 4º do grupo
    -(overall.get(teamId) ?? Number.MAX_SAFE_INTEGER) // desempenho geral
  ]

  return [...ids].sort((a, b) => {
    const sa = score(a)
    const sb = score(b)
    for (let i = 0; i < sa.length; i++) {
      if (sa[i] !== sb[i]) return sb[i] - sa[i]
    }
    return 0
  })
}

/**
 * Classificação final (melhor → pior) de um torneio encerrado, para qualquer
 * formato. Se o torneio não estiver encerrado, ainda devolve a melhor
 * estimativa com os dados disponíveis (útil apenas para exibição).
 */
export function finalRanking(t: Tournament): string[] {
  const ids = t.teams.map((x) => x.id)
  switch (t.format) {
    case 'league':
    case 'swiss':
      return computeStandings(ids, t.matches).map((r) => r.teamId)
    case 'league-playoffs': {
      const ko = bracketMatchIds(t)
      const leagueOnly = t.matches.filter((m) => !ko.has(m.id))
      const table = computeStandings(ids, leagueOnly).map((r) => r.teamId)
      // o campeão dos playoffs sobe pro topo; o resto mantém a ordem da tabela
      if (t.champion && table[0] !== t.champion) {
        return [t.champion, ...table.filter((id) => id !== t.champion)]
      }
      return table
    }
    default:
      return bracketRanking(t)
  }
}
