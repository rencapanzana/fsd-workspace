// Fixed vocabularies. They mirror the check constraints in supabase/migrations/0001_core.sql.
export const STATUSES = [
  ['todo', 'To Do'],
  ['in_progress', 'In Progress'],
  ['review', 'Review'],
  ['approved', 'Approved'],
  ['on_hold', 'On Hold'],
  ['done', 'Done'],
] as const

export const TYPES = [
  ['meta', 'Meta Ads'],
  ['google', 'Google Ads'],
  ['bing_openai', 'Bing / OpenAI Ads'],
  ['tiktok', 'TikTok'],
  ['seo', 'SEO'],
  ['website', 'Website'],
  ['creative', 'Creative'],
  ['report', 'Report / Review'],
  ['qa', 'QA'],
  ['admin', 'Admin'],
] as const

export const PRIORITIES = [
  ['urgent', 'Urgent'],
  ['high', 'High'],
  ['normal', 'Normal'],
  ['low', 'Low'],
] as const

export type Status = (typeof STATUSES)[number][0]
export type TaskType = (typeof TYPES)[number][0]
export type Priority = (typeof PRIORITIES)[number][0]

const label = (list: readonly (readonly [string, string])[]) => (key: string) => list.find(([k]) => k === key)?.[1] ?? key
export const statusLabel = label(STATUSES)
export const typeLabel = label(TYPES)
export const priorityLabel = label(PRIORITIES)

export const ref = (n: number) => `FSD-${n}`
