import { expect, test } from 'vitest'
import { slackSummary, slackTask } from './slack'
import { checklist, toggle } from './checklist'
import { toCsv } from './format'

test('Slack copy keeps every ad with its ID and never uses an em dash', () => {
  const out = slackTask(
    {
      ref: 12,
      client: 'Example Retail',
      title: 'Van ad set — build',
      ads: 'Prospecting - Spring Sale - Oct26 - Static | 120200000000000001\nSpring Video 2 120200000000000002\nCarousel (no ID yet)',
    },
    'https://example.test/#/?task=12',
  )
  expect(out).not.toMatch(/[–—]/)
  expect(out).toContain('FSD-12 Example Retail: Van ad set - build')
  expect(out).toContain('Prospecting - Spring Sale - Oct26 - Static (120200000000000001)')
  expect(out).toContain('Spring Video 2 (120200000000000002)')
  expect(out).toContain('Carousel (no ID yet)')
  expect(out).toContain('https://example.test/#/?task=12')
  expect(slackSummary('For review — 1', [{ ref: 1, client: 'A', title: 'B', ads: '' }], (r) => `#${r}`)).toBe('For review - 1\n• FSD-1 A: B\n    #1')
})

test('checklist reads and toggles markdown task lines only', () => {
  const md = 'Brief notes\n- [ ] Build\n- [x] QA\n- not a step'
  expect(checklist(md)).toEqual([
    { line: 1, text: 'Build', done: false },
    { line: 2, text: 'QA', done: true },
  ])
  expect(toggle(md, 1)).toBe('Brief notes\n- [x] Build\n- [x] QA\n- not a step')
  expect(toggle(md, 2)).toBe('Brief notes\n- [ ] Build\n- [ ] QA\n- not a step')
  expect(toggle(md, 0)).toBe(md)
})

test('CSV export survives commas, quotes and line breaks in notes', () => {
  expect(toCsv([['Date', 'Note'], ['2026-10-22', 'Kill list, "B1" ads\nround 2'], ['2026-10-23', null]])).toBe(
    '"Date","Note"\r\n"2026-10-22","Kill list, ""B1"" ads\nround 2"\r\n"2026-10-23",""',
  )
})
