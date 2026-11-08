import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useApp } from '../store/useApp'
import { useI18n } from '../i18n/useI18n'
import type { DictKey } from '../i18n/dict'
import { ruleAnswer } from '../lib/brain'
import { buildSystemPrompt, callAi, splitSources } from '../lib/ai'
import { uid } from '../lib/id'
import { cn, formatDate, pct } from '../lib/cn'
import { EmptyState, PageHeader, Panel, SectionLabel } from '../components/ui'
import type { ChatMessage, Conversation } from '../types'

const SUGGESTIONS = [
  { zh: '如果我突然拥有 100 万美元，我会怎么安排？', en: 'If I suddenly had $1M, how would I allocate it?' },
  { zh: '如果必须在自由和稳定之间选择，我会选什么？', en: 'Freedom or stability — which would I pick?' },
  { zh: '如果我需要推荐一本书，我会推荐什么？', en: 'What book would I recommend?' },
  { zh: '如果未来十年只能专注一件事，我会选什么？', en: 'If I could focus on one thing for ten years, what would it be?' },
]

export function Chat() {
  const { t, lang, tl } = useI18n()
  const profile = useApp((s) => s.profile)
  const doppel = useApp((s) => s.doppel)
  const memories = useApp((s) => s.memories)
  const settings = useApp((s) => s.settings)
  const conversations = useApp((s) => s.conversations)
  const saveConversation = useApp((s) => s.saveConversation)
  const deleteConversation = useApp((s) => s.deleteConversation)

  const [activeId, setActiveId] = useState<string | null>(conversations[0]?.id ?? null)
  const [input, setInput] = useState('')
  const [pending, setPending] = useState(false)
  const [historyOpen, setHistoryOpen] = useState(false)
  const listRef = useRef<HTMLDivElement | null>(null)

  const conversation = useMemo(
    () => conversations.find((c) => c.id === activeId) ?? null,
    [conversations, activeId],
  )
  const messages = conversation?.messages ?? []
  const aiReady = settings.ai.enabled && settings.ai.baseUrl.trim() !== '' && settings.ai.apiKey.trim() !== ''

  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight
  }, [messages.length, pending])

  function startNew() {
    setActiveId(null)
    setHistoryOpen(false)
  }

  async function send(text: string) {
    const question = text.trim()
    if (!question || !profile || !doppel || pending) return
    setInput('')
    setPending(true)

    const base: Conversation =
      conversation ?? {
        id: uid('conv'),
        title: question.slice(0, 40),
        messages: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }

    const userMessage: ChatMessage = {
      id: uid('msg'),
      role: 'user',
      text: question,
      citations: [],
      confidence: 0,
      mode: aiReady ? 'ai' : 'rules',
      createdAt: Date.now(),
    }

    const withUser: Conversation = {
      ...base,
      messages: [...base.messages, userMessage],
      updatedAt: Date.now(),
    }
    await saveConversation(withUser)
    if (!activeId) setActiveId(base.id)

    const rules = ruleAnswer(question, profile, doppel, memories, lang)
    let reply: ChatMessage

    if (aiReady) {
      const systemPrompt = buildSystemPrompt(profile, doppel, memories, lang)
      const history = withUser.messages.slice(-8).map((m) => ({
        role: m.role === 'user' ? ('user' as const) : ('assistant' as const),
        content: m.text,
      }))
      const result = await callAi(settings.ai, [
        { role: 'system', content: systemPrompt },
        ...history,
      ])

      if (result.ok) {
        const { body } = splitSources(result.text)
        reply = {
          id: uid('msg'),
          role: 'doppel',
          text: body,
          citations: rules.citations,
          confidence: Math.min(0.85, Math.max(0.3, rules.confidence + 0.1)),
          mode: 'ai',
          createdAt: Date.now(),
        }
      } else {
        reply = {
          id: uid('msg'),
          role: 'doppel',
          text: `${t('chat.errorNetwork')}\n\n${rules.text}`,
          citations: rules.citations,
          confidence: rules.confidence,
          mode: 'rules',
          createdAt: Date.now(),
          error: result.error,
        }
      }
    } else {
      reply = {
        id: uid('msg'),
        role: 'doppel',
        text: rules.text,
        citations: rules.citations,
        confidence: rules.confidence,
        mode: 'rules',
        createdAt: Date.now(),
      }
    }

    const finished: Conversation = {
      ...withUser,
      messages: [...withUser.messages, reply],
      updatedAt: Date.now(),
    }
    await saveConversation(finished)
    setPending(false)
  }

  if (!profile || !doppel) return null

  return (
    <div>
      <PageHeader
        eyebrow={t('nav.chat')}
        title={t('chat.title')}
        subtitle={t('chat.subtitle')}
        actions={
          <>
            <button type="button" className="btn !min-h-9 !px-3 !py-0 text-[0.78rem]" onClick={() => setHistoryOpen((v) => !v)}>
              {t('chat.history')}
            </button>
            <button type="button" className="btn !min-h-9 !px-3 !py-0 text-[0.78rem]" onClick={startNew}>
              {t('chat.newChat')}
            </button>
          </>
        }
      />

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className={cn('chip', aiReady ? 'chip-active' : '')}>
          {aiReady ? t('chat.modeAi') : t('chat.modeRules')}
        </span>
        {!aiReady && (
          <Link to="/settings" className="text-[0.72rem] text-[var(--text-faint)] underline-offset-2 hover:text-[var(--accent)] hover:underline">
            {t('chat.aiNeedsConfig')}
          </Link>
        )}
      </div>

      {historyOpen && (
        <Panel className="mb-3">
          <SectionLabel>{t('chat.history')}</SectionLabel>
          {conversations.length === 0 ? (
            <p className="text-[0.78rem] text-[var(--text-faint)]">{t('common.empty')}</p>
          ) : (
            <ul className="space-y-1.5">
              {conversations.slice(0, 12).map((c) => (
                <li key={c.id} className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveId(c.id)
                      setHistoryOpen(false)
                    }}
                    className={cn(
                      'flex min-w-0 flex-1 items-baseline justify-between gap-2 rounded-lg border px-3 py-2 text-left text-[0.78rem]',
                      c.id === activeId ? 'border-[var(--accent)] text-[var(--accent)]' : 'border-[var(--border)] text-[var(--text-dim)]',
                    )}
                  >
                    <span className="truncate">{c.title || t('common.empty')}</span>
                    <span className="mono shrink-0 text-[0.62rem] text-[var(--text-faint)]">
                      {c.messages.length}
                    </span>
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost !min-h-8 !px-2 !py-0 text-[0.7rem]"
                    onClick={() => {
                      void deleteConversation(c.id)
                      if (c.id === activeId) setActiveId(null)
                    }}
                    aria-label={t('common.delete')}
                  >
                    ✕
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      )}

      <Panel className="flex min-h-[58vh] flex-col p-0">
        <div ref={listRef} className="scroll-thin flex-1 overflow-y-auto px-3 py-4 sm:px-5">
          {messages.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-4 py-10">
              <p className="max-w-sm text-center text-[0.82rem] leading-relaxed text-[var(--text-dim)]">
                {t('chat.subtitle')}
              </p>
              <div className="flex w-full max-w-xl flex-col gap-1.5">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s.en}
                    type="button"
                    onClick={() => void send(lang === 'zh' ? s.zh : s.en)}
                    className="rounded-lg border border-[var(--border)] px-3 py-2 text-left text-[0.78rem] text-[var(--text-dim)] transition-colors hover:border-[var(--accent)] hover:text-[var(--text)]"
                  >
                    {lang === 'zh' ? s.zh : s.en}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <ul className="space-y-4">
              {messages.map((m) => (
                <li key={m.id} className={cn('flex', m.role === 'user' ? 'justify-end' : 'justify-start')}>
                  <div className={cn('max-w-[85%] sm:max-w-[78%]', m.role === 'user' && 'text-right')}>
                    <div
                      className={cn(
                        'whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2.5 text-[0.86rem] leading-relaxed',
                        m.role === 'user'
                          ? 'rounded-br-sm bg-[var(--accent)] text-[var(--accent-ink)]'
                          : 'rounded-bl-sm border border-[var(--border)] bg-[var(--panel)]',
                      )}
                    >
                      {m.text}
                    </div>
                    {m.role === 'doppel' && (
                      <div className="mt-1.5 space-y-1.5 text-left">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="mono text-[0.6rem] uppercase tracking-[0.12em] text-[var(--text-faint)]">
                            {m.mode === 'ai' ? t('common.ai') : t('common.rules')} · {t('common.confidence')} {pct(m.confidence)}
                          </span>
                          {m.error && (
                            <span className="chip !border-[var(--ember)] !py-0 !text-[0.6rem] !text-[var(--ember)]">
                              {m.error.slice(0, 40)}
                            </span>
                          )}
                        </div>
                        {m.citations.length > 0 ? (
                          <div className="rounded-lg border border-[var(--border)] px-2.5 py-2">
                            <p className="label-xs mb-1">{t('chat.basis')}</p>
                            <ul className="space-y-1">
                              {m.citations.map((c) => (
                                <li key={c.memoryId} className="text-[0.72rem] leading-snug text-[var(--text-dim)]">
                                  <span className="mono text-[0.62rem] text-[var(--accent)]">
                                    [{t(`memory.category.${c.category}` as DictKey)}]
                                  </span>{' '}
                                  {c.excerpt}
                                </li>
                              ))}
                            </ul>
                          </div>
                        ) : (
                          <p className="text-[0.7rem] text-[var(--text-faint)]">{t('chat.noBasis')}</p>
                        )}
                      </div>
                    )}
                  </div>
                </li>
              ))}
              {pending && (
                <li className="flex justify-start">
                  <div className="rounded-2xl rounded-bl-sm border border-[var(--border)] bg-[var(--panel)] px-3.5 py-2.5">
                    <span className="mono animate-pulse-soft text-[0.72rem] text-[var(--text-dim)]">{t('chat.thinking')}</span>
                  </div>
                </li>
              )}
            </ul>
          )}
        </div>

        <div className="border-t border-[var(--border)] p-2.5 sm:p-3">
          <form
            className="flex items-end gap-2"
            onSubmit={(e) => {
              e.preventDefault()
              void send(input)
            }}
          >
            <textarea
              className="input max-h-32 min-h-[44px] flex-1 resize-none py-2.5"
              rows={1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  void send(input)
                }
              }}
              placeholder={t('chat.placeholder')}
              aria-label={t('chat.placeholder')}
            />
            <button type="submit" className="btn btn-primary !min-h-[44px]" disabled={pending || input.trim().length === 0}>
              {t('chat.send')}
            </button>
          </form>
          {conversation && (
            <p className="mono mt-1.5 px-1 text-[0.6rem] text-[var(--text-faint)]">
              {formatDate(conversation.updatedAt, lang)} · {messages.length} {t('common.items')}
            </p>
          )}
        </div>
      </Panel>

      {messages.length === 0 && <div className="mt-3"><EmptyState title={tl({ zh: '提示', en: 'Tip' })} body={t('chat.insufficient')} /></div>}
    </div>
  )
}
