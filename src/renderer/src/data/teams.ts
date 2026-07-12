import type { Team } from '../types'

type Seed = Omit<Team, 'category' | 'sport' | 'squad'> & Partial<Pick<Team, 'category' | 'sport'>>

function make(seeds: Seed[], category: Team['category'], sport: Team['sport']): Team[] {
  return seeds.map((s) => ({ ...s, category, sport }))
}

// ---------------- Clubes europeus ----------------
const EURO_CLUBS: Seed[] = [
  { id: 'real-madrid', name: 'Real Madrid', shortName: 'RMA', strength: 92, color: '#febe10', country: 'Espanha' },
  { id: 'man-city', name: 'Manchester City', shortName: 'MCI', strength: 91, color: '#6cabdd', country: 'Inglaterra' },
  { id: 'bayern', name: 'Bayern de Munique', shortName: 'BAY', strength: 90, color: '#dc052d', country: 'Alemanha' },
  { id: 'barcelona', name: 'Barcelona', shortName: 'BAR', strength: 88, color: '#a50044', country: 'Espanha' },
  { id: 'psg', name: 'Paris Saint-Germain', shortName: 'PSG', strength: 87, color: '#004170', country: 'França' },
  { id: 'liverpool', name: 'Liverpool', shortName: 'LIV', strength: 87, color: '#c8102e', country: 'Inglaterra' },
  { id: 'inter', name: 'Inter de Milão', shortName: 'INT', strength: 86, color: '#0068a8', country: 'Itália' },
  { id: 'arsenal', name: 'Arsenal', shortName: 'ARS', strength: 85, color: '#ef0107', country: 'Inglaterra' },
  { id: 'atletico', name: 'Atlético de Madrid', shortName: 'ATM', strength: 84, color: '#cb3524', country: 'Espanha' },
  { id: 'dortmund', name: 'Borussia Dortmund', shortName: 'BVB', strength: 83, color: '#fde100', country: 'Alemanha' },
  { id: 'milan', name: 'Milan', shortName: 'MIL', strength: 83, color: '#fb090b', country: 'Itália' },
  { id: 'juventus', name: 'Juventus', shortName: 'JUV', strength: 83, color: '#cccccc', country: 'Itália' },
  { id: 'man-united', name: 'Manchester United', shortName: 'MUN', strength: 82, color: '#da291c', country: 'Inglaterra' },
  { id: 'chelsea', name: 'Chelsea', shortName: 'CHE', strength: 82, color: '#034694', country: 'Inglaterra' },
  { id: 'napoli', name: 'Napoli', shortName: 'NAP', strength: 82, color: '#199fdb', country: 'Itália' },
  { id: 'tottenham', name: 'Tottenham', shortName: 'TOT', strength: 80, color: '#132257', country: 'Inglaterra' }
]

// ---------------- Clubes brasileiros ----------------
const BR_CLUBS: Seed[] = [
  { id: 'flamengo', name: 'Flamengo', shortName: 'FLA', strength: 84, color: '#c52613', country: 'Brasil' },
  { id: 'palmeiras', name: 'Palmeiras', shortName: 'PAL', strength: 84, color: '#006437', country: 'Brasil' },
  { id: 'atletico-mg', name: 'Atlético-MG', shortName: 'CAM', strength: 80, color: '#111111', country: 'Brasil' },
  { id: 'fluminense', name: 'Fluminense', shortName: 'FLU', strength: 79, color: '#7a0c2e', country: 'Brasil' },
  { id: 'sao-paulo', name: 'São Paulo', shortName: 'SAO', strength: 79, color: '#fe0000', country: 'Brasil' },
  { id: 'corinthians', name: 'Corinthians', shortName: 'COR', strength: 78, color: '#000000', country: 'Brasil' },
  { id: 'internacional', name: 'Internacional', shortName: 'INT', strength: 78, color: '#e5050f', country: 'Brasil' },
  { id: 'gremio', name: 'Grêmio', shortName: 'GRE', strength: 77, color: '#0d80bf', country: 'Brasil' },
  { id: 'botafogo', name: 'Botafogo', shortName: 'BOT', strength: 78, color: '#111111', country: 'Brasil' },
  { id: 'cruzeiro', name: 'Cruzeiro', shortName: 'CRU', strength: 76, color: '#003da5', country: 'Brasil' },
  { id: 'athletico-pr', name: 'Athletico-PR', shortName: 'CAP', strength: 75, color: '#e30613', country: 'Brasil' },
  { id: 'santos', name: 'Santos', shortName: 'SAN', strength: 74, color: '#ffffff', country: 'Brasil' }
]

// ---------------- Seleções ----------------
const NATIONS: Seed[] = [
  { id: 'brasil', name: 'Brasil', shortName: 'BRA', strength: 90, color: '#ffdf00', country: 'Brasil' },
  { id: 'franca', name: 'França', shortName: 'FRA', strength: 91, color: '#21304f', country: 'França' },
  { id: 'argentina', name: 'Argentina', shortName: 'ARG', strength: 90, color: '#6cace4', country: 'Argentina' },
  { id: 'espanha', name: 'Espanha', shortName: 'ESP', strength: 89, color: '#c60b1e', country: 'Espanha' },
  { id: 'inglaterra', name: 'Inglaterra', shortName: 'ENG', strength: 88, color: '#cf081f', country: 'Inglaterra' },
  { id: 'alemanha', name: 'Alemanha', shortName: 'GER', strength: 86, color: '#000000', country: 'Alemanha' },
  { id: 'portugal', name: 'Portugal', shortName: 'POR', strength: 87, color: '#006600', country: 'Portugal' },
  { id: 'holanda', name: 'Países Baixos', shortName: 'NED', strength: 85, color: '#f36c21', country: 'Países Baixos' },
  { id: 'italia', name: 'Itália', shortName: 'ITA', strength: 84, color: '#0066a8', country: 'Itália' },
  { id: 'belgica', name: 'Bélgica', shortName: 'BEL', strength: 83, color: '#e30613', country: 'Bélgica' },
  { id: 'croacia', name: 'Croácia', shortName: 'CRO', strength: 82, color: '#ff0000', country: 'Croácia' },
  { id: 'uruguai', name: 'Uruguai', shortName: 'URU', strength: 82, color: '#5cbfeb', country: 'Uruguai' },
  { id: 'colombia', name: 'Colômbia', shortName: 'COL', strength: 80, color: '#fcd116', country: 'Colômbia' },
  { id: 'marrocos', name: 'Marrocos', shortName: 'MAR', strength: 80, color: '#c1272d', country: 'Marrocos' },
  { id: 'mexico', name: 'México', shortName: 'MEX', strength: 78, color: '#006847', country: 'México' },
  { id: 'eua', name: 'Estados Unidos', shortName: 'USA', strength: 77, color: '#3c3b6e', country: 'EUA' },
  { id: 'japao', name: 'Japão', shortName: 'JPN', strength: 78, color: '#bc002d', country: 'Japão' },
  { id: 'senegal', name: 'Senegal', shortName: 'SEN', strength: 78, color: '#00853f', country: 'Senegal' },
  { id: 'suica', name: 'Suíça', shortName: 'SUI', strength: 77, color: '#d52b1e', country: 'Suíça' },
  { id: 'dinamarca', name: 'Dinamarca', shortName: 'DEN', strength: 78, color: '#c60c30', country: 'Dinamarca' },
  { id: 'coreia', name: 'Coreia do Sul', shortName: 'KOR', strength: 76, color: '#003478', country: 'Coreia do Sul' },
  { id: 'servia', name: 'Sérvia', shortName: 'SRB', strength: 76, color: '#c6363c', country: 'Sérvia' },
  { id: 'equador', name: 'Equador', shortName: 'ECU', strength: 75, color: '#ffd100', country: 'Equador' },
  { id: 'australia', name: 'Austrália', shortName: 'AUS', strength: 73, color: '#00843d', country: 'Austrália' },
  // ---- Copa do Mundo 2026 (48 seleções) — completando as que faltavam ----
  { id: 'canada', name: 'Canadá', shortName: 'CAN', strength: 74, color: '#ff0000', country: 'Canadá' },
  { id: 'paraguai', name: 'Paraguai', shortName: 'PAR', strength: 74, color: '#0038a8', country: 'Paraguai' },
  { id: 'austria', name: 'Áustria', shortName: 'AUT', strength: 79, color: '#ed2939', country: 'Áustria' },
  { id: 'noruega', name: 'Noruega', shortName: 'NOR', strength: 79, color: '#ba0c2f', country: 'Noruega' },
  { id: 'escocia', name: 'Escócia', shortName: 'SCO', strength: 76, color: '#0065bd', country: 'Escócia' },
  { id: 'suecia', name: 'Suécia', shortName: 'SWE', strength: 76, color: '#006aa7', country: 'Suécia' },
  { id: 'turquia', name: 'Turquia', shortName: 'TUR', strength: 78, color: '#e30a17', country: 'Turquia' },
  { id: 'tchequia', name: 'Tchéquia', shortName: 'CZE', strength: 74, color: '#11457e', country: 'Tchéquia' },
  { id: 'bosnia', name: 'Bósnia e Herzegovina', shortName: 'BIH', strength: 73, color: '#002395', country: 'Bósnia e Herzegovina' },
  { id: 'costa-do-marfim', name: 'Costa do Marfim', shortName: 'CIV', strength: 76, color: '#f77f00', country: 'Costa do Marfim' },
  { id: 'egito', name: 'Egito', shortName: 'EGY', strength: 73, color: '#ce1126', country: 'Egito' },
  { id: 'argelia', name: 'Argélia', shortName: 'ALG', strength: 74, color: '#006233', country: 'Argélia' },
  { id: 'tunisia', name: 'Tunísia', shortName: 'TUN', strength: 71, color: '#e70013', country: 'Tunísia' },
  { id: 'gana', name: 'Gana', shortName: 'GHA', strength: 72, color: '#ce1126', country: 'Gana' },
  { id: 'africa-do-sul', name: 'África do Sul', shortName: 'RSA', strength: 68, color: '#007a4d', country: 'África do Sul' },
  { id: 'cabo-verde', name: 'Cabo Verde', shortName: 'CPV', strength: 68, color: '#003893', country: 'Cabo Verde' },
  { id: 'rd-congo', name: 'RD Congo', shortName: 'COD', strength: 65, color: '#007fff', country: 'RD Congo' },
  { id: 'arabia-saudita', name: 'Arábia Saudita', shortName: 'KSA', strength: 68, color: '#006c35', country: 'Arábia Saudita' },
  { id: 'catar', name: 'Catar', shortName: 'QAT', strength: 66, color: '#8d1b3d', country: 'Catar' },
  { id: 'ira', name: 'Irã', shortName: 'IRN', strength: 76, color: '#239f40', country: 'Irã' },
  { id: 'iraque', name: 'Iraque', shortName: 'IRQ', strength: 66, color: '#ce1126', country: 'Iraque' },
  { id: 'jordania', name: 'Jordânia', shortName: 'JOR', strength: 64, color: '#007a3d', country: 'Jordânia' },
  { id: 'uzbequistao', name: 'Uzbequistão', shortName: 'UZB', strength: 63, color: '#0099b5', country: 'Uzbequistão' },
  { id: 'panama', name: 'Panamá', shortName: 'PAN', strength: 68, color: '#da121a', country: 'Panamá' },
  { id: 'haiti', name: 'Haiti', shortName: 'HAI', strength: 58, color: '#00209f', country: 'Haiti' },
  { id: 'curacao', name: 'Curaçao', shortName: 'CUW', strength: 60, color: '#002b7f', country: 'Curaçao' },
  { id: 'nova-zelandia', name: 'Nova Zelândia', shortName: 'NZL', strength: 62, color: '#000000', country: 'Nova Zelândia' },
  // CONMEBOL fora da Copa 2026 (completam as Eliminatórias sul-americanas)
  { id: 'chile', name: 'Chile', shortName: 'CHI', strength: 72, color: '#d52b1e', country: 'Chile' },
  { id: 'peru', name: 'Peru', shortName: 'PER', strength: 71, color: '#d91023', country: 'Peru' },
  { id: 'venezuela', name: 'Venezuela', shortName: 'VEN', strength: 68, color: '#7a0c2e', country: 'Venezuela' },
  { id: 'bolivia', name: 'Bolívia', shortName: 'BOL', strength: 65, color: '#007a33', country: 'Bolívia' }
]

// ---------------- E-sports ----------------
const ESPORTS: Seed[] = [
  { id: 'navi', name: 'Natus Vincere', shortName: 'NAV', strength: 90, color: '#ffe500' },
  { id: 'vitality', name: 'Team Vitality', shortName: 'VIT', strength: 91, color: '#ffd700' },
  { id: 'faze', name: 'FaZe Clan', shortName: 'FAZ', strength: 88, color: '#e43d30' },
  { id: 'g2', name: 'G2 Esports', shortName: 'G2', strength: 88, color: '#ed1c24' },
  { id: 'spirit', name: 'Team Spirit', shortName: 'SPR', strength: 89, color: '#1a1a1a' },
  { id: 'mouz', name: 'MOUZ', shortName: 'MOU', strength: 86, color: '#e2001a' },
  { id: 'liquid', name: 'Team Liquid', shortName: 'LIQ', strength: 84, color: '#0a1a2f' },
  { id: 'astralis', name: 'Astralis', shortName: 'AST', strength: 83, color: '#e30613' },
  { id: 'furia', name: 'FURIA', shortName: 'FUR', strength: 85, color: '#111111' },
  { id: 'heroic', name: 'Heroic', shortName: 'HER', strength: 83, color: '#00a0e9' },
  { id: 'cloud9', name: 'Cloud9', shortName: 'C9', strength: 82, color: '#00aeef' },
  { id: 'pain', name: 'paiN Gaming', shortName: 'PAI', strength: 80, color: '#e3022e' },
  { id: 'complexity', name: 'Complexity', shortName: 'COL', strength: 80, color: '#1f3b73' },
  { id: 'ence', name: 'ENCE', shortName: 'ENC', strength: 81, color: '#0098d8' },
  { id: 'big', name: 'BIG', shortName: 'BIG', strength: 79, color: '#0a0a0a' },
  { id: 'falcons', name: 'Team Falcons', shortName: 'FLC', strength: 86, color: '#0aa14b' }
]

// ---------------- +30 orgs de e-sports ----------------
const EXTRA_ESPORTS: Seed[] = [
  { id: 'fnatic', name: 'Fnatic', shortName: 'FNC', strength: 88, color: '#ff5900' },
  { id: 'sentinels', name: 'Sentinels', shortName: 'SEN', strength: 86, color: '#cd1f3c' },
  { id: 'loud', name: 'LOUD', shortName: 'LLL', strength: 87, color: '#00e701', country: 'Brasil' },
  { id: 'paper-rex', name: 'Paper Rex', shortName: 'PRX', strength: 86, color: '#ff1f44' },
  { id: 'drx', name: 'DRX', shortName: 'DRX', strength: 84, color: '#1f3a93' },
  { id: 'geng', name: 'Gen.G', shortName: 'GEN', strength: 86, color: '#aa8a00' },
  { id: 't1', name: 'T1', shortName: 'T1', strength: 85, color: '#e2012d' },
  { id: 'edg', name: 'EDward Gaming', shortName: 'EDG', strength: 83, color: '#cc0000' },
  { id: 'nrg', name: 'NRG', shortName: 'NRG', strength: 84, color: '#c8102e' },
  { id: 'hundred-thieves', name: '100 Thieves', shortName: '100', strength: 82, color: '#e0162b' },
  { id: 'eg', name: 'Evil Geniuses', shortName: 'EG', strength: 80, color: '#053a6a' },
  { id: 'tsm', name: 'TSM', shortName: 'TSM', strength: 80, color: '#5b9bd5' },
  { id: 'karmine', name: 'Karmine Corp', shortName: 'KC', strength: 84, color: '#1f6fd0' },
  { id: 'heretics', name: 'Team Heretics', shortName: 'TH', strength: 85, color: '#1a1a1a' },
  { id: 'koi', name: 'KOI', shortName: 'KOI', strength: 81, color: '#00b3a4' },
  { id: 'm8', name: 'Gentle Mates', shortName: 'M8', strength: 82, color: '#ff4f8b' },
  { id: 'vp', name: 'Virtus.pro', shortName: 'VP', strength: 84, color: '#ff6600' },
  { id: 'imperial', name: 'Imperial', shortName: 'IMP', strength: 80, color: '#1a1a1a', country: 'Brasil' },
  { id: 'mibr', name: 'MIBR', shortName: 'MBR', strength: 79, color: '#111111', country: 'Brasil' },
  { id: 'red-canids', name: 'RED Canids', shortName: 'RED', strength: 76, color: '#e2231a', country: 'Brasil' },
  { id: 'fluxo', name: 'Fluxo', shortName: 'FLX', strength: 75, color: '#00d1ff', country: 'Brasil' },
  { id: 'legacy', name: 'Legacy', shortName: 'LGC', strength: 75, color: '#7b2cbf', country: 'Brasil' },
  { id: 'n9z', name: '9z Team', shortName: '9Z', strength: 78, color: '#ffe600' },
  { id: 'leviatan', name: 'Leviatán', shortName: 'LVT', strength: 80, color: '#00e0c7' },
  { id: 'kru', name: 'KRÜ Esports', shortName: 'KRU', strength: 79, color: '#1f1f1f' },
  { id: 'movistar-riders', name: 'Movistar Riders', shortName: 'MRS', strength: 79, color: '#00a9e0' },
  { id: 'saw', name: 'SAW', shortName: 'SAW', strength: 78, color: '#ff7a00' },
  { id: 'eternal-fire', name: 'Eternal Fire', shortName: 'EF', strength: 81, color: '#e30613' },
  { id: 'gamerlegion', name: 'GamerLegion', shortName: 'GL', strength: 80, color: '#d4af37' },
  { id: 'apeks', name: 'Apeks', shortName: 'APX', strength: 78, color: '#ff5a36' }
]

// ---------------- VCT 2026 — franquias que faltavam (Valorant) ----------------
const VCT_2026: Seed[] = [
  // Americas
  { id: 'envy', name: 'Envy', shortName: 'NV', strength: 78, color: '#111111' },
  // China
  { id: 'all-gamers', name: 'All Gamers', shortName: 'AG', strength: 76, color: '#0a4b9e' },
  { id: 'bilibili-gaming', name: 'Bilibili Gaming', shortName: 'BLG', strength: 77, color: '#fb7299' },
  { id: 'funplus-phoenix', name: 'FunPlus Phoenix', shortName: 'FPX', strength: 78, color: '#f36c21' },
  { id: 'jd-gaming', name: 'JD Gaming', shortName: 'JDG', strength: 79, color: '#e2231a' },
  { id: 'nova-esports', name: 'Nova Esports', shortName: 'NOVA', strength: 77, color: '#7b2cbf' },
  { id: 'titan-esports', name: 'Titan Esports Club', shortName: 'TEC', strength: 76, color: '#9b1212' },
  { id: 'trace-esports', name: 'Trace Esports', shortName: 'TE', strength: 75, color: '#00a9a5' },
  { id: 'tyloo', name: 'TYLOO', shortName: 'TYL', strength: 76, color: '#cc0000' },
  { id: 'wolves-esports', name: 'Wolves Esports', shortName: 'WOL', strength: 75, color: '#1a2f6b' },
  { id: 'dragon-ranger', name: 'Dragon Ranger Gaming', shortName: 'DRG', strength: 74, color: '#c8102e' },
  { id: 'xlg-esports', name: 'XLG Esports', shortName: 'XLG', strength: 74, color: '#1f6fd0' },
  // EMEA
  { id: 'bbl-esports', name: 'BBL Esports', shortName: 'BBL', strength: 78, color: '#e2231a' },
  { id: 'fut-esports', name: 'FUT Esports', shortName: 'FUT', strength: 78, color: '#f5820b' },
  { id: 'giantx', name: 'GIANTX', shortName: 'GX', strength: 79, color: '#0a8a4a' },
  { id: 'pcific', name: 'PCIFIC Esports', shortName: 'PCI', strength: 75, color: '#00a9e0' },
  // Pacific
  { id: 'detonation', name: 'DetonatioN FocusMe', shortName: 'DFM', strength: 76, color: '#f5820b' },
  { id: 'global-esports', name: 'Global Esports', shortName: 'GE', strength: 74, color: '#1a2f6b' },
  { id: 'rrq', name: 'Rex Regum Qeon', shortName: 'RRQ', strength: 79, color: '#d4af37' },
  { id: 'team-secret', name: 'Team Secret', shortName: 'TS', strength: 75, color: '#e2231a' },
  { id: 'zeta-division', name: 'ZETA DIVISION', shortName: 'ZETA', strength: 77, color: '#111111' },
  { id: 'full-sense', name: 'FULL SENSE', shortName: 'FS', strength: 76, color: '#0a4b9e' },
  { id: 'nongshim', name: 'Nongshim RedForce', shortName: 'NS', strength: 80, color: '#e2231a' },
  { id: 'varrel', name: 'VARREL', shortName: 'VRL', strength: 78, color: '#111111' }
]

// ---------------- +100 clubes adicionais ----------------
const MORE_CLUBS: Seed[] = [
  // Brasil – Série A e grandes clubes
  { id: 'bragantino', name: 'Red Bull Bragantino', shortName: 'RBB', strength: 74, color: '#cc0000', country: 'Brasil' },
  { id: 'vitoria', name: 'Vitória', shortName: 'VIT', strength: 73, color: '#cc0000', country: 'Brasil' },
  { id: 'sport', name: 'Sport Recife', shortName: 'SPT', strength: 72, color: '#c60b1e', country: 'Brasil' },
  { id: 'ceara', name: 'Ceará SC', shortName: 'CEA', strength: 72, color: '#111111', country: 'Brasil' },
  { id: 'juventude', name: 'Juventude', shortName: 'JUC', strength: 72, color: '#005230', country: 'Brasil' },
  { id: 'mirassol', name: 'Mirassol FC', shortName: 'MIR', strength: 71, color: '#f5c400', country: 'Brasil' },
  { id: 'america-mg', name: 'América-MG', shortName: 'AMG', strength: 70, color: '#007a30', country: 'Brasil' },
  { id: 'goias', name: 'Goiás', shortName: 'GOI', strength: 70, color: '#005235', country: 'Brasil' },
  { id: 'coritiba', name: 'Coritiba', shortName: 'CTB', strength: 69, color: '#007a30', country: 'Brasil' },
  { id: 'cuiaba', name: 'Cuiabá', shortName: 'CUI', strength: 69, color: '#ffd700', country: 'Brasil' },
  { id: 'criciuma', name: 'Criciúma', shortName: 'CRI', strength: 70, color: '#f9c000', country: 'Brasil' },
  { id: 'novorizontino', name: 'Novorizontino', shortName: 'NOV', strength: 68, color: '#e05a00', country: 'Brasil' },
  { id: 'ponte-preta', name: 'Ponte Preta', shortName: 'PON', strength: 68, color: '#111111', country: 'Brasil' },
  { id: 'guarani', name: 'Guarani FC', shortName: 'GUA', strength: 67, color: '#009a44', country: 'Brasil' },
  { id: 'chapecoense', name: 'Chapecoense', shortName: 'CHA', strength: 68, color: '#007a30', country: 'Brasil' },
  { id: 'avai', name: 'Avaí', shortName: 'AVA', strength: 67, color: '#005baa', country: 'Brasil' },
  { id: 'botafogo-sp', name: 'Botafogo SP', shortName: 'BSP', strength: 68, color: '#111111', country: 'Brasil' },
  { id: 'operario', name: 'Operário-PR', shortName: 'OPE', strength: 67, color: '#000000', country: 'Brasil' },
  { id: 'ituano', name: 'Ituano FC', shortName: 'ITU', strength: 66, color: '#003da5', country: 'Brasil' },
  { id: 'crb', name: 'CRB', shortName: 'CRB', strength: 65, color: '#003da5', country: 'Brasil' },
  // Inglaterra – Premier League extras
  { id: 'bournemouth', name: 'AFC Bournemouth', shortName: 'BOU', strength: 75, color: '#da291c', country: 'Inglaterra' },
  { id: 'brentford', name: 'Brentford', shortName: 'BRE', strength: 74, color: '#e30613', country: 'Inglaterra' },
  { id: 'leicester', name: 'Leicester City', shortName: 'LEI', strength: 73, color: '#003090', country: 'Inglaterra' },
  { id: 'ipswich', name: 'Ipswich Town', shortName: 'IPS', strength: 72, color: '#003090', country: 'Inglaterra' },
  { id: 'southampton', name: 'Southampton', shortName: 'SOU', strength: 72, color: '#d71920', country: 'Inglaterra' },
  { id: 'sheffield-utd', name: 'Sheffield United', shortName: 'SHU', strength: 71, color: '#da291c', country: 'Inglaterra' },
  { id: 'sunderland', name: 'Sunderland', shortName: 'SUN', strength: 70, color: '#eb172b', country: 'Inglaterra' },
  { id: 'burnley', name: 'Burnley', shortName: 'BUR', strength: 70, color: '#6c1d45', country: 'Inglaterra' },
  // Alemanha – Bundesliga extras
  { id: 'werder', name: 'Werder Bremen', shortName: 'WER', strength: 76, color: '#009a44', country: 'Alemanha' },
  { id: 'freiburg', name: 'SC Freiburg', shortName: 'SCF', strength: 75, color: '#e30613', country: 'Alemanha' },
  { id: 'wolfsburg', name: 'VfL Wolfsburg', shortName: 'WOB', strength: 76, color: '#00893e', country: 'Alemanha' },
  { id: 'union-berlin', name: 'Union Berlin', shortName: 'UNB', strength: 75, color: '#e1291a', country: 'Alemanha' },
  { id: 'hoffenheim', name: 'TSG Hoffenheim', shortName: 'HOF', strength: 74, color: '#1769aa', country: 'Alemanha' },
  { id: 'mainz', name: 'FSV Mainz 05', shortName: 'MAI', strength: 73, color: '#c8102e', country: 'Alemanha' },
  { id: 'augsburg', name: 'FC Augsburg', shortName: 'AUG', strength: 72, color: '#ba2025', country: 'Alemanha' },
  { id: 'hertha', name: 'Hertha BSC', shortName: 'HER', strength: 71, color: '#005ca5', country: 'Alemanha' },
  { id: 'schalke', name: 'Schalke 04', shortName: 'S04', strength: 72, color: '#004b8d', country: 'Alemanha' },
  { id: 'st-pauli', name: 'FC St. Pauli', shortName: 'STP', strength: 72, color: '#6d1f26', country: 'Alemanha' },
  { id: 'koln', name: 'FC Köln', shortName: 'KOL', strength: 71, color: '#e1261c', country: 'Alemanha' },
  { id: 'heidenheim', name: 'FC Heidenheim', shortName: 'HDH', strength: 70, color: '#b2002b', country: 'Alemanha' },
  // Espanha – La Liga extras
  { id: 'osasuna', name: 'CA Osasuna', shortName: 'OSA', strength: 74, color: '#c30027', country: 'Espanha' },
  { id: 'girona', name: 'Girona FC', shortName: 'GIR', strength: 74, color: '#c30027', country: 'Espanha' },
  { id: 'getafe', name: 'Getafe CF', shortName: 'GET', strength: 72, color: '#005fb2', country: 'Espanha' },
  { id: 'las-palmas', name: 'UD Las Palmas', shortName: 'LPA', strength: 72, color: '#fed10a', country: 'Espanha' },
  { id: 'alaves', name: 'Deportivo Alavés', shortName: 'ALA', strength: 71, color: '#0055a5', country: 'Espanha' },
  { id: 'mallorca', name: 'Real Mallorca', shortName: 'MAL', strength: 72, color: '#d4001a', country: 'Espanha' },
  { id: 'espanyol', name: 'Espanyol', shortName: 'EPN', strength: 73, color: '#005baa', country: 'Espanha' },
  { id: 'rayo', name: 'Rayo Vallecano', shortName: 'RAY', strength: 71, color: '#e30613', country: 'Espanha' },
  // Itália – Serie A extras
  { id: 'udinese', name: 'Udinese', shortName: 'UDI', strength: 74, color: '#000000', country: 'Itália' },
  { id: 'sassuolo', name: 'Sassuolo', shortName: 'SAS', strength: 74, color: '#00793c', country: 'Itália' },
  { id: 'lecce', name: 'US Lecce', shortName: 'LEC', strength: 72, color: '#c8102e', country: 'Itália' },
  { id: 'empoli', name: 'Empoli FC', shortName: 'EMP', strength: 72, color: '#00529f', country: 'Itália' },
  { id: 'monza', name: 'AC Monza', shortName: 'MNZ', strength: 73, color: '#e4051f', country: 'Itália' },
  { id: 'verona', name: 'Hellas Verona', shortName: 'VER', strength: 73, color: '#004b9d', country: 'Itália' },
  { id: 'genoa', name: 'Genoa CFC', shortName: 'GEN', strength: 74, color: '#e0001b', country: 'Itália' },
  { id: 'cagliari', name: 'Cagliari', shortName: 'CAG', strength: 72, color: '#b40000', country: 'Itália' },
  { id: 'venezia', name: 'Venezia FC', shortName: 'VEN', strength: 71, color: '#1a1a2e', country: 'Itália' },
  { id: 'sampdoria', name: 'Sampdoria', shortName: 'SAM', strength: 73, color: '#0a4b9e', country: 'Itália' },
  // França – Ligue 1 extras
  { id: 'rennes', name: 'Stade Rennais', shortName: 'REN', strength: 76, color: '#cc0000', country: 'França' },
  { id: 'lens', name: 'RC Lens', shortName: 'LEN', strength: 76, color: '#e89a00', country: 'França' },
  { id: 'strasbourg', name: 'RC Strasbourg', shortName: 'STR', strength: 73, color: '#005baa', country: 'França' },
  { id: 'reims', name: 'Stade de Reims', shortName: 'REI', strength: 73, color: '#e30613', country: 'França' },
  { id: 'nantes', name: 'FC Nantes', shortName: 'NAN', strength: 72, color: '#ffd700', country: 'França' },
  { id: 'brest', name: 'Stade Brestois', shortName: 'BRS', strength: 73, color: '#cc0000', country: 'França' },
  { id: 'toulouse', name: 'Toulouse FC', shortName: 'TOU', strength: 73, color: '#5c0c94', country: 'França' },
  { id: 'saint-etienne', name: 'AS Saint-Étienne', shortName: 'STE', strength: 72, color: '#108044', country: 'França' },
  // Países Baixos extras
  { id: 'az', name: 'AZ Alkmaar', shortName: 'AZ', strength: 76, color: '#e2001a', country: 'Países Baixos' },
  { id: 'twente', name: 'FC Twente', shortName: 'TWE', strength: 75, color: '#c8102e', country: 'Países Baixos' },
  { id: 'utrecht', name: 'FC Utrecht', shortName: 'UTR', strength: 72, color: '#cc0000', country: 'Países Baixos' },
  // Bélgica
  { id: 'anderlecht', name: 'RSC Anderlecht', shortName: 'AND', strength: 77, color: '#6e1c8d', country: 'Bélgica' },
  { id: 'brugge', name: 'Club Brugge', shortName: 'BRU', strength: 79, color: '#004289', country: 'Bélgica' },
  // Turquia extras
  { id: 'besiktas', name: 'Beşiktaş', shortName: 'BJK', strength: 76, color: '#000000', country: 'Turquia' },
  { id: 'trabzonspor', name: 'Trabzonspor', shortName: 'TRA', strength: 74, color: '#a52019', country: 'Turquia' },
  { id: 'basaksehir', name: 'İstanbul Başakşehir', shortName: 'IBF', strength: 73, color: '#f97300', country: 'Turquia' },
  // Argentina
  { id: 'independiente', name: 'Independiente', shortName: 'IND', strength: 76, color: '#e30613', country: 'Argentina' },
  { id: 'racing-club', name: 'Racing Club', shortName: 'RAC', strength: 77, color: '#72b0e8', country: 'Argentina' },
  { id: 'san-lorenzo', name: 'San Lorenzo', shortName: 'SAL', strength: 75, color: '#cc0000', country: 'Argentina' },
  { id: 'estudiantes', name: 'Estudiantes', shortName: 'EST', strength: 73, color: '#003da5', country: 'Argentina' },
  { id: 'velez', name: 'Vélez Sársfield', shortName: 'VEL', strength: 74, color: '#005baa', country: 'Argentina' },
  { id: 'talleres', name: 'Talleres', shortName: 'TAL', strength: 73, color: '#003da5', country: 'Argentina' },
  { id: 'huracan', name: 'Huracán', shortName: 'HUR', strength: 70, color: '#8dc8e8', country: 'Argentina' },
  // México
  { id: 'guadalajara', name: 'Guadalajara', shortName: 'GDL', strength: 76, color: '#cc0000', country: 'México' },
  { id: 'tigres', name: 'Tigres UANL', shortName: 'TIG', strength: 76, color: '#f8d100', country: 'México' },
  { id: 'monterrey', name: 'CF Monterrey', shortName: 'MTY', strength: 75, color: '#003da5', country: 'México' },
  { id: 'cruz-azul', name: 'Cruz Azul', shortName: 'CAZ', strength: 74, color: '#003da5', country: 'México' },
  { id: 'pumas', name: 'Pumas UNAM', shortName: 'PUM', strength: 73, color: '#ffd100', country: 'México' },
  { id: 'toluca', name: 'Deportivo Toluca', shortName: 'TOL', strength: 72, color: '#cc0000', country: 'México' },
  { id: 'pachuca', name: 'CF Pachuca', shortName: 'PAC', strength: 72, color: '#006ebb', country: 'México' },
  // Japão – J1 League
  { id: 'kashima', name: 'Kashima Antlers', shortName: 'KAS', strength: 74, color: '#cc0000', country: 'Japão' },
  { id: 'urawa', name: 'Urawa Red Diamonds', shortName: 'URA', strength: 73, color: '#c8102e', country: 'Japão' },
  { id: 'yokohama-fm', name: 'Yokohama F. Marinos', shortName: 'YFM', strength: 72, color: '#0065bd', country: 'Japão' },
  { id: 'gamba', name: 'Gamba Osaka', shortName: 'GAM', strength: 71, color: '#003da5', country: 'Japão' },
  // MLS
  { id: 'inter-miami', name: 'Inter Miami CF', shortName: 'MIA', strength: 76, color: '#f7b5cd', country: 'EUA' },
  { id: 'la-galaxy', name: 'LA Galaxy', shortName: 'LAG', strength: 75, color: '#00245d', country: 'EUA' },
  { id: 'lafc', name: 'LAFC', shortName: 'LAF', strength: 76, color: '#c39e6e', country: 'EUA' },
  { id: 'seattle', name: 'Seattle Sounders FC', shortName: 'SEA', strength: 74, color: '#005695', country: 'EUA' },
  // Europa Oriental
  { id: 'shakhtar', name: 'Shakhtar Donetsk', shortName: 'SHA', strength: 82, color: '#f55a00', country: 'Ucrânia' },
  { id: 'dynamo-kyiv', name: 'Dynamo Kyiv', shortName: 'DYN', strength: 78, color: '#003da5', country: 'Ucrânia' },
  { id: 'zenit', name: 'Zenit', shortName: 'ZEN', strength: 78, color: '#0050a0', country: 'Rússia' },
  { id: 'red-star', name: 'Estrela Vermelha', shortName: 'RSB', strength: 78, color: '#cc0000', country: 'Sérvia' },
]

// ---------------- +50 clubes (várias ligas) ----------------
const EXTRA_CLUBS: Seed[] = [
  // Inglaterra
  { id: 'newcastle', name: 'Newcastle', shortName: 'NEW', strength: 80, color: '#241f20', country: 'Inglaterra' },
  { id: 'aston-villa', name: 'Aston Villa', shortName: 'AVL', strength: 79, color: '#670e36', country: 'Inglaterra' },
  { id: 'west-ham', name: 'West Ham', shortName: 'WHU', strength: 76, color: '#7a263a', country: 'Inglaterra' },
  { id: 'brighton', name: 'Brighton', shortName: 'BHA', strength: 76, color: '#0057b8', country: 'Inglaterra' },
  { id: 'everton', name: 'Everton', shortName: 'EVE', strength: 74, color: '#003399', country: 'Inglaterra' },
  { id: 'nottingham', name: 'Nottingham Forest', shortName: 'NFO', strength: 75, color: '#dd0000', country: 'Inglaterra' },
  { id: 'wolves', name: 'Wolverhampton', shortName: 'WOL', strength: 75, color: '#fdb913', country: 'Inglaterra' },
  { id: 'crystal-palace', name: 'Crystal Palace', shortName: 'CRY', strength: 74, color: '#1b458f', country: 'Inglaterra' },
  { id: 'fulham', name: 'Fulham', shortName: 'FUL', strength: 74, color: '#cccccc', country: 'Inglaterra' },
  { id: 'leeds', name: 'Leeds United', shortName: 'LEE', strength: 73, color: '#ffcd00', country: 'Inglaterra' },
  // Espanha
  { id: 'sevilla', name: 'Sevilla', shortName: 'SEV', strength: 79, color: '#d4011d', country: 'Espanha' },
  { id: 'betis', name: 'Real Betis', shortName: 'BET', strength: 77, color: '#00954c', country: 'Espanha' },
  { id: 'villarreal', name: 'Villarreal', shortName: 'VIL', strength: 78, color: '#ffe667', country: 'Espanha' },
  { id: 'real-sociedad', name: 'Real Sociedad', shortName: 'RSO', strength: 77, color: '#0067b1', country: 'Espanha' },
  { id: 'athletic', name: 'Athletic Bilbao', shortName: 'ATH', strength: 77, color: '#ee2523', country: 'Espanha' },
  { id: 'valencia', name: 'Valencia', shortName: 'VAL', strength: 76, color: '#f18e00', country: 'Espanha' },
  { id: 'celta', name: 'Celta de Vigo', shortName: 'CTA', strength: 73, color: '#8ac3ee', country: 'Espanha' },
  // Itália
  { id: 'roma', name: 'Roma', shortName: 'ROM', strength: 81, color: '#8e1f2f', country: 'Itália' },
  { id: 'lazio', name: 'Lazio', shortName: 'LAZ', strength: 79, color: '#87d8f7', country: 'Itália' },
  { id: 'atalanta', name: 'Atalanta', shortName: 'ATA', strength: 80, color: '#1d71b8', country: 'Itália' },
  { id: 'fiorentina', name: 'Fiorentina', shortName: 'FIO', strength: 77, color: '#592c82', country: 'Itália' },
  { id: 'bologna', name: 'Bologna', shortName: 'BOL', strength: 76, color: '#1a2f48', country: 'Itália' },
  { id: 'torino', name: 'Torino', shortName: 'TOR', strength: 74, color: '#8a1e03', country: 'Itália' },
  // Alemanha
  { id: 'leipzig', name: 'RB Leipzig', shortName: 'RBL', strength: 82, color: '#dd0741', country: 'Alemanha' },
  { id: 'leverkusen', name: 'Bayer Leverkusen', shortName: 'LEV', strength: 83, color: '#e32219', country: 'Alemanha' },
  { id: 'frankfurt', name: 'Eintracht Frankfurt', shortName: 'SGE', strength: 79, color: '#e1000f', country: 'Alemanha' },
  { id: 'stuttgart', name: 'VfB Stuttgart', shortName: 'STU', strength: 78, color: '#e30613', country: 'Alemanha' },
  { id: 'gladbach', name: 'Mönchengladbach', shortName: 'BMG', strength: 75, color: '#111111', country: 'Alemanha' },
  // França
  { id: 'marseille', name: 'Olympique de Marseille', shortName: 'OM', strength: 79, color: '#2faee0', country: 'França' },
  { id: 'lyon', name: 'Olympique Lyonnais', shortName: 'OL', strength: 78, color: '#d10921', country: 'França' },
  { id: 'monaco', name: 'Monaco', shortName: 'MON', strength: 79, color: '#e51b22', country: 'França' },
  { id: 'lille', name: 'Lille', shortName: 'LIL', strength: 77, color: '#e01e24', country: 'França' },
  { id: 'nice', name: 'Nice', shortName: 'NIC', strength: 75, color: '#c1071f', country: 'França' },
  // Portugal
  { id: 'benfica', name: 'Benfica', shortName: 'BEN', strength: 82, color: '#e30613', country: 'Portugal' },
  { id: 'porto', name: 'Porto', shortName: 'POR', strength: 82, color: '#00529f', country: 'Portugal' },
  { id: 'sporting', name: 'Sporting CP', shortName: 'SPO', strength: 81, color: '#008057', country: 'Portugal' },
  { id: 'braga', name: 'Braga', shortName: 'BRG', strength: 76, color: '#e30613', country: 'Portugal' },
  // Países Baixos
  { id: 'ajax', name: 'Ajax', shortName: 'AJA', strength: 80, color: '#d2122e', country: 'Países Baixos' },
  { id: 'psv', name: 'PSV', shortName: 'PSV', strength: 80, color: '#ed1c24', country: 'Países Baixos' },
  { id: 'feyenoord', name: 'Feyenoord', shortName: 'FEY', strength: 79, color: '#c8102e', country: 'Países Baixos' },
  // Escócia / Turquia
  { id: 'celtic', name: 'Celtic', shortName: 'CEL', strength: 78, color: '#008857', country: 'Escócia' },
  { id: 'rangers', name: 'Rangers', shortName: 'RAN', strength: 77, color: '#1b458f', country: 'Escócia' },
  { id: 'galatasaray', name: 'Galatasaray', shortName: 'GAL', strength: 78, color: '#fdb913', country: 'Turquia' },
  { id: 'fenerbahce', name: 'Fenerbahçe', shortName: 'FEN', strength: 78, color: '#1b3281', country: 'Turquia' },
  // Argentina
  { id: 'boca', name: 'Boca Juniors', shortName: 'BOC', strength: 81, color: '#0a3d91', country: 'Argentina' },
  { id: 'river', name: 'River Plate', shortName: 'RIV', strength: 82, color: '#ed1c24', country: 'Argentina' },
  // Brasil
  { id: 'vasco', name: 'Vasco da Gama', shortName: 'VAS', strength: 74, color: '#111111', country: 'Brasil' },
  { id: 'bahia', name: 'Bahia', shortName: 'BAH', strength: 74, color: '#005baa', country: 'Brasil' },
  { id: 'fortaleza', name: 'Fortaleza', shortName: 'FOR', strength: 75, color: '#005baa', country: 'Brasil' },
  // México
  { id: 'america-mx', name: 'Club América', shortName: 'AME', strength: 76, color: '#ffd700', country: 'México' }
]

// ---------------- CONMEBOL — clubes sul-americanos que faltavam ----------------
const CONMEBOL_EXTRA: Seed[] = [
  // Chile
  { id: 'colo-colo', name: 'Colo-Colo', shortName: 'CCO', strength: 76, color: '#ffffff', country: 'Chile' },
  { id: 'u-de-chile', name: 'Universidad de Chile', shortName: 'UCH', strength: 74, color: '#0055a4', country: 'Chile' },
  { id: 'u-catolica', name: 'Universidad Católica', shortName: 'UCA', strength: 75, color: '#00296b', country: 'Chile' },
  // Uruguai
  { id: 'penarol', name: 'Peñarol', shortName: 'PEN', strength: 77, color: '#f5c400', country: 'Uruguai' },
  { id: 'nacional-uy', name: 'Nacional', shortName: 'NAC', strength: 76, color: '#0055a4', country: 'Uruguai' },
  // Paraguai
  { id: 'olimpia', name: 'Olimpia', shortName: 'OLI', strength: 73, color: '#ffffff', country: 'Paraguai' },
  { id: 'cerro-porteno', name: 'Cerro Porteño', shortName: 'CEP', strength: 72, color: '#002b7f', country: 'Paraguai' },
  // Colômbia
  { id: 'atletico-nacional', name: 'Atlético Nacional', shortName: 'ATN', strength: 77, color: '#00853f', country: 'Colômbia' },
  { id: 'millonarios', name: 'Millonarios', shortName: 'MIL', strength: 75, color: '#0055a4', country: 'Colômbia' },
  { id: 'america-cali', name: 'América de Cali', shortName: 'ACA', strength: 73, color: '#c8102e', country: 'Colômbia' },
  // Equador
  { id: 'barcelona-sc', name: 'Barcelona SC', shortName: 'BSC', strength: 75, color: '#ffd700', country: 'Equador' },
  { id: 'ldu-quito', name: 'LDU Quito', shortName: 'LDU', strength: 76, color: '#ffffff', country: 'Equador' },
  { id: 'independiente-del-valle', name: 'Independiente del Valle', shortName: 'IDV', strength: 76, color: '#e30613', country: 'Equador' },
  // Peru
  { id: 'universitario', name: 'Universitario', shortName: 'UNI', strength: 74, color: '#a6192e', country: 'Peru' },
  { id: 'alianza-lima', name: 'Alianza Lima', shortName: 'ALI', strength: 73, color: '#00296b', country: 'Peru' },
  // Bolívia
  { id: 'bolivar', name: 'Bolívar', shortName: 'BOL', strength: 71, color: '#1a1a1a', country: 'Bolívia' },
  { id: 'the-strongest', name: 'The Strongest', shortName: 'TST', strength: 70, color: '#ffd700', country: 'Bolívia' },
  // Venezuela
  { id: 'deportivo-tachira', name: 'Deportivo Táchira', shortName: 'DTA', strength: 68, color: '#fdb913', country: 'Venezuela' },
  { id: 'caracas-fc', name: 'Caracas FC', shortName: 'CAR', strength: 68, color: '#a6192e', country: 'Venezuela' }
]

// ---------------- CONMEBOL — ligas nacionais completas ----------------
// Completa as 9 ligas de fora do Brasil (que já tem Série A/B/C) pra pirâmide
// sul-americana rodar inteira: liga nacional → Pré-Libertadores → Libertadores.
const CONMEBOL_LEAGUES: Seed[] = [
  // Argentina — Primera División (completa os 9 já cadastrados)
  { id: 'lanus', name: 'Lanús', shortName: 'LAN', strength: 72, color: '#800000', country: 'Argentina' },
  { id: 'rosario-central', name: 'Rosario Central', shortName: 'ROS', strength: 73, color: '#002d62', country: 'Argentina' },
  { id: 'argentinos-jrs', name: 'Argentinos Juniors', shortName: 'ARJ', strength: 72, color: '#d50032', country: 'Argentina' },
  { id: 'newells', name: "Newell's Old Boys", shortName: 'NOB', strength: 70, color: '#cc0000', country: 'Argentina' },
  { id: 'defensa-justicia', name: 'Defensa y Justicia', shortName: 'DYJ', strength: 70, color: '#009a44', country: 'Argentina' },
  { id: 'godoy-cruz', name: 'Godoy Cruz', shortName: 'GOD', strength: 69, color: '#004b93', country: 'Argentina' },
  { id: 'belgrano', name: 'Belgrano', shortName: 'BEL', strength: 69, color: '#75aadb', country: 'Argentina' },
  { id: 'banfield', name: 'Banfield', shortName: 'BAN', strength: 68, color: '#00703c', country: 'Argentina' },
  { id: 'gimnasia-lp', name: 'Gimnasia La Plata', shortName: 'GIM', strength: 68, color: '#0b2f6b', country: 'Argentina' },
  { id: 'instituto', name: 'Instituto', shortName: 'INS', strength: 67, color: '#d50032', country: 'Argentina' },
  { id: 'atletico-tucuman', name: 'Atlético Tucumán', shortName: 'ATU', strength: 67, color: '#75aadb', country: 'Argentina' },
  { id: 'union-santa-fe', name: 'Unión de Santa Fe', shortName: 'USF', strength: 67, color: '#cc0000', country: 'Argentina' },
  { id: 'central-cordoba', name: 'Central Córdoba', shortName: 'CCB', strength: 66, color: '#111111', country: 'Argentina' },
  { id: 'tigre', name: 'Tigre', shortName: 'TGR', strength: 66, color: '#003da5', country: 'Argentina' },
  { id: 'platense', name: 'Platense', shortName: 'PLT', strength: 65, color: '#5c4033', country: 'Argentina' },
  { id: 'independiente-riv', name: 'Independiente Rivadavia', shortName: 'IRV', strength: 65, color: '#005baa', country: 'Argentina' },
  { id: 'barracas-central', name: 'Barracas Central', shortName: 'BCE', strength: 64, color: '#cc0000', country: 'Argentina' },
  { id: 'sarmiento', name: 'Sarmiento', shortName: 'SAR', strength: 64, color: '#00703c', country: 'Argentina' },
  { id: 'deportivo-riestra', name: 'Deportivo Riestra', shortName: 'RIE', strength: 63, color: '#111111', country: 'Argentina' },
  { id: 'aldosivi', name: 'Aldosivi', shortName: 'ALD', strength: 63, color: '#f9c000', country: 'Argentina' },
  { id: 'san-martin-sj', name: 'San Martín-SJ', shortName: 'SMJ', strength: 63, color: '#00703c', country: 'Argentina' },
  // Chile — Primera División
  { id: 'coquimbo-unido', name: 'Coquimbo Unido', shortName: 'COQ', strength: 68, color: '#f9c000', country: 'Chile' },
  { id: 'ohiggins', name: "O'Higgins", shortName: 'OHI', strength: 66, color: '#78b9e7', country: 'Chile' },
  { id: 'palestino', name: 'Palestino', shortName: 'PTN', strength: 66, color: '#00703c', country: 'Chile' },
  { id: 'cobresal', name: 'Cobresal', shortName: 'CBS', strength: 65, color: '#e05a00', country: 'Chile' },
  { id: 'audax-italiano', name: 'Audax Italiano', shortName: 'AUD', strength: 65, color: '#00703c', country: 'Chile' },
  { id: 'union-espanola', name: 'Unión Española', shortName: 'UES', strength: 64, color: '#cc0000', country: 'Chile' },
  { id: 'huachipato', name: 'Huachipato', shortName: 'HUA', strength: 64, color: '#0057a8', country: 'Chile' },
  { id: 'everton-cl', name: 'Everton de Viña', shortName: 'EVD', strength: 63, color: '#005baa', country: 'Chile' },
  { id: 'nublense', name: 'Ñublense', shortName: 'NUB', strength: 63, color: '#cc0000', country: 'Chile' },
  { id: 'union-la-calera', name: 'Unión La Calera', shortName: 'ULC', strength: 62, color: '#cc0000', country: 'Chile' },
  { id: 'deportes-iquique', name: 'Deportes Iquique', shortName: 'IQU', strength: 61, color: '#78b9e7', country: 'Chile' },
  { id: 'la-serena', name: 'Deportes La Serena', shortName: 'LSE', strength: 61, color: '#a6192e', country: 'Chile' },
  { id: 'deportes-limache', name: 'Deportes Limache', shortName: 'LIM', strength: 60, color: '#e30613', country: 'Chile' },
  // Uruguai — Primera División
  { id: 'defensor-sporting', name: 'Defensor Sporting', shortName: 'DEF', strength: 68, color: '#5c2d91', country: 'Uruguai' },
  { id: 'liverpool-uy', name: 'Liverpool-URU', shortName: 'LVU', strength: 67, color: '#0a3d91', country: 'Uruguai' },
  { id: 'danubio', name: 'Danubio', shortName: 'DAN', strength: 66, color: '#1a1a1a', country: 'Uruguai' },
  { id: 'wanderers-uy', name: 'Montevideo Wanderers', shortName: 'MWA', strength: 64, color: '#111111', country: 'Uruguai' },
  { id: 'river-uy', name: 'River Plate-URU', shortName: 'RPU', strength: 64, color: '#d50032', country: 'Uruguai' },
  { id: 'boston-river', name: 'Boston River', shortName: 'BRI', strength: 63, color: '#00703c', country: 'Uruguai' },
  { id: 'cerro-largo', name: 'Cerro Largo', shortName: 'CLA', strength: 63, color: '#0057a8', country: 'Uruguai' },
  { id: 'torque', name: 'Montevideo City Torque', shortName: 'MCT', strength: 63, color: '#78b9e7', country: 'Uruguai' },
  { id: 'cerro-uy', name: 'Cerro', shortName: 'CER', strength: 62, color: '#78b9e7', country: 'Uruguai' },
  { id: 'racing-uy', name: 'Racing-URU', shortName: 'RCU', strength: 62, color: '#00703c', country: 'Uruguai' },
  { id: 'plaza-colonia', name: 'Plaza Colonia', shortName: 'PLC', strength: 62, color: '#00703c', country: 'Uruguai' },
  { id: 'juventud-uy', name: 'Juventud de Las Piedras', shortName: 'JLP', strength: 61, color: '#800000', country: 'Uruguai' },
  { id: 'miramar-misiones', name: 'Miramar Misiones', shortName: 'MMI', strength: 60, color: '#f9c000', country: 'Uruguai' },
  { id: 'progreso', name: 'Progreso', shortName: 'PRG', strength: 60, color: '#f9c000', country: 'Uruguai' },
  // Paraguai — Primera División
  { id: 'libertad', name: 'Libertad', shortName: 'LIB', strength: 72, color: '#111111', country: 'Paraguai' },
  { id: 'guarani-py', name: 'Guaraní-PY', shortName: 'GPY', strength: 68, color: '#f9c000', country: 'Paraguai' },
  { id: 'nacional-py', name: 'Nacional-PY', shortName: 'NPY', strength: 66, color: '#75aadb', country: 'Paraguai' },
  { id: 'sportivo-luqueno', name: 'Sportivo Luqueño', shortName: 'LUQ', strength: 64, color: '#0057a8', country: 'Paraguai' },
  { id: 'sportivo-trinidense', name: 'Sportivo Trinidense', shortName: 'TRI', strength: 62, color: '#cc0000', country: 'Paraguai' },
  { id: 'sportivo-ameliano', name: 'Sportivo Ameliano', shortName: 'AML', strength: 62, color: '#004b93', country: 'Paraguai' },
  { id: 'tacuary', name: 'Tacuary', shortName: 'TAC', strength: 61, color: '#cc0000', country: 'Paraguai' },
  { id: 'dos-de-mayo', name: '2 de Mayo', shortName: 'DDM', strength: 61, color: '#ffd700', country: 'Paraguai' },
  { id: 'general-caballero', name: 'General Caballero JLM', shortName: 'GCA', strength: 60, color: '#cc0000', country: 'Paraguai' },
  { id: 'recoleta', name: 'Recoleta FC', shortName: 'REC', strength: 60, color: '#f9c000', country: 'Paraguai' },
  // Colômbia — Primera A
  { id: 'junior-barranquilla', name: 'Junior de Barranquilla', shortName: 'JUN', strength: 74, color: '#cc0000', country: 'Colômbia' },
  { id: 'santa-fe', name: 'Independiente Santa Fe', shortName: 'ISF', strength: 72, color: '#cc0000', country: 'Colômbia' },
  { id: 'independiente-medellin', name: 'Independiente Medellín', shortName: 'DIM', strength: 71, color: '#cc0000', country: 'Colômbia' },
  { id: 'tolima', name: 'Deportes Tolima', shortName: 'DTO', strength: 71, color: '#7a0c2e', country: 'Colômbia' },
  { id: 'deportivo-cali', name: 'Deportivo Cali', shortName: 'DCA', strength: 70, color: '#00703c', country: 'Colômbia' },
  { id: 'once-caldas', name: 'Once Caldas', shortName: 'ONC', strength: 69, color: '#ffffff', country: 'Colômbia' },
  { id: 'bucaramanga', name: 'Atlético Bucaramanga', shortName: 'BUC', strength: 68, color: '#f9c000', country: 'Colômbia' },
  { id: 'pereira', name: 'Deportivo Pereira', shortName: 'DPE', strength: 67, color: '#cc0000', country: 'Colômbia' },
  { id: 'aguilas-doradas', name: 'Águilas Doradas', shortName: 'AGD', strength: 65, color: '#f9c000', country: 'Colômbia' },
  { id: 'la-equidad', name: 'La Equidad', shortName: 'EQU', strength: 64, color: '#00703c', country: 'Colômbia' },
  { id: 'envigado', name: 'Envigado', shortName: 'ENV', strength: 63, color: '#e05a00', country: 'Colômbia' },
  { id: 'deportivo-pasto', name: 'Deportivo Pasto', shortName: 'PAS', strength: 63, color: '#cc0000', country: 'Colômbia' },
  { id: 'alianza-fc', name: 'Alianza FC', shortName: 'ALZ', strength: 62, color: '#00703c', country: 'Colômbia' },
  { id: 'fortaleza-ceif', name: 'Fortaleza CEIF', shortName: 'FCE', strength: 61, color: '#cc0000', country: 'Colômbia' },
  { id: 'boyaca-chico', name: 'Boyacá Chicó', shortName: 'BCH', strength: 61, color: '#005baa', country: 'Colômbia' },
  { id: 'union-magdalena', name: 'Unión Magdalena', shortName: 'UMA', strength: 60, color: '#005baa', country: 'Colômbia' },
  { id: 'llaneros', name: 'Llaneros FC', shortName: 'LLA', strength: 60, color: '#00703c', country: 'Colômbia' },
  // Equador — LigaPro Serie A
  { id: 'emelec', name: 'Emelec', shortName: 'EME', strength: 72, color: '#005baa', country: 'Equador' },
  { id: 'aucas', name: 'Aucas', shortName: 'AUC', strength: 68, color: '#f9c000', country: 'Equador' },
  { id: 'u-catolica-ec', name: 'U. Católica-EC', shortName: 'UCE', strength: 67, color: '#78b9e7', country: 'Equador' },
  { id: 'el-nacional', name: 'El Nacional', shortName: 'ENA', strength: 66, color: '#cc0000', country: 'Equador' },
  { id: 'delfin', name: 'Delfín', shortName: 'DLF', strength: 65, color: '#f9c000', country: 'Equador' },
  { id: 'deportivo-cuenca', name: 'Deportivo Cuenca', shortName: 'CUE', strength: 64, color: '#cc0000', country: 'Equador' },
  { id: 'orense', name: 'Orense', shortName: 'ORE', strength: 63, color: '#00703c', country: 'Equador' },
  { id: 'macara', name: 'Macará', shortName: 'MAC', strength: 62, color: '#78b9e7', country: 'Equador' },
  { id: 'mushuc-runa', name: 'Mushuc Runa', shortName: 'MUS', strength: 61, color: '#cc0000', country: 'Equador' },
  { id: 'tecnico-universitario', name: 'Técnico Universitario', shortName: 'TUN', strength: 61, color: '#cc0000', country: 'Equador' },
  { id: 'libertad-ec', name: 'Libertad FC', shortName: 'LEC', strength: 61, color: '#0057a8', country: 'Equador' },
  { id: 'manta-fc', name: 'Manta FC', shortName: 'MTA', strength: 60, color: '#005baa', country: 'Equador' },
  { id: 'vinotinto-ec', name: 'Vinotinto EC', shortName: 'VEC', strength: 60, color: '#7a0c2e', country: 'Equador' },
  // Peru — Liga 1
  { id: 'sporting-cristal', name: 'Sporting Cristal', shortName: 'SCR', strength: 73, color: '#78b9e7', country: 'Peru' },
  { id: 'melgar', name: 'Melgar', shortName: 'MEL', strength: 70, color: '#cc0000', country: 'Peru' },
  { id: 'cienciano', name: 'Cienciano', shortName: 'CIE', strength: 67, color: '#cc0000', country: 'Peru' },
  { id: 'cusco-fc', name: 'Cusco FC', shortName: 'CUS', strength: 66, color: '#f9c000', country: 'Peru' },
  { id: 'sport-huancayo', name: 'Sport Huancayo', shortName: 'SHY', strength: 65, color: '#cc0000', country: 'Peru' },
  { id: 'deportivo-garcilaso', name: 'Deportivo Garcilaso', shortName: 'GAR', strength: 65, color: '#78b9e7', country: 'Peru' },
  { id: 'atletico-grau', name: 'Atlético Grau', shortName: 'GRA', strength: 64, color: '#f9c000', country: 'Peru' },
  { id: 'adt', name: 'ADT', shortName: 'ADT', strength: 63, color: '#78b9e7', country: 'Peru' },
  { id: 'sport-boys', name: 'Sport Boys', shortName: 'SBO', strength: 63, color: '#f77fbe', country: 'Peru' },
  { id: 'utc', name: 'UTC Cajamarca', shortName: 'UTC', strength: 62, color: '#78b9e7', country: 'Peru' },
  { id: 'alianza-atletico', name: 'Alianza Atlético', shortName: 'AAT', strength: 62, color: '#005baa', country: 'Peru' },
  { id: 'los-chankas', name: 'Los Chankas', shortName: 'CHK', strength: 61, color: '#7a0c2e', country: 'Peru' },
  { id: 'binacional', name: 'Binacional', shortName: 'BIN', strength: 61, color: '#005baa', country: 'Peru' },
  { id: 'ayacucho-fc', name: 'Ayacucho FC', shortName: 'AYA', strength: 61, color: '#cc0000', country: 'Peru' },
  { id: 'comerciantes-unidos', name: 'Comerciantes Unidos', shortName: 'CUN', strength: 60, color: '#00703c', country: 'Peru' },
  { id: 'juan-pablo-ii', name: 'Juan Pablo II', shortName: 'JPI', strength: 60, color: '#f9c000', country: 'Peru' },
  // Bolívia — División Profesional
  { id: 'always-ready', name: 'Always Ready', shortName: 'ARE', strength: 68, color: '#cc0000', country: 'Bolívia' },
  { id: 'blooming', name: 'Blooming', shortName: 'BLO', strength: 65, color: '#78b9e7', country: 'Bolívia' },
  { id: 'oriente-petrolero', name: 'Oriente Petrolero', shortName: 'ORI', strength: 64, color: '#00703c', country: 'Bolívia' },
  { id: 'wilstermann', name: 'Jorge Wilstermann', shortName: 'WIL', strength: 64, color: '#cc0000', country: 'Bolívia' },
  { id: 'nacional-potosi', name: 'Nacional Potosí', shortName: 'NPO', strength: 63, color: '#7a0c2e', country: 'Bolívia' },
  { id: 'guabira', name: 'Guabirá', shortName: 'GBI', strength: 61, color: '#cc0000', country: 'Bolívia' },
  { id: 'san-antonio-bb', name: 'San Antonio Bulo Bulo', shortName: 'SAB', strength: 61, color: '#f9c000', country: 'Bolívia' },
  { id: 'real-tomayapo', name: 'Real Tomayapo', shortName: 'RTO', strength: 60, color: '#005baa', country: 'Bolívia' },
  { id: 'aurora-bo', name: 'Aurora', shortName: 'AUR', strength: 60, color: '#78b9e7', country: 'Bolívia' },
  { id: 'gv-san-jose', name: 'GV San José', shortName: 'GVS', strength: 60, color: '#0057a8', country: 'Bolívia' },
  { id: 'independiente-petrolero', name: 'Independiente Petrolero', shortName: 'IPE', strength: 60, color: '#cc0000', country: 'Bolívia' },
  { id: 'universitario-vinto', name: 'Universitario de Vinto', shortName: 'UVI', strength: 59, color: '#cc0000', country: 'Bolívia' },
  { id: 'real-oruro', name: 'Real Oruro', shortName: 'ROR', strength: 59, color: '#005baa', country: 'Bolívia' },
  { id: 'real-santa-cruz', name: 'Real Santa Cruz', shortName: 'RSC', strength: 59, color: '#005baa', country: 'Bolívia' },
  // Venezuela — Liga FUTVE
  { id: 'academia-puerto-cabello', name: 'Academia Puerto Cabello', shortName: 'APC', strength: 66, color: '#0057a8', country: 'Venezuela' },
  { id: 'deportivo-la-guaira', name: 'Deportivo La Guaira', shortName: 'DLG', strength: 64, color: '#e05a00', country: 'Venezuela' },
  { id: 'metropolitanos', name: 'Metropolitanos', shortName: 'MET', strength: 63, color: '#5c2d91', country: 'Venezuela' },
  { id: 'estudiantes-merida', name: 'Estudiantes de Mérida', shortName: 'EDM', strength: 63, color: '#cc0000', country: 'Venezuela' },
  { id: 'carabobo', name: 'Carabobo', shortName: 'CBO', strength: 63, color: '#7a0c2e', country: 'Venezuela' },
  { id: 'zamora-fc', name: 'Zamora FC', shortName: 'ZAM', strength: 62, color: '#111111', country: 'Venezuela' },
  { id: 'monagas', name: 'Monagas', shortName: 'MGS', strength: 62, color: '#005baa', country: 'Venezuela' },
  { id: 'portuguesa-fc', name: 'Portuguesa FC', shortName: 'PVE', strength: 61, color: '#cc0000', country: 'Venezuela' },
  { id: 'mineros', name: 'Mineros de Guayana', shortName: 'MIN', strength: 61, color: '#f9c000', country: 'Venezuela' },
  { id: 'ucv', name: 'UCV FC', shortName: 'UCV', strength: 60, color: '#7a0c2e', country: 'Venezuela' },
  { id: 'rayo-zuliano', name: 'Rayo Zuliano', shortName: 'RZU', strength: 59, color: '#005baa', country: 'Venezuela' },
  { id: 'angostura', name: 'Angostura FC', shortName: 'ANG', strength: 59, color: '#f9c000', country: 'Venezuela' }
]

// ---------------- Divisões de acesso (Série B/C, Championship, 2. Bundesliga) ----------------
const LOWER_DIVISION_CLUBS: Seed[] = [
  // Brasil – Série B
  { id: 'vila-nova', name: 'Vila Nova', shortName: 'VIL', strength: 66, color: '#ff0000', country: 'Brasil' },
  { id: 'remo', name: 'Remo', shortName: 'REM', strength: 66, color: '#005baa', country: 'Brasil' },
  { id: 'paysandu', name: 'Paysandu', shortName: 'PAY', strength: 65, color: '#00693e', country: 'Brasil' },
  { id: 'amazonas-fc', name: 'Amazonas FC', shortName: 'AMA', strength: 64, color: '#00923f', country: 'Brasil' },
  { id: 'ferroviaria', name: 'Ferroviária', shortName: 'FER', strength: 64, color: '#004b93', country: 'Brasil' },
  { id: 'athletic-mg', name: 'Athletic Club', shortName: 'ATH', strength: 63, color: '#111111', country: 'Brasil' },
  { id: 'volta-redonda', name: 'Volta Redonda', shortName: 'VOL', strength: 63, color: '#ffd700', country: 'Brasil' },
  { id: 'atletico-go', name: 'Atlético-GO', shortName: 'ACG', strength: 65, color: '#ff0000', country: 'Brasil' },
  { id: 'nautico', name: 'Náutico', shortName: 'NAU', strength: 64, color: '#e30613', country: 'Brasil' },
  { id: 'csa', name: 'CSA', shortName: 'CSA', strength: 63, color: '#111111', country: 'Brasil' },
  // Brasil – Série C
  { id: 'abc', name: 'ABC', shortName: 'ABC', strength: 61, color: '#111111', country: 'Brasil' },
  { id: 'confianca', name: 'Confiança', shortName: 'CON', strength: 60, color: '#f5c400', country: 'Brasil' },
  { id: 'sao-bernardo', name: 'São Bernardo', shortName: 'SBE', strength: 59, color: '#005baa', country: 'Brasil' },
  { id: 'ypiranga', name: 'Ypiranga-RS', shortName: 'YPI', strength: 59, color: '#111111', country: 'Brasil' },
  { id: 'brusque', name: 'Brusque', shortName: 'BRU', strength: 60, color: '#005baa', country: 'Brasil' },
  { id: 'figueirense', name: 'Figueirense', shortName: 'FIG', strength: 60, color: '#111111', country: 'Brasil' },
  { id: 'botafogo-pb', name: 'Botafogo-PB', shortName: 'BFP', strength: 59, color: '#111111', country: 'Brasil' },
  { id: 'tombense', name: 'Tombense', shortName: 'TOM', strength: 61, color: '#005baa', country: 'Brasil' },
  // Inglaterra – Championship
  { id: 'sheffield-wed', name: 'Sheffield Wednesday', shortName: 'SHW', strength: 68, color: '#0066b3', country: 'Inglaterra' },
  { id: 'middlesbrough', name: 'Middlesbrough', shortName: 'MID', strength: 69, color: '#e2231a', country: 'Inglaterra' },
  { id: 'west-brom', name: 'West Bromwich Albion', shortName: 'WBA', strength: 69, color: '#122f67', country: 'Inglaterra' },
  { id: 'norwich', name: 'Norwich City', shortName: 'NOR', strength: 68, color: '#00a650', country: 'Inglaterra' },
  { id: 'watford', name: 'Watford', shortName: 'WAT', strength: 67, color: '#fbee23', country: 'Inglaterra' },
  { id: 'coventry', name: 'Coventry City', shortName: 'COV', strength: 68, color: '#78b9e7', country: 'Inglaterra' },
  { id: 'preston', name: 'Preston North End', shortName: 'PRE', strength: 66, color: '#b2b2b2', country: 'Inglaterra' },
  { id: 'blackburn', name: 'Blackburn Rovers', shortName: 'BLA', strength: 67, color: '#009ee0', country: 'Inglaterra' },
  { id: 'millwall', name: 'Millwall', shortName: 'MIL', strength: 66, color: '#001b3a', country: 'Inglaterra' },
  { id: 'hull', name: 'Hull City', shortName: 'HUL', strength: 66, color: '#f18a00', country: 'Inglaterra' },
  { id: 'swansea', name: 'Swansea City', shortName: 'SWA', strength: 67, color: '#000000', country: 'Inglaterra' },
  { id: 'cardiff', name: 'Cardiff City', shortName: 'CAR', strength: 65, color: '#0070b5', country: 'Inglaterra' },
  { id: 'qpr', name: 'Queens Park Rangers', shortName: 'QPR', strength: 65, color: '#1d5ba4', country: 'Inglaterra' },
  { id: 'stoke', name: 'Stoke City', shortName: 'STK', strength: 67, color: '#e03a3e', country: 'Inglaterra' },
  { id: 'bristol-city', name: 'Bristol City', shortName: 'BRC', strength: 66, color: '#e21c21', country: 'Inglaterra' },
  { id: 'portsmouth', name: 'Portsmouth', shortName: 'POR', strength: 65, color: '#001489', country: 'Inglaterra' },
  // Alemanha – 2. Bundesliga
  { id: 'hamburgo', name: 'Hamburger SV', shortName: 'HSV', strength: 70, color: '#0f1c2e', country: 'Alemanha' },
  { id: 'fortuna-dus', name: 'Fortuna Düsseldorf', shortName: 'FOR', strength: 66, color: '#e2231a', country: 'Alemanha' },
  { id: 'hannover', name: 'Hannover 96', shortName: 'H96', strength: 67, color: '#0c9639', country: 'Alemanha' },
  { id: 'kaiserslautern', name: '1. FC Kaiserslautern', shortName: 'FCK', strength: 65, color: '#e2231a', country: 'Alemanha' },
  { id: 'karlsruher', name: 'Karlsruher SC', shortName: 'KSC', strength: 64, color: '#0057a8', country: 'Alemanha' },
  { id: 'elversberg', name: 'SV Elversberg', shortName: 'ELV', strength: 63, color: '#111111', country: 'Alemanha' },
  { id: 'greuther-furth', name: 'Greuther Fürth', shortName: 'GRF', strength: 63, color: '#00834a', country: 'Alemanha' },
  { id: 'braunschweig', name: 'Eintracht Braunschweig', shortName: 'BRA', strength: 62, color: '#f5c400', country: 'Alemanha' },
  { id: 'nurnberg', name: '1. FC Nürnberg', shortName: 'NUR', strength: 65, color: '#ba0c2f', country: 'Alemanha' },
  { id: 'paderborn', name: 'SC Paderborn', shortName: 'PAD', strength: 64, color: '#003da5', country: 'Alemanha' }
]

export const PRESET_TEAMS: Team[] = [
  ...make(EURO_CLUBS, 'club', 'football'),
  ...make(BR_CLUBS, 'club', 'football'),
  ...make(EXTRA_CLUBS, 'club', 'football'),
  ...make(CONMEBOL_EXTRA, 'club', 'football'),
  ...make(CONMEBOL_LEAGUES, 'club', 'football'),
  ...make(MORE_CLUBS, 'club', 'football'),
  ...make(LOWER_DIVISION_CLUBS, 'club', 'football'),
  ...make(NATIONS, 'national', 'football'),
  ...make(ESPORTS, 'club', 'esports'),
  ...make(EXTRA_ESPORTS, 'club', 'esports'),
  ...make(VCT_2026, 'club', 'esports')
]

export function presetsForSport(sport: Team['sport']): Team[] {
  return PRESET_TEAMS.filter((t) => t.sport === sport)
}
