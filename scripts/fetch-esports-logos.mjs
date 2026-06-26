// Baixa as logos das orgs de e-sports do TheSportsDB (sport = ESports) e salva
// em src/renderer/src/assets/crests/<id>.png (offline, incremental, resumível).
// Uso: node scripts/fetch-esports-logos.mjs
import { mkdir, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUT = resolve(__dirname, '../src/renderer/src/assets/crests')
const KEY = '3'

const TEAMS = {
  navi: ['Natus Vincere'],
  vitality: ['Team Vitality', 'Vitality'],
  faze: ['FaZe Clan'],
  g2: ['G2 Esports'],
  spirit: ['Team Spirit'],
  mouz: ['MOUZ', 'mousesports'],
  liquid: ['Team Liquid'],
  astralis: ['Astralis'],
  furia: ['FURIA Esports', 'FURIA'],
  heroic: ['Heroic'],
  cloud9: ['Cloud9'],
  pain: ['paiN Gaming', 'paiN'],
  complexity: ['Complexity Gaming', 'Complexity'],
  ence: ['ENCE'],
  big: ['BIG'],
  falcons: ['Team Falcons', 'Falcons'],
  fnatic: ['Fnatic'],
  sentinels: ['Sentinels'],
  loud: ['LOUD', 'Loud'],
  'paper-rex': ['Paper Rex'],
  drx: ['DRX'],
  geng: ['Gen.G', 'Gen G', 'GenG'],
  t1: ['T1'],
  edg: ['EDward Gaming', 'Edward Gaming'],
  nrg: ['NRG', 'NRG Esports'],
  'hundred-thieves': ['100 Thieves'],
  eg: ['Evil Geniuses'],
  tsm: ['TSM'],
  karmine: ['Karmine Corp'],
  heretics: ['Team Heretics'],
  koi: ['KOI'],
  m8: ['Gentle Mates', 'M8'],
  vp: ['Virtus.pro', 'Virtus Pro'],
  imperial: ['Imperial Esports', 'Imperial'],
  mibr: ['MIBR'],
  'red-canids': ['RED Canids'],
  fluxo: ['Fluxo'],
  legacy: ['Legacy'],
  n9z: ['9z Team', '9z', '9Z'],
  leviatan: ['Leviatán', 'Leviatan'],
  kru: ['KRÜ Esports', 'KRU Esports', 'KRU'],
  'movistar-riders': ['Movistar Riders'],
  saw: ['SAW'],
  'eternal-fire': ['Eternal Fire'],
  gamerlegion: ['GamerLegion'],
  apeks: ['Apeks']
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function findBadge(candidates) {
  for (const q of candidates) {
    try {
      const r = await fetch(
        `https://www.thesportsdb.com/api/v1/json/${KEY}/searchteams.php?t=${encodeURIComponent(q)}`
      )
      const d = await r.json()
      const teams = (d.teams || []).filter((t) => t.strSport === 'ESports')
      if (teams.length) {
        const exact = teams.find((t) => (t.strTeam || '').toLowerCase() === q.toLowerCase())
        const t = exact || teams[0]
        const badge = t.strBadge || t.strTeamBadge
        if (badge) return { badge, name: t.strTeam }
      }
    } catch {
      /* tenta o próximo */
    }
    await sleep(250)
  }
  return null
}

async function resolveTeam(id) {
  for (let attempt = 0; attempt < 4; attempt++) {
    const found = await findBadge(TEAMS[id])
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
    if (existsSync(resolve(OUT, `${id}.png`))) continue
    const found = await resolveTeam(id)
    if (!found) {
      fails.push(id)
      console.log(`✗ ${id}`)
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
  console.log(`\nConcluído: ${ok}/${ids.length} logos salvas`)
  if (fails.length) console.log('Faltaram:', fails.join(', '))
}

main()
