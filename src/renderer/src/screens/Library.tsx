import { useState } from 'react'
import { Check, Pencil, Play, Save, Trash2, Trophy, X } from 'lucide-react'
import { useLibrary, type SavedTournament } from '../store/library'
import { useApp } from '../store/app'
import { FORMAT_META, GAME_META, SPORT_META } from '../lib/meta'
import { progress, teamMap } from '../engine/selectors'
import { Button, EmptyState } from '../components/ui'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { ScreenHeader } from '../components/motionx'
import { TeamBadge } from '../components/TeamBadge'

const PHASE_LABEL: Record<string, string> = {
  league: 'Em andamento',
  group: 'Fase de grupos',
  knockout: 'Mata-mata',
  swiss: 'Em andamento',
  finished: 'Encerrado'
}

export function LibraryScreen() {
  const saved = useLibrary((s) => s.saved)
  const removeSaved = useLibrary((s) => s.removeSaved)
  const renameSaved = useLibrary((s) => s.renameSaved)
  const loadFromLibrary = useApp((s) => s.loadFromLibrary)
  const setToast = useApp((s) => s.setToast)

  const [renaming, setRenaming] = useState<string | null>(null)
  const [draft, setDraft] = useState('')
  const [confirmRemove, setConfirmRemove] = useState<SavedTournament | null>(null)

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-6xl px-8 py-8">
        <ScreenHeader kicker="Sua estante" title="Campeonatos" accent="salvos" />

        <ConfirmDialog
          open={!!confirmRemove}
          title="Excluir da biblioteca?"
          message={`“${confirmRemove?.tournament.name ?? ''}” será removido da biblioteca. Esta ação não pode ser desfeita.`}
          confirmLabel="Excluir"
          onCancel={() => setConfirmRemove(null)}
          onConfirm={() => {
            if (confirmRemove) removeSaved(confirmRemove.id)
            setConfirmRemove(null)
            setToast('Removido da biblioteca')
          }}
        />

        {saved.length === 0 ? (
          <EmptyState
            icon={<Save size={48} />}
            title="Nenhum campeonato salvo"
            hint="Dentro de um campeonato, use “Salvar na biblioteca” para guardar o progresso e voltar quando quiser."
          />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {saved.map((s) => (
              <SavedCard
                key={s.id}
                entry={s}
                renaming={renaming === s.id}
                draft={draft}
                onDraft={setDraft}
                onStartRename={() => {
                  setRenaming(s.id)
                  setDraft(s.tournament.name)
                }}
                onCancelRename={() => setRenaming(null)}
                onConfirmRename={() => {
                  renameSaved(s.id, draft)
                  setRenaming(null)
                  setToast('Campeonato renomeado')
                }}
                onOpen={() => loadFromLibrary(s.tournament)}
                onRemove={() => setConfirmRemove(s)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function SavedCard({
  entry,
  renaming,
  draft,
  onDraft,
  onStartRename,
  onCancelRename,
  onConfirmRename,
  onOpen,
  onRemove
}: {
  entry: SavedTournament
  renaming: boolean
  draft: string
  onDraft: (v: string) => void
  onStartRename: () => void
  onCancelRename: () => void
  onConfirmRename: () => void
  onOpen: () => void
  onRemove: () => void
}) {
  const t = entry.tournament
  const teams = teamMap(t)
  const prog = progress(t)
  const pct = prog.total > 0 ? Math.round((prog.played / prog.total) * 100) : 0
  const champ = t.champion ? teams[t.champion] : undefined
  const date = new Date(entry.savedAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })

  return (
    <div className="card flex flex-col gap-3 p-4">
      <div className="flex items-start justify-between gap-2">
        {renaming ? (
          <div className="flex flex-1 items-center gap-1">
            <input
              className="input py-1.5 text-sm"
              value={draft}
              autoFocus
              onChange={(e) => onDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') onConfirmRename()
                if (e.key === 'Escape') onCancelRename()
              }}
            />
            <button onClick={onConfirmRename} className="flex h-7 w-7 items-center justify-center rounded-[3px] border border-emerald-700/40 bg-emerald-950/30 text-emerald-300">
              <Check size={13} />
            </button>
            <button onClick={onCancelRename} className="flex h-7 w-7 items-center justify-center rounded-[3px] border border-white/10 text-zinc-400">
              <X size={13} />
            </button>
          </div>
        ) : (
          <p className="display flex-1 truncate text-xl text-zinc-100">{t.name}</p>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <span className="tag bg-ink-800 text-zinc-300">
          {SPORT_META[t.sport].emoji} {SPORT_META[t.sport].label}
        </span>
        {t.sport === 'esports' && t.config.game && (
          <span className="tag bg-ink-800 text-zinc-300">{GAME_META[t.config.game].short}</span>
        )}
        <span className="tag bg-ink-800 text-zinc-400">{FORMAT_META[t.format].short}</span>
        <span className="tag bg-ink-800 text-zinc-500">{t.teams.length} times</span>
      </div>

      {champ ? (
        <div className="flex items-center gap-2 rounded-[4px] border border-blood-800/30 bg-blood-950/15 px-3 py-2">
          <Trophy size={15} className="text-blood-400" />
          <TeamBadge team={champ} size="sm" />
          <span className="truncate text-sm font-bold text-zinc-100">{champ.name}</span>
        </div>
      ) : (
        <div>
          <div className="mb-1 flex items-center justify-between text-[11px] text-zinc-500">
            <span>{PHASE_LABEL[t.phase] ?? 'Em andamento'}</span>
            <span className="tnum">{pct}%</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-white/5">
            <div className="h-full bg-blood-grad" style={{ width: `${pct}%` }} />
          </div>
        </div>
      )}

      <div className="mt-auto flex items-center justify-between gap-2 pt-1">
        <span className="text-[11px] text-zinc-600">{date}</span>
        <div className="flex items-center gap-1">
          <button
            onClick={onStartRename}
            title="Renomear"
            className="flex h-8 w-8 items-center justify-center rounded-[3px] border border-white/5 bg-white/[0.03] text-zinc-300 hover:bg-white/10"
          >
            <Pencil size={13} />
          </button>
          <button
            onClick={onRemove}
            title="Excluir"
            className="flex h-8 w-8 items-center justify-center rounded-[3px] border border-blood-800/40 bg-blood-950/30 text-blood-300 hover:bg-blood-900/40"
          >
            <Trash2 size={13} />
          </button>
          <Button variant="primary" icon={<Play size={14} />} onClick={onOpen} className="px-3 py-1.5 text-xs">
            Abrir
          </Button>
        </div>
      </div>
    </div>
  )
}
