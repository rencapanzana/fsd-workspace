// Slack copy for Jeremy: short bullets, the FSD ref, ad name + ad ID for every ad, never an em dash.
export type SlackTask = { ref: number; title: string; client: string; ads: string }

const DASHES = /\s*[–—]\s*/g

export const clean = (s: string) => s.replace(DASHES, ' - ')

// One ad per line, written as "Ad name | 1202..." or "Ad name 1202...".
export function parseAds(ads: string) {
  return ads
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .map((line) => {
      const pipe = line.lastIndexOf('|')
      if (pipe > -1) return { name: line.slice(0, pipe).trim(), id: line.slice(pipe + 1).trim() }
      const m = line.match(/^(.*?)[\s(]+(\d{8,})\)?$/)
      return m ? { name: m[1].trim(), id: m[2] } : { name: line, id: '' }
    })
}

export function slackTask(t: SlackTask, link: string) {
  const lines = [`• FSD-${t.ref} ${t.client}: ${t.title}`]
  for (const ad of parseAds(t.ads)) lines.push(`    ◦ ${ad.id ? `${ad.name} (${ad.id})` : ad.name}`)
  lines.push(`    ${link}`)
  return lines.map(clean).join('\n')
}

export function slackSummary(heading: string, tasks: SlackTask[], linkFor: (ref: number) => string) {
  return [clean(heading), ...tasks.map((t) => slackTask(t, linkFor(t.ref)))].join('\n')
}
