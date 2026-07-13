// Sorteio de grupos por potes regionais — só Valorant, só dentro da Temporada.
// Pote = posição de chegada do time na região de origem (via `arrivals`);
// o sorteio garante que nenhum grupo receba 2 times da mesma região, do
// jeito que os grandes eventos internacionais (VCT Champions/Masters) fazem
// de verdade. Se for inviável (ou algum time não tiver `region`), quem chama
// cai de volta no sorteio por força de sempre — sem mistura parcial.
import type { Group, Match, Team, TournamentConfig } from '../types'
import { uid, shuffle } from './rng'
import { roundRobinPairings } from './schedule'

const groupLetter = (i: number): string => String.fromCharCode(65 + i)

const REGION_LABEL: Record<string, string> = {
  americas: 'Americas',
  emea: 'EMEA',
  pacific: 'Pacific',
  china: 'China'
}

export interface RegionDrawResult {
  groups: Group[]
  matches: Match[]
  seedLabels: Record<string, string>
}

/** capacidade de cada grupo somando exatamente `n` times entre `g` grupos */
function capacities(n: number, g: number): number[] {
  const base = Math.floor(n / g)
  const extra = n % g
  return Array.from({ length: g }, (_, i) => base + (i < extra ? 1 : 0))
}

/**
 * Monta os grupos por potes regionais: nenhum grupo recebe 2 times da mesma
 * região. Retorna `null` quando o sorteio é inviável (times sem `region`,
 * ou a distribuição de regiões não cabe nos grupos) — quem chama cai de
 * volta no sorteio legado por força.
 */
export function buildRegionPotGroups(
  teams: Team[],
  config: TournamentConfig,
  arrivals: Record<string, { fromSlotId?: string; rank?: number }> | undefined
): RegionDrawResult | null {
  const G = config.groupCount
  if (!G || G < 1) return null
  if (!teams.every((t) => t.region)) return null

  const potOf = (team: Team): number => arrivals?.[team.id]?.rank ?? Number.POSITIVE_INFINITY
  const pots = new Map<number, Team[]>()
  for (const t of teams) {
    const key = potOf(t)
    if (!pots.has(key)) pots.set(key, [])
    pots.get(key)!.push(t)
  }
  // melhor pote primeiro — sorteio de verdade (World Cup/VCT): cada grupo recebe
  // no máximo ceil(potSize/G) times de um mesmo pote (1 quando pote e grupos
  // batem, ex. Champions 4x4; mais que 1 quando o pote é maior, ex. Masters
  // com 4 regiões em só 2 grupos), além de nunca 2 times da mesma região
  const potKeys = [...pots.keys()].sort((a, b) => a - b)
  const cap = capacities(teams.length, G)

  const groupRegions: Set<string>[] = Array.from({ length: G }, () => new Set())
  const groupPotCounts: Map<number, number>[] = Array.from({ length: G }, () => new Map())
  const groupIds: string[][] = Array.from({ length: G }, () => [])
  const counts = new Array(G).fill(0)

  const assignPot = (potKey: number, potCap: number, list: Team[], idx: number): boolean => {
    if (idx >= list.length) return true
    const team = list[idx]
    const groupOrder = shuffle(Array.from({ length: G }, (_, i) => i))
    for (const g of groupOrder) {
      if (counts[g] >= cap[g]) continue
      if (groupRegions[g].has(team.region!)) continue
      if ((groupPotCounts[g].get(potKey) ?? 0) >= potCap) continue
      groupRegions[g].add(team.region!)
      groupPotCounts[g].set(potKey, (groupPotCounts[g].get(potKey) ?? 0) + 1)
      groupIds[g].push(team.id)
      counts[g]++
      if (assignPot(potKey, potCap, list, idx + 1)) return true
      counts[g]--
      groupIds[g].pop()
      groupPotCounts[g].set(potKey, groupPotCounts[g].get(potKey)! - 1)
      groupRegions[g].delete(team.region!)
    }
    return false
  }
  for (const key of potKeys) {
    const potTeams = shuffle(pots.get(key)!)
    const potCap = Math.max(1, Math.ceil(potTeams.length / G))
    if (!assignPot(key, potCap, potTeams, 0)) return null
  }

  const groups: Group[] = groupIds.map((teamIds, i) => ({
    id: groupLetter(i),
    name: `Grupo ${groupLetter(i)}`,
    teamIds
  }))

  const matches: Match[] = []
  for (const grp of groups) {
    const pairings = roundRobinPairings(grp.teamIds, config.homeAndAway)
    for (const p of pairings) {
      matches.push({
        id: uid('m'),
        round: p.round,
        stage: `Grupo ${grp.id} · Rodada ${p.round}`,
        groupId: grp.id,
        homeId: p.homeId,
        awayId: p.awayId,
        played: false,
        homeScore: 0,
        awayScore: 0
      })
    }
  }

  const seedLabels: Record<string, string> = {}
  for (const team of teams) {
    const rank = arrivals?.[team.id]?.rank
    seedLabels[team.id] = rank != null ? `${REGION_LABEL[team.region!] ?? team.region} #${rank}` : (REGION_LABEL[team.region!] ?? team.region!)
  }

  return { groups, matches, seedLabels }
}
