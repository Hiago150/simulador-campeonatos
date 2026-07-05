import type { EsportsGame } from '../types'

// Snapshot de elencos reais por jogo (IGNs públicos dos jogadores).
// O mesmo time tem line-up diferente em cada jogo (ex.: FURIA no CS2 ≠ no Valorant).
// É uma "foto" de um período recente — envelhece com o tempo. Times sem entrada
// aqui caem no gerador procedural de nomes.
// Snapshot verificado em 2026-07-03 — CS2 via Liquipedia, Valorant via VLR.gg.
// Times em transição podem ter 4 nomes (o gerador completa o 5º procedural).
export const ESPORTS_ROSTERS: Record<EsportsGame, Record<string, string[]>> = {
  cs2: {
    navi: ['w0nderful', 'Aleksib', 'b1t', 'iM', 'makazze'],
    vitality: ['ZywOo', 'apEX', 'flameZ', 'mezii', 'ropz'],
    faze: ['frozen', 'rain', 'Twistzz', 'jcobbb', 'JBOEN'],
    g2: ['huNter-', 'HeavyGod', 'matys', 'NertZ', 'r1nkle'],
    spirit: ['donk', 'sh1ro', 'zont1x', 'magixx', 'tN1R'],
    // MOUZ está oficialmente com 4 (Jimpphat liberado em 02/07/26; empréstimo de jL expirou)
    mouz: ['torzsi', 'xertioN', 'Spinx', 'xelex'],
    falcons: ['NiKo', 'm0NESY', 'TeSeS', 'kyousuke', 'karrigan'],
    furia: ['FalleN', 'yuurih', 'KSCERATO', 'molodoy', 'YEKINDAR'],
    astralis: ['Staehr', 'jabbi', 'HooXi', 'phzy', 'ryu'],
    liquid: ['EliGE', 'NAF', 'siuhy', 'ultimate', 'malbsMd'],
    // complexity saiu do CS2 em ago/2025 (elenco vendido) — sem roster curado
    vp: ['mir', 'tO0RO', 'b1st', 'AquaRS', 'F0R3VER'],
    mibr: ['brnz4n', 'insani', 'LNZ', 'venomzera', 'nqz'],
    pain: ['biguzera', 'snow', 'piriajr', 'v$m', 'saffee']
  },
  valorant: {
    sentinels: ['johnqt', 'Reduxx', 'Jerrwin', 'cortezia', 'JonahP'],
    loud: ['lukxo', 'Darker', 'Virtyy', 'erde', 'cauanzin'],
    'paper-rex': ['invy', 'Jinggg', 'f0rsakeN', 'd4v41', 'something'],
    drx: ['MaKo', 'yong', 'free1ng', 'HYUNMIN', 'BeYN'],
    // Gen.G está oficialmente com 4 (Lakia saiu em 01/07/26)
    geng: ['ZynX', 'Ash', 'Karon', 't3xture'],
    t1: ['Munchkin', 'stax', 'Meteor', 'BuZz', 'iZu'],
    fnatic: ['Boaster', 'crashies', 'kaajak', 'Veqaj', 'Alfajer'],
    nrg: ['Ethan', 'keiko', 'brawk', 'mada', 'skuba'],
    'hundred-thieves': ['vora', 'Cryocells', 'Asuna', 'Timotino', 'bang'],
    heretics: ['Boo', 'koshmaras', 'Wo0t', 'RieNs', 'benjyfishy'],
    edg: ['nobody', 'ZmjjKK', 'CHICHOO', 'Smoggy', 'Jieni7'],
    leviatan: ['kiNgg', 'spike', 'blowz', 'Neon', 'Sato'],
    navi: ['chloric', 'ExiT', 'Ruxic', 'hiro', 'CyvOph'],
    vitality: ['Jamppi', 'PROFEK', 'Derke', 'Chronicle', 'Sayonara'],
    eg: ['supamen', 'bao', 'dgzin', 'Paincakes', 'zerona'],
    karmine: ['dos9', 'LewN', 'Avez', 'SUYGETSU', 'N4RRATE'],
    m8: ['starxo', 'Proxh', 'bipo', 'marteen', 'Minny'],
    mibr: ['zekken', 'tex', 'Mazino', 'Verno', 'aspas'],
    kru: ['saadhak', 'mwzera', 'Less', 'Dantedeu5', 'heat'],
    furia: ['artzin', 'basic', 'Shyy', 'eeiu', 'koalanoob'],
    g2: ['valyn', 'jawgemo', 'BABYBAY', 'trent', 'leaf']
  }
}

export function getEsportsRoster(game: EsportsGame, teamId: string): string[] | undefined {
  const roster = ESPORTS_ROSTERS[game]?.[teamId]
  // aceita 4+ (time em transição sem o 5º anunciado); o gerador completa o resto
  return roster && roster.length >= 4 ? roster : undefined
}

/** chave de armazenamento dos elencos editados pelo usuário (por jogo + time) */
export function rosterKey(game: EsportsGame, teamId: string): string {
  return `${game}::${teamId}`
}
