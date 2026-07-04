// Pools de nomes para gerar elencos procedurais (estáveis por time)
import type { EsportsGame, Player, Position, Team } from '../types'
import { getSquadData } from '../data/squads'
import { getEsportsRoster, rosterKey } from '../data/esports-rosters'

/** Overrides de elenco editados pelo usuário, chaveados por `${game}::${teamId}`. */
export type RosterOverrides = Record<string, string[]>
import { hashString, mulberry32 } from './rng'

const BR_FIRST = [
  'Gabriel', 'Lucas', 'Matheus', 'Rafael', 'Bruno', 'Felipe', 'Thiago', 'Pedro', 'Vinícius',
  'João', 'Carlos', 'Eduardo', 'Diego', 'Rodrigo', 'André', 'Marcelo', 'Fernando', 'Caio',
  'Wesley', 'Everton', 'Richarlison', 'Casemiro', 'Danilo', 'Allan', 'Murilo', 'Igor'
]
const BR_LAST = [
  'Silva', 'Santos', 'Oliveira', 'Souza', 'Costa', 'Pereira', 'Almeida', 'Lima', 'Gomes',
  'Ribeiro', 'Carvalho', 'Araújo', 'Fernandes', 'Barbosa', 'Rocha', 'Martins', 'Cardoso',
  'Teixeira', 'Moreira', 'Nascimento', 'Andrade', 'Vieira'
]

const EU_FIRST = [
  'Marco', 'Luka', 'Kevin', 'Sergio', 'Antoine', 'Toni', 'Mateo', 'Leon', 'Joshua', 'Mason',
  'Phil', 'Jack', 'Karim', 'Kylian', 'Erling', 'Robert', 'Federico', 'Lorenzo', 'Pedri',
  'Gavi', 'Jude', 'Declan', 'Bruno', 'Bernardo', 'Rúben', 'Pau', 'Niko'
]
const EU_LAST = [
  'Müller', 'Kroos', 'De Bruyne', 'Modrić', 'Ramos', 'Kanté', 'Kovačić', 'Goretzka', 'Kimmich',
  'Mount', 'Foden', 'Grealish', 'Benzema', 'Mbappé', 'Haaland', 'Lewandowski', 'Chiesa',
  'Insigne', 'González', 'Bellingham', 'Rice', 'Fernandes', 'Silva', 'Dias', 'Torres'
]

const GAMER_TAGS = [
  's1mple', 'ZywOo', 'NiKo', 'dev1ce', 'sh1ro', 'b1t', 'electronic', 'Twistzz', 'ropz', 'broky',
  'Ax1Le', 'donk', 'm0NESY', 'jL', 'frozen', 'huNter', 'blameF', 'stavn', 'jabbi', 'Spinx',
  'rain', 'karrigan', 'Magisk', 'NAF', 'EliGE', 'Brehze', 'Cadian', 'TeSeS', 'degster', 'Jame'
]
const GAMER_PREFIX = ['xX', 'Mr', 'iz', 'Pro', 'No', 'Dark', 'Red', 'Mad', 'Ghost', 'Cyber', 'Toxic', 'Lone']
const GAMER_CORE = ['Sniper', 'Reaper', 'Phantom', 'Viper', 'Frost', 'Blaze', 'Nova', 'Storm', 'Hawk', 'Wolf', 'Shadow', 'Venom', 'Rogue', 'Saint']

const FOOTBALL_LAYOUT: Position[] = [
  'GK', 'GK',
  'DEF', 'DEF', 'DEF', 'DEF', 'DEF',
  'MID', 'MID', 'MID', 'MID', 'MID',
  'FWD', 'FWD', 'FWD', 'FWD'
]

function fmtName(first: string, last: string): string {
  return `${first} ${last}`
}

export function generateSquad(team: Team, game?: EsportsGame, rosterOverrides?: RosterOverrides): Player[] {
  // Elenco real (TheSportsDB), quando disponível para o time
  if (team.sport === 'football') {
    const real = getSquadData(team.id)
    if (real) {
      return real.map((p, i) => ({ id: `${team.id}_p${i}`, name: p.name, position: p.pos }))
    }
  }

  const roles: Position[] = ['FWD', 'FWD', 'MID', 'MID', 'DEF'] // entry/awp/rifler/support/igl visual

  // Elenco de e-sports: 1º o editado pelo usuário, depois o curado (por jogo)
  if (team.sport === 'esports' && game) {
    const override = rosterOverrides?.[rosterKey(game, team.id)]
    const real = override && override.length >= 5 ? override : getEsportsRoster(game, team.id)
    if (real) {
      const names = real.slice(0, 5)
      // time em transição (4 anunciados): completa com um tag procedural estável
      if (names.length < 5) {
        const fillRng = mulberry32(hashString(team.id + (game ?? '') + 'fill'))
        const fr = <T,>(arr: T[]): T => arr[Math.floor(fillRng() * arr.length)]
        while (names.length < 5) {
          const tag = `${fr(GAMER_PREFIX)}${fr(GAMER_CORE)}${Math.floor(fillRng() * 90 + 10)}`
          if (!names.includes(tag)) names.push(tag)
        }
      }
      return names.map((name, i) => ({ id: `${team.id}_p${i}`, name, position: roles[i] }))
    }
  }

  const rng = mulberry32(hashString(team.id + team.name + (game ?? '')))
  const r = <T,>(arr: T[]): T => arr[Math.floor(rng() * arr.length)]
  const players: Player[] = []

  if (team.sport === 'esports') {
    const used = new Set<string>()
    for (let i = 0; i < 5; i++) {
      let tag = ''
      let guard = 0
      do {
        const style = rng()
        if (style < 0.5) tag = r(GAMER_TAGS)
        else tag = `${r(GAMER_PREFIX)}${r(GAMER_CORE)}${Math.floor(rng() * 90 + 10)}`
        guard++
      } while (used.has(tag) && guard < 12)
      used.add(tag)
      players.push({ id: `${team.id}_p${i}`, name: tag, position: roles[i] })
    }
    return players
  }

  // futebol
  const isBR = team.country === 'Brasil' || /brasil|flamengo|palmeiras|corinthians|são|sao|grêmio|gremio|cruzeiro|atlético|atletico|fluminense|botafogo|vasco|internacional|santos|bahia/i.test(
    team.name
  )
  const firsts = isBR ? BR_FIRST : EU_FIRST
  const lasts = isBR ? BR_LAST : EU_LAST
  const used = new Set<string>()
  for (let i = 0; i < FOOTBALL_LAYOUT.length; i++) {
    let name = ''
    let guard = 0
    do {
      name = fmtName(r(firsts), r(lasts))
      guard++
    } while (used.has(name) && guard < 16)
    used.add(name)
    players.push({ id: `${team.id}_p${i}`, name, position: FOOTBALL_LAYOUT[i] })
  }
  return players
}

/** Garante que o time tenha um elenco gerado (mutação idempotente). */
export function ensureSquad(team: Team, game?: EsportsGame, rosterOverrides?: RosterOverrides): Team {
  if (team.squad && team.squad.length > 0) return team
  return { ...team, squad: generateSquad(team, game, rosterOverrides) }
}

/** Nomes do elenco efetivo de e-sports (editado → curado → procedural). */
export function effectiveEsportsRoster(
  team: Team,
  game: EsportsGame,
  rosterOverrides?: RosterOverrides
): string[] {
  return generateSquad(team, game, rosterOverrides)
    .slice(0, 5)
    .map((p) => p.name)
}
