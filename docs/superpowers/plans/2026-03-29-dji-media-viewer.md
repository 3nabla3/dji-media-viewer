# DJI Media Viewer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a client-side Next.js app that reads a drone SD card folder and renders videos, photos, HDR bracket sets, and panoramas in a unified Bootstrap grid.

**Architecture:** Pure client-side SPA — no API routes, no uploads. Files are read via `<input type="file" webkitdirectory>`, EXIF is parsed in-browser with `exifr`, and media is displayed via blob URLs. All parsing logic lives in focused `lib/` modules with unit tests.

**Tech Stack:** Next.js 16 (App Router), Bootstrap 5, exifr, Vitest

---

## File Map

| File | Responsibility |
|------|---------------|
| `app/layout.tsx` | Root layout, Bootstrap CSS import |
| `app/globals.css` | Minimal global reset |
| `app/page.tsx` | Page state (`'use client'`): holds `MediaItem[]`, active filter, renders FolderPicker → MediaGrid |
| `lib/media-types.ts` | TypeScript interfaces: `VideoItem`, `PhotoItem`, `HdrItem`, `PanoramaItem`, `MediaItem` |
| `lib/panorama-resolver.ts` | Pure functions: parse HTML redirect URL, resolve folder path, collect tile files |
| `lib/hdr-detector.ts` | Pure function: group `JpgWithExif[]` into `PhotoItem | HdrItem` using timestamp + bias logic |
| `lib/media-parser.ts` | Async orchestrator: reads EXIF via exifr, calls resolver + detector, returns `MediaItem[]` |
| `lib/__tests__/panorama-resolver.test.ts` | Unit tests for panorama resolver |
| `lib/__tests__/hdr-detector.test.ts` | Unit tests for HDR bracket detection |
| `components/FolderPicker.tsx` | `'use client'` — `<input webkitdirectory>`, emits `File[]` |
| `components/FilterTabs.tsx` | `'use client'` — tab bar with counts per media type |
| `components/MediaGrid.tsx` | `'use client'` — Bootstrap grid, dispatches to card variants |
| `components/cards/VideoCard.tsx` | `'use client'` — `<video>` with blob URL |
| `components/cards/PhotoCard.tsx` | `'use client'` — `<img>` with blob URL |
| `components/cards/HdrCard.tsx` | `'use client'` — middle exposure + amber "not yet implemented" badge |
| `components/cards/PanoramaCard.tsx` | `'use client'` — Bootstrap grid of tile `<img>` elements |

---

## Task 1: Install dependencies and configure Bootstrap

**Files:**
- Modify: `package.json` (via bun add)
- Create: `vitest.config.ts`
- Modify: `app/layout.tsx`
- Modify: `app/globals.css`
- Delete content: `app/page.module.css`

- [ ] **Step 1: Install runtime dependencies**

```bash
bun add bootstrap exifr
```

Expected: `bootstrap` and `exifr` appear in `package.json` dependencies.

- [ ] **Step 2: Install vitest**

```bash
bun add -D vitest
```

Expected: `vitest` appears in `package.json` devDependencies.

- [ ] **Step 3: Add test script to package.json**

Open `package.json` and add `"test": "vitest run"` and `"test:watch": "vitest"` to the `scripts` block:

```json
"scripts": {
  "dev": "next dev",
  "build": "next build",
  "start": "next start",
  "lint": "eslint",
  "test": "vitest run",
  "test:watch": "vitest"
}
```

- [ ] **Step 4: Create vitest.config.ts**

```ts
// vitest.config.ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['lib/__tests__/**/*.test.ts'],
  },
})
```

- [ ] **Step 5: Update app/layout.tsx — import Bootstrap, strip Geist fonts**

```tsx
// app/layout.tsx
import type { Metadata } from 'next'
import 'bootstrap/dist/css/bootstrap.min.css'
import './globals.css'

export const metadata: Metadata = {
  title: 'DJI Media Viewer',
  description: 'View drone footage from your SD card',
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
```

- [ ] **Step 6: Replace app/globals.css with minimal reset**

```css
/* app/globals.css */
*, *::before, *::after {
  box-sizing: border-box;
}

body {
  margin: 0;
}
```

- [ ] **Step 7: Replace app/page.module.css with empty file**

```css
/* app/page.module.css — unused, kept to avoid import errors until page.tsx is replaced */
```

- [ ] **Step 8: Verify dev server starts without errors**

```bash
bun dev
```

Expected: server starts at http://localhost:3000, no compilation errors in terminal.

- [ ] **Step 9: Commit**

```bash
git add package.json bun.lock vitest.config.ts app/layout.tsx app/globals.css app/page.module.css
git commit -m "chore: install bootstrap, exifr, vitest; configure layout"
```

---

## Task 2: Media type definitions

**Files:**
- Create: `lib/media-types.ts`

- [ ] **Step 1: Create lib/media-types.ts**

```ts
// lib/media-types.ts

export interface VideoItem {
  type: 'video'
  file: File
}

export interface PhotoItem {
  type: 'photo'
  file: File
}

/**
 * HDR bracket set. `middle` is the exposure closest to 0 EV bias — used as
 * the preview thumbnail until full blending is implemented.
 * `files` contains all 2–3 bracketed exposures sorted ascending by ExposureBiasValue.
 */
export interface HdrItem {
  type: 'hdr'
  files: File[]
  middle: File
}

export interface PanoramaItem {
  type: 'panorama'
  htmlFile: File
  tiles: File[]
}

export type MediaItem = VideoItem | PhotoItem | HdrItem | PanoramaItem
```

- [ ] **Step 2: Commit**

```bash
git add lib/media-types.ts
git commit -m "feat: add MediaItem type definitions"
```

---

## Task 3: Panorama path resolver (TDD)

**Files:**
- Create: `lib/panorama-resolver.ts`
- Create: `lib/__tests__/panorama-resolver.test.ts`

- [ ] **Step 1: Create test file**

```ts
// lib/__tests__/panorama-resolver.test.ts
import { describe, it, expect } from 'vitest'
import {
  parsePanoramaRedirectUrl,
  resolveRelativePath,
  collectPanoramaTiles,
} from '../panorama-resolver'

describe('parsePanoramaRedirectUrl', () => {
  it('extracts redirect URL from DJI panorama HTML', () => {
    const html = `<html><head>
<meta http-equiv="refresh" content="0;url=../PANORAMA/100_0255/">
<meta data-PANOMODE="BALL  ">
</head></html>`
    expect(parsePanoramaRedirectUrl(html)).toBe('../PANORAMA/100_0255/')
  })

  it('returns null when no refresh meta tag is present', () => {
    expect(parsePanoramaRedirectUrl('<html></html>')).toBeNull()
  })

  it('handles url= with surrounding whitespace in content attribute', () => {
    const html = `<meta http-equiv="refresh" content="0; url=../PANORAMA/100_0010/">`
    expect(parsePanoramaRedirectUrl(html)).toBe('../PANORAMA/100_0010/')
  })
})

describe('resolveRelativePath', () => {
  it('resolves ../PANORAMA/100_0255/ relative to DCIM/100MEDIA', () => {
    expect(resolveRelativePath('DJI_SD/DCIM/100MEDIA', '../PANORAMA/100_0255/'))
      .toBe('DJI_SD/DCIM/PANORAMA/100_0255')
  })

  it('resolves single-level parent correctly', () => {
    expect(resolveRelativePath('root/a/b', '../c')).toBe('root/a/c')
  })

  it('handles trailing slash in relative path', () => {
    expect(resolveRelativePath('root/a', 'b/')).toBe('root/a/b')
  })
})

describe('collectPanoramaTiles', () => {
  it('returns files whose webkitRelativePath starts with the resolved folder', () => {
    const makeFile = (path: string) =>
      Object.assign(new File([], path.split('/').pop()!), {
        webkitRelativePath: path,
      })

    const htmlFile = makeFile('DJI_SD/DCIM/100MEDIA/DJI_0255.html')
    const tile1 = makeFile('DJI_SD/DCIM/PANORAMA/100_0255/DJI_0001.JPG')
    const tile2 = makeFile('DJI_SD/DCIM/PANORAMA/100_0255/DJI_0002.JPG')
    const other = makeFile('DJI_SD/DCIM/100MEDIA/DJI_0001.JPG')

    const html = `<meta http-equiv="refresh" content="0;url=../PANORAMA/100_0255/">`
    const result = collectPanoramaTiles(htmlFile, html, [htmlFile, tile1, tile2, other])

    expect(result).toHaveLength(2)
    expect(result).toContain(tile1)
    expect(result).toContain(tile2)
  })

  it('returns empty array when redirect URL cannot be parsed', () => {
    const makeFile = (path: string) =>
      Object.assign(new File([], path.split('/').pop()!), {
        webkitRelativePath: path,
      })
    const htmlFile = makeFile('root/DJI_0255.html')
    expect(collectPanoramaTiles(htmlFile, '<html></html>', [])).toEqual([])
  })
})
```

- [ ] **Step 2: Run tests — expect failures**

```bash
bun test
```

Expected: 6 failing tests (module not found).

- [ ] **Step 3: Implement lib/panorama-resolver.ts**

```ts
// lib/panorama-resolver.ts

/**
 * Extracts the redirect URL from a DJI panorama HTML file.
 * DJI writes: <meta http-equiv="refresh" content="0;url=../PANORAMA/100_0255/">
 */
export function parsePanoramaRedirectUrl(html: string): string | null {
  const match = html.match(/http-equiv=["']refresh["'][^>]*content=["'][^"']*;\s*url=([^"']+)/i)
  return match ? match[1].trim() : null
}

/**
 * Resolves a relative path against a base directory path.
 * Both arguments use forward slashes (matching webkitRelativePath).
 * Trailing slashes in `relative` are stripped from the result.
 */
export function resolveRelativePath(baseDir: string, relative: string): string {
  const parts = baseDir.split('/')
  const relParts = relative.replace(/\/$/, '').split('/')
  for (const part of relParts) {
    if (part === '..') {
      parts.pop()
    } else if (part !== '.') {
      parts.push(part)
    }
  }
  return parts.join('/')
}

/**
 * Finds all tile files for a panorama.
 * @param htmlFile  The .html pointer file
 * @param htmlContent  Text content of the HTML file
 * @param allFiles  All files from the folder input
 */
export function collectPanoramaTiles(
  htmlFile: File,
  htmlContent: string,
  allFiles: File[]
): File[] {
  const redirectUrl = parsePanoramaRedirectUrl(htmlContent)
  if (!redirectUrl) return []

  const htmlPath = (htmlFile as File & { webkitRelativePath: string }).webkitRelativePath
  const htmlDir = htmlPath.substring(0, htmlPath.lastIndexOf('/'))
  const tileFolder = resolveRelativePath(htmlDir, redirectUrl)

  return allFiles.filter((f) => {
    const rel = (f as File & { webkitRelativePath: string }).webkitRelativePath
    return rel.startsWith(tileFolder + '/')
  })
}
```

- [ ] **Step 4: Run tests — expect all pass**

```bash
bun test
```

Expected: 6 passing tests, 0 failing.

- [ ] **Step 5: Commit**

```bash
git add lib/panorama-resolver.ts lib/__tests__/panorama-resolver.test.ts
git commit -m "feat: panorama path resolver with tests"
```

---

## Task 4: HDR bracket detector (TDD)

**Files:**
- Create: `lib/hdr-detector.ts`
- Create: `lib/__tests__/hdr-detector.test.ts`

- [ ] **Step 1: Create test file**

```ts
// lib/__tests__/hdr-detector.test.ts
import { describe, it, expect } from 'vitest'
import { groupIntoBrackets } from '../hdr-detector'
import type { JpgWithExif } from '../hdr-detector'
import type { PhotoItem, HdrItem } from '../media-types'

function makeJpg(
  name: string,
  isoDate: string,
  bias: number | undefined,
  xpType?: string
): JpgWithExif {
  const file = Object.assign(new File([], name), { webkitRelativePath: `root/${name}` })
  return {
    file,
    dateTimeOriginal: new Date(isoDate),
    exposureBiasValue: bias,
    xpCommentType: xpType,
  }
}

describe('groupIntoBrackets', () => {
  it('returns a standalone photo when DateTimeOriginal is unique', () => {
    const items = [makeJpg('DJI_0001.JPG', '2024-01-01T10:00:00Z', 0)]
    const result = groupIntoBrackets(items)
    expect(result).toHaveLength(1)
    expect(result[0].type).toBe('photo')
  })

  it('groups 3 files with same timestamp into an HDR item', () => {
    const ts = '2024-01-01T10:00:01Z'
    const items = [
      makeJpg('DJI_0010.JPG', ts, -0.333),
      makeJpg('DJI_0011.JPG', ts, 0.333),
      makeJpg('DJI_0012.JPG', ts, 1.0),
    ]
    const result = groupIntoBrackets(items)
    expect(result).toHaveLength(1)
    expect(result[0].type).toBe('hdr')
    const hdr = result[0] as HdrItem
    // files sorted ascending by ExposureBiasValue
    expect(hdr.files[0]).toBe(items[0].file) // -0.333 (under)
    expect(hdr.files[2]).toBe(items[2].file) // +1.0 (over)
  })

  it('picks middle exposure as the file with ExposureBiasValue closest to 0', () => {
    const ts = '2024-01-01T10:00:02Z'
    const items = [
      makeJpg('DJI_0013.JPG', ts, -0.333),
      makeJpg('DJI_0014.JPG', ts, 0.333),
      makeJpg('DJI_0015.JPG', ts, 1.0),
    ]
    const result = groupIntoBrackets(items)
    const hdr = result[0] as HdrItem
    // 0.333 is closer to 0 than -0.333 (both equal in abs — pick first)
    expect(hdr.middle).toBe(items[0].file) // |−0.333| == |+0.333|, first wins
  })

  it('handles 1-second boundary: merges consecutive files straddling a second', () => {
    const items = [
      makeJpg('DJI_0020.JPG', '2024-01-01T10:00:59Z', -0.333),
      makeJpg('DJI_0021.JPG', '2024-01-01T10:01:00Z', 0.333),
      makeJpg('DJI_0022.JPG', '2024-01-01T10:01:00Z', 1.0),
    ]
    const result = groupIntoBrackets(items)
    expect(result).toHaveLength(1)
    expect(result[0].type).toBe('hdr')
    expect((result[0] as HdrItem).files).toHaveLength(3)
  })

  it('excludes files with XPComment Type=P (panorama tiles)', () => {
    const items = [
      makeJpg('DJI_0001.JPG', '2024-01-01T10:00:00Z', 0, 'P'),
      makeJpg('DJI_0002.JPG', '2024-01-01T10:00:00Z', 0, 'P'),
    ]
    const result = groupIntoBrackets(items)
    expect(result).toHaveLength(0)
  })

  it('returns mixed photos and HDR sets when timestamps vary', () => {
    const hdrTs = '2024-01-01T10:00:00Z'
    const items = [
      makeJpg('DJI_0001.JPG', '2024-01-01T09:00:00Z', 0),   // standalone
      makeJpg('DJI_0010.JPG', hdrTs, -0.333),                // HDR
      makeJpg('DJI_0011.JPG', hdrTs, 0.333),                 // HDR
      makeJpg('DJI_0012.JPG', hdrTs, 1.0),                   // HDR
      makeJpg('DJI_0020.JPG', '2024-01-01T11:00:00Z', 0),   // standalone
    ]
    const result = groupIntoBrackets(items)
    expect(result).toHaveLength(3)
    expect(result[0].type).toBe('photo')
    expect(result[1].type).toBe('hdr')
    expect(result[2].type).toBe('photo')
  })

  it('groups 2 files with same timestamp as HDR (not all brackets required)', () => {
    const ts = '2024-01-01T10:00:03Z'
    const items = [
      makeJpg('DJI_0030.JPG', ts, -0.333),
      makeJpg('DJI_0031.JPG', ts, 1.0),
    ]
    const result = groupIntoBrackets(items)
    expect(result).toHaveLength(1)
    expect(result[0].type).toBe('hdr')
    expect((result[0] as HdrItem).files).toHaveLength(2)
  })
})
```

- [ ] **Step 2: Run tests — expect failures**

```bash
bun test
```

Expected: 7 failing tests (module not found).

- [ ] **Step 3: Implement lib/hdr-detector.ts**

```ts
// lib/hdr-detector.ts
import type { PhotoItem, HdrItem } from './media-types'

export interface JpgWithExif {
  file: File
  dateTimeOriginal: Date | undefined
  exposureBiasValue: number | undefined
  /** Value of XPComment.Type field — 'P' means panorama tile, exclude from HDR logic */
  xpCommentType: string | undefined
}

/**
 * Groups JPG files (pre-sorted by filename) into PhotoItems and HdrItems.
 *
 * Rules:
 * - Files with xpCommentType === 'P' are excluded entirely.
 * - Consecutive files (adjacent in sort order) are merged into the same
 *   bracket group if they share the same DateTimeOriginal OR their timestamps
 *   differ by exactly 1 second.
 * - Groups of 2–3 become HdrItems; groups of 1 become PhotoItems.
 * - Within an HdrItem, `files` are sorted ascending by ExposureBiasValue.
 *   `middle` is the file with ExposureBiasValue closest to 0.
 */
export function groupIntoBrackets(items: JpgWithExif[]): (PhotoItem | HdrItem)[] {
  // Exclude panorama tiles
  const eligible = items.filter((item) => item.xpCommentType !== 'P')
  if (eligible.length === 0) return []

  // Group consecutive items by timestamp proximity
  const groups: JpgWithExif[][] = []
  let current: JpgWithExif[] = [eligible[0]]

  for (let i = 1; i < eligible.length; i++) {
    const prev = current[current.length - 1]
    const curr = eligible[i]
    const prevTs = prev.dateTimeOriginal?.getTime()
    const currTs = curr.dateTimeOriginal?.getTime()

    const sameTimestamp =
      prevTs !== undefined && currTs !== undefined && prevTs === currTs
    const oneSecondBoundary =
      prevTs !== undefined &&
      currTs !== undefined &&
      Math.abs(currTs - prevTs) === 1000

    if ((sameTimestamp || oneSecondBoundary) && current.length < 3) {
      current.push(curr)
    } else {
      groups.push(current)
      current = [curr]
    }
  }
  groups.push(current)

  return groups.map((group): PhotoItem | HdrItem => {
    if (group.length === 1) {
      return { type: 'photo', file: group[0].file }
    }

    // Sort by ExposureBiasValue ascending (undefined bias goes last)
    const sorted = [...group].sort((a, b) => {
      const aBias = a.exposureBiasValue ?? Infinity
      const bBias = b.exposureBiasValue ?? Infinity
      return aBias - bBias
    })

    // Middle = file with ExposureBiasValue closest to 0
    const middle = sorted.reduce((best, candidate) => {
      const bestDist = Math.abs(best.exposureBiasValue ?? Infinity)
      const candDist = Math.abs(candidate.exposureBiasValue ?? Infinity)
      return candDist < bestDist ? candidate : best
    })

    return {
      type: 'hdr',
      files: sorted.map((s) => s.file),
      middle: middle.file,
    }
  })
}
```

- [ ] **Step 4: Run tests — expect all pass**

```bash
bun test
```

Expected: 7 passing tests, 0 failing.

- [ ] **Step 5: Commit**

```bash
git add lib/hdr-detector.ts lib/__tests__/hdr-detector.test.ts
git commit -m "feat: HDR bracket detector with tests"
```

---

## Task 5: Media parser orchestrator

**Files:**
- Create: `lib/media-parser.ts`

- [ ] **Step 1: Create lib/media-parser.ts**

```ts
// lib/media-parser.ts
// NOTE: This module uses browser APIs (File, exifr). Call only from Client Components.
import exifr from 'exifr'
import type { MediaItem, VideoItem } from './media-types'
import { collectPanoramaTiles } from './panorama-resolver'
import { groupIntoBrackets } from './hdr-detector'
import type { JpgWithExif } from './hdr-detector'

const VIDEO_EXTS = new Set(['.mp4', '.mov'])
const JPG_EXTS = new Set(['.jpg', '.jpeg'])

function ext(file: File): string {
  return file.name.slice(file.name.lastIndexOf('.')).toLowerCase()
}

/**
 * Parses a raw XPComment value from exifr.
 * DJI encodes it as a semicolon-separated key=value string, e.g. "Type=P;...".
 * Returns the value of the `Type` key, or undefined if not found.
 */
function parseXpCommentType(raw: unknown): string | undefined {
  if (typeof raw !== 'string') return undefined
  const match = raw.match(/Type=([^;]+)/i)
  return match ? match[1].trim() : undefined
}

export async function parseMediaFiles(files: File[]): Promise<MediaItem[]> {
  const allFiles = Array.from(files)

  // Partition by type
  const videos: File[] = []
  const jpgs: File[] = []
  const htmls: File[] = []

  for (const file of allFiles) {
    const e = ext(file)
    if (VIDEO_EXTS.has(e)) videos.push(file)
    else if (JPG_EXTS.has(e)) jpgs.push(file)
    else if (e === '.html') htmls.push(file)
  }

  // Sort JPGs by filename (preserves capture order)
  jpgs.sort((a, b) => a.name.localeCompare(b.name))

  // Read EXIF for all JPGs in one batch
  const exifResults = await Promise.all(
    jpgs.map((file) =>
      exifr
        .parse(file, {
          pick: ['DateTimeOriginal', 'ExposureBiasValue', 'XPComment'],
        })
        .catch(() => null)
    )
  )

  const jpgsWithExif: JpgWithExif[] = jpgs.map((file, i) => {
    const exif = exifResults[i]
    return {
      file,
      dateTimeOriginal: exif?.DateTimeOriginal instanceof Date
        ? exif.DateTimeOriginal
        : undefined,
      exposureBiasValue:
        typeof exif?.ExposureBiasValue === 'number' ? exif.ExposureBiasValue : undefined,
      xpCommentType: parseXpCommentType(exif?.XPComment),
    }
  })

  // Resolve panoramas — read HTML file text, find tiles
  const panoramaItems = await Promise.all(
    htmls.map(async (htmlFile) => {
      const html = await htmlFile.text()
      const tiles = collectPanoramaTiles(htmlFile, html, allFiles)
      return { type: 'panorama' as const, htmlFile, tiles }
    })
  )

  // Collect file paths used as panorama tiles so we can exclude them from HDR logic
  const panoramaTilePaths = new Set(
    panoramaItems.flatMap((p) =>
      p.tiles.map(
        (f) => (f as File & { webkitRelativePath: string }).webkitRelativePath
      )
    )
  )

  // Filter out panorama tile JPGs before HDR detection (belt-and-suspenders alongside XPComment check)
  const nonTileJpgs = jpgsWithExif.filter(
    (item) =>
      !panoramaTilePaths.has(
        (item.file as File & { webkitRelativePath: string }).webkitRelativePath
      )
  )

  const photoAndHdrItems = groupIntoBrackets(nonTileJpgs)

  const videoItems: VideoItem[] = videos.map((file) => ({ type: 'video', file }))

  return [...videoItems, ...photoAndHdrItems, ...panoramaItems]
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
bun run build 2>&1 | head -30
```

Expected: either a clean build or only pre-existing Next.js scaffold errors (not type errors from the new files).

- [ ] **Step 3: Commit**

```bash
git add lib/media-parser.ts
git commit -m "feat: media parser orchestrator"
```

---

## Task 6: FolderPicker component

**Files:**
- Create: `components/FolderPicker.tsx`

- [ ] **Step 1: Create components/FolderPicker.tsx**

```tsx
// components/FolderPicker.tsx
'use client'

import { useRef } from 'react'

interface FolderPickerProps {
  onFiles: (files: File[]) => void
}

export default function FolderPicker({ onFiles }: FolderPickerProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files) {
      onFiles(Array.from(e.target.files))
    }
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        // @ts-expect-error — webkitdirectory is not in React's typings
        webkitdirectory=""
        multiple
        className="d-none"
        onChange={handleChange}
      />
      <button
        className="btn btn-primary btn-lg"
        onClick={() => inputRef.current?.click()}
      >
        Open Folder
      </button>
    </>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add components/FolderPicker.tsx
git commit -m "feat: FolderPicker component"
```

---

## Task 7: Card components

**Files:**
- Create: `components/cards/VideoCard.tsx`
- Create: `components/cards/PhotoCard.tsx`
- Create: `components/cards/HdrCard.tsx`
- Create: `components/cards/PanoramaCard.tsx`

- [ ] **Step 1: Create components/cards/VideoCard.tsx**

```tsx
// components/cards/VideoCard.tsx
'use client'

import { useMemo } from 'react'
import type { VideoItem } from '@/lib/media-types'

export default function VideoCard({ item }: { item: VideoItem }) {
  const url = useMemo(() => URL.createObjectURL(item.file), [item.file])

  return (
    <div className="card h-100">
      <video
        src={url}
        controls
        className="card-img-top"
        style={{ maxHeight: '200px', objectFit: 'cover' }}
      />
      <div className="card-body p-2">
        <span className="badge bg-secondary me-1">VIDEO</span>
        <small className="text-muted">{item.file.name}</small>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Create components/cards/PhotoCard.tsx**

```tsx
// components/cards/PhotoCard.tsx
'use client'

import { useMemo } from 'react'
import type { PhotoItem } from '@/lib/media-types'

export default function PhotoCard({ item }: { item: PhotoItem }) {
  const url = useMemo(() => URL.createObjectURL(item.file), [item.file])

  return (
    <div className="card h-100">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={url}
        alt={item.file.name}
        className="card-img-top"
        style={{ height: '200px', objectFit: 'cover' }}
      />
      <div className="card-body p-2">
        <span className="badge bg-success me-1">PHOTO</span>
        <small className="text-muted">{item.file.name}</small>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Create components/cards/HdrCard.tsx**

```tsx
// components/cards/HdrCard.tsx
'use client'

// TODO: Replace middle-exposure preview with OpenCV.js createMergeMertens exposure fusion.
// See: https://docs.opencv.org/4.x/d6/df5/group__photo__hdr.html
// cv.MergeMertens accepts an array of Mat images and produces a blended result.
// OpenCV.js is ~9MB WASM — defer until HDR quality becomes a priority.

import { useMemo } from 'react'
import type { HdrItem } from '@/lib/media-types'

export default function HdrCard({ item }: { item: HdrItem }) {
  const url = useMemo(() => URL.createObjectURL(item.middle), [item.middle])

  return (
    <div className="card h-100 border-warning">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={url}
        alt={item.middle.name}
        className="card-img-top"
        style={{ height: '200px', objectFit: 'cover' }}
      />
      <div className="card-body p-2">
        <span className="badge bg-warning text-dark me-1">HDR</span>
        <span className="badge bg-warning text-dark me-1" title="Full HDR blend not yet implemented">
          preview only
        </span>
        <br />
        <small className="text-muted">
          {item.files.length} exposures · middle: {item.middle.name}
        </small>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Create components/cards/PanoramaCard.tsx**

```tsx
// components/cards/PanoramaCard.tsx
'use client'

import { useMemo } from 'react'
import type { PanoramaItem } from '@/lib/media-types'

export default function PanoramaCard({ item }: { item: PanoramaItem }) {
  const tileUrls = useMemo(
    () => item.tiles.map((f) => URL.createObjectURL(f)),
    [item.tiles]
  )

  return (
    <div className="card h-100">
      <div className="card-header p-2">
        <span className="badge bg-info text-dark me-1">PANORAMA</span>
        <small className="text-muted">
          {item.htmlFile.name} · {item.tiles.length} tiles
        </small>
      </div>
      <div className="card-body p-2">
        <div className="row row-cols-4 g-1">
          {tileUrls.map((url, i) => (
            <div key={i} className="col">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={url}
                alt={`tile ${i + 1}`}
                className="img-fluid"
                style={{ height: '60px', objectFit: 'cover', width: '100%' }}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 5: Commit**

```bash
git add components/cards/
git commit -m "feat: VideoCard, PhotoCard, HdrCard, PanoramaCard components"
```

---

## Task 8: FilterTabs and MediaGrid

**Files:**
- Create: `components/FilterTabs.tsx`
- Create: `components/MediaGrid.tsx`

- [ ] **Step 1: Create components/FilterTabs.tsx**

```tsx
// components/FilterTabs.tsx
'use client'

import type { MediaItem } from '@/lib/media-types'

export type FilterType = 'all' | 'video' | 'photo' | 'hdr' | 'panorama'

interface FilterTabsProps {
  items: MediaItem[]
  active: FilterType
  onChange: (filter: FilterType) => void
}

const TABS: { key: FilterType; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'video', label: 'Videos' },
  { key: 'photo', label: 'Photos' },
  { key: 'hdr', label: 'HDR' },
  { key: 'panorama', label: 'Panoramas' },
]

export default function FilterTabs({ items, active, onChange }: FilterTabsProps) {
  function count(type: FilterType) {
    if (type === 'all') return items.length
    return items.filter((i) => i.type === type).length
  }

  return (
    <ul className="nav nav-tabs mb-3">
      {TABS.map(({ key, label }) => (
        <li key={key} className="nav-item">
          <button
            className={`nav-link${active === key ? ' active' : ''}`}
            onClick={() => onChange(key)}
          >
            {label}{' '}
            <span className="badge bg-secondary">{count(key)}</span>
          </button>
        </li>
      ))}
    </ul>
  )
}
```

- [ ] **Step 2: Create components/MediaGrid.tsx**

```tsx
// components/MediaGrid.tsx
'use client'

import type { MediaItem } from '@/lib/media-types'
import type { FilterType } from './FilterTabs'
import VideoCard from './cards/VideoCard'
import PhotoCard from './cards/PhotoCard'
import HdrCard from './cards/HdrCard'
import PanoramaCard from './cards/PanoramaCard'

interface MediaGridProps {
  items: MediaItem[]
  filter: FilterType
}

export default function MediaGrid({ items, filter }: MediaGridProps) {
  const visible = filter === 'all' ? items : items.filter((i) => i.type === filter)

  if (visible.length === 0) {
    return <p className="text-muted">No items to display.</p>
  }

  return (
    <div className="row row-cols-1 row-cols-sm-2 row-cols-md-3 row-cols-lg-4 g-3">
      {visible.map((item, idx) => (
        <div key={idx} className="col">
          {item.type === 'video' && <VideoCard item={item} />}
          {item.type === 'photo' && <PhotoCard item={item} />}
          {item.type === 'hdr' && <HdrCard item={item} />}
          {item.type === 'panorama' && <PanoramaCard item={item} />}
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add components/FilterTabs.tsx components/MediaGrid.tsx
git commit -m "feat: FilterTabs and MediaGrid components"
```

---

## Task 9: Main page assembly

**Files:**
- Modify: `app/page.tsx`
- Delete content: `app/page.module.css`

- [ ] **Step 1: Replace app/page.tsx**

```tsx
// app/page.tsx
'use client'

import { useState } from 'react'
import type { MediaItem } from '@/lib/media-types'
import { parseMediaFiles } from '@/lib/media-parser'
import FolderPicker from '@/components/FolderPicker'
import FilterTabs, { type FilterType } from '@/components/FilterTabs'
import MediaGrid from '@/components/MediaGrid'

export default function Page() {
  const [items, setItems] = useState<MediaItem[] | null>(null)
  const [folderName, setFolderName] = useState<string>('')
  const [filter, setFilter] = useState<FilterType>('all')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleFiles(files: File[]) {
    if (files.length === 0) return

    // Derive folder name from the first file's webkitRelativePath
    const firstPath = (files[0] as File & { webkitRelativePath: string }).webkitRelativePath
    setFolderName(firstPath.split('/')[0] ?? 'Unknown folder')
    setFilter('all')
    setLoading(true)
    setError(null)

    try {
      const parsed = await parseMediaFiles(files)
      setItems(parsed)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to parse media files.')
    } finally {
      setLoading(false)
    }
  }

  // ── Empty state ──────────────────────────────────────────────────────────
  if (!items && !loading) {
    return (
      <div className="d-flex flex-column align-items-center justify-content-center vh-100">
        <h1 className="mb-3">DJI Media Viewer</h1>
        <p className="text-muted mb-4">Select your drone SD card folder to get started.</p>
        <FolderPicker onFiles={handleFiles} />
      </div>
    )
  }

  // ── Loading state ────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="d-flex flex-column align-items-center justify-content-center vh-100">
        <div className="spinner-border text-primary mb-3" role="status" />
        <p className="text-muted">Reading media files…</p>
      </div>
    )
  }

  // ── Error state ──────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="d-flex flex-column align-items-center justify-content-center vh-100">
        <div className="alert alert-danger">{error}</div>
        <FolderPicker onFiles={handleFiles} />
      </div>
    )
  }

  // ── Loaded state ─────────────────────────────────────────────────────────
  return (
    <div>
      <nav className="navbar navbar-light bg-light border-bottom mb-4">
        <div className="container-fluid">
          <span className="navbar-brand mb-0 h1">DJI Media Viewer</span>
          <span className="text-muted small me-auto ms-3">
            {folderName} · {items!.length} items
          </span>
          <FolderPicker onFiles={handleFiles} />
        </div>
      </nav>

      <div className="container-fluid">
        <FilterTabs items={items!} active={filter} onChange={setFilter} />
        <MediaGrid items={items!} filter={filter} />
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Empty out app/page.module.css**

```css
/* app/page.module.css — unused */
```

- [ ] **Step 3: Run the dev server and manually verify**

```bash
bun dev
```

Open http://localhost:3000 and verify:
- Empty state renders with "Open Folder" button
- Selecting a drone SD card folder shows the loading spinner then the media grid
- Filter tabs show correct counts
- Videos play inline
- Photos display with thumbnail
- HDR cards show amber "preview only" badge and middle exposure image
- Panorama cards show tile grid

- [ ] **Step 4: Run tests one final time**

```bash
bun test
```

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add app/page.tsx app/page.module.css
git commit -m "feat: main page — wires FolderPicker, FilterTabs, MediaGrid"
```
