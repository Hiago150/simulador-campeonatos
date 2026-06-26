import type { BestOf, EsportsGame, Format, Sport } from '../types'

// Modelos de campeonato prontos: ao escolher um, o Setup já vem com nome,
// esporte, formato, configuração e os clubes "lógicos" selecionados.
export interface ChampionshipPreset {
  id: string
  label: string
  emoji: string
  sport: Sport
  format: Format
  group: string // categoria para agrupar na UI
  description: string
  teamIds: string[]
  game?: EsportsGame
  config: {
    homeAndAway?: boolean
    bestOf?: BestOf
    groupCount?: number
    qualifiersPerGroup?: number
    swissRounds?: number
  }
}

// ───────────────────────── Listas reutilizáveis ─────────────────────────────

// Ligas nacionais (refletem o elenco real disponível na base de times)
const PREMIER = [
  'man-city', 'arsenal', 'liverpool', 'man-united', 'chelsea', 'tottenham', 'newcastle',
  'aston-villa', 'west-ham', 'brighton', 'everton', 'nottingham', 'wolves', 'crystal-palace',
  'fulham', 'brentford', 'bournemouth', 'leeds', 'leicester', 'burnley'
]
const LA_LIGA = [
  'real-madrid', 'barcelona', 'atletico', 'athletic', 'real-sociedad', 'villarreal', 'betis',
  'sevilla', 'valencia', 'celta', 'osasuna', 'girona', 'getafe', 'mallorca', 'espanyol',
  'rayo', 'alaves', 'las-palmas'
]
const SERIE_A = [
  'inter', 'milan', 'juventus', 'napoli', 'roma', 'lazio', 'atalanta', 'fiorentina', 'bologna',
  'torino', 'udinese', 'genoa', 'monza', 'verona', 'cagliari', 'lecce', 'empoli', 'sassuolo',
  'venezia', 'sampdoria'
]
const BUNDESLIGA = [
  'bayern', 'leverkusen', 'dortmund', 'leipzig', 'stuttgart', 'frankfurt', 'gladbach', 'wolfsburg',
  'werder', 'freiburg', 'union-berlin', 'hoffenheim', 'mainz', 'augsburg', 'koln', 'st-pauli',
  'heidenheim', 'schalke'
]
const LIGUE_1 = [
  'psg', 'monaco', 'marseille', 'lyon', 'lille', 'nice', 'rennes', 'lens', 'strasbourg', 'reims',
  'nantes', 'brest', 'toulouse', 'saint-etienne'
]

export const CHAMPIONSHIP_PRESETS: ChampionshipPreset[] = [
  // ═══════════════════════ Futebol — Europa ═══════════════════════
  {
    id: 'champions-liga',
    label: 'Champions League',
    emoji: '🏆',
    sport: 'football',
    format: 'swiss',
    group: 'Europa',
    description: 'Fase de liga: 36 clubes numa tabela única, 8 rodadas (formato atual).',
    config: { swissRounds: 8 },
    teamIds: [
      'real-madrid', 'man-city', 'bayern', 'barcelona', 'psg', 'liverpool', 'inter', 'arsenal',
      'atletico', 'dortmund', 'milan', 'juventus', 'man-united', 'chelsea', 'napoli', 'tottenham',
      'leipzig', 'leverkusen', 'frankfurt', 'stuttgart', 'benfica', 'porto', 'sporting', 'ajax',
      'psv', 'feyenoord', 'marseille', 'monaco', 'lille', 'atalanta', 'roma', 'celtic',
      'brugge', 'galatasaray', 'shakhtar', 'newcastle'
    ]
  },
  {
    id: 'europa-league',
    label: 'Europa League',
    emoji: '🥈',
    sport: 'football',
    format: 'swiss',
    group: 'Europa',
    description: 'Fase de liga: 24 clubes europeus de segundo escalão, 8 rodadas.',
    config: { swissRounds: 8 },
    teamIds: [
      'roma', 'lazio', 'fiorentina', 'villarreal', 'betis', 'real-sociedad', 'athletic',
      'brighton', 'aston-villa', 'west-ham', 'lyon', 'marseille', 'rangers', 'fenerbahce',
      'besiktas', 'braga', 'ajax', 'feyenoord', 'twente', 'anderlecht', 'freiburg', 'frankfurt',
      'sevilla', 'lens'
    ]
  },
  {
    id: 'copa-mundo',
    label: 'Copa do Mundo',
    emoji: '🌍',
    sport: 'football',
    format: 'groups',
    group: 'Seleções',
    description: '24 seleções: 8 grupos de 3 e mata-mata com os 16 melhores.',
    config: { groupCount: 8, qualifiersPerGroup: 2 },
    teamIds: [
      'brasil', 'franca', 'argentina', 'espanha', 'inglaterra', 'alemanha', 'portugal', 'holanda',
      'italia', 'belgica', 'croacia', 'uruguai', 'colombia', 'marrocos', 'mexico', 'eua',
      'japao', 'senegal', 'suica', 'dinamarca', 'coreia', 'servia', 'equador', 'australia'
    ]
  },
  {
    id: 'eurocopa',
    label: 'Eurocopa',
    emoji: '🇪🇺',
    sport: 'football',
    format: 'groups',
    group: 'Seleções',
    description: '12 seleções europeias: 4 grupos de 3 e mata-mata.',
    config: { groupCount: 4, qualifiersPerGroup: 2 },
    teamIds: [
      'franca', 'espanha', 'inglaterra', 'alemanha', 'portugal', 'holanda',
      'italia', 'belgica', 'croacia', 'suica', 'dinamarca', 'servia'
    ]
  },
  // ═══════════════════════ Futebol — Ligas nacionais ═══════════════════════
  {
    id: 'premier-league',
    label: 'Premier League',
    emoji: '🦁',
    sport: 'football',
    format: 'league',
    group: 'Ligas nacionais',
    description: 'Pontos corridos, ida e volta — 20 clubes ingleses.',
    config: { homeAndAway: true },
    teamIds: PREMIER
  },
  {
    id: 'la-liga',
    label: 'La Liga',
    emoji: '🇪🇸',
    sport: 'football',
    format: 'league',
    group: 'Ligas nacionais',
    description: 'Pontos corridos, ida e volta — clubes espanhóis.',
    config: { homeAndAway: true },
    teamIds: LA_LIGA
  },
  {
    id: 'serie-a',
    label: 'Serie A',
    emoji: '🇮🇹',
    sport: 'football',
    format: 'league',
    group: 'Ligas nacionais',
    description: 'Pontos corridos, ida e volta — 20 clubes italianos.',
    config: { homeAndAway: true },
    teamIds: SERIE_A
  },
  {
    id: 'bundesliga',
    label: 'Bundesliga',
    emoji: '🇩🇪',
    sport: 'football',
    format: 'league',
    group: 'Ligas nacionais',
    description: 'Pontos corridos, ida e volta — 18 clubes alemães.',
    config: { homeAndAway: true },
    teamIds: BUNDESLIGA
  },
  {
    id: 'ligue-1',
    label: 'Ligue 1',
    emoji: '🇫🇷',
    sport: 'football',
    format: 'league',
    group: 'Ligas nacionais',
    description: 'Pontos corridos, ida e volta — clubes franceses.',
    config: { homeAndAway: true },
    teamIds: LIGUE_1
  },
  {
    id: 'brasileirao',
    label: 'Brasileirão',
    emoji: '🇧🇷',
    sport: 'football',
    format: 'league',
    group: 'Ligas nacionais',
    description: 'Pontos corridos, ida e volta — 20 clubes do Brasil.',
    config: { homeAndAway: true },
    teamIds: [
      'flamengo', 'palmeiras', 'atletico-mg', 'fluminense', 'sao-paulo', 'corinthians',
      'internacional', 'gremio', 'botafogo', 'cruzeiro', 'athletico-pr', 'santos', 'vasco',
      'bahia', 'fortaleza', 'bragantino', 'vitoria', 'juventude', 'ceara', 'mirassol'
    ]
  },
  // ═══════════════════════ Futebol — Américas ═══════════════════════
  {
    id: 'libertadores',
    label: 'Libertadores',
    emoji: '🥇',
    sport: 'football',
    format: 'groups',
    group: 'Américas',
    description: '16 clubes sul-americanos: 4 grupos de 4 e mata-mata.',
    config: { groupCount: 4, qualifiersPerGroup: 2 },
    teamIds: [
      'flamengo', 'palmeiras', 'atletico-mg', 'fluminense', 'sao-paulo', 'botafogo',
      'internacional', 'gremio', 'boca', 'river', 'racing-club', 'independiente',
      'velez', 'estudiantes', 'cruzeiro', 'corinthians'
    ]
  },
  {
    id: 'copa-america',
    label: 'Copa América',
    emoji: '🌎',
    sport: 'football',
    format: 'groups',
    group: 'Seleções',
    description: '8 seleções (Conmebol + convidadas): 2 grupos e mata-mata.',
    config: { groupCount: 2, qualifiersPerGroup: 2 },
    teamIds: ['brasil', 'argentina', 'uruguai', 'colombia', 'equador', 'mexico', 'eua', 'japao']
  },
  {
    id: 'liga-mx',
    label: 'Liga MX',
    emoji: '🇲🇽',
    sport: 'football',
    format: 'league',
    group: 'Américas',
    description: 'Pontos corridos, ida e volta — clubes mexicanos.',
    config: { homeAndAway: true },
    teamIds: ['guadalajara', 'tigres', 'monterrey', 'cruz-azul', 'america-mx', 'pumas', 'toluca', 'pachuca']
  },
  {
    id: 'leagues-cup',
    label: 'Leagues Cup',
    emoji: '🌐',
    sport: 'football',
    format: 'groups',
    group: 'Américas',
    description: 'Liga MX × MLS: 12 clubes, 4 grupos e mata-mata.',
    config: { groupCount: 4, qualifiersPerGroup: 2 },
    teamIds: [
      'tigres', 'monterrey', 'america-mx', 'cruz-azul', 'guadalajara', 'pumas', 'toluca', 'pachuca',
      'inter-miami', 'lafc', 'la-galaxy', 'seattle'
    ]
  },
  // ═══════════════════════ Futebol — Mundo ═══════════════════════
  {
    id: 'mundial-clubes',
    label: 'Mundial de Clubes',
    emoji: '🏵️',
    sport: 'football',
    format: 'groups',
    group: 'Mundo',
    description: '32 gigantes de todos os continentes: 8 grupos e mata-mata.',
    config: { groupCount: 8, qualifiersPerGroup: 2 },
    teamIds: [
      'real-madrid', 'man-city', 'bayern', 'psg', 'inter', 'chelsea', 'dortmund', 'atletico',
      'benfica', 'porto', 'juventus', 'arsenal',
      'flamengo', 'palmeiras', 'fluminense', 'botafogo', 'boca', 'river', 'internacional', 'gremio',
      'america-mx', 'monterrey', 'tigres', 'inter-miami', 'lafc', 'seattle',
      'urawa', 'kashima', 'yokohama-fm', 'gamba', 'galatasaray', 'fenerbahce'
    ]
  },
  // ═══════════════════════ E-sports ═══════════════════════
  {
    id: 'cs-major',
    label: 'CS Major',
    emoji: '🔫',
    sport: 'esports',
    format: 'swiss',
    game: 'cs2',
    group: 'Counter-Strike 2',
    description: 'CS2 — 16 orgs no formato suíço (legends stage), séries BO3.',
    config: { swissRounds: 5, bestOf: 3 },
    teamIds: [
      'navi', 'vitality', 'faze', 'g2', 'spirit', 'mouz', 'falcons', 'fnatic',
      'heroic', 'astralis', 'furia', 'liquid', 'complexity', 'ence', 'big', 'cloud9'
    ]
  },
  {
    id: 'iem-blast',
    label: 'IEM / BLAST',
    emoji: '🏟️',
    sport: 'esports',
    format: 'groups',
    game: 'cs2',
    group: 'Counter-Strike 2',
    description: 'CS2 — 12 orgs de elite, 4 grupos e playoffs, séries BO3.',
    config: { groupCount: 4, qualifiersPerGroup: 2, bestOf: 3 },
    teamIds: [
      'vitality', 'spirit', 'navi', 'faze', 'g2', 'mouz', 'falcons', 'furia',
      'astralis', 'heroic', 'gamerlegion', 'eternal-fire'
    ]
  },
  {
    id: 'cs-brasil',
    label: 'CS Brasil',
    emoji: '🇧🇷',
    sport: 'esports',
    format: 'league',
    game: 'cs2',
    group: 'Counter-Strike 2',
    description: 'CS2 — orgs brasileiras em pontos corridos, séries BO3.',
    config: { homeAndAway: false, bestOf: 3 },
    teamIds: ['furia', 'pain', 'loud', 'imperial', 'mibr', 'red-canids', 'fluxo', 'legacy']
  },
  {
    id: 'vct-champions',
    label: 'VCT Champions',
    emoji: '🎯',
    sport: 'esports',
    format: 'groups',
    game: 'valorant',
    group: 'Valorant',
    description: 'Valorant — 16 times, fase de grupos e mata-mata, séries BO3.',
    config: { groupCount: 4, qualifiersPerGroup: 2, bestOf: 3 },
    teamIds: [
      'sentinels', 'loud', 'paper-rex', 'drx', 'geng', 't1', 'fnatic', 'nrg',
      'hundred-thieves', 'karmine', 'heretics', 'koi', 'm8', 'leviatan', 'kru', 'edg'
    ]
  },
  {
    id: 'vct-masters',
    label: 'VCT Masters',
    emoji: '🏅',
    sport: 'esports',
    format: 'groups',
    game: 'valorant',
    group: 'Valorant',
    description: 'Valorant — 8 melhores do mundo, 2 grupos e playoffs, séries BO3.',
    config: { groupCount: 2, qualifiersPerGroup: 2, bestOf: 3 },
    teamIds: ['sentinels', 'loud', 'paper-rex', 'geng', 't1', 'fnatic', 'nrg', 'heretics']
  }
]

export function championshipsForSport(sport: Sport): ChampionshipPreset[] {
  return CHAMPIONSHIP_PRESETS.filter((c) => c.sport === sport)
}

/** modelos agrupados por categoria (`group`), preservando a ordem de declaração */
export function championshipsGrouped(sport: Sport): Array<{ group: string; items: ChampionshipPreset[] }> {
  const out: Array<{ group: string; items: ChampionshipPreset[] }> = []
  for (const c of championshipsForSport(sport)) {
    let bucket = out.find((b) => b.group === c.group)
    if (!bucket) {
      bucket = { group: c.group, items: [] }
      out.push(bucket)
    }
    bucket.items.push(c)
  }
  return out
}
