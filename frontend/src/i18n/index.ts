import en, { Dict } from './en'
import es from './es'

export type Language = 'en' | 'es'
export const LANGUAGES: { code: Language; name: string }[] = [
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Español' },
]
export const DICTS: Record<Language, Dict> = { en, es }
