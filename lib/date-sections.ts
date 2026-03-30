// lib/date-sections.ts
import type { MediaItem } from './media-types'

export interface DateSection {
  label: 'Today' | 'This Week' | 'This Month' | 'This Year' | 'Others'
  items: { item: MediaItem; idx: number }[]
}

/** ISO 8601 week: week starts Monday, week 1 contains the year's first Thursday. */
function isoWeek(d: Date): { year: number; week: number } {
  // Work in UTC to avoid DST shifts
  const utc = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
  const day = utc.getUTCDay() || 7 // make Sunday = 7
  utc.setUTCDate(utc.getUTCDate() + 4 - day) // shift to nearest Thursday
  const yearStart = new Date(Date.UTC(utc.getUTCFullYear(), 0, 1))
  const week = Math.ceil(((utc.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7)
  return { year: utc.getUTCFullYear(), week }
}

const SECTION_ORDER: DateSection['label'][] = [
  'Today', 'This Week', 'This Month', 'This Year', 'Others',
]

/**
 * Buckets items into date sections and sorts each section most-recent-first.
 * Empty sections are omitted. `now` defaults to the current time and is
 * injectable for deterministic tests.
 */
export function groupByDate(
  items: { item: MediaItem; idx: number }[],
  now: Date = new Date(),
): DateSection[] {
  const nowYear = now.getFullYear()
  const nowMonth = now.getMonth()
  const nowDay = now.getDate()
  const nowIso = isoWeek(now)

  const buckets = new Map<DateSection['label'], { item: MediaItem; idx: number }[]>(
    SECTION_ORDER.map((label) => [label, []]),
  )

  for (const entry of items) {
    const d = entry.item.date
    const year = d.getFullYear()
    const month = d.getMonth()
    const day = d.getDate()
    const iso = isoWeek(d)

    let label: DateSection['label']
    if (year === nowYear && month === nowMonth && day === nowDay) {
      label = 'Today'
    } else if (iso.year === nowIso.year && iso.week === nowIso.week) {
      label = 'This Week'
    } else if (year === nowYear && month === nowMonth) {
      label = 'This Month'
    } else if (year === nowYear) {
      label = 'This Year'
    } else {
      label = 'Others'
    }
    buckets.get(label)!.push(entry)
  }

  const result: DateSection[] = []
  for (const label of SECTION_ORDER) {
    const sectionItems = buckets.get(label)!
    if (sectionItems.length === 0) continue
    sectionItems.sort((a, b) => b.item.date.getTime() - a.item.date.getTime())
    result.push({ label, items: sectionItems })
  }
  return result
}
