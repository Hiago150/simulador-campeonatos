// Mapa id-do-time -> URL do escudo empacotado (offline).
// Os PNGs ficam em src/renderer/src/assets/crests/<id>.png e são baixados
// pelo script scripts/fetch-crests.mjs (fonte: TheSportsDB).
const modules = import.meta.glob('../assets/crests/*.png', {
  eager: true,
  query: '?url',
  import: 'default'
}) as Record<string, string>

const crestMap: Record<string, string> = {}
for (const [path, url] of Object.entries(modules)) {
  const file = path.split('/').pop() ?? ''
  const id = file.replace(/\.png$/, '')
  crestMap[id] = url
}

export function crestFor(teamId: string): string | undefined {
  return crestMap[teamId]
}
