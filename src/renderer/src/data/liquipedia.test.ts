import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
// @ts-expect-error — script Node puro, sem tipos
import { parseActiveRoster, activeSection, WIKI } from '../../../../scripts/liquipedia.mjs'

const here = dirname(fileURLToPath(import.meta.url))
// Recorte real da seção "Active" da página da Sentinels no wiki de Valorant
// (capturado em 2026-07-24). Serve de contrato: se a Liquipedia mudar a
// marcação, o teste quebra antes do script trazer lixo pro app.
const SENTINELS = readFileSync(resolve(here, '__fixtures__/liquipedia-sentinels.html'), 'utf-8')
// A LOUD tem uma coluna a mais (agentes), então o papel cai num índice
// diferente do da Sentinels — é o caso que quebrou o parser posicional.
const LOUD = readFileSync(resolve(here, '__fixtures__/liquipedia-loud.html'), 'utf-8')
// A Team Liquid tem uma tabela de "Inactive" logo abaixo do elenco ativo, na
// mesma seção — siuhy e ultimate não podem vazar pro elenco.
const LIQUID = readFileSync(resolve(here, '__fixtures__/liquipedia-liquid.html'), 'utf-8')

describe('parseActiveRoster', () => {
  it('extrai os titulares da página real da Sentinels', () => {
    expect(parseActiveRoster(SENTINELS)).toEqual([
      'johnqt',
      'cortezia',
      'reduxx',
      'JonahP',
      'Jerrwin'
    ])
  })

  it('descarta quem não é titular (Marved está como Stand-in)', () => {
    expect(SENTINELS).toContain('Stand-in')
    expect(parseActiveRoster(SENTINELS)).not.toContain('Marved')
  })

  it('usa o IGN exibido, não o título capitalizado da página', () => {
    // o link é /valorant/Johnqt mas o texto visível é "johnqt"
    expect(SENTINELS).toContain('/valorant/Johnqt')
    expect(parseActiveRoster(SENTINELS)).toContain('johnqt')
  })

  it('funciona com o número de colunas da LOUD, diferente do da Sentinels', () => {
    // 6 ativos: a LOUD tem elenco estendido. names.ts corta em 5.
    expect(parseActiveRoster(LOUD)).toEqual([
      'cauanzin',
      'lukxo',
      'Darker',
      'erde',
      'tkzin',
      'DaviH'
    ])
  })

  it('não confunde nome real com papel', () => {
    // "David Cruz" está numa célula da linha do DaviH e não pode disparar o
    // filtro de papel — só célula que É um papel descarta a linha
    expect(LOUD).toContain('David Cruz')
    expect(parseActiveRoster(LOUD)).toContain('DaviH')
  })

  it('ignora a tabela de Inactive dentro da seção Active (Team Liquid)', () => {
    const roster = parseActiveRoster(LIQUID)
    expect(roster).toEqual(['NAF', 'EliGE', 'malbsMd', 'Jorko', 'JT'])
    // siuhy e ultimate estão numa tabela de Inactive logo abaixo
    expect(LIQUID).toContain('Inactive Date')
    expect(roster).not.toContain('siuhy')
    expect(roster).not.toContain('ultimate')
    // e o técnico (flashie) continua fora
    expect(roster).not.toContain('flashie')
  })

  it('descarta comissão técnica mesmo se a coluna de papel sumir', () => {
    const semColuna = `id="Active"<table><tr>
      <td><span class="inline-player"><a href="/counterstrike/B1ad3">B1ad3</a></span></td>
      <td>Andrii Horodenskyi</td><td>Coach</td></tr></table>id="Former"`
    expect(parseActiveRoster(semColuna)).toEqual([])
  })

  it('devolve vazio quando a página não tem seção Active', () => {
    expect(parseActiveRoster('<p>time sem elenco</p>')).toEqual([])
  })

  it('não atravessa para a seção Former', () => {
    expect(activeSection('id="Active">AAA<table></table>id="Former">BBB')).not.toContain('BBB')
  })

  it('não casa a seção de staff da org (id="Active_2")', () => {
    // org sem elenco no jogo: só existe a subseção de staff Active_2
    const staffOnly =
      'id="Active_2">Active<table><tr>' +
      '<td><span class="inline-player"><a href="/valorant/Reginald">Reginald</a></span></td>' +
      '<td>Andy Dinh</td><td></td></tr></table>id="Former_2">'
    expect(parseActiveRoster(staffOnly)).toEqual([])
  })

  it('rejeita a "Active" de staff quando ela vem depois de Organization', () => {
    // org sem elenco no jogo (ex.: FaZe no Valorant): a única "Active" está
    // dentro de Organization e lista donos/executivos
    const orgOnly =
      'id="Player_Roster">...id="Former">...' +
      'id="Organization">...id="Active">Active<table><tr>' +
      '<td><span class="inline-player"><a href="/valorant/Reginald">Reginald</a></span></td>' +
      '<td>Andy Dinh</td><td></td></tr></table>'
    expect(parseActiveRoster(orgOnly)).toEqual([])
  })

  it('acha a seção de jogadores mesmo com uma Active_2 depois', () => {
    const both =
      'id="Active">Active<table><tr>' +
      '<td><span class="inline-player"><a href="/x/Ann">ann</a></span></td>' +
      '<td>A</td><td></td></tr></table>id="Former">...' +
      'id="Active_2">Active<table><tr>' +
      '<td><span class="inline-player"><a href="/x/Boss">Boss</a></span></td>' +
      '<td>B</td><td></td></tr></table>'
    expect(parseActiveRoster(both)).toEqual(['ann'])
  })
})

describe('WIKI', () => {
  it('mapeia os dois jogos do app para wikis da Liquipedia', () => {
    expect(WIKI).toEqual({ cs2: 'counterstrike', valorant: 'valorant' })
  })
})
