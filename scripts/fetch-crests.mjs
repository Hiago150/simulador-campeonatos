// Baixa os escudos (badges) dos clubes e seleções do TheSportsDB e salva
// em src/renderer/src/assets/crests/<id>.png — para uso OFFLINE no app.
// Uso: node scripts/fetch-crests.mjs
import { mkdir, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUT = resolve(__dirname, '../src/renderer/src/assets/crests')
const KEY = '3' // chave pública de teste do TheSportsDB

// dicionário compartilhado com fetch-squads.mjs (novos times entram lá)
import { TEAMS as SHARED_TEAMS } from './football-search.mjs'

// id (igual ao de data/teams.ts) -> nomes candidatos de busca no TheSportsDB
const TEAMS = {
  // Clubes europeus
  'real-madrid': ['Real Madrid'],
  'man-city': ['Manchester City'],
  bayern: ['Bayern Munich', 'Bayern München'],
  barcelona: ['Barcelona'],
  psg: ['Paris Saint-Germain', 'Paris SG', 'PSG'],
  liverpool: ['Liverpool'],
  inter: ['Inter Milan', 'Internazionale'],
  arsenal: ['Arsenal'],
  atletico: ['Atletico Madrid'],
  dortmund: ['Borussia Dortmund'],
  milan: ['AC Milan'],
  juventus: ['Juventus'],
  'man-united': ['Manchester United'],
  chelsea: ['Chelsea'],
  napoli: ['Napoli'],
  tottenham: ['Tottenham Hotspur', 'Tottenham'],
  // Clubes brasileiros
  flamengo: ['Flamengo'],
  palmeiras: ['Palmeiras'],
  'atletico-mg': ['Atletico Mineiro', 'Atletico-MG'],
  fluminense: ['Fluminense'],
  'sao-paulo': ['Sao Paulo'],
  corinthians: ['Corinthians'],
  internacional: ['Internacional'],
  gremio: ['Gremio'],
  botafogo: ['Botafogo'],
  cruzeiro: ['Cruzeiro'],
  'athletico-pr': ['Athletico Paranaense', 'Atletico Paranaense'],
  santos: ['Santos'],
  // Seleções
  brasil: ['Brazil'],
  franca: ['France'],
  argentina: ['Argentina'],
  espanha: ['Spain'],
  inglaterra: ['England'],
  alemanha: ['Germany'],
  portugal: ['Portugal'],
  holanda: ['Netherlands'],
  italia: ['Italy'],
  belgica: ['Belgium'],
  croacia: ['Croatia'],
  uruguai: ['Uruguay'],
  colombia: ['Colombia'],
  marrocos: ['Morocco'],
  mexico: ['Mexico'],
  eua: ['USA', 'United States'],
  japao: ['Japan'],
  senegal: ['Senegal'],
  suica: ['Switzerland'],
  dinamarca: ['Denmark'],
  coreia: ['South Korea', 'Korea Republic'],
  servia: ['Serbia'],
  equador: ['Ecuador'],
  australia: ['Australia'],
  // +50 clubes
  newcastle: ['Newcastle'],
  'aston-villa': ['Aston Villa'],
  'west-ham': ['West Ham United'],
  brighton: ['Brighton'],
  everton: ['Everton'],
  nottingham: ['Nottingham Forest'],
  wolves: ['Wolverhampton Wanderers', 'Wolves'],
  'crystal-palace': ['Crystal Palace'],
  fulham: ['Fulham'],
  leeds: ['Leeds United'],
  sevilla: ['Sevilla'],
  betis: ['Real Betis', 'Betis'],
  villarreal: ['Villarreal'],
  'real-sociedad': ['Real Sociedad'],
  athletic: ['Athletic Bilbao', 'Athletic Club'],
  valencia: ['Valencia'],
  celta: ['Celta Vigo', 'Celta de Vigo'],
  roma: ['AS Roma', 'Roma'],
  lazio: ['Lazio'],
  atalanta: ['Atalanta'],
  fiorentina: ['Fiorentina'],
  bologna: ['Bologna'],
  torino: ['Torino'],
  leipzig: ['RB Leipzig'],
  leverkusen: ['Bayer Leverkusen', 'Leverkusen'],
  frankfurt: ['Eintracht Frankfurt'],
  stuttgart: ['VfB Stuttgart', 'Stuttgart'],
  gladbach: ['Borussia Monchengladbach', 'Monchengladbach'],
  marseille: ['Marseille', 'Olympique Marseille'],
  lyon: ['Lyon', 'Olympique Lyonnais'],
  monaco: ['Monaco', 'AS Monaco'],
  lille: ['Lille OSC', 'Lille'],
  nice: ['Nice', 'OGC Nice'],
  benfica: ['Benfica'],
  porto: ['Porto', 'FC Porto'],
  sporting: ['Sporting CP', 'Sporting Lisbon'],
  braga: ['Sporting Braga', 'Braga'],
  ajax: ['Ajax'],
  psv: ['PSV Eindhoven', 'PSV'],
  feyenoord: ['Feyenoord'],
  celtic: ['Celtic'],
  rangers: ['Rangers'],
  galatasaray: ['Galatasaray'],
  fenerbahce: ['Fenerbahce'],
  boca: ['Boca Juniors'],
  river: ['River Plate'],
  vasco: ['Vasco da Gama', 'Vasco'],
  bahia: ['Bahia', 'EC Bahia'],
  fortaleza: ['Fortaleza', 'Fortaleza EC'],
  'america-mx': ['Club America', 'America'],
  // Brasil extras – Série A e grandes clubes
  bragantino: ['Red Bull Bragantino', 'Bragantino'],
  vitoria: ['Vitória BA', 'Vitoria', 'EC Vitoria', 'Esporte Clube Vitória'],
  sport: ['Sport Club Recife', 'Sport Recife', 'Sport'],
  ceara: ['Ceará Sporting Club', 'Ceara SC', 'Ceará'],
  juventude: ['Juventude', 'EC Juventude'],
  mirassol: ['Mirassol FC', 'Mirassol'],
  'america-mg': ['America Mineiro', 'América-MG', 'America MG'],
  goias: ['Goias Esporte Clube', 'Goias', 'Goiás'],
  coritiba: ['Coritiba', 'Coritiba FC'],
  cuiaba: ['Cuiabá EC', 'Cuiaba', 'Cuiabá'],
  criciuma: ['Criciúma EC', 'Criciuma', 'Criciúma'],
  novorizontino: ['Novorizontino', 'Grêmio Novorizontino'],
  'ponte-preta': ['Associação Atlética Ponte Preta', 'Ponte Preta'],
  guarani: ['Guarani FC', 'Guarani Campinas'],
  chapecoense: ['Chapecoense', 'Associação Chapecoense de Futebol'],
  avai: ['Avaí FC', 'Avai'],
  'botafogo-sp': ['Botafogo SP', 'Botafogo Ribeirão Preto', 'Botafogo de Ribeirão Preto'],
  operario: ['Operário Ferroviário', 'Operario Ferroviario EC'],
  ituano: ['Ituano FC', 'Ituano'],
  crb: ['CRB', 'Clube de Regatas Brasil'],
  // Inglaterra – Premier League extras
  bournemouth: ['Bournemouth', 'AFC Bournemouth'],
  brentford: ['Brentford'],
  leicester: ['Leicester City'],
  ipswich: ['Ipswich Town'],
  southampton: ['Southampton'],
  'sheffield-utd': ['Sheffield United'],
  sunderland: ['Sunderland'],
  burnley: ['Burnley'],
  // Alemanha – Bundesliga extras
  werder: ['Werder Bremen', 'SV Werder Bremen'],
  freiburg: ['Sport-Club Freiburg', 'SC Freiburg 1906', 'Freiburg'],
  wolfsburg: ['VfL Wolfsburg', 'Wolfsburg'],
  'union-berlin': ['1. FC Union Berlin', 'Union Berlin'],
  hoffenheim: ['TSG 1899 Hoffenheim', 'Hoffenheim', 'TSG Hoffenheim'],
  mainz: ['FSV Mainz 05', 'Mainz 05', 'Mainz'],
  augsburg: ['FC Augsburg', 'Augsburg'],
  hertha: ['Hertha Berlin', 'Hertha BSC'],
  schalke: ['FC Schalke 04', 'Schalke 04'],
  'st-pauli': ['FC St. Pauli', 'St. Pauli Hamburg', 'Sankt Pauli'],
  koln: ['1. FC Köln', 'FC Koln', 'Köln'],
  heidenheim: ['1. FC Heidenheim', 'Heidenheim'],
  // Espanha – La Liga extras
  osasuna: ['CA Osasuna', 'Osasuna'],
  girona: ['Girona FC', 'Girona'],
  getafe: ['Getafe CF', 'Getafe'],
  'las-palmas': ['UD Las Palmas', 'Las Palmas'],
  alaves: ['Deportivo Alaves', 'Deportivo Alavés', 'Alavés'],
  mallorca: ['Real Mallorca', 'Mallorca'],
  espanyol: ['RCD Espanyol', 'Espanyol'],
  rayo: ['Rayo Vallecano'],
  // Itália – Serie A extras
  udinese: ['Udinese'],
  sassuolo: ['Sassuolo', 'US Sassuolo'],
  lecce: ['US Lecce', 'Lecce'],
  empoli: ['Empoli', 'Empoli FC'],
  monza: ['AC Monza', 'Monza'],
  verona: ['Hellas Verona', 'Verona'],
  genoa: ['Genoa', 'Genoa CFC'],
  cagliari: ['Cagliari', 'Cagliari Calcio'],
  venezia: ['Venezia', 'FC Venezia'],
  sampdoria: ['Sampdoria', 'UC Sampdoria'],
  // França – Ligue 1 extras
  rennes: ['Stade Rennais', 'Rennes'],
  lens: ['RC Lens', 'Lens'],
  strasbourg: ['RC Strasbourg Alsace', 'Strasbourg', 'RC Strasbourg'],
  reims: ['Stade de Reims', 'Reims'],
  nantes: ['FC Nantes', 'Nantes'],
  brest: ['Stade Brestois 29', 'Brest'],
  toulouse: ['Toulouse FC', 'Toulouse'],
  'saint-etienne': ['AS Saint-Étienne', 'Saint-Etienne'],
  // Países Baixos extras
  az: ['AZ Alkmaar', 'AZ'],
  twente: ['FC Twente', 'Twente'],
  utrecht: ['FC Utrecht', 'Utrecht'],
  // Bélgica
  anderlecht: ['RSC Anderlecht', 'Anderlecht'],
  brugge: ['Club Brugge', 'Club Brugge KV'],
  // Turquia extras
  besiktas: ['Besiktas JK', 'Beşiktaş'],
  trabzonspor: ['Trabzonspor'],
  basaksehir: ['Istanbul Basaksehir', 'Medipol Başakşehir'],
  // Argentina
  independiente: ['Club Atletico Independiente', 'Independiente'],
  'racing-club': ['Racing Club de Avellaneda', 'Racing Club'],
  'san-lorenzo': ['CA San Lorenzo', 'Club Atletico San Lorenzo', 'San Lorenzo'],
  estudiantes: ['Estudiantes de La Plata', 'Estudiantes'],
  velez: ['Velez Sarsfield', 'Vélez Sársfield'],
  talleres: ['Talleres de Córdoba', 'Talleres'],
  huracan: ['Club Atletico Huracan', 'Huracán', 'Huracan'],
  // México
  guadalajara: ['Chivas de Guadalajara', 'Club Deportivo Guadalajara', 'Guadalajara Chivas'],
  tigres: ['Tigres UANL', 'Tigres'],
  monterrey: ['CF Monterrey', 'Monterrey'],
  'cruz-azul': ['Cruz Azul', 'Deportivo Cruz Azul'],
  pumas: ['Pumas UNAM', 'UNAM Pumas'],
  toluca: ['Deportivo Toluca FC', 'Club Deportivo Toluca', 'Toluca'],
  pachuca: ['CF Pachuca', 'Pachuca'],
  // Japão – J1 League
  kashima: ['Kashima Antlers'],
  urawa: ['Urawa Red Diamonds', 'Urawa Reds'],
  'yokohama-fm': ['Yokohama F. Marinos', 'Yokohama Marinos'],
  gamba: ['Gamba Osaka'],
  // MLS
  'inter-miami': ['Inter Miami CF', 'Inter Miami'],
  'la-galaxy': ['LA Galaxy', 'Los Angeles Galaxy'],
  lafc: ['LAFC', 'Los Angeles FC'],
  seattle: ['Seattle Sounders FC', 'Sounders FC'],
  // Europa Oriental
  shakhtar: ['Shakhtar Donetsk'],
  'dynamo-kyiv': ['Dynamo Kiev', 'Dynamo Kyiv', 'FK Dynamo Kyiv'],
  zenit: ['Zenit Saint Petersburg', 'Zenit', 'FC Zenit'],
  'red-star': ['FK Crvena zvezda', 'Red Star Belgrade', 'Crvena Zvezda'],
  // ---- Copa 2026 (seleções novas) ----
  canada: ['Canada'],
  paraguai: ['Paraguay'],
  austria: ['Austria'],
  noruega: ['Norway'],
  escocia: ['Scotland'],
  suecia: ['Sweden'],
  turquia: ['Turkey', 'Türkiye'],
  tchequia: ['Czech Republic', 'Czechia'],
  bosnia: ['Bosnia and Herzegovina', 'Bosnia-Herzegovina'],
  'costa-do-marfim': ['Ivory Coast', "Cote d'Ivoire"],
  egito: ['Egypt'],
  argelia: ['Algeria'],
  tunisia: ['Tunisia'],
  gana: ['Ghana'],
  'africa-do-sul': ['South Africa'],
  'cabo-verde': ['Cape Verde'],
  'rd-congo': ['DR Congo', 'Congo DR'],
  'arabia-saudita': ['Saudi Arabia'],
  catar: ['Qatar'],
  ira: ['Iran', 'IR Iran'],
  iraque: ['Iraq'],
  jordania: ['Jordan'],
  uzbequistao: ['Uzbekistan'],
  panama: ['Panama'],
  haiti: ['Haiti'],
  curacao: ['Curacao', 'Curaçao'],
  'nova-zelandia': ['New Zealand'],
  // ---- Brasil Série B ----
  'vila-nova': ['Vila Nova FC', 'Vila Nova'],
  remo: ['Clube do Remo', 'Remo'],
  paysandu: ['Paysandu SC', 'Paysandu'],
  'amazonas-fc': ['Amazonas FC', 'Amazonas'],
  ferroviaria: ['Ferroviaria', 'AA Ferroviaria'],
  'athletic-mg': ['Athletic Club MG', 'Athletic Club'],
  'volta-redonda': ['Volta Redonda FC', 'Volta Redonda'],
  'atletico-go': ['Atletico Goianiense', 'Atletico-GO'],
  nautico: ['Clube Nautico Capibaribe', 'Nautico'],
  csa: ['CSA', 'Centro Sportivo Alagoano'],
  // ---- Brasil Série C ----
  abc: ['ABC FC', 'ABC'],
  confianca: ['Confianca', 'AD Confianca'],
  'sao-bernardo': ['Sao Bernardo FC', 'Sao Bernardo'],
  ypiranga: ['Ypiranga FC', 'Ypiranga RS'],
  brusque: ['Brusque FC', 'Brusque'],
  figueirense: ['Figueirense FC', 'Figueirense'],
  'botafogo-pb': ['Botafogo PB', 'Botafogo Futebol Clube PB'],
  tombense: ['Tombense FC', 'Tombense'],
  // ---- Championship (Inglaterra) ----
  'sheffield-wed': ['Sheffield Wednesday'],
  middlesbrough: ['Middlesbrough'],
  'west-brom': ['West Bromwich Albion', 'West Brom'],
  norwich: ['Norwich City'],
  watford: ['Watford'],
  coventry: ['Coventry City'],
  preston: ['Preston North End'],
  blackburn: ['Blackburn Rovers'],
  millwall: ['Millwall'],
  hull: ['Hull City'],
  swansea: ['Swansea City'],
  cardiff: ['Cardiff City'],
  qpr: ['Queens Park Rangers', 'QPR'],
  stoke: ['Stoke City'],
  'bristol-city': ['Bristol City'],
  portsmouth: ['Portsmouth'],
  // ---- 2. Bundesliga (Alemanha) ----
  hamburgo: ['Hamburger SV', 'Hamburg SV'],
  'fortuna-dus': ['Fortuna Dusseldorf'],
  hannover: ['Hannover 96'],
  kaiserslautern: ['Kaiserslautern', '1. FC Kaiserslautern'],
  karlsruher: ['Karlsruher SC'],
  elversberg: ['SV Elversberg'],
  'greuther-furth': ['Greuther Furth', 'SpVgg Greuther Furth'],
  braunschweig: ['Eintracht Braunschweig'],
  nurnberg: ['1. FC Nurnberg', 'Nurnberg'],
  paderborn: ['SC Paderborn 07', 'Paderborn'],
  // ---- CONMEBOL — clubes sul-americanos ----
  'colo-colo': ['Colo-Colo', 'CSD Colo-Colo'],
  'u-de-chile': ['Universidad de Chile', 'U de Chile'],
  'u-catolica': ['Universidad Catolica', 'CD Universidad Catolica'],
  penarol: ['Penarol', 'CA Penarol'],
  'nacional-uy': ['Nacional', 'Club Nacional de Football'],
  olimpia: ['Olimpia', 'Club Olimpia'],
  'cerro-porteno': ['Cerro Porteno', 'Club Cerro Porteno'],
  'atletico-nacional': ['Atletico Nacional', 'Atl. Nacional'],
  millonarios: ['Millonarios', 'Millonarios FC'],
  'america-cali': ['America de Cali'],
  'barcelona-sc': ['Barcelona SC', 'Barcelona Sporting Club'],
  'ldu-quito': ['LDU Quito', 'Liga de Quito', 'Liga Deportiva Universitaria'],
  'independiente-del-valle': ['Independiente del Valle'],
  universitario: ['Universitario', 'Universitario de Deportes'],
  'alianza-lima': ['Alianza Lima', 'Club Alianza Lima'],
  bolivar: ['Bolivar', 'Club Bolivar'],
  'the-strongest': ['The Strongest', 'Club The Strongest'],
  'deportivo-tachira': ['Deportivo Tachira'],
  'caracas-fc': ['Caracas FC', 'Caracas'],
  // dicionário compartilhado por último: novas entradas (ligas CONMEBOL etc.)
  // entram aqui automaticamente sem duplicar a lista
  ...SHARED_TEAMS
}

// A busca do TheSportsDB casa "Athletic Club" com o TRAU (Índia) — escudo
// errado já baixado 2x. Sem fonte confiável: fica fora até termos idTeam.
delete TEAMS['athletic-mg']

// Times sem busca confiável → resolvidos direto pelo idTeam do TheSportsDB.
const ID_OVERRIDE = {
  psg: '133714',        // Paris Saint-Germain (a busca por nome não retorna o time masculino)
  nottingham: '133720', // Nottingham Forest
  'saint-etienne': '133717', // AS Saint-Étienne
  seattle: '134149',         // Seattle Sounders FC
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

// ignora times de base / reservas / feminino
const isYouthOrReserve = (name) => /\b(U\d{2}|Women|Reserves?|Academy|Youth|II|Femenil|Feminino|Defiance|Tacoma)\b/i.test(name || '')

async function lookupById(id) {
  try {
    const r = await fetch(`https://www.thesportsdb.com/api/v1/json/${KEY}/lookupteam.php?id=${id}`)
    const d = await r.json()
    const t = d.teams && d.teams[0]
    const badge = t && (t.strBadge || t.strTeamBadge)
    if (badge) return { badge, name: t.strTeam }
  } catch (e) {
    /* ignora */
  }
  return null
}

async function findBadge(candidates) {
  for (const q of candidates) {
    try {
      const r = await fetch(
        `https://www.thesportsdb.com/api/v1/json/${KEY}/searchteams.php?t=${encodeURIComponent(q)}`
      )
      const d = await r.json()
      const teams = (d.teams || []).filter(
        (t) => t.strSport === 'Soccer' && !isYouthOrReserve(t.strTeam)
      )
      if (teams.length) {
        const exact = teams.find((t) => (t.strTeam || '').toLowerCase() === q.toLowerCase())
        const t = exact || teams[0]
        const badge = t.strBadge || t.strTeamBadge
        if (badge) return { badge, name: t.strTeam }
      }
    } catch (e) {
      // tenta o próximo candidato
    }
    await sleep(250)
  }
  return null
}

// resolve com backoff: se vier vazio (provável rate limit), espera e re-tenta
async function resolveTeam(id) {
  for (let attempt = 0; attempt < 4; attempt++) {
    const found = ID_OVERRIDE[id] ? await lookupById(ID_OVERRIDE[id]) : await findBadge(TEAMS[id])
    if (found) return found
    if (attempt < 3) {
      console.log(`  ↻ ${id} vazio — aguardando 20s (rate limit?)...`)
      await sleep(20000)
    }
  }
  return null
}

async function main() {
  await mkdir(OUT, { recursive: true })
  const ids = Object.keys(TEAMS)
  let ok = 0
  const fails = []
  for (const id of ids) {
    if (existsSync(resolve(OUT, `${id}.png`))) {
      continue
    }
    const found = await resolveTeam(id)
    if (!found) {
      fails.push(id)
      console.log(`✗ ${id} — não encontrado`)
      continue
    }
    try {
      const img = await fetch(found.badge)
      const buf = Buffer.from(await img.arrayBuffer())
      await writeFile(resolve(OUT, `${id}.png`), buf)
      ok++
      console.log(`✓ ${id.padEnd(16)} → ${found.name}`)
    } catch (e) {
      fails.push(id)
      console.log(`✗ ${id} — falha ao baixar (${e.message})`)
    }
    await sleep(1500)
  }
  console.log(`\nConcluído: ${ok}/${ids.length} escudos salvos em ${OUT}`)
  if (fails.length) console.log(`Faltaram: ${fails.join(', ')}`)
}

main()
