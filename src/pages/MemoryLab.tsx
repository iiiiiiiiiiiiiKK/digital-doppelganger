import { useMemo, useRef, useState } from 'react'
import { useApp } from '../store/useApp'
import { useI18n } from '../i18n/useI18n'
import type { DictKey } from '../i18n/dict'
import { MEMORY_CATEGORIES } from '../lib/profile'
import { readMemoryFile } from '../lib/io'
import { cn, formatDate, truncate } from '../lib/cn'
import { ConfirmButton, EmptyState, Field, PageHeader, Panel, SectionLabel } from '../components/ui'
import type { Memory, MemoryCategory } from '../types'

interface Draft {
  content: string
  category: MemoryCategory
  importance: number
  tags: string
}

const EMPTY_DRAFT: Draft = { content: '', category: 'experience', importance: 3, tags: '' }

export function MemoryLab() {
  const { t, lang } = useI18n()
  const memories = useApp((s) => s.memories)
  const addMemory = useApp((s) => s.addMemory)
  const updateMemory = useApp((s) => s.updateMemory)
  const deleteMemory = useApp((s) => s.deleteMemory)
  const toggleMemory = useApp((s) => s.toggleMemory)
  const importMemories = useApp((s) => s.importMemories)
  const setNotice = useApp((s) => s.setNotice)

  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<MemoryCategory | 'all'>('all')
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [importError, setImportError] = useState('')
  const fileRef = useRef<HTMLInputElement | null>(null)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return memories.filter((m) => {
      if (filter !== 'all' && m.category !== filter) return false
      if (!q) return true
      return (
        m.content.toLowerCase().includes(q) ||
        m.tags.some((tag) => tag.toLowerCase().includes(q))
      )
    })
  }, [memories, query, filter])

  const enabledCount = memories.filter((m) => m.enabled).length

  function openCreate() {
    setEditingId(null)
    setDraft(EMPTY_DRAFT)
    setFormOpen(true)
    setImportError('')
  }

  function openEdit(memory: Memory) {
    setEditingId(memory.id)
    setDraft({
      content: memory.content,
      category: memory.category,
      importance: memory.importance,
      tags: memory.tags.join(', '),
    })
    setFormOpen(true)
  }

  async function submit() {
    const content = draft.content.trim()
    if (content.length < 2) return
    const tags = draft.tags
      .split(/[,，]/)
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 12)
    if (editingId) {
      await updateMemory(editingId, {
        content,
        category: draft.category,
        importance: draft.importance,
        tags,
      })
    } else {
      await addMemory({
        content,
        category: draft.category,
        source: 'manual',
        importance: draft.importance,
        enabled: true,
        tags,
      })
    }
    setDraft(EMPTY_DRAFT)
    setEditingId(null)
    setFormOpen(false)
    setNotice({ kind: 'ok', text: t('common.saved') })
  }

  async function onFile(file: File | undefined) {
    if (!file) return
    setImportError('')
    try {
      const parsed = await readMemoryFile(file)
      if (!parsed.ok) {
        setImportError(`${t('memory.importFail')} (${parsed.error ?? 'invalid'})`)
        return
      }
      const count = await importMemories(parsed.memories)
      setNotice({
        kind: 'ok',
        text: `${t('memory.importOk')} ${count} ${t('common.items')}`,
      })
    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'error')
    } finally {
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  return (
    <div>
      <PageHeader
        eyebrow={t('nav.memory')}
        title={t('memory.title')}
        subtitle={t('memory.subtitle')}
        actions={
          <>
            <input
              ref={fileRef}
              type="file"
              accept=".txt,.md,.markdown,.json,text/plain,application/json"
              className="hidden"
              onChange={(e) => void onFile(e.target.files?.[0])}
            />
            <button type="button" className="btn" onClick={() => fileRef.current?.click()}>
              {t('memory.import')}
            </button>
            <button type="button" className="btn btn-primary" onClick={openCreate}>
              {t('memory.add')}
            </button>
          </>
        }
      />

      {formOpen && (
        <Panel className="mb-4">
          <SectionLabel>{editingId ? t('common.edit') : t('memory.add')}</SectionLabel>
          <div className="space-y-3">
            <Field label={t('memory.content')} required htmlFor="mem-content">
              <textarea
                id="mem-content"
                className="input min-h-[96px] resize-y"
                value={draft.content}
                maxLength={4000}
                onChange={(e) => setDraft((d) => ({ ...d, content: e.target.value }))}
                placeholder={t('memory.contentPh')}
              />
            </Field>
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label={t('memory.category')} htmlFor="mem-cat">
                <select
                  id="mem-cat"
                  className="input"
                  value={draft.category}
                  onChange={(e) => setDraft((d) => ({ ...d, category: e.target.value as MemoryCategory }))}
                >
                  {MEMORY_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {t(`memory.category.${c}` as DictKey)}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label={t('memory.importance')} htmlFor="mem-imp">
                <select
                  id="mem-imp"
                  className="input"
                  value={draft.importance}
                  onChange={(e) => setDraft((d) => ({ ...d, importance: Number(e.target.value) }))}
                >
                  {[1, 2, 3, 4, 5].map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label={t('memory.tags')} htmlFor="mem-tags" hint={t('memory.tagsPh')}>
                <input
                  id="mem-tags"
                  className="input"
                  value={draft.tags}
                  onChange={(e) => setDraft((d) => ({ ...d, tags: e.target.value }))}
                />
              </Field>
            </div>
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => {
                  setFormOpen(false)
                  setEditingId(null)
                  setDraft(EMPTY_DRAFT)
                }}
              >
                {t('common.cancel')}
              </button>
              <button type="button" className="btn btn-primary" onClick={() => void submit()} disabled={draft.content.trim().length < 2}>
                {t('common.save')}
              </button>
            </div>
          </div>
        </Panel>
      )}

      {importError && (
        <p role="alert" className="mb-4 rounded-lg border border-[rgba(255,120,120,0.4)] px-3 py-2 text-[0.78rem] text-[#ff9c9c]">
          {importError}
        </p>
      )}

      <Panel className="mb-4">
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <input
              className="input sm:max-w-xs"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('memory.searchPh')}
              aria-label={t('common.search')}
              type="search"
            />
            <p className="mono ml-auto text-[0.68rem] uppercase tracking-[0.14em] text-[var(--text-faint)]">
              {enabledCount}/{memories.length} {t('memory.enabledCount')}
            </p>
          </div>
          <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
            <button
              type="button"
              onClick={() => setFilter('all')}
              className={cn('chip whitespace-nowrap', filter === 'all' && 'chip-active')}
            >
              {t('common.all')}
            </button>
            {MEMORY_CATEGORIES.map((c) => {
              const count = memories.filter((m) => m.category === c).length
              if (count === 0) return null
              return (
                <button
                  key={c}
                  type="button"
                  onClick={() => setFilter(c)}
                  className={cn('chip whitespace-nowrap', filter === c && 'chip-active')}
                >
                  {t(`memory.category.${c}` as DictKey)}
                  <span className="mono text-[0.62rem] opacity-70">{count}</span>
                </button>
              )
            })}
          </div>
        </div>
      </Panel>

      {filtered.length === 0 ? (
        <EmptyState
          title={memories.length === 0 ? t('memory.empty') : t('common.empty')}
          body={memories.length === 0 ? t('memory.importHint') : undefined}
          action={
            memories.length === 0 ? (
              <button type="button" className="btn btn-primary" onClick={openCreate}>
                {t('memory.add')}
              </button>
            ) : undefined
          }
        />
      ) : (
        <ul className="space-y-2.5">
          {filtered.map((memory) => (
            <li key={memory.id} data-testid="memory-row" className={cn('surface p-3.5 sm:p-4', !memory.enabled && 'opacity-55')}>
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="chip !px-2 !py-0.5 !text-[0.66rem]">{t(`memory.category.${memory.category}` as DictKey)}</span>
                <span className="mono text-[0.62rem] uppercase tracking-[0.12em] text-[var(--text-faint)]">
                  {memory.source.toUpperCase()}
                </span>
                <span aria-hidden="true" className="text-[var(--text-faint)]">
                  ·
                </span>
                <span className="mono text-[0.62rem] text-[var(--text-faint)]">
                  {'★'.repeat(memory.importance)}
                  {'☆'.repeat(5 - memory.importance)}
                </span>
                <span aria-hidden="true" className="text-[var(--text-faint)]">
                  ·
                </span>
                <span className="mono text-[0.62rem] text-[var(--text-faint)]">{formatDate(memory.createdAt, lang)}</span>
                {!memory.enabled && (
                  <span className="chip !border-[var(--ember)] !px-2 !py-0.5 !text-[0.64rem] !text-[var(--ember)]">
                    {t('memory.paused')}
                  </span>
                )}
              </div>
              <p className="mt-2 whitespace-pre-wrap break-words text-[0.86rem] leading-relaxed">{memory.content}</p>
              {memory.tags.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {memory.tags.map((tag) => (
                    <span key={tag} className="chip !px-2 !py-0 !text-[0.64rem]">
                      #{tag}
                    </span>
                  ))}
                </div>
              )}
              <div className="mt-2.5 flex flex-wrap items-center gap-1">
                <button
                  type="button"
                  className="btn btn-ghost !min-h-8 !px-2 !py-0 text-[0.72rem]"
                  data-testid="memory-toggle"
                  onClick={() => void toggleMemory(memory.id)}
                >
                  {memory.enabled ? t('memory.paused') : t('memory.enabled')}
                </button>
                <button
                  type="button"
                  className="btn btn-ghost !min-h-8 !px-2 !py-0 text-[0.72rem]"
                  onClick={() => openEdit(memory)}
                >
                  {t('common.edit')}
                </button>
                <ConfirmButton
                  onConfirm={() => void deleteMemory(memory.id)}
                  className="text-[0.72rem]"
                  ariaLabel={`${t('common.delete')} ${truncate(memory.content, 24)}`}
                >
                  {t('common.delete')}
                </ConfirmButton>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
