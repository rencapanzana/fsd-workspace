import type { TaskType } from './model'

// A task's checklist is just markdown task-list lines ("- [ ] step") inside its description.
const ITEM = /^(\s*[-*] \[)([ xX])(\] )(.*)$/

export function checklist(md: string) {
  return md.split('\n').flatMap((line, i) => {
    const m = line.match(ITEM)
    return m ? [{ line: i, text: m[4], done: m[2] !== ' ' }] : []
  })
}

export function toggle(md: string, line: number) {
  const lines = md.split('\n')
  const m = lines[line]?.match(ITEM)
  if (m) lines[line] = m[1] + (m[2] === ' ' ? 'x' : ' ') + m[3] + m[4]
  return lines.join('\n')
}

const steps = (...s: string[]) => s.map((x) => `- [ ] ${x}`).join('\n')

// Default checklist for a new task, by type. FSD's build rules live here so nobody has to remember them.
export const TEMPLATES: Partial<Record<TaskType, string>> = {
  meta: steps(
    'Build from the brief, ads PAUSED',
    'Tracking parameter and pixel copied from a live ad, website event ON',
    'No "- Copy" in names; "- Video" / "- Carousel" suffixes',
    'Run meta-ads-qa',
    'Chrome QA prompt for what the API cannot see (form, URL params)',
    'Log every ad name and ID',
    'Send for review',
  ),
  google: steps('Build from the brief', 'Check conversion tracking and naming', 'Log campaign and ad IDs', 'Send for review'),
  report: steps('Pull last period data', 'Compare against the client target', 'Draft the report', 'Send for review', 'Send to the client'),
  qa: steps('Compare live build against the brief', 'Check placements and ratios', 'Check tracking and pixel', 'Write up pass / fail with fixes'),
}

export const LEADGEN_REVIEW = steps(
  'REVIEW: re-pull live ad-level data',
  'KILL: flag ads past the spend floor (ping Jeremy first on high-volume drivers)',
  'BACKFILL: thin ad sets from untested or proven paused concepts',
  'Flag starved ads for Push Delivery',
  'MD report for Jeremy with Ad IDs',
)
