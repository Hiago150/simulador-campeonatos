// Baixa os elencos de e-sports da Liquipedia e salva em
// src/renderer/src/data/esports-rosters.json (offline, incremental, resumível).
//
// Fonte única pros dois jogos: os wikis `counterstrike` e `valorant` têm a
// mesma estrutura de página, então é um mapa de páginas e um parser só —
// nada de tratamento separado por jogo (antes o CS2 era copiado à mão da
// Liquipedia e o Valorant do VLR.gg).
//
// Usa a API pública do MediaWiki, sem chave. Em troca disso os termos de uso
// (liquipedia.net/api-terms-of-use) exigem User-Agent identificável, gzip e
// no máximo 1 requisição `action=parse` a cada 30s — por isso um refresh
// completo leva ~1h. É script de manutenção, roda de vez em quando.
//
// Conteúdo da Liquipedia é CC-BY-SA 3.0.
//
// Uso:
//   node scripts/fetch-esports-rosters.mjs                 # tudo (~1h)
//   node scripts/fetch-esports-rosters.mjs --only=valorant # um jogo só
//   node scripts/fetch-esports-rosters.mjs --ids=loud,navi # times escolhidos
//   node scripts/fetch-esports-rosters.mjs --resume        # pula o que já tem
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { WIKI, parseActiveRoster } from './liquipedia.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUT = resolve(__dirname, '../src/renderer/src/data/esports-rosters.json')

const UA = 'SimuladorCampeonatos/1.0 (github.com/Hiago150/simulador-campeonatos)'
const PARSE_COOLDOWN = 32_000 // termos de uso: 1 req/30s em action=parse
const MIN_ROSTER = 4 // getEsportsRoster() aceita 4+ e completa o resto

// id do time no app -> nome da página na Liquipedia. O mesmo nome vale nos
// dois wikis; quem não tem página naquele jogo simplesmente falha e é pulado.
const PAGES = {
  navi: 'Natus Vincere',
  vitality: 'Team Vitality',
  faze: 'FaZe Clan',
  g2: 'G2 Esports',
  spirit: 'Team Spirit',
  mouz: 'MOUZ',
  liquid: 'Team Liquid',
  astralis: 'Astralis',
  furia: 'FURIA',
  heroic: 'Heroic',
  cloud9: 'Cloud9',
  pain: 'paiN Gaming',
  complexity: 'Complexity Gaming',
  ence: 'ENCE',
  big: 'BIG',
  falcons: 'Team Falcons',
  fnatic: 'Fnatic',
  sentinels: 'Sentinels',
  loud: 'LOUD',
  'paper-rex': 'Paper Rex',
  drx: 'DRX',
  geng: 'Gen.G',
  t1: 'T1',
  edg: 'EDward Gaming',
  nrg: 'NRG',
  'hundred-thieves': '100 Thieves',
  eg: 'Evil Geniuses',
  tsm: 'TSM',
  karmine: 'Karmine Corp',
  heretics: 'Team Heretics',
  koi: 'KOI',
  m8: 'Gentle Mates',
  vp: 'Virtus.pro',
  imperial: 'Imperial Esports',
  mibr: 'MIBR',
  'red-canids': 'RED Canids',
  fluxo: 'Fluxo',
  legacy: 'Legacy',
  n9z: '9z Team',
  leviatan: 'Leviatán',
  kru: 'KRÜ Esports',
  'movistar-riders': 'Movistar Riders',
  saw: 'SAW',
  'eternal-fire': 'Eternal Fire',
  gamerlegion: 'GamerLegion',
  apeks: 'Apeks',
  envy: 'Envy',
  'all-gamers': 'All Gamers',
  'bilibili-gaming': 'Bilibili Gaming',
  'funplus-phoenix': 'FunPlus Phoenix',
  'jd-gaming': 'JD Gaming',
  'nova-esports': 'Nova Esports',
  'titan-esports': 'Titan Esports Club',
  'trace-esports': 'Trace Esports',
  tyloo: 'TYLOO',
  'wolves-esports': 'Wolves Esports',
  'dragon-ranger': 'Dragon Ranger Gaming',
  'xlg-esports': 'XLG Esports',
  'bbl-esports': 'BBL Esports',
  'fut-esports': 'FUT Esports',
  giantx: 'GIANTX',
  pcific: 'PCIFIC Esports',
  detonation: 'DetonatioN FocusMe',
  'global-esports': 'Global Esports',
  rrq: 'Rex Regum Qeon',
  'team-secret': 'Team Secret',
  'zeta-division': 'ZETA DIVISION',
  'full-sense': 'FULL SENSE',
  nongshim: 'Nongshim RedForce',
  varrel: 'VARREL'
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const arg = (name) => process.argv.find((a) => a.startsWith(`--${name}=`))?.split('=')[1]
const has = (name) => process.argv.includes(`--${name}`)

async function fetchPage(wiki, page) {
  const url =
    `https://liquipedia.net/${wiki}/api.php?action=parse` +
    // redirects=1: muitas páginas de org são redirect (ex.: "Gen.G" →
    // "Gen.G Esports"); sem isso o parse devolve a casca do redirect, sem elenco
    `&page=${encodeURIComponent(page)}&prop=text&redirects=1&format=json`
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      // sem Accept-Encoding manual: o fetch do Node já pede gzip (exigido
      // pela Liquipedia) e descomprime sozinho
      const res = await fetch(url, { headers: { 'User-Agent': UA } })
      if (res.status === 429) {
        console.log('  ↻ 429, esperando 60s...')
        await sleep(60_000)
        continue
      }
      if (!res.ok) return null
      const json = await res.json()
      return json?.parse?.text?.['*'] ?? null
    } catch (e) {
      console.log(`  ↻ ${e.message}, esperando 20s...`)
      await sleep(20_000)
    }
  }
  return null
}

async function main() {
  const only = arg('only')
  const ids = arg('ids')?.split(',').map((s) => s.trim()).filter(Boolean)
  const resume = has('resume')
  const games = Object.keys(WIKI).filter((g) => !only || g === only)
  if (!games.length) {
    console.error(`--only inválido. Use: ${Object.keys(WIKI).join(' ou ')}`)
    process.exit(1)
  }

  await mkdir(dirname(OUT), { recursive: true })
  /** @type {Record<string, Record<string, string[]>>} */
  let data = {}
  if (existsSync(OUT)) {
    try {
      data = JSON.parse(await readFile(OUT, 'utf-8'))
    } catch {
      data = {}
    }
  }

  const targets = []
  for (const game of games) {
    for (const id of ids ?? Object.keys(PAGES)) {
      if (!PAGES[id]) {
        console.log(`? ${id} — sem página mapeada, ignorado`)
        continue
      }
      if (resume && data[game]?.[id]?.length) continue
      targets.push({ game, id })
    }
  }

  const mins = Math.round((targets.length * PARSE_COOLDOWN) / 60_000)
  console.log(`${targets.length} páginas a buscar (~${mins} min, limite de 1 req/30s)\n`)

  let ok = 0
  let changed = 0
  const fails = []
  for (const [i, { game, id }] of targets.entries()) {
    if (i) await sleep(PARSE_COOLDOWN)
    const html = await fetchPage(WIKI[game], PAGES[id])
    const roster = html ? parseActiveRoster(html) : []
    const label = `${game}/${id}`.padEnd(24)
    if (roster.length < MIN_ROSTER) {
      // não sobrescreve dado bom com dado ruim: página sem elenco, org que
      // não joga aquele jogo, ou time desmontado
      fails.push(`${game}/${id}`)
      console.log(`✗ ${label} ${roster.length} titulares — mantido o anterior`)
      continue
    }
    const before = data[game]?.[id]
    data[game] ??= {}
    data[game][id] = roster
    await writeFile(OUT, JSON.stringify(data, null, 2) + '\n')
    ok++
    const diff = before && before.join() !== roster.join()
    if (diff) changed++
    console.log(`✓ ${label} ${roster.join(', ')}${diff ? `  (era: ${before.join(', ')})` : ''}`)
  }

  console.log(`\nConcluído: ${ok}/${targets.length} elencos, ${changed} mudaram`)
  if (fails.length) console.log('Sem elenco utilizável:', fails.join(', '))
}

main()
