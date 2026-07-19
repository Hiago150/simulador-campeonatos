// "Como funciona minha temporada" — explica em texto simples, pra cada
// campeonato da sequência, de onde vêm os times: elenco fixo, vagas dinâmicas
// (qualifiesFrom) e divisões interligadas (divisionBoundaries/play-in).
// Tudo DERIVADO de Season.slots/divisionBoundaries — nada persiste, é só leitura.
import type { DivisionBoundary, Season, SeasonSlot } from '../types'

function slotName(season: Season, slotId: string): string {
  return season.slots.find((s) => s.id === slotId)?.name ?? slotId
}

/** uma fonte de vagas dinâmicas pra dentro do slot (qualifiesFrom) */
export interface SlotSource {
  fromSlotId: string
  fromSlotName: string
  count: number
  /** rank inicial 1-based (1 = campeão) */
  rankFrom: number
  rankTo: number
}

/** um lado de uma divisão interligada visto a partir de UM slot específico */
export interface SlotBoundaryLink {
  partnerSlotId: string
  partnerSlotName: string
  /** 'sobe-pra' = este slot manda gente pro parceiro (é o inferior); 'desce-pra' = o contrário */
  direction: 'sobe-pra' | 'desce-pra'
  count: number
  /** quando a última vaga de acesso é decidida por um play-in em vez da tabela */
  playInSlotId?: string
  playInSlotName?: string
}

export interface SlotFlow {
  slotId: string
  slotName: string
  format: SeasonSlot['format']
  /** times de elenco fixo (SeasonSlot.teamIds) — undefined = usa o pool inteiro da temporada */
  fixedCount: number | null
  sources: SlotSource[]
  boundaryLinks: SlotBoundaryLink[]
  /** mecanismos preset-específicos (VCT) — só uma nota curta, sem detalhar */
  extraNotes: string[]
}

/** fluxo de classificação de cada campeonato da temporada, na ordem da sequência do ano */
export function seasonFlow(season: Season): SlotFlow[] {
  const boundaries = season.divisionBoundaries ?? []

  return season.slots.map((slot) => {
    const sources: SlotSource[] = (slot.qualifiesFrom ?? []).map((q) => {
      const rankFrom = (q.offset ?? 0) + 1
      return {
        fromSlotId: q.slotId,
        fromSlotName: slotName(season, q.slotId),
        count: q.count,
        rankFrom,
        rankTo: rankFrom + q.count - 1
      }
    })

    const boundaryLinks: SlotBoundaryLink[] = []
    for (const b of boundaries) {
      if (b.upperSlotId === slot.id) {
        boundaryLinks.push({
          partnerSlotId: b.lowerSlotId,
          partnerSlotName: slotName(season, b.lowerSlotId),
          direction: 'desce-pra',
          count: b.count,
          playInSlotId: b.playInSlotId,
          playInSlotName: b.playInSlotId ? slotName(season, b.playInSlotId) : undefined
        })
      } else if (b.lowerSlotId === slot.id) {
        boundaryLinks.push({
          partnerSlotId: b.upperSlotId,
          partnerSlotName: slotName(season, b.upperSlotId),
          direction: 'sobe-pra',
          count: b.count,
          playInSlotId: b.playInSlotId,
          playInSlotName: b.playInSlotId ? slotName(season, b.playInSlotId) : undefined
        })
      }
    }

    const extraNotes: string[] = []
    if (slot.vctConsistencyWildcards) {
      const n = slot.vctConsistencyWildcards.count
      extraNotes.push(`+ ${n} vaga${n === 1 ? '' : 's'} extra por região, pela consistência dos times ao longo do ano`)
    }
    if (slot.previousYearBye) {
      extraNotes.push(`os melhores colocados de ${slotName(season, slot.previousYearBye.fromSlotId)} no ano anterior entram com bye`)
    }

    return {
      slotId: slot.id,
      slotName: slot.name,
      format: slot.format,
      fixedCount: slot.teamIds?.length ?? null,
      sources,
      boundaryLinks,
      extraNotes
    }
  })
}

/** true quando a temporada não tem NENHUM mecanismo de vagas dinâmicas — botão de info fica sem conteúdo útil */
export function seasonHasFlow(season: Season): boolean {
  return (
    (season.divisionBoundaries?.length ?? 0) > 0 ||
    season.slots.some((s) => (s.qualifiesFrom?.length ?? 0) > 0 || s.vctConsistencyWildcards || s.previousYearBye)
  )
}

export type { DivisionBoundary }
