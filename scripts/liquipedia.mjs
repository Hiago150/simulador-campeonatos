// Parser puro das páginas de time da Liquipedia — sem I/O, sem rede.
// Serve os dois wikis (counterstrike e valorant): a estrutura da seção
// "Player Roster > Active" é a mesma, então um parser só cobre os dois jogos.
// A parte com rede fica em fetch-esports-rosters.mjs; aqui só texto → nomes,
// pra poder testar com fixture (src/renderer/src/data/liquipedia.test.ts).

/** wikis da Liquipedia por jogo do app */
export const WIKI = { cs2: 'counterstrike', valorant: 'valorant' }

// Papéis que NÃO entram no elenco: técnico, analista, staff e quem não é
// titular (reserva, stand-in, inativo, emprestado). O app usa 5 titulares.
// Casa a célula inteira, não o texto solto da linha: assim um nome real nunca
// é confundido com um papel (e o índice da coluna de papel não importa — ele
// varia entre páginas: Sentinels tem 4 colunas, LOUD tem 5).
const ROLE_CELL =
  /^(?:head\s+|assistant\s+|strategic\s+|positional\s+|interim\s+|general\s+|team\s+|co-?)?(?:coach|analyst|manager|staff|substitute|sub|stand-?in|inactive|on\s+loan|loaned|trainee|streamer|content|owner|founder|president|chief|director|chairman|officer|psycholog|physio|creator|host|ceo|cfo|coo)\b/i

const stripTags = (s) => s.replace(/<[^>]+>/g, '')

function decode(s) {
  return s
    .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(Number(d)))
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;/g, "'")
}

const text = (html) => decode(stripTags(html.replace(/<sup\b[\s\S]*?<\/sup>/g, ''))).trim()

/**
 * Recorta a seção "Active" do Player Roster.
 * A ordem das âncoras na página é Player_Roster > Active > Former >
 * Organization > Active_2, então parar em "Former" já exclui a comissão
 * técnica (que vive em Active_2, depois de Former).
 *
 * Dentro da seção "Active" pode haver mais de uma tabela: a do elenco ativo
 * (sempre a 1ª) e, às vezes, uma de "Inactive" logo depois (jogadores
 * afastados, ex.: siuhy/ultimate na Team Liquid). Só a 1ª tabela interessa,
 * então cortamos no primeiro </table>.
 *
 * O casamento do heading é EXATO: `id="Active"`, não `id="Active_2"` (o `_2`
 * é a "Active" de staff da Organização; "Active" é prefixo de "Active_2", e
 * um indexOf ingênuo pegaria a tabela de staff).
 *
 * Mais sutil: quando o time NÃO tem elenco naquele jogo (FaZe/KOI/TSM no
 * Valorant, Gen.G no CS2), a página é a da org e a ÚNICA "Active" fica DENTRO
 * de "Organization" — trazia donos e executivos (Piqué, Ibai, Reginald...).
 * A "Active" de jogador sempre vem ANTES de "Organization"; a de staff vem
 * depois. Então se a "Active" que achamos está depois de "Organization", é
 * management: retorna vazio e o time cai no dado anterior / gerador procedural.
 */
export function activeSection(html) {
  const m = /id="Active"[\s>]/.exec(html)
  if (!m) return ''
  const start = m.index
  const org = html.search(/id="Organization"[\s>]/)
  if (org >= 0 && org < start) return '' // "Active" é de staff da org, não de jogadores
  const former = html.slice(start).search(/id="Former"[\s>]/)
  const bounded = former >= 0 ? html.slice(start, start + former) : html.slice(start)
  const firstTableEnd = bounded.indexOf('</table>')
  return firstTableEnd >= 0 ? bounded.slice(0, firstTableEnd) : bounded
}

/**
 * Extrai os titulares ativos de uma página de time já renderizada.
 * A linha tem `ID | ... | Nome real | Papel | Entrada`, mas o número e a
 * ordem das colunas mudam de página pra página (o wiki de Valorant tem uma
 * coluna de agentes que o de CS2 não tem). Então em vez de olhar índice, a
 * linha é descartada quando QUALQUER célula é um papel — titular é quem não
 * tem papel nenhum.
 *
 * O nome usado é o IGN do link (texto visível), não o título da página — a
 * Liquipedia capitaliza o título (`/valorant/Johnqt`) mas exibe `johnqt`.
 * @returns {string[]} IGNs, na ordem da página, sem repetição
 */
export function parseActiveRoster(html) {
  const seg = activeSection(html)
  if (!seg) return []
  const out = []
  for (const row of seg.split(/<tr\b/).slice(1)) {
    const cells = [...row.matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/g)].map((m) => m[1])
    if (cells.length < 2) continue
    const ign = /<span class="inline-player"[\s\S]*?<a\b[^>]*>([^<]+)<\/a>/.exec(cells[0])
    if (!ign) continue
    // cells[0] fora do teste: é o IGN, e um nick pode casar com um papel
    if (cells.slice(1).some((c) => ROLE_CELL.test(text(c)))) continue
    const name = decode(ign[1]).trim()
    if (name && !out.includes(name)) out.push(name)
  }
  return out
}
