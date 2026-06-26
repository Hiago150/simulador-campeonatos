import type { EsportsGame } from '../types'

// Snapshot de elencos reais por jogo (IGNs públicos dos jogadores).
// O mesmo time tem line-up diferente em cada jogo (ex.: FURIA no CS2 ≠ no Valorant).
// É uma "foto" de um período recente — envelhece com o tempo. Times sem entrada
// aqui caem no gerador procedural de nomes.
export const ESPORTS_ROSTERS: Record<EsportsGame, Record<string, string[]>> = {
  cs2: {
    navi: ['w0nderful', 'Aleksib', 'b1t', 'jL', 'iM'],
    vitality: ['ZywOo', 'apEX', 'flameZ', 'Spinx', 'mezii'],
    faze: ['karrigan', 'rain', 'frozen', 'broky', 'ropz'],
    g2: ['NiKo', 'huNter-', 'm0NESY', 'malbsMd', 'Snax'],
    spirit: ['chopper', 'sh1ro', 'donk', 'zont1x', 'magixx'],
    mouz: ['Brollan', 'torzsi', 'xertioN', 'Jimpphat', 'siuhy'],
    furia: ['FalleN', 'yuurih', 'KSCERATO', 'molodoy', 'YEKINDAR'],
    astralis: ['device', 'stavn', 'jabbi', 'Staehr', 'HooXi'],
    liquid: ['cadiaN', 'NAF', 'Twistzz', 'ultimate', 'NertZ'],
    complexity: ['EliGE', 'hallzerk', 'Grim', 'JT', 'floppy'],
    vp: ['Jame', 'FL1T', 'fame', 'n0rb3r7', 'Perfecto'],
    mibr: ['exit', 'insani', 'drop', 'brnz4n', 'Lucaozy'],
    pain: ['nqz', 'dgt', 'kauez', 'snow', 'biguzera']
  },
  // Valorant — lineups atualizadas pelo VLR.gg (snapshot meados de 2026)
  valorant: {
    sentinels: ['johnqt', 'Reduxx', 'Jerrwin', 'cortezia', 'JonahP'],
    loud: ['lukxo', 'Darker', 'Virtyy', 'erde', 'cauanzin'],
    'paper-rex': ['invy', 'Jinggg', 'f0rsakeN', 'd4v41', 'something'],
    drx: ['MaKo', 'yong', 'free1ng', 'HYUNMIN', 'BeYN'],
    geng: ['Lakia', 'ZynX', 'Ash', 'Karon', 't3xture'],
    t1: ['Munchkin', 'stax', 'Meteor', 'BuZz', 'iZu'],
    fnatic: ['Boaster', 'crashies', 'kaajak', 'Veqaj', 'Cloud'],
    nrg: ['Ethan', 'keiko', 'brawk', 'mada', 'skuba'],
    'hundred-thieves': ['vora', 'Cryocells', 'Asuna', 'Timotino', 'bang'],
    heretics: ['Boo', 'koshmaras', 'Wo0t', 'RieNs', 'benjyfishy'],
    edg: ['nobody', 'ZmjjKK', 'CHICHOO', 'Smoggy', 'Jieni7'],
    leviatan: ['kiNgg', 'spike', 'blowz', 'Neon', 'Sato'],
    furia: ['artzin', 'eeiu', 'koalanoob', 'nerve', 'alym'],
    g2: ['valyn', 'jawgemo', 'BABYBAY', 'trent', 'leaf']
  }
}

export function getEsportsRoster(game: EsportsGame, teamId: string): string[] | undefined {
  const roster = ESPORTS_ROSTERS[game]?.[teamId]
  return roster && roster.length >= 5 ? roster : undefined
}

/** chave de armazenamento dos elencos editados pelo usuário (por jogo + time) */
export function rosterKey(game: EsportsGame, teamId: string): string {
  return `${game}::${teamId}`
}
