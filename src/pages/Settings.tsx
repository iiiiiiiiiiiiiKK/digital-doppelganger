import { useRef, useState } from 'react'
import { useApp } from '../store/useApp'
import { useI18n } from '../i18n/useI18n'
import { ConfirmButton, Field, PageHeader, Panel, SectionLabel } from '../components/ui'
import { buildBackup, downloadJson } from '../lib/io'
import { testAiConnection } from '../lib/ai'
import { cn } from '../lib/cn'
import { XLink, AUTHOR_HANDLE } from '../components/XLink'

export function Settings() {
  const { t, lang, setLang } = useI18n()
  const settings = useApp((s) => s.settings)
  const profile = useApp((s) => s.profile)
  const memories = useApp((s) => s.memories)
  const conversations = useApp((s) => s.conversations)
  const decisions = useApp((s) => s.decisions)
  const similarities = useApp((s) => s.similarities)
  const versions = useApp((s) => s.versions)
  const setTheme = useApp((s) => s.setTheme)
  const setAiConfig = useApp((s) => s.setAiConfig)
  const importBackupData = useApp((s) => s.importBackupData)
  const wipeAll = useApp((s) => s.wipeAll)
  const setNotice = useApp((s) => s.setNotice)

  const [baseUrl, setBaseUrl] = useState(settings.ai.baseUrl)
  const [model, setModel] = useState(settings.ai.model)
  const [apiKey, setApiKey] = useState(settings.ai.apiKey)
  const [temperature, setTemperature] = useState(settings.ai.temperature)
  const [persistKey, setPersistKey] = useState(settings.ai.persistKey)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<'ok' | 'fail' | null>(null)
  const [importError, setImportError] = useState('')
  const fileRef = useRef<HTMLInputElement | null>(null)

  async function saveAi() {
    await setAiConfig({
      baseUrl: baseUrl.trim(),
      model: model.trim(),
      apiKey: apiKey.trim(),
      temperature,
      persistKey,
    })
    setNotice({ kind: 'ok', text: t('common.saved') })
  }

  async function toggleAi(enabled: boolean) {
    await setAiConfig({ enabled })
  }

  async function testConn() {
    setTesting(true)
    setTestResult(null)
    const result = await testAiConnection({
      ...settings.ai,
      baseUrl: baseUrl.trim(),
      model: model.trim(),
      apiKey: apiKey.trim(),
      temperature,
    })
    setTestResult(result.ok ? 'ok' : 'fail')
    if (!result.ok) setNotice({ kind: 'err', text: `${t('settings.testFail')}: ${result.error ?? ''}` })
    setTesting(false)
  }

  function exportAll() {
    if (!profile) {
      setNotice({ kind: 'err', text: t('overview.notReady') })
      return
    }
    const bundle = buildBackup({
      profile,
      memories,
      conversations,
      decisions,
      similarities,
      versions,
      settings: {
        id: 'settings',
        lang: settings.lang,
        theme: settings.theme,
        galleryPublic: settings.galleryPublic,
        updatedAt: settings.updatedAt,
        ai: {
          enabled: settings.ai.enabled,
          baseUrl: settings.ai.baseUrl,
          model: settings.ai.model,
          temperature: settings.ai.temperature,
          persistKey: settings.ai.persistKey,
          proxyNote: settings.ai.proxyNote,
        },
      },
    })
    downloadJson(`doppelganger-backup-${new Date().toISOString().slice(0, 10)}.json`, bundle)
    setNotice({ kind: 'ok', text: t('common.copied') })
  }

  async function onImport(file: File | undefined) {
    if (!file) return
    setImportError('')
    try {
      const text = await file.text()
      const parsed = JSON.parse(text) as unknown
      const result = await importBackupData(parsed)
      if (!result.ok) {
        setImportError(`${t('memory.importFail')} — ${result.error ?? ''}`)
        return
      }
      setNotice({ kind: 'ok', text: t('memory.importOk') })
    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'invalid json')
    } finally {
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  return (
    <div>
      <PageHeader eyebrow={t('nav.settings')} title={t('settings.title')} />

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel>
          <SectionLabel>{t('settings.appearance')}</SectionLabel>
          <div className="space-y-3">
            <div>
              <p className="mb-1.5 text-[0.78rem] text-[var(--text-dim)]">{t('settings.theme')}</p>
              <div className="flex gap-2">
                {(['dark', 'light'] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => void setTheme(mode)}
                    className={cn(
                      'flex flex-1 items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-[0.8rem]',
                      settings.theme === mode
                        ? 'border-[var(--accent)] text-[var(--accent)]'
                        : 'border-[var(--border)] text-[var(--text-dim)]',
                    )}
                  >
                    <span aria-hidden="true">{mode === 'dark' ? '☾' : '☀'}</span>
                    {t(mode === 'dark' ? 'settings.theme.dark' : 'settings.theme.light')}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-1.5 text-[0.78rem] text-[var(--text-dim)]">{t('settings.language')}</p>
              <div className="flex gap-2">
                {(['zh', 'en'] as const).map((code) => (
                  <button
                    key={code}
                    type="button"
                    onClick={() => void setLang(code)}
                    className={cn(
                      'flex-1 rounded-lg border px-3 py-2 text-[0.8rem]',
                      lang === code
                        ? 'border-[var(--accent)] text-[var(--accent)]'
                        : 'border-[var(--border)] text-[var(--text-dim)]',
                    )}
                  >
                    {code === 'zh' ? '简体中文' : 'English'}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </Panel>

        <Panel>
          <SectionLabel
            right={
              <button
                type="button"
                role="switch"
                aria-checked={settings.ai.enabled}
                onClick={() => void toggleAi(!settings.ai.enabled)}
                className={cn(
                  'relative h-6 w-11 rounded-full border transition-colors',
                  settings.ai.enabled ? 'border-[var(--accent)] bg-[var(--accent)]' : 'border-[var(--border-strong)] bg-[var(--panel-strong)]',
                )}
                aria-label={t('settings.aiEnable')}
              >
                <span
                  className={cn(
                    'absolute top-0.5 h-4 w-4 rounded-full bg-[var(--bg)] transition-all',
                    settings.ai.enabled ? 'left-[1.45rem]' : 'left-0.5',
                  )}
                />
              </button>
            }
          >
            {t('settings.aiTitle')}
          </SectionLabel>
          <p className="mb-3 rounded-lg border border-[var(--ember)] px-3 py-2 text-[0.72rem] leading-relaxed text-[var(--text-dim)]">
            {t('settings.aiWarn')}
          </p>
          <div className="space-y-3">
            <Field label={t('settings.baseUrl')} htmlFor="ai-base">
              <input
                id="ai-base"
                className="input"
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
                placeholder="https://api.openai.com/v1"
                inputMode="url"
                autoComplete="off"
                spellCheck={false}
              />
            </Field>
            <Field label={t('settings.model')} htmlFor="ai-model">
              <input
                id="ai-model"
                className="input"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder="gpt-4o-mini"
                autoComplete="off"
                spellCheck={false}
              />
            </Field>
            <Field label={t('settings.apiKey')} htmlFor="ai-key">
              <input
                id="ai-key"
                className="input"
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="sk-…"
                autoComplete="off"
                spellCheck={false}
              />
            </Field>
            <Field label={t('settings.temperature')} htmlFor="ai-temp">
              <input
                id="ai-temp"
                className="w-full accent-[var(--accent)]"
                type="range"
                min={0}
                max={1.5}
                step={0.05}
                value={temperature}
                onChange={(e) => setTemperature(Number(e.target.value))}
              />
              <span className="mono text-[0.7rem] text-[var(--text-faint)]">{temperature.toFixed(2)}</span>
            </Field>
            <label className="flex cursor-pointer items-start gap-2 text-[0.76rem] text-[var(--text-dim)]">
              <input
                type="checkbox"
                checked={persistKey}
                onChange={(e) => setPersistKey(e.target.checked)}
                className="mt-0.5 accent-[var(--accent)]"
              />
              {t('settings.persistKey')}
            </label>
            <div className="flex flex-wrap items-center gap-2">
              <button type="button" className="btn btn-primary" onClick={() => void saveAi()}>
                {t('common.save')}
              </button>
              <button type="button" className="btn" onClick={() => void testConn()} disabled={testing || !baseUrl || !apiKey}>
                {testing ? t('common.loading') : t('settings.testConn')}
              </button>
              {testResult && (
                <span className={cn('mono text-[0.7rem]', testResult === 'ok' ? 'text-[var(--accent)]' : 'text-[var(--ember)]')}>
                  {testResult === 'ok' ? t('settings.testOk') : t('settings.testFail')}
                </span>
              )}
            </div>
          </div>
        </Panel>

        <Panel>
          <SectionLabel>{t('settings.data')}</SectionLabel>
          <div className="space-y-2">
            <button type="button" className="btn w-full justify-start" onClick={exportAll}>
              {t('settings.exportAll')}
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={(e) => void onImport(e.target.files?.[0])}
            />
            <button type="button" className="btn w-full justify-start" onClick={() => fileRef.current?.click()}>
              {t('settings.importAll')}
            </button>
            {importError && <p className="text-[0.72rem] text-[#ff9c9c]">{importError}</p>}
            <ConfirmButton
              onConfirm={async () => {
                await wipeAll()
                setNotice({ kind: 'ok', text: t('settings.wiped') })
              }}
              className="w-full justify-start"
              confirmLabel={t('common.confirm')}
              cancelLabel={t('common.cancel')}
              ariaLabel={t('settings.wipe')}
            >
              <span className="text-[#ff9c9c]">{t('settings.wipe')}</span>
            </ConfirmButton>
            <p className="pt-1 text-[0.72rem] leading-relaxed text-[var(--text-faint)]">{t('settings.wipeConfirm')}</p>
          </div>
        </Panel>

        <Panel>
          <SectionLabel>{t('settings.privacy')}</SectionLabel>
          <p className="text-[0.8rem] leading-relaxed text-[var(--text-dim)]">{t('settings.privacyBody')}</p>
          <div className="mt-4 border-t border-[var(--border)] pt-3">
            <p className="label-xs mb-2">{t('app.author')}</p>
            <div className="flex items-center gap-2">
              <XLink />
              <span className="mono text-[0.7rem] text-[var(--text-faint)]">{AUTHOR_HANDLE}</span>
            </div>
          </div>
        </Panel>
      </div>
    </div>
  )
}
