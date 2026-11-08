import { useCallback } from 'react'
import { useApp } from '../store/useApp'
import { translate, type DictKey } from './dict'
import type { Lang } from '../types'

export function useI18n() {
  const lang = useApp((s) => s.settings.lang)
  const t = useCallback((key: DictKey) => translate(key, lang), [lang])
  const tl = useCallback((value: { zh: string; en: string } | undefined, fallback = '') => {
    if (!value) return fallback
    return value[lang] || value.zh || value.en || fallback
  }, [lang])
  return { t, tl, lang, setLang: useApp((s) => s.setLang) }
}

export function pick(lang: Lang, zh: string, en: string): string {
  return lang === 'zh' ? zh : en
}
