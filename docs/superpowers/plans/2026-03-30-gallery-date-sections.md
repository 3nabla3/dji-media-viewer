# Gallery Date Sections Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Group gallery items into labelled date sections (Today, This Week, This Month, This Year, Others), sorted most-recent-first within each section.

**Architecture:** Add `date: Date` to all `MediaItem` types, populated at parse time from EXIF `DateTimeOriginal` (photos/HDR) or `file.lastModified` (video/panorama). A new pure `groupByDate()` function buckets and sorts items. `MediaGrid` renders a section header above each bucket.

**Tech Stack:** Next.js (bun), TypeScript, React, Vitest

---

## File Map

| File | Action |
|---|---|
| `lib/media-types.ts` | Modify — add `date: Date` to all 4 interfaces |
| `lib/hdr-detector.ts` | Modify — populate `date` on returned `PhotoItem` / `HdrItem` |
| `lib/media-parser.ts` | Modify — populate `date` on `VideoItem` / `PanoramaItem` |
| `lib/date-sections.ts` | Create — `isoWeek` helper + `groupByDate` function |
| `lib/__tests__/date-sections.test.ts` | Create — full test suite for groupByDate |
| `components/MediaGrid.tsx` | Modify — render sections with headers |

---

## Task 1 — Add `date` to types and fix hdr-detector

**Files:**
- Modify: `lib/media-types.ts`
- Modify: `lib/hdr-detector.ts`

- [ ] **Step 1: Add `date: Date` to all MediaItem interfaces in `lib/media-types.ts`**

Replace the entire file content:

```typescript
// lib/media-types.ts

export interface VideoItem {
  type: 'video'
  file: File
  date: Date
}

export interface PhotoItem {
  type: 'photo'
  file: File
  date: Date
}

/**
 * HDR bracket set. `middle` is the median-EV exposure used as the preview
 * thumbnail. `files` contains all 2–3 bracketed exposures sorted ascending
 * by ExposureBiasValue. `date` is the capture time of the middle exposure.
 */
export interface HdrItem {
  type: 'hdr'
  files: File[]
  middle: File
  date: Date
}

export interface PanoramaItem {
  type: 'panorama'
  htmlFile: File
  tiles: File[]
  date: Date
}

export type MediaItem = VideoItem | PhotoItem | HdrItem | PanoramaItem
```

- [ ] **Step 2: Update `groupIntoBrackets` in `lib/hdr-detector.ts` to populate `date`**

The function currently returns `{ type: 'photo', file }` and `{ type: 'hdr', files, middle }`. Add `date` to both. `JpgWithExif` already carries `dateTimeOriginal: Date | undefined` — use it, falling back to `file.lastModified`.

Replace the `return groups.map(...)` block (lines 55–79) with:

```typescript
  return groups.map((group): PhotoItem | HdrItem => {
    if (group.length === 1) {
      const item = group[0]
      return {
        type: 'photo',
        file: item.file,
        date: item.dateTimeOriginal ?? new Date(item.file.lastModified),
      }
    }

    // Sort by ExposureBiasValue ascending (undefined bias goes last)
    const sorted = [...group].sort((a, b) => {
      const aBias = a.exposureBiasValue ?? Infinity
      const bBias = b.exposureBiasValue ?? Infinity
      return aBias - bBias
    })

    // Middle = median position in the EV-sorted array (index floor(n/2)).
    const middle = sorted[Math.floor(sorted.length / 2)]

    return {
      type: 'hdr',
      files: sorted.map((s) => s.file),
      middle: middle.file,
      date: middle.dateTimeOriginal ?? new Date(middle.file.lastModified),
    }
  })
```

- [ ] **Step 3: Run the existing test suite — all 26 tests must still pass**

```bash
bun test
```

Expected:
```
26 pass
0 fail
```

- [ ] **Step 4: Commit**

```bash
git add lib/media-types.ts lib/hdr-detector.ts
git commit -m "feat: add date field to MediaItem types, populate in hdr-detector"
```

---

## Task 2 — Populate `date` in media-parser for videos and panoramas

**Files:**
- Modify: `lib/media-parser.ts`

`DateTimeOriginal` is already fetched in the EXIF batch for JPGs and available as `exif?.DateTimeOriginal`. `groupIntoBrackets` (called in Task 1) now handles `date` for photos and HDR. This task covers videos and panoramas.

- [ ] **Step 1: Update `VideoItem` construction in `lib/media-parser.ts`**

Find this line (currently near the end of the file):

```typescript
  const videoItems: VideoItem[] = videos.map((file) => ({ type: 'video', file }))
```

Replace it with:

```typescript
  const videoItems: VideoItem[] = videos.map((file) => ({
    type: 'video',
    file,
    date: new Date(file.lastModified),
  }))
```

- [ ] **Step 2: Update `PanoramaItem` construction in `lib/media-parser.ts`**

Find this block:

```typescript
  const panoramaItems = await Promise.all(
    htmls.map(async (htmlFile) => {
      const html = await htmlFile.text()
      const tiles = collectPanoramaTiles(htmlFile, html, allFiles)
      return { type: 'panorama' as const, htmlFile, tiles }
    })
  )
```

Replace it with:

```typescript
  const panoramaItems = await Promise.all(
    htmls.map(async (htmlFile) => {
      const html = await htmlFile.text()
      const tiles = collectPanoramaTiles(htmlFile, html, allFiles)
      return {
        type: 'panorama' as const,
        htmlFile,
        tiles,
        date: new Date(htmlFile.lastModified),
      }
    })
  )
```

- [ ] **Step 3: Run tests — all 26 must still pass**

```bash
bun test
```

Expected: `26 pass, 0 fail`

- [ ] **Step 4: Commit**

```bash
git add lib/media-parser.ts
git commit -m "feat: populate date on VideoItem and PanoramaItem in parser"
```

---

## Task 3 — Create `lib/date-sections.ts` with tests

**Files:**
- Create: `lib/__tests__/date-sections.test.ts`
- Create: `lib/date-sections.ts`

Use TDD: write all tests first, watch them fail, then implement.

- [ ] **Step 1: Create `lib/__tests__/date-sections.test.ts`**

```typescript
// lib/__tests__/date-sections.test.ts
import { describe, it, expect } from 'vitest'
import { groupByDate } from '../date-sections'
import type { MediaItem } from '../media-types'

// Fixed reference point: Thursday 2024-06-13 10:00 local time
// ISO week 24 of 2024 spans Mon 2024-06-10 → Sun 2024-06-16
const NOW = new Date('2024-06-13T10:00:00')

function makeItem(date: Date, idx = 0): { item: MediaItem; idx: number } {
  const file = new File([], 'test.jpg')
  return { item: { type: 'photo', file, date }, idx }
}

describe('groupByDate', () => {
  it('places an item from today into Today', () => {
    const entry = makeItem(new Date('2024-06-13T08:30:00'))
    const sections = groupByDate([entry], NOW)
    expect(sections).toHaveLength(1)
    expect(sections[0].label).toBe('Today')
    expect(sections[0].items[0]).toBe(entry)
  })

  it('places an item from earlier this week (not today) into This Week', () => {
    const entry = makeItem(new Date('2024-06-10T09:00:00')) // Monday, same ISO week
    const sections = groupByDate([entry], NOW)
    expect(sections).toHaveLength(1)
    expect(sections[0].label).toBe('This Week')
  })

  it('places an item from earlier this month (different week) into This Month', () => {
    const entry = makeItem(new Date('2024-06-03T12:00:00')) // week 23, same month
    const sections = groupByDate([entry], NOW)
    expect(sections).toHaveLength(1)
    expect(sections[0].label).toBe('This Month')
  })

  it('places an item from earlier this year (different month) into This Year', () => {
    const entry = makeItem(new Date('2024-03-15T10:00:00'))
    const sections = groupByDate([entry], NOW)
    expect(sections).toHaveLength(1)
    expect(sections[0].label).toBe('This Year')
  })

  it('places an item from a previous year into Others', () => {
    const entry = makeItem(new Date('2023-12-25T10:00:00'))
    const sections = groupByDate([entry], NOW)
    expect(sections).toHaveLength(1)
    expect(sections[0].label).toBe('Others')
  })

  it('omits empty sections', () => {
    const entry = makeItem(new Date('2024-06-13T08:00:00')) // Today only
    const sections = groupByDate([entry], NOW)
    const labels = sections.map((s) => s.label)
    expect(labels).toEqual(['Today'])
    expect(labels).not.toContain('This Week')
    expect(labels).not.toContain('Others')
  })

  it('sorts items within a section descending by date', () => {
    const older = makeItem(new Date('2024-06-13T07:00:00'), 0)
    const newer = makeItem(new Date('2024-06-13T09:00:00'), 1)
    const sections = groupByDate([older, newer], NOW)
    expect(sections[0].label).toBe('Today')
    expect(sections[0].items[0]).toBe(newer) // newer first
    expect(sections[0].items[1]).toBe(older)
  })

  it('returns sections in order: Today → This Week → This Month → This Year → Others', () => {
    const entries = [
      makeItem(new Date('2023-01-01T00:00:00'), 0), // Others
      makeItem(new Date('2024-03-01T00:00:00'), 1), // This Year
      makeItem(new Date('2024-06-13T08:00:00'), 2), // Today
      makeItem(new Date('2024-06-03T00:00:00'), 3), // This Month
      makeItem(new Date('2024-06-10T00:00:00'), 4), // This Week
    ]
    const sections = groupByDate(entries, NOW)
    expect(sections.map((s) => s.label)).toEqual([
      'Today', 'This Week', 'This Month', 'This Year', 'Others',
    ])
  })

  it('ISO week boundary: Sunday before now\'s week → This Month (not This Week)', () => {
    // now = 2024-06-13 (week 24). Sunday 2024-06-09 is end of week 23.
    const entry = makeItem(new Date('2024-06-09T23:59:00'))
    const sections = groupByDate([entry], NOW)
    expect(sections[0].label).toBe('This Month') // same month, different week
  })

  it('returns empty array when given no items', () => {
    expect(groupByDate([], NOW)).toEqual([])
  })
})
```

- [ ] **Step 2: Run tests — they must all FAIL (date-sections.ts doesn't exist yet)**

```bash
bun test lib/__tests__/date-sections.test.ts
```

Expected: error like `Cannot find module '../date-sections'`

- [ ] **Step 3: Create `lib/date-sections.ts`**

```typescript
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
```

- [ ] **Step 4: Run tests — all must pass**

```bash
bun test lib/__tests__/date-sections.test.ts
```

Expected: `10 pass, 0 fail`

- [ ] **Step 5: Run full suite — all 36 tests must pass**

```bash
bun test
```

Expected: `36 pass, 0 fail`

- [ ] **Step 6: Commit**

```bash
git add lib/date-sections.ts lib/__tests__/date-sections.test.ts
git commit -m "feat: add groupByDate with ISO week bucketing and tests"
```

---

## Task 4 — Update MediaGrid to render date sections

**Files:**
- Modify: `components/MediaGrid.tsx`

- [ ] **Step 1: Replace `components/MediaGrid.tsx` with the sections-aware version**

```typescript
'use client'

import type { MediaItem } from '@/lib/media-types'
import type { FilterType } from './FilterTabs'
import { groupByDate } from '@/lib/date-sections'
import VideoCard from './cards/VideoCard'
import PhotoCard from './cards/PhotoCard'
import HdrCard from './cards/HdrCard'
import PanoramaCard from './cards/PanoramaCard'

interface MediaGridProps {
  items: MediaItem[]
  filter: FilterType
  onSelect: (index: number) => void
}

export default function MediaGrid({ items, filter, onSelect }: MediaGridProps) {
  const visible = filter === 'all'
    ? items.map((item, idx) => ({ item, idx }))
    : items.map((item, idx) => ({ item, idx })).filter(({ item }) => item.type === filter)

  if (visible.length === 0) {
    return <p className="text-muted">No items to display.</p>
  }

  const sections = groupByDate(visible)

  return (
    <>
      {sections.map((section) => (
        <div key={section.label}>
          <h5 className="text-muted fw-semibold mb-2 mt-4">{section.label}</h5>
          <div className="row row-cols-1 row-cols-sm-2 row-cols-md-3 row-cols-lg-4 g-3">
            {section.items.map(({ item, idx }) => (
              <div key={idx} className="col">
                {item.type === 'video' && <VideoCard item={item} onClick={() => onSelect(idx)} />}
                {item.type === 'photo' && <PhotoCard item={item} onClick={() => onSelect(idx)} />}
                {item.type === 'hdr' && <HdrCard item={item} onClick={() => onSelect(idx)} />}
                {item.type === 'panorama' && <PanoramaCard item={item} onClick={() => onSelect(idx)} />}
              </div>
            ))}
          </div>
        </div>
      ))}
    </>
  )
}
```

- [ ] **Step 2: Run full test suite**

```bash
bun test
```

Expected: `36 pass, 0 fail`

- [ ] **Step 3: Start dev server and verify manually**

```bash
bun run dev
```

Open the app, load a folder with media from multiple dates. Verify:
- Sections appear with bold grey headers (Today / This Week / etc.)
- Most recent items appear at the top within each section
- Sections without items are absent
- All filter tabs still work (each shows only that type, still grouped by date)

- [ ] **Step 4: Commit**

```bash
git add components/MediaGrid.tsx
git commit -m "feat: render gallery in date sections (Today / This Week / This Month / This Year / Others)"
```
