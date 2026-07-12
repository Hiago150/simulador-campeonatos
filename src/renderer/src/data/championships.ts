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

// Ligas nacionais da CONMEBOL (exportadas: alimentam a pirâmide sul-americana
// dos presets de temporada — liga nacional → Pré-Libertadores → Libertadores)
export const ARG_PRIMERA = [
  'boca', 'river', 'racing-club', 'independiente', 'san-lorenzo', 'estudiantes', 'velez',
  'talleres', 'huracan', 'lanus', 'rosario-central', 'argentinos-jrs', 'newells',
  'defensa-justicia', 'godoy-cruz', 'belgrano', 'banfield', 'gimnasia-lp', 'instituto',
  'atletico-tucuman', 'union-santa-fe', 'central-cordoba', 'tigre', 'platense',
  'independiente-riv', 'barracas-central', 'sarmiento', 'deportivo-riestra', 'aldosivi',
  'san-martin-sj'
]
export const CHI_PRIMERA = [
  'colo-colo', 'u-de-chile', 'u-catolica', 'coquimbo-unido', 'ohiggins', 'palestino',
  'cobresal', 'audax-italiano', 'union-espanola', 'huachipato', 'everton-cl', 'nublense',
  'union-la-calera', 'deportes-iquique', 'la-serena', 'deportes-limache'
]
export const URU_PRIMERA = [
  'penarol', 'nacional-uy', 'defensor-sporting', 'liverpool-uy', 'danubio', 'wanderers-uy',
  'river-uy', 'boston-river', 'cerro-largo', 'torque', 'cerro-uy', 'racing-uy',
  'plaza-colonia', 'juventud-uy', 'miramar-misiones', 'progreso'
]
export const PAR_PRIMERA = [
  'olimpia', 'cerro-porteno', 'libertad', 'guarani-py', 'nacional-py', 'sportivo-luqueno',
  'sportivo-trinidense', 'sportivo-ameliano', 'tacuary', 'dos-de-mayo', 'general-caballero',
  'recoleta'
]
export const COL_PRIMERA = [
  'atletico-nacional', 'millonarios', 'america-cali', 'junior-barranquilla', 'santa-fe',
  'independiente-medellin', 'tolima', 'deportivo-cali', 'once-caldas', 'bucaramanga',
  'pereira', 'aguilas-doradas', 'la-equidad', 'envigado', 'deportivo-pasto', 'alianza-fc',
  'fortaleza-ceif', 'boyaca-chico', 'union-magdalena', 'llaneros'
]
export const ECU_LIGAPRO = [
  'barcelona-sc', 'ldu-quito', 'independiente-del-valle', 'emelec', 'aucas', 'u-catolica-ec',
  'el-nacional', 'delfin', 'deportivo-cuenca', 'orense', 'macara', 'mushuc-runa',
  'tecnico-universitario', 'libertad-ec', 'manta-fc', 'vinotinto-ec'
]
export const PER_LIGA1 = [
  'universitario', 'alianza-lima', 'sporting-cristal', 'melgar', 'cienciano', 'cusco-fc',
  'sport-huancayo', 'deportivo-garcilaso', 'atletico-grau', 'adt', 'sport-boys', 'utc',
  'alianza-atletico', 'los-chankas', 'binacional', 'ayacucho-fc', 'comerciantes-unidos',
  'juan-pablo-ii'
]
export const BOL_PROFESIONAL = [
  'bolivar', 'the-strongest', 'always-ready', 'blooming', 'oriente-petrolero', 'wilstermann',
  'nacional-potosi', 'guabira', 'san-antonio-bb', 'real-tomayapo', 'aurora-bo', 'gv-san-jose',
  'independiente-petrolero', 'universitario-vinto', 'real-oruro', 'real-santa-cruz'
]
export const VEN_FUTVE = [
  'deportivo-tachira', 'caracas-fc', 'academia-puerto-cabello', 'deportivo-la-guaira',
  'metropolitanos', 'estudiantes-merida', 'carabobo', 'zamora-fc', 'monagas', 'portuguesa-fc',
  'mineros', 'ucv', 'rayo-zuliano', 'angostura'
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
    label: 'Copa do Mundo 2026',
    emoji: '🌍',
    sport: 'football',
    format: 'groups',
    group: 'Seleções',
    description: 'Edição 2026 (Canadá/México/EUA): as 48 seleções classificadas, 16 grupos de 3 e mata-mata com os 32 melhores.',
    config: { groupCount: 16, qualifiersPerGroup: 2 },
    teamIds: [
      // anfitriãs
      'canada', 'mexico', 'eua',
      // AFC
      'australia', 'iraque', 'ira', 'japao', 'jordania', 'coreia', 'catar', 'arabia-saudita', 'uzbequistao',
      // CAF
      'argelia', 'cabo-verde', 'rd-congo', 'costa-do-marfim', 'egito', 'gana', 'marrocos', 'senegal',
      'africa-do-sul', 'tunisia',
      // CONCACAF
      'curacao', 'haiti', 'panama',
      // CONMEBOL
      'argentina', 'brasil', 'colombia', 'equador', 'paraguai', 'uruguai',
      // OFC
      'nova-zelandia',
      // UEFA
      'austria', 'belgica', 'bosnia', 'croacia', 'tchequia', 'inglaterra', 'franca', 'alemanha',
      'holanda', 'noruega', 'portugal', 'escocia', 'espanha', 'suecia', 'suica', 'turquia'
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
  // ═══════════════════════ Futebol — América do Sul ═══════════════════════
  {
    id: 'liga-argentina',
    label: 'Primera División ARG',
    emoji: '🇦🇷',
    sport: 'football',
    format: 'league',
    group: 'América do Sul',
    description: 'Pontos corridos, turno único — 30 clubes argentinos.',
    config: { homeAndAway: false },
    teamIds: ARG_PRIMERA
  },
  {
    id: 'liga-chilena',
    label: 'Primera División CHI',
    emoji: '🇨🇱',
    sport: 'football',
    format: 'league',
    group: 'América do Sul',
    description: 'Pontos corridos, ida e volta — 16 clubes chilenos.',
    config: { homeAndAway: true },
    teamIds: CHI_PRIMERA
  },
  {
    id: 'liga-uruguaia',
    label: 'Primera División URU',
    emoji: '🇺🇾',
    sport: 'football',
    format: 'league',
    group: 'América do Sul',
    description: 'Pontos corridos, turno único — 16 clubes uruguaios.',
    config: { homeAndAway: false },
    teamIds: URU_PRIMERA
  },
  {
    id: 'liga-paraguaia',
    label: 'Primera División PAR',
    emoji: '🇵🇾',
    sport: 'football',
    format: 'league',
    group: 'América do Sul',
    description: 'Pontos corridos, ida e volta — 12 clubes paraguaios.',
    config: { homeAndAway: true },
    teamIds: PAR_PRIMERA
  },
  {
    id: 'liga-colombiana',
    label: 'Primera A COL',
    emoji: '🇨🇴',
    sport: 'football',
    format: 'league',
    group: 'América do Sul',
    description: 'Pontos corridos, turno único — 20 clubes colombianos.',
    config: { homeAndAway: false },
    teamIds: COL_PRIMERA
  },
  {
    id: 'liga-equatoriana',
    label: 'LigaPro EQU',
    emoji: '🇪🇨',
    sport: 'football',
    format: 'league',
    group: 'América do Sul',
    description: 'Pontos corridos, turno único — 16 clubes equatorianos.',
    config: { homeAndAway: false },
    teamIds: ECU_LIGAPRO
  },
  {
    id: 'liga-peruana',
    label: 'Liga 1 PER',
    emoji: '🇵🇪',
    sport: 'football',
    format: 'league',
    group: 'América do Sul',
    description: 'Pontos corridos, turno único — 18 clubes peruanos.',
    config: { homeAndAway: false },
    teamIds: PER_LIGA1
  },
  {
    id: 'liga-boliviana',
    label: 'División Profesional BOL',
    emoji: '🇧🇴',
    sport: 'football',
    format: 'league',
    group: 'América do Sul',
    description: 'Pontos corridos, turno único — 16 clubes bolivianos.',
    config: { homeAndAway: false },
    teamIds: BOL_PROFESIONAL
  },
  {
    id: 'liga-venezuelana',
    label: 'Liga FUTVE VEN',
    emoji: '🇻🇪',
    sport: 'football',
    format: 'league',
    group: 'América do Sul',
    description: 'Pontos corridos, turno único — 14 clubes venezuelanos.',
    config: { homeAndAway: false },
    teamIds: VEN_FUTVE
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
    teamIds: ['brasil', 'argentina', 'uruguai', 'colombia', 'equador', 'mexico', 'eua', 'panama']
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
      // complexity saiu do CS2 (elenco vendido) e cloud9/fnatic não competem mais no jogo — trocados
      // por vp/mibr/pain, orgs de CS2 de verdade com elenco curado
      'navi', 'vitality', 'faze', 'g2', 'spirit', 'mouz', 'falcons', 'vp',
      'heroic', 'astralis', 'furia', 'liquid', 'mibr', 'ence', 'big', 'pain'
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
    description: 'Valorant — 4 melhores de cada região da VCT 2026, fase de grupos e mata-mata, séries BO3.',
    config: { groupCount: 4, qualifiersPerGroup: 2, bestOf: 3 },
    teamIds: [
      // Americas
      'sentinels', 'loud', 'nrg', 'g2',
      // EMEA
      'fnatic', 'heretics', 'vitality', 'karmine',
      // Pacific
      'paper-rex', 'drx', 't1', 'geng',
      // China
      'edg', 'titan-esports', 'jd-gaming', 'bilibili-gaming'
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
    description: 'Valorant — 2 melhores de cada região da VCT 2026, 2 grupos e playoffs, séries BO3.',
    config: { groupCount: 2, qualifiersPerGroup: 2, bestOf: 3 },
    teamIds: ['sentinels', 'loud', 'fnatic', 'heretics', 'paper-rex', 't1', 'edg', 'titan-esports']
  },
  // ═══════════════════════ Futebol — divisões de acesso ═══════════════════════
  {
    id: 'brasileirao-b',
    label: 'Brasileirão Série B',
    emoji: '🇧🇷',
    sport: 'football',
    format: 'league',
    group: 'Ligas nacionais',
    description: 'Pontos corridos, ida e volta — 20 clubes da Série B.',
    config: { homeAndAway: true },
    teamIds: [
      'vila-nova', 'remo', 'paysandu', 'amazonas-fc', 'ferroviaria', 'athletic-mg', 'volta-redonda',
      'atletico-go', 'nautico', 'csa', 'coritiba', 'avai', 'operario', 'ponte-preta', 'guarani',
      'chapecoense', 'botafogo-sp', 'ituano', 'crb', 'criciuma'
    ]
  },
  {
    id: 'championship-ing',
    label: 'Championship',
    emoji: '🏴',
    sport: 'football',
    format: 'league',
    group: 'Ligas nacionais',
    description: 'Pontos corridos, ida e volta — 16 clubes da 2ª divisão inglesa.',
    config: { homeAndAway: true },
    teamIds: [
      'sheffield-wed', 'middlesbrough', 'west-brom', 'norwich', 'watford', 'coventry', 'preston',
      'blackburn', 'millwall', 'hull', 'swansea', 'cardiff', 'qpr', 'stoke', 'bristol-city', 'portsmouth'
    ]
  },
  {
    id: 'bundesliga-2',
    label: '2. Bundesliga',
    emoji: '🇩🇪',
    sport: 'football',
    format: 'league',
    group: 'Ligas nacionais',
    description: 'Pontos corridos, ida e volta — 10 clubes da 2ª divisão alemã.',
    config: { homeAndAway: true },
    teamIds: [
      'hamburgo', 'fortuna-dus', 'hannover', 'kaiserslautern', 'karlsruher', 'elversberg',
      'greuther-furth', 'braunschweig', 'nurnberg', 'paderborn'
    ]
  },
  // ═══════════════════════ Valorant — ligas regionais VCT 2026 ═══════════════════════
  {
    id: 'vct-americas',
    label: 'VCT Americas',
    emoji: '🌎',
    sport: 'esports',
    format: 'league',
    game: 'valorant',
    group: 'Valorant',
    description: 'Valorant — as 12 franquias da liga Americas, pontos corridos, séries BO3.',
    config: { homeAndAway: false, bestOf: 3 },
    teamIds: [
      'hundred-thieves', 'cloud9', 'eg', 'furia', 'kru', 'leviatan', 'loud', 'mibr',
      'nrg', 'sentinels', 'g2', 'envy'
    ]
  },
  {
    id: 'vct-emea',
    label: 'VCT EMEA',
    emoji: '🇪🇺',
    sport: 'esports',
    format: 'league',
    game: 'valorant',
    group: 'Valorant',
    description: 'Valorant — as 12 franquias da liga EMEA, pontos corridos, séries BO3.',
    config: { homeAndAway: false, bestOf: 3 },
    teamIds: [
      'bbl-esports', 'fnatic', 'fut-esports', 'karmine', 'navi', 'heretics', 'liquid', 'vitality',
      'giantx', 'm8', 'pcific', 'eternal-fire'
    ]
  },
  {
    id: 'vct-pacific',
    label: 'VCT Pacific',
    emoji: '🌏',
    sport: 'esports',
    format: 'league',
    game: 'valorant',
    group: 'Valorant',
    description: 'Valorant — as 12 franquias da liga Pacific, pontos corridos, séries BO3.',
    config: { homeAndAway: false, bestOf: 3 },
    teamIds: [
      'detonation', 'drx', 'geng', 'global-esports', 'paper-rex', 'rrq', 't1', 'team-secret',
      'zeta-division', 'full-sense', 'nongshim', 'varrel'
    ]
  },
  {
    id: 'vct-china',
    label: 'VCT China',
    emoji: '🇨🇳',
    sport: 'esports',
    format: 'league',
    game: 'valorant',
    group: 'Valorant',
    description: 'Valorant — as 12 franquias da liga China, pontos corridos, séries BO3.',
    config: { homeAndAway: false, bestOf: 3 },
    teamIds: [
      'all-gamers', 'bilibili-gaming', 'edg', 'funplus-phoenix', 'jd-gaming', 'nova-esports',
      'titan-esports', 'trace-esports', 'tyloo', 'wolves-esports', 'dragon-ranger', 'xlg-esports'
    ]
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
