import type { Sport } from '../types'
import { CHAMPIONSHIP_PRESETS } from './championships'

// Coleções/presets de times: filtros rápidos na seleção de times do Setup
// (e do modo Temporada). Cada um seleciona os clubes/times "lógicos".
export interface Collection {
  id: string
  label: string
  sport: Sport
  group: string
  teamIds: string[]
}

/** reaproveita a lista de times de um modelo de campeonato — coleção e modelo nunca dessincronizam */
const fromChamp = (id: string): string[] => CHAMPIONSHIP_PRESETS.find((c) => c.id === id)?.teamIds ?? []

export const COLLECTIONS: Collection[] = [
  // ──────────────── Futebol — Ligas nacionais ────────────────
  {
    id: 'br-clubes',
    label: 'Brasileirão',
    sport: 'football',
    group: 'Ligas nacionais',
    teamIds: [
      'flamengo', 'palmeiras', 'atletico-mg', 'fluminense', 'sao-paulo', 'corinthians',
      'internacional', 'gremio', 'botafogo', 'cruzeiro', 'athletico-pr', 'santos', 'vasco',
      'bahia', 'fortaleza', 'bragantino', 'vitoria', 'juventude', 'ceara', 'mirassol'
    ]
  },
  {
    id: 'br-serie-b',
    label: 'Brasileirão Série B',
    sport: 'football',
    group: 'Ligas nacionais',
    teamIds: fromChamp('brasileirao-b')
  },
  {
    id: 'br-serie-c',
    label: 'Brasileirão Série C',
    sport: 'football',
    group: 'Ligas nacionais',
    teamIds: ['abc', 'confianca', 'sao-bernardo', 'ypiranga', 'brusque', 'figueirense', 'botafogo-pb', 'tombense']
  },
  {
    id: 'premier',
    label: 'Premier League',
    sport: 'football',
    group: 'Ligas nacionais',
    teamIds: [
      'man-city', 'arsenal', 'liverpool', 'man-united', 'chelsea', 'tottenham', 'newcastle',
      'aston-villa', 'west-ham', 'brighton', 'everton', 'nottingham', 'wolves', 'crystal-palace',
      'fulham', 'brentford', 'bournemouth', 'leeds', 'leicester', 'burnley'
    ]
  },
  {
    id: 'la-liga',
    label: 'La Liga',
    sport: 'football',
    group: 'Ligas nacionais',
    teamIds: [
      'real-madrid', 'barcelona', 'atletico', 'athletic', 'real-sociedad', 'villarreal', 'betis',
      'sevilla', 'valencia', 'celta', 'osasuna', 'girona', 'getafe', 'mallorca', 'espanyol',
      'rayo', 'alaves', 'las-palmas'
    ]
  },
  {
    id: 'serie-a',
    label: 'Serie A',
    sport: 'football',
    group: 'Ligas nacionais',
    teamIds: [
      'inter', 'milan', 'juventus', 'napoli', 'roma', 'lazio', 'atalanta', 'fiorentina', 'bologna',
      'torino', 'udinese', 'genoa', 'monza', 'verona', 'cagliari', 'lecce', 'empoli', 'sassuolo',
      'venezia', 'sampdoria'
    ]
  },
  {
    id: 'bundesliga',
    label: 'Bundesliga',
    sport: 'football',
    group: 'Ligas nacionais',
    teamIds: [
      'bayern', 'leverkusen', 'dortmund', 'leipzig', 'stuttgart', 'frankfurt', 'gladbach', 'wolfsburg',
      'werder', 'freiburg', 'union-berlin', 'hoffenheim', 'mainz', 'augsburg', 'koln', 'st-pauli',
      'heidenheim', 'schalke'
    ]
  },
  {
    id: 'ligue-1',
    label: 'Ligue 1',
    sport: 'football',
    group: 'Ligas nacionais',
    teamIds: [
      'psg', 'monaco', 'marseille', 'lyon', 'lille', 'nice', 'rennes', 'lens', 'strasbourg', 'reims',
      'nantes', 'brest', 'toulouse', 'saint-etienne'
    ]
  },
  {
    id: 'championship-ing',
    label: 'Championship (ING)',
    sport: 'football',
    group: 'Ligas nacionais',
    teamIds: fromChamp('championship-ing')
  },
  {
    id: 'bundesliga-2',
    label: '2. Bundesliga',
    sport: 'football',
    group: 'Ligas nacionais',
    teamIds: fromChamp('bundesliga-2')
  },
  // América do Sul — ligas nacionais completas (espelham os modelos)
  {
    id: 'liga-argentina',
    label: 'Primera División (ARG)',
    sport: 'football',
    group: 'América do Sul',
    teamIds: fromChamp('liga-argentina')
  },
  {
    id: 'liga-chilena',
    label: 'Primera División (CHI)',
    sport: 'football',
    group: 'América do Sul',
    teamIds: fromChamp('liga-chilena')
  },
  {
    id: 'liga-uruguaia',
    label: 'Primera División (URU)',
    sport: 'football',
    group: 'América do Sul',
    teamIds: fromChamp('liga-uruguaia')
  },
  {
    id: 'liga-paraguaia',
    label: 'Primera División (PAR)',
    sport: 'football',
    group: 'América do Sul',
    teamIds: fromChamp('liga-paraguaia')
  },
  {
    id: 'liga-colombiana',
    label: 'Primera A (COL)',
    sport: 'football',
    group: 'América do Sul',
    teamIds: fromChamp('liga-colombiana')
  },
  {
    id: 'liga-equatoriana',
    label: 'LigaPro (EQU)',
    sport: 'football',
    group: 'América do Sul',
    teamIds: fromChamp('liga-equatoriana')
  },
  {
    id: 'liga-peruana',
    label: 'Liga 1 (PER)',
    sport: 'football',
    group: 'América do Sul',
    teamIds: fromChamp('liga-peruana')
  },
  {
    id: 'liga-boliviana',
    label: 'División Profesional (BOL)',
    sport: 'football',
    group: 'América do Sul',
    teamIds: fromChamp('liga-boliviana')
  },
  {
    id: 'liga-venezuelana',
    label: 'Liga FUTVE (VEN)',
    sport: 'football',
    group: 'América do Sul',
    teamIds: fromChamp('liga-venezuelana')
  },
  {
    id: 'liga-mx',
    label: 'Liga MX',
    sport: 'football',
    group: 'Ligas nacionais',
    teamIds: ['guadalajara', 'tigres', 'monterrey', 'cruz-azul', 'america-mx', 'pumas', 'toluca', 'pachuca']
  },
  // ──────────────── Futebol — Continentais ────────────────
  {
    id: 'champions',
    label: 'Champions (Europa)',
    sport: 'football',
    group: 'Continentais',
    teamIds: [
      'real-madrid', 'man-city', 'bayern', 'barcelona', 'psg', 'liverpool', 'inter', 'arsenal',
      'atletico', 'dortmund', 'milan', 'juventus', 'man-united', 'chelsea', 'napoli', 'tottenham',
      'leipzig', 'leverkusen', 'frankfurt', 'stuttgart', 'benfica', 'porto', 'sporting', 'ajax',
      'psv', 'feyenoord', 'marseille', 'monaco', 'lille', 'atalanta', 'roma', 'celtic',
      'brugge', 'galatasaray', 'shakhtar', 'newcastle'
    ]
  },
  {
    id: 'libertadores',
    label: 'Libertadores',
    sport: 'football',
    group: 'Continentais',
    teamIds: [
      'flamengo', 'palmeiras', 'atletico-mg', 'fluminense', 'sao-paulo', 'botafogo',
      'internacional', 'gremio', 'boca', 'river', 'racing-club', 'independiente',
      'velez', 'estudiantes', 'cruzeiro', 'corinthians'
    ]
  },
  {
    id: 'sul-americanos',
    label: 'Sul-americanos',
    sport: 'football',
    group: 'Continentais',
    teamIds: [
      'flamengo', 'palmeiras', 'atletico-mg', 'fluminense', 'sao-paulo', 'corinthians', 'internacional',
      'gremio', 'botafogo', 'cruzeiro', 'boca', 'river', 'racing-club', 'independiente', 'san-lorenzo',
      'estudiantes', 'velez', 'talleres', 'huracan'
    ]
  },
  // ──────────────── Futebol — Seleções ────────────────
  {
    id: 'copa-mundo',
    label: 'Copa do Mundo 2026',
    sport: 'football',
    group: 'Seleções',
    teamIds: fromChamp('copa-mundo')
  },
  {
    id: 'eurocopa',
    label: 'Eurocopa',
    sport: 'football',
    group: 'Seleções',
    teamIds: [
      'franca', 'espanha', 'inglaterra', 'alemanha', 'portugal', 'holanda', 'italia', 'belgica',
      'croacia', 'suica', 'dinamarca', 'servia'
    ]
  },
  {
    id: 'copa-america',
    label: 'Copa América',
    sport: 'football',
    group: 'Seleções',
    teamIds: fromChamp('copa-america')
  },
  // ──────────────── E-sports ────────────────
  {
    id: 'es-cs',
    label: 'CS2 (elite)',
    sport: 'esports',
    group: 'Counter-Strike 2',
    teamIds: [...new Set([...fromChamp('cs-major'), 'eternal-fire', 'gamerlegion', 'apeks'])]
  },
  {
    id: 'es-cs-br',
    label: 'CS2 Brasil',
    sport: 'esports',
    group: 'Counter-Strike 2',
    teamIds: ['furia', 'pain', 'loud', 'imperial', 'mibr', 'red-canids', 'fluxo', 'legacy']
  },
  {
    id: 'es-val',
    label: 'Valorant (elite)',
    sport: 'esports',
    group: 'Valorant',
    teamIds: fromChamp('vct-champions')
  },
  {
    id: 'es-val-br',
    label: 'Valorant Brasil',
    sport: 'esports',
    group: 'Valorant',
    teamIds: ['loud', 'furia', 'mibr', 'leviatan', 'kru']
  },
  {
    id: 'vct-americas',
    label: 'VCT Americas',
    sport: 'esports',
    group: 'Valorant',
    teamIds: fromChamp('vct-americas')
  },
  {
    id: 'vct-emea',
    label: 'VCT EMEA',
    sport: 'esports',
    group: 'Valorant',
    teamIds: fromChamp('vct-emea')
  },
  {
    id: 'vct-pacific',
    label: 'VCT Pacific',
    sport: 'esports',
    group: 'Valorant',
    teamIds: fromChamp('vct-pacific')
  },
  {
    id: 'vct-china',
    label: 'VCT China',
    sport: 'esports',
    group: 'Valorant',
    teamIds: fromChamp('vct-china')
  },
  // ──────────────── E-sports — Mistos ────────────────
  {
    id: 'es-br',
    label: 'Brasileiros',
    sport: 'esports',
    group: 'Mistos',
    teamIds: ['furia', 'pain', 'loud', 'imperial', 'mibr', 'red-canids', 'fluxo', 'legacy']
  },
  {
    id: 'es-worlds',
    label: 'WORLDS',
    sport: 'esports',
    group: 'Mistos',
    teamIds: [
      'vitality', 'navi', 'spirit', 'falcons', 'faze', 'g2', 'loud', 'fnatic', 'geng',
      'sentinels', 'paper-rex', 't1', 'heretics', 'furia', 'mouz', 'karmine'
    ]
  }
]

export function collectionsForSport(sport: Sport): Collection[] {
  return COLLECTIONS.filter((c) => c.sport === sport)
}

export function collectionById(id: string): Collection | undefined {
  return COLLECTIONS.find((c) => c.id === id)
}

/** coleções agrupadas por categoria (`group`), preservando a ordem de declaração */
export function collectionsGrouped(sport: Sport): Array<{ group: string; items: Collection[] }> {
  const out: Array<{ group: string; items: Collection[] }> = []
  for (const c of collectionsForSport(sport)) {
    let bucket = out.find((b) => b.group === c.group)
    if (!bucket) {
      bucket = { group: c.group, items: [] }
      out.push(bucket)
    }
    bucket.items.push(c)
  }
  return out
}
