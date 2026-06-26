// Baixa os elencos reais (nomes + posição) dos times de futebol do TheSportsDB
// e salva em src/renderer/src/data/squads.json (offline, incremental, resumível).
// Uso: node scripts/fetch-squads.mjs
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { TEAMS, ID_OVERRIDE } from './football-search.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUT = resolve(__dirname, '../src/renderer/src/data/squads.json')
const KEY = '3'

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const isYouthOrReserve = (n) => /\b(U\d{2}|Women|Reserves?|Academy|Youth|II)\b/i.test(n || '')
const STAFF = /coach|manager|assistant|analyst|director|president|physio|scout|kit|chairman|owner/i

function mapPos(p) {
  const s = (p || '').toLowerCase()
  if (s.includes('keeper') || s.includes('goalkeeper')) return 'GK'
  if (s.includes('midfield')) return 'MID'
  if (s.includes('wing') || s.includes('forward') || s.includes('striker') || s.includes('attack')) return 'FWD'
  if (s.includes('back') || s.includes('defen') || s.includes('centre-back')) return 'DEF'
  return 'MID'
}

async function getJson(url) {
  try {
    return await (await fetch(url)).json()
  } catch {
    return null
  }
}

async function resolveId(id) {
  if (ID_OVERRIDE[id]) return ID_OVERRIDE[id]
  for (const q of TEAMS[id]) {
    const d = await getJson(
      `https://www.thesportsdb.com/api/v1/json/${KEY}/searchteams.php?t=${encodeURIComponent(q)}`
    )
    const teams = (d?.teams || []).filter((t) => t.strSport === 'Soccer' && !isYouthOrReserve(t.strTeam))
    if (teams.length) {
      const exact = teams.find((t) => (t.strTeam || '').toLowerCase() === q.toLowerCase())
      return (exact || teams[0]).idTeam
    }
    await sleep(300)
  }
  return null
}

async function getSquad(id) {
  // resolve idTeam com backoff
  let tid = null
  for (let a = 0; a < 4 && !tid; a++) {
    tid = await resolveId(id)
    if (!tid) {
      console.log(`  ↻ ${id} (id vazio) aguardando 20s...`)
      await sleep(20000)
    }
  }
  if (!tid) return null
  // lista de jogadores com backoff
  for (let a = 0; a < 4; a++) {
    const d = await getJson(`https://www.thesportsdb.com/api/v1/json/${KEY}/lookup_all_players.php?id=${tid}`)
    const arr = d?.player || d?.players
    if (arr && arr.length) {
      const players = arr
        .filter((p) => p.strPlayer && !STAFF.test(p.strPosition || ''))
        .map((p) => ({ name: p.strPlayer, pos: mapPos(p.strPosition) }))
      if (players.length) return players
    }
    if (a < 3) {
      console.log(`  ↻ ${id} (jogadores vazio) aguardando 20s...`)
      await sleep(20000)
    }
  }
  return null
}

async function main() {
  await mkdir(dirname(OUT), { recursive: true })
  let data = {}
  if (existsSync(OUT)) {
    try {
      data = JSON.parse(await readFile(OUT, 'utf-8'))
    } catch {
      data = {}
    }
  }
  const ids = Object.keys(TEAMS)
  let ok = 0
  const fails = []
  for (const id of ids) {
    if (data[id] && data[id].length) continue
    const squad = await getSquad(id)
    if (squad && squad.length) {
      data[id] = squad
      await writeFile(OUT, JSON.stringify(data))
      ok++
      console.log(`✓ ${id.padEnd(16)} ${squad.length} jogadores — ex: ${squad.slice(0, 3).map((p) => p.name).join(', ')}`)
    } else {
      fails.push(id)
      console.log(`✗ ${id}`)
    }
    await sleep(1200)
  }
  console.log(`\nConcluído: +${ok} times; total ${Object.keys(data).length}/${ids.length}`)
  if (fails.length) console.log('Faltaram:', fails.join(', '))
}

main()
