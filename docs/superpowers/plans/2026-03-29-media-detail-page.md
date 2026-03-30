# Media Detail Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `/media/[index]` detail page that shows a selected media item at full size with rich metadata (EXIF, mp4box.js codec info, DJI flight data).

**Architecture:** A `MediaContext` provider wraps the whole app and holds the parsed `MediaItem[]` array. Gallery card clicks navigate to `/media/[index]` via `router.push`. The detail page reads the index from `useParams()`, looks up the item in context, and renders the appropriate detail component. If context is empty (page refresh), it redirects to `/`.

**Tech Stack:** Next.js 16 App Router, React Context, Bootstrap 5, `exifr` (already installed), `mp4box` (to install)

---

## File Map

**New files:**
- `lib/media-context.tsx` — MediaContext + MediaProvider + useMediaContext hook
- `lib/dji-xp-comment.ts` — parse DJI XPComment key=value string into a typed object
- `lib/__tests__/dji-xp-comment.test.ts` — tests for XPComment parser
- `components/detail/format.ts` — formatBytes, formatDate, formatShutter helpers
- `lib/__tests__/format.test.ts` — tests for format helpers
- `components/detail/MetaTile.tsx` — shared metadata tile component
- `components/detail/DetailNav.tsx` — shared navbar (back button + filename + badge)
- `components/detail/PhotoDetail.tsx` — full-res img + EXIF + DJI flight data
- `components/detail/VideoDetail.tsx` — video player + mp4box.js codec info
- `components/detail/HdrDetail.tsx` — middle-exposure img + bracket set + EXIF
- `components/detail/PanoramaDetail.tsx` — iframe DJI viewer + tile info
- `app/media/[index]/page.tsx` — client detail page; dispatches to the right detail component

**Modified files:**
- `app/layout.tsx` — wrap `{children}` in `<MediaProvider>`
- `app/page.tsx` — read `setItems` from context; pass `onSelect` to MediaGrid
- `components/MediaGrid.tsx` — accept `onSelect: (index: number) => void` prop
- `components/cards/VideoCard.tsx` — accept and forward `onClick` prop
- `components/cards/PhotoCard.tsx` — accept and forward `onClick` prop
- `components/cards/HdrCard.tsx` — accept and forward `onClick` prop
- `components/cards/PanoramaCard.tsx` — accept and forward `onClick` prop

---

## Task 1: Install mp4box

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install mp4box**

```bash
cd /home/alban/Documents/coding/dji-media-viewer && npm install mp4box
```

Expected: `mp4box` added to `node_modules` and `package.json` dependencies.

- [ ] **Step 2: Verify types are available**

```bash
ls node_modules/mp4box/*.d.ts 2>/dev/null || echo "no bundled types"
```

If no bundled types, create `mp4box.d.ts` in the repo root (step 3). Otherwise skip step 3.

- [ ] **Step 3: (Only if no bundled types) Create minimal type declaration**

Create `mp4box.d.ts` in the project root:

```typescript
declare module 'mp4box' {
  interface VideoTrackInfo {
    codec: string
    bitrate: number
    nb_samples: number
    duration: number
    timescale: number
    video: { width: number; height: number }
  }
  interface AudioTrackInfo {
    codec: string
    bitrate: number
  }
  interface MP4Info {
    duration: number
    timescale: number
    videoTracks: VideoTrackInfo[]
    audioTracks: AudioTrackInfo[]
    created?: Date
    brands?: string[]
  }
  interface MP4File {
    onReady: (info: MP4Info) => void
    onError: (e: string) => void
    appendBuffer(buffer: ArrayBuffer & { fileStart: number }): void
    flush(): void
  }
  function createFile(): MP4File
  export default { createFile }
}
```

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json mp4box.d.ts
git commit -m "chore: install mp4box for video metadata parsing"
```

---

## Task 2: DJI XPComment parser + format helpers

**Files:**
- Create: `lib/dji-xp-comment.ts`
- Create: `lib/__tests__/dji-xp-comment.test.ts`
- Create: `components/detail/format.ts`
- Create: `lib/__tests__/format.test.ts`

- [ ] **Step 1: Write the failing XPComment tests**

Create `lib/__tests__/dji-xp-comment.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { parseXpComment } from '../dji-xp-comment'

describe('parseXpComment', () => {
  it('returns empty object for undefined input', () => {
    expect(parseXpComment(undefined)).toEqual({})
  })

  it('returns empty object for empty string', () => {
    expect(parseXpComment('')).toEqual({})
  })

  it('parses a full DJI XPComment string', () => {
    const raw =
      'Type=P;AbsoluteAltitude=+0120.25;RelativeAltitude=+0095.10;' +
      'GimbalRollDegree=+0.00;GimbalYawDegree=+0012.40;GimbalPitchDegree=-0090.00;' +
      'FlightRollDegree=+0.00;FlightYawDegree=+0014.20;FlightPitchDegree=+0.00;' +
      'FlightXSpeed=+0.0;FlightYSpeed=+0.0;FlightZSpeed=+0.0;CamReverse=0;GimbalReverse=0'

    const result = parseXpComment(raw)
    expect(result.AbsoluteAltitude).toBe('+0120.25')
    expect(result.RelativeAltitude).toBe('+0095.10')
    expect(result.GimbalPitchDegree).toBe('-0090.00')
    expect(result.GimbalYawDegree).toBe('+0012.40')
    expect(result.FlightYawDegree).toBe('+0014.20')
    expect(result.Type).toBe('P')
  })

  it('ignores malformed pairs', () => {
    const result = parseXpComment('Good=Value;BadEntry;=NoKey')
    expect(result.Good).toBe('Value')
    expect(Object.keys(result)).toHaveLength(1)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test -- lib/__tests__/dji-xp-comment.test.ts
```

Expected: FAIL — `../dji-xp-comment` not found.

- [ ] **Step 3: Create `lib/dji-xp-comment.ts`**

```typescript
// lib/dji-xp-comment.ts

export interface DjiFlightData {
  Type?: string
  AbsoluteAltitude?: string
  RelativeAltitude?: string
  GimbalRollDegree?: string
  GimbalYawDegree?: string
  GimbalPitchDegree?: string
  FlightRollDegree?: string
  FlightYawDegree?: string
  FlightPitchDegree?: string
  FlightXSpeed?: string
  FlightYSpeed?: string
  FlightZSpeed?: string
  CamReverse?: string
  GimbalReverse?: string
}

/**
 * Parses a DJI XPComment string of the form "Key=Value;Key2=Value2;..."
 * into a typed object. Unknown keys are ignored.
 */
export function parseXpComment(raw: string | undefined): DjiFlightData {
  if (!raw) return {}
  const result: Record<string, string> = {}
  for (const pair of raw.split(';')) {
    const eq = pair.indexOf('=')
    if (eq <= 0) continue
    const key = pair.slice(0, eq).trim()
    const value = pair.slice(eq + 1).trim()
    if (key) result[key] = value
  }
  return result as DjiFlightData
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test -- lib/__tests__/dji-xp-comment.test.ts
```

Expected: PASS (4 tests).

- [ ] **Step 5: Write the failing format helper tests**

Create `lib/__tests__/format.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { formatBytes, formatShutter, formatDate } from '../../components/detail/format'

describe('formatBytes', () => {
  it('formats bytes', () => expect(formatBytes(512)).toBe('512 B'))
  it('formats KB', () => expect(formatBytes(2048)).toBe('2.0 KB'))
  it('formats MB', () => expect(formatBytes(4.2 * 1024 * 1024)).toBe('4.2 MB'))
  it('formats GB', () => expect(formatBytes(1.2 * 1024 ** 3)).toBe('1.20 GB'))
})

describe('formatShutter', () => {
  it('formats sub-second shutter speeds as fractions', () => {
    expect(formatShutter(1 / 1000)).toBe('1/1000 s')
    expect(formatShutter(1 / 250)).toBe('1/250 s')
  })
  it('formats whole-second shutter speeds', () => {
    expect(formatShutter(2)).toBe('2 s')
  })
})

describe('formatDate', () => {
  it('returns a non-empty string for a valid Date', () => {
    const result = formatDate(new Date('2024-03-15T10:32:00'))
    expect(typeof result).toBe('string')
    expect(result.length).toBeGreaterThan(0)
  })
})
```

- [ ] **Step 6: Run tests to verify they fail**

```bash
npm test -- lib/__tests__/format.test.ts
```

Expected: FAIL — `../../components/detail/format` not found.

- [ ] **Step 7: Create `components/detail/format.ts`**

```typescript
// components/detail/format.ts

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 ** 3) return `${(bytes / 1024 / 1024).toFixed(1)} MB`
  return `${(bytes / 1024 ** 3).toFixed(2)} GB`
}

export function formatShutter(seconds: number): string {
  if (seconds >= 1) return `${seconds} s`
  return `1/${Math.round(1 / seconds)} s`
}

export function formatDate(d: Date): string {
  return d.toLocaleString()
}
```

- [ ] **Step 8: Run tests to verify they pass**

```bash
npm test -- lib/__tests__/format.test.ts
```

Expected: PASS (6 tests).

- [ ] **Step 9: Commit**

```bash
git add lib/dji-xp-comment.ts lib/__tests__/dji-xp-comment.test.ts \
        components/detail/format.ts lib/__tests__/format.test.ts
git commit -m "feat: DJI XPComment parser and detail page format helpers"
```

---

## Task 3: MediaContext

**Files:**
- Create: `lib/media-context.tsx`

- [ ] **Step 1: Create `lib/media-context.tsx`**

```tsx
// lib/media-context.tsx
'use client'

import { createContext, useContext, useState } from 'react'
import type { ReactNode } from 'react'
import type { MediaItem } from './media-types'

interface MediaContextValue {
  items: MediaItem[] | null
  setItems: (items: MediaItem[]) => void
}

const MediaContext = createContext<MediaContextValue | null>(null)

export function MediaProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<MediaItem[] | null>(null)
  return (
    <MediaContext.Provider value={{ items, setItems }}>
      {children}
    </MediaContext.Provider>
  )
}

export function useMediaContext(): MediaContextValue {
  const ctx = useContext(MediaContext)
  if (!ctx) throw new Error('useMediaContext must be used inside <MediaProvider>')
  return ctx
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/media-context.tsx
git commit -m "feat: MediaContext provider for sharing parsed media items across routes"
```

---

## Task 4: Wrap layout in MediaProvider

**Files:**
- Modify: `app/layout.tsx`

- [ ] **Step 1: Update `app/layout.tsx`**

Replace the entire file with:

```tsx
// app/layout.tsx
import type { Metadata } from 'next'
import 'bootstrap/dist/css/bootstrap.min.css'
import './globals.css'
import { MediaProvider } from '@/lib/media-context'

export const metadata: Metadata = {
  title: 'DJI Media Viewer',
  description: 'View drone footage from your SD card',
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <MediaProvider>{children}</MediaProvider>
      </body>
    </html>
  )
}
```

- [ ] **Step 2: Run the dev server briefly to confirm it compiles**

```bash
npm run build 2>&1 | tail -20
```

Expected: build succeeds with no errors.

- [ ] **Step 3: Commit**

```bash
git add app/layout.tsx
git commit -m "feat: wrap app in MediaProvider"
```

---

## Task 5: Wire page.tsx to context and navigation

**Files:**
- Modify: `app/page.tsx`

- [ ] **Step 1: Update `app/page.tsx`**

Replace the entire file with:

```tsx
// app/page.tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { MediaItem } from '@/lib/media-types'
import { parseMediaFiles } from '@/lib/media-parser'
import { useMediaContext } from '@/lib/media-context'
import FolderPicker from '@/components/FolderPicker'
import FilterTabs, { type FilterType } from '@/components/FilterTabs'
import MediaGrid from '@/components/MediaGrid'

export default function Page() {
  const { items, setItems } = useMediaContext()
  const [folderName, setFolderName] = useState<string>('')
  const [filter, setFilter] = useState<FilterType>('all')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  async function handleFiles(files: File[]) {
    if (files.length === 0) return
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

  function handleSelect(index: number) {
    router.push(`/media/${index}`)
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
        <MediaGrid items={items!} filter={filter} onSelect={handleSelect} />
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add app/page.tsx
git commit -m "feat: wire page.tsx to MediaContext and add card click navigation"
```

---

## Task 6: Make MediaGrid and cards clickable

**Files:**
- Modify: `components/MediaGrid.tsx`
- Modify: `components/cards/VideoCard.tsx`
- Modify: `components/cards/PhotoCard.tsx`
- Modify: `components/cards/HdrCard.tsx`
- Modify: `components/cards/PanoramaCard.tsx`

- [ ] **Step 1: Update `components/MediaGrid.tsx`**

```tsx
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
  onSelect: (index: number) => void
}

export default function MediaGrid({ items, filter, onSelect }: MediaGridProps) {
  const visible = filter === 'all'
    ? items.map((item, idx) => ({ item, idx }))
    : items.map((item, idx) => ({ item, idx })).filter(({ item }) => item.type === filter)

  if (visible.length === 0) {
    return <p className="text-muted">No items to display.</p>
  }

  return (
    <div className="row row-cols-1 row-cols-sm-2 row-cols-md-3 row-cols-lg-4 g-3">
      {visible.map(({ item, idx }) => (
        <div key={idx} className="col">
          {item.type === 'video' && <VideoCard item={item} onClick={() => onSelect(idx)} />}
          {item.type === 'photo' && <PhotoCard item={item} onClick={() => onSelect(idx)} />}
          {item.type === 'hdr' && <HdrCard item={item} onClick={() => onSelect(idx)} />}
          {item.type === 'panorama' && <PanoramaCard item={item} onClick={() => onSelect(idx)} />}
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 2: Update `components/cards/VideoCard.tsx`**

```tsx
// components/cards/VideoCard.tsx
'use client'

import { useEffect, useState } from 'react'
import type { VideoItem } from '@/lib/media-types'

export default function VideoCard({ item, onClick }: { item: VideoItem; onClick: () => void }) {
  const [url, setUrl] = useState<string>('')

  useEffect(() => {
    const objectUrl = URL.createObjectURL(item.file)
    setUrl(objectUrl)
    return () => URL.revokeObjectURL(objectUrl)
  }, [item.file])

  if (!url) return null

  return (
    <div className="card h-100" style={{ cursor: 'pointer' }} onClick={onClick}>
      <video
        src={url}
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

Note: `controls` removed from the gallery thumbnail — clicking plays the video *and* navigates. The full player with controls is on the detail page.

- [ ] **Step 3: Update `components/cards/PhotoCard.tsx`**

```tsx
// components/cards/PhotoCard.tsx
'use client'

import { useEffect, useState } from 'react'
import type { PhotoItem } from '@/lib/media-types'

export default function PhotoCard({ item, onClick }: { item: PhotoItem; onClick: () => void }) {
  const [url, setUrl] = useState<string>('')

  useEffect(() => {
    const objectUrl = URL.createObjectURL(item.file)
    setUrl(objectUrl)
    return () => URL.revokeObjectURL(objectUrl)
  }, [item.file])

  if (!url) return null

  return (
    <div className="card h-100" style={{ cursor: 'pointer' }} onClick={onClick}>
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

- [ ] **Step 4: Update `components/cards/HdrCard.tsx`**

```tsx
// components/cards/HdrCard.tsx
'use client'

import { useEffect, useState } from 'react'
import type { HdrItem } from '@/lib/media-types'

export default function HdrCard({ item, onClick }: { item: HdrItem; onClick: () => void }) {
  const [url, setUrl] = useState<string>('')

  useEffect(() => {
    const objectUrl = URL.createObjectURL(item.middle)
    setUrl(objectUrl)
    return () => URL.revokeObjectURL(objectUrl)
  }, [item.middle])

  if (!url) return null

  return (
    <div className="card h-100 border-warning" style={{ cursor: 'pointer' }} onClick={onClick}>
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

- [ ] **Step 5: Update `components/cards/PanoramaCard.tsx`**

```tsx
// components/cards/PanoramaCard.tsx
'use client'

import { useEffect, useState } from 'react'
import type { PanoramaItem } from '@/lib/media-types'

export default function PanoramaCard({ item, onClick }: { item: PanoramaItem; onClick: () => void }) {
  const [tileUrls, setTileUrls] = useState<string[]>([])

  useEffect(() => {
    const urls = item.tiles.map((f) => URL.createObjectURL(f))
    setTileUrls(urls)
    return () => urls.forEach((u) => URL.revokeObjectURL(u))
  }, [item.tiles])

  return (
    <div className="card h-100" style={{ cursor: 'pointer' }} onClick={onClick}>
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

- [ ] **Step 6: Build to confirm no type errors**

```bash
npm run build 2>&1 | tail -20
```

Expected: clean build.

- [ ] **Step 7: Commit**

```bash
git add components/MediaGrid.tsx components/cards/VideoCard.tsx \
        components/cards/PhotoCard.tsx components/cards/HdrCard.tsx \
        components/cards/PanoramaCard.tsx
git commit -m "feat: make gallery cards clickable with onSelect prop"
```

---

## Task 7: Shared detail components (DetailNav + MetaTile)

**Files:**
- Create: `components/detail/DetailNav.tsx`
- Create: `components/detail/MetaTile.tsx`

- [ ] **Step 1: Create `components/detail/DetailNav.tsx`**

```tsx
// components/detail/DetailNav.tsx
'use client'

import { useRouter } from 'next/navigation'
import type { ReactNode } from 'react'

interface DetailNavProps {
  filename: string
  badge: ReactNode
}

export default function DetailNav({ filename, badge }: DetailNavProps) {
  const router = useRouter()
  return (
    <nav className="navbar navbar-dark bg-dark border-bottom sticky-top">
      <div className="container-fluid">
        <button
          type="button"
          className="btn btn-outline-secondary btn-sm"
          onClick={() => router.back()}
        >
          ← Back to gallery
        </button>
        <span className="text-light ms-3 me-2">{filename}</span>
        {badge}
      </div>
    </nav>
  )
}
```

- [ ] **Step 2: Create `components/detail/MetaTile.tsx`**

```tsx
// components/detail/MetaTile.tsx

interface MetaTileProps {
  label: string
  value: string
}

export default function MetaTile({ label, value }: MetaTileProps) {
  return (
    <div className="col-6 col-md-4 col-lg-3">
      <div className="bg-light rounded p-2">
        <div
          className="text-muted"
          style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}
        >
          {label}
        </div>
        <div className="fw-semibold" style={{ fontSize: '0.875rem', wordBreak: 'break-all' }}>
          {value}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add components/detail/DetailNav.tsx components/detail/MetaTile.tsx
git commit -m "feat: shared DetailNav and MetaTile components"
```

---

## Task 8: PhotoDetail

**Files:**
- Create: `components/detail/PhotoDetail.tsx`

- [ ] **Step 1: Create `components/detail/PhotoDetail.tsx`**

```tsx
// components/detail/PhotoDetail.tsx
'use client'

import { useEffect, useState } from 'react'
import exifr from 'exifr'
import type { PhotoItem } from '@/lib/media-types'
import { parseXpComment } from '@/lib/dji-xp-comment'
import { formatBytes, formatDate, formatShutter } from './format'
import DetailNav from './DetailNav'
import MetaTile from './MetaTile'

interface PhotoExif {
  dateTimeOriginal?: Date
  make?: string
  model?: string
  iso?: number
  fNumber?: number
  exposureTime?: number
  focalLength?: number
  gpsLatitude?: number
  gpsLongitude?: number
  gpsLatitudeRef?: string
  gpsLongitudeRef?: string
  xpComment?: string
}

export default function PhotoDetail({ item }: { item: PhotoItem }) {
  const [url, setUrl] = useState('')
  const [exif, setExif] = useState<PhotoExif>({})
  const [naturalSize, setNaturalSize] = useState<{ w: number; h: number } | null>(null)

  useEffect(() => {
    const objectUrl = URL.createObjectURL(item.file)
    setUrl(objectUrl)
    return () => URL.revokeObjectURL(objectUrl)
  }, [item.file])

  useEffect(() => {
    exifr
      .parse(item.file, {
        pick: [
          'DateTimeOriginal', 'Make', 'Model',
          'ISO', 'FNumber', 'ExposureTime', 'FocalLength',
          'GPSLatitude', 'GPSLongitude', 'GPSLatitudeRef', 'GPSLongitudeRef',
          'XPComment',
        ],
      })
      .then((data) => {
        if (!data) return
        setExif({
          dateTimeOriginal: data.DateTimeOriginal instanceof Date ? data.DateTimeOriginal : undefined,
          make: typeof data.Make === 'string' ? data.Make : undefined,
          model: typeof data.Model === 'string' ? data.Model : undefined,
          iso: typeof data.ISO === 'number' ? data.ISO : undefined,
          fNumber: typeof data.FNumber === 'number' ? data.FNumber : undefined,
          exposureTime: typeof data.ExposureTime === 'number' ? data.ExposureTime : undefined,
          focalLength: typeof data.FocalLength === 'number' ? data.FocalLength : undefined,
          gpsLatitude: typeof data.GPSLatitude === 'number' ? data.GPSLatitude : undefined,
          gpsLongitude: typeof data.GPSLongitude === 'number' ? data.GPSLongitude : undefined,
          gpsLatitudeRef: typeof data.GPSLatitudeRef === 'string' ? data.GPSLatitudeRef : undefined,
          gpsLongitudeRef: typeof data.GPSLongitudeRef === 'string' ? data.GPSLongitudeRef : undefined,
          xpComment: typeof data.XPComment === 'string' ? data.XPComment : undefined,
        })
      })
      .catch(() => {})
  }, [item.file])

  const dji = parseXpComment(exif.xpComment)

  const lat =
    exif.gpsLatitude != null
      ? `${exif.gpsLatitude.toFixed(4)}° ${exif.gpsLatitudeRef ?? ''}`
      : '—'
  const lng =
    exif.gpsLongitude != null
      ? `${exif.gpsLongitude.toFixed(4)}° ${exif.gpsLongitudeRef ?? ''}`
      : '—'

  return (
    <div>
      <DetailNav
        filename={item.file.name}
        badge={<span className="badge bg-success">PHOTO</span>}
      />

      {url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={url}
          alt={item.file.name}
          className="img-fluid w-100"
          onLoad={(e) => {
            const img = e.currentTarget
            setNaturalSize({ w: img.naturalWidth, h: img.naturalHeight })
          }}
        />
      )}

      <div className="container-fluid py-4">
        <h6 className="text-uppercase text-muted mb-3">File Info</h6>
        <div className="row g-2 mb-4">
          <MetaTile label="Filename" value={item.file.name} />
          <MetaTile label="File Size" value={formatBytes(item.file.size)} />
          <MetaTile label="Date Taken" value={exif.dateTimeOriginal ? formatDate(exif.dateTimeOriginal) : '—'} />
          <MetaTile label="Dimensions" value={naturalSize ? `${naturalSize.w} × ${naturalSize.h}` : '—'} />
          <MetaTile label="Make" value={exif.make ?? '—'} />
          <MetaTile label="Model" value={exif.model ?? '—'} />
        </div>

        <h6 className="text-uppercase text-muted mb-3">Camera Settings</h6>
        <div className="row g-2 mb-4">
          <MetaTile label="ISO" value={exif.iso?.toString() ?? '—'} />
          <MetaTile label="Aperture" value={exif.fNumber != null ? `f/${exif.fNumber}` : '—'} />
          <MetaTile label="Shutter" value={exif.exposureTime != null ? formatShutter(exif.exposureTime) : '—'} />
          <MetaTile label="Focal Length" value={exif.focalLength != null ? `${exif.focalLength} mm` : '—'} />
        </div>

        <h6 className="text-uppercase text-muted mb-3">DJI Flight Data</h6>
        <div className="row g-2">
          <MetaTile label="GPS" value={`${lat}, ${lng}`} />
          <MetaTile label="Altitude (Abs)" value={dji.AbsoluteAltitude ? `${dji.AbsoluteAltitude} m` : '—'} />
          <MetaTile label="Altitude (Rel)" value={dji.RelativeAltitude ? `${dji.RelativeAltitude} m` : '—'} />
          <MetaTile label="Gimbal Pitch" value={dji.GimbalPitchDegree ? `${dji.GimbalPitchDegree}°` : '—'} />
          <MetaTile label="Gimbal Yaw" value={dji.GimbalYawDegree ? `${dji.GimbalYawDegree}°` : '—'} />
          <MetaTile label="Gimbal Roll" value={dji.GimbalRollDegree ? `${dji.GimbalRollDegree}°` : '—'} />
          <MetaTile label="Flight Yaw" value={dji.FlightYawDegree ? `${dji.FlightYawDegree}°` : '—'} />
          <MetaTile label="Flight Pitch" value={dji.FlightPitchDegree ? `${dji.FlightPitchDegree}°` : '—'} />
          <MetaTile label="Flight Roll" value={dji.FlightRollDegree ? `${dji.FlightRollDegree}°` : '—'} />
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add components/detail/PhotoDetail.tsx
git commit -m "feat: PhotoDetail component with EXIF and DJI flight data"
```

---

## Task 9: VideoDetail

**Files:**
- Create: `components/detail/VideoDetail.tsx`

- [ ] **Step 1: Create `components/detail/VideoDetail.tsx`**

```tsx
// components/detail/VideoDetail.tsx
'use client'

import { useEffect, useRef, useState } from 'react'
import type { VideoItem } from '@/lib/media-types'
import { formatBytes, formatDate } from './format'
import DetailNav from './DetailNav'
import MetaTile from './MetaTile'

interface VideoMeta {
  duration?: number
  width?: number
  height?: number
}

interface Mp4Meta {
  videoCodec?: string
  audioCodec?: string
  frameRate?: number
  bitrate?: number
  creationTime?: Date
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}m ${s.toString().padStart(2, '0')}s`
}

function formatAspectRatio(w: number, h: number): string {
  const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b))
  const d = gcd(w, h)
  return `${w / d}:${h / d}`
}

export default function VideoDetail({ item }: { item: VideoItem }) {
  const [url, setUrl] = useState('')
  const [videoMeta, setVideoMeta] = useState<VideoMeta>({})
  const [mp4Meta, setMp4Meta] = useState<Mp4Meta>({})
  const [mp4Error, setMp4Error] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    const objectUrl = URL.createObjectURL(item.file)
    setUrl(objectUrl)
    return () => URL.revokeObjectURL(objectUrl)
  }, [item.file])

  // Parse mp4box metadata from the first 1 MB of the file (avoids loading entire file)
  useEffect(() => {
    let cancelled = false
    async function parseMp4() {
      try {
        const MP4Box = (await import('mp4box')).default
        const mp4File = MP4Box.createFile()

        await new Promise<void>((resolve, reject) => {
          mp4File.onReady = (info) => {
            if (cancelled) return
            const vt = info.videoTracks?.[0]
            const at = info.audioTracks?.[0]
            const fps =
              vt && vt.timescale > 0
                ? Math.round((vt.nb_samples / (vt.duration / vt.timescale)) * 100) / 100
                : undefined
            setMp4Meta({
              videoCodec: vt?.codec,
              audioCodec: at?.codec,
              frameRate: fps,
              bitrate: vt ? Math.round(vt.bitrate / 1_000_000) : undefined,
              creationTime: info.created instanceof Date ? info.created : undefined,
            })
            resolve()
          }
          mp4File.onError = (e) => reject(new Error(e))

          // Read only first 1 MB for metadata
          const CHUNK = 1024 * 1024
          item.file.slice(0, CHUNK).arrayBuffer().then((buf) => {
            const buffer = buf as ArrayBuffer & { fileStart: number }
            buffer.fileStart = 0
            mp4File.appendBuffer(buffer)
            mp4File.flush()
          })
        })
      } catch {
        if (!cancelled) setMp4Error(true)
      }
    }
    parseMp4()
    return () => { cancelled = true }
  }, [item.file])

  return (
    <div>
      <DetailNav
        filename={item.file.name}
        badge={<span className="badge bg-secondary">VIDEO</span>}
      />

      {url && (
        <video
          ref={videoRef}
          src={url}
          controls
          className="w-100"
          onLoadedMetadata={() => {
            const v = videoRef.current
            if (!v) return
            setVideoMeta({ duration: v.duration, width: v.videoWidth, height: v.videoHeight })
          }}
        />
      )}

      <div className="container-fluid py-4">
        <h6 className="text-uppercase text-muted mb-3">File Info</h6>
        <div className="row g-2 mb-4">
          <MetaTile label="Filename" value={item.file.name} />
          <MetaTile label="File Size" value={formatBytes(item.file.size)} />
          <MetaTile
            label="Last Modified"
            value={item.file.lastModified ? formatDate(new Date(item.file.lastModified)) : '—'}
          />
        </div>

        <h6 className="text-uppercase text-muted mb-3">Video Properties</h6>
        <div className="row g-2 mb-4">
          <MetaTile
            label="Duration"
            value={videoMeta.duration != null ? formatDuration(videoMeta.duration) : '—'}
          />
          <MetaTile
            label="Resolution"
            value={
              videoMeta.width && videoMeta.height
                ? `${videoMeta.width} × ${videoMeta.height}`
                : '—'
            }
          />
          <MetaTile
            label="Aspect Ratio"
            value={
              videoMeta.width && videoMeta.height
                ? formatAspectRatio(videoMeta.width, videoMeta.height)
                : '—'
            }
          />
        </div>

        <h6 className="text-uppercase text-muted mb-3">
          Container &amp; Codec
          {mp4Error && (
            <span className="badge bg-secondary ms-2 text-lowercase fw-normal">unavailable</span>
          )}
        </h6>
        <div className="row g-2">
          <MetaTile label="Video Codec" value={mp4Meta.videoCodec ?? '—'} />
          <MetaTile
            label="Frame Rate"
            value={mp4Meta.frameRate != null ? `${mp4Meta.frameRate} fps` : '—'}
          />
          <MetaTile
            label="Bitrate"
            value={mp4Meta.bitrate != null ? `${mp4Meta.bitrate} Mbps` : '—'}
          />
          <MetaTile label="Audio Codec" value={mp4Meta.audioCodec ?? '—'} />
          <MetaTile
            label="Creation Time"
            value={mp4Meta.creationTime ? formatDate(mp4Meta.creationTime) : '—'}
          />
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add components/detail/VideoDetail.tsx
git commit -m "feat: VideoDetail component with mp4box.js codec and frame rate metadata"
```

---

## Task 10: HdrDetail

**Files:**
- Create: `components/detail/HdrDetail.tsx`

- [ ] **Step 1: Create `components/detail/HdrDetail.tsx`**

```tsx
// components/detail/HdrDetail.tsx
'use client'

import { useEffect, useState } from 'react'
import exifr from 'exifr'
import type { HdrItem } from '@/lib/media-types'
import { parseXpComment } from '@/lib/dji-xp-comment'
import { formatBytes, formatDate, formatShutter } from './format'
import DetailNav from './DetailNav'
import MetaTile from './MetaTile'

interface HdrExif {
  dateTimeOriginal?: Date
  iso?: number
  fNumber?: number
  exposureTime?: number
  focalLength?: number
  gpsLatitude?: number
  gpsLongitude?: number
  gpsLatitudeRef?: string
  gpsLongitudeRef?: string
  xpComment?: string
}

export default function HdrDetail({ item }: { item: HdrItem }) {
  const [url, setUrl] = useState('')
  const [exif, setExif] = useState<HdrExif>({})

  useEffect(() => {
    const objectUrl = URL.createObjectURL(item.middle)
    setUrl(objectUrl)
    return () => URL.revokeObjectURL(objectUrl)
  }, [item.middle])

  useEffect(() => {
    exifr
      .parse(item.middle, {
        pick: [
          'DateTimeOriginal', 'ISO', 'FNumber', 'ExposureTime', 'FocalLength',
          'GPSLatitude', 'GPSLongitude', 'GPSLatitudeRef', 'GPSLongitudeRef',
          'XPComment',
        ],
      })
      .then((data) => {
        if (!data) return
        setExif({
          dateTimeOriginal: data.DateTimeOriginal instanceof Date ? data.DateTimeOriginal : undefined,
          iso: typeof data.ISO === 'number' ? data.ISO : undefined,
          fNumber: typeof data.FNumber === 'number' ? data.FNumber : undefined,
          exposureTime: typeof data.ExposureTime === 'number' ? data.ExposureTime : undefined,
          focalLength: typeof data.FocalLength === 'number' ? data.FocalLength : undefined,
          gpsLatitude: typeof data.GPSLatitude === 'number' ? data.GPSLatitude : undefined,
          gpsLongitude: typeof data.GPSLongitude === 'number' ? data.GPSLongitude : undefined,
          gpsLatitudeRef: typeof data.GPSLatitudeRef === 'string' ? data.GPSLatitudeRef : undefined,
          gpsLongitudeRef: typeof data.GPSLongitudeRef === 'string' ? data.GPSLongitudeRef : undefined,
          xpComment: typeof data.XPComment === 'string' ? data.XPComment : undefined,
        })
      })
      .catch(() => {})
  }, [item.middle])

  const dji = parseXpComment(exif.xpComment)
  const lat =
    exif.gpsLatitude != null
      ? `${exif.gpsLatitude.toFixed(4)}° ${exif.gpsLatitudeRef ?? ''}`
      : '—'
  const lng =
    exif.gpsLongitude != null
      ? `${exif.gpsLongitude.toFixed(4)}° ${exif.gpsLongitudeRef ?? ''}`
      : '—'

  // Map each file to its EV bias (middle = 0, under < 0, over > 0) by sort order
  const sorted = [...item.files].sort((a, b) => a.name.localeCompare(b.name))

  return (
    <div>
      <DetailNav
        filename={item.middle.name}
        badge={<span className="badge bg-warning text-dark">HDR</span>}
      />

      {url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt={item.middle.name} className="img-fluid w-100" />
      )}

      <div className="container-fluid py-4">
        <h6 className="text-uppercase text-muted mb-3">HDR Bracket Set</h6>
        <div className="row g-2 mb-4">
          {sorted.map((f, i) => {
            const isMiddle = f.name === item.middle.name
            const label = isMiddle ? 'Middle (preview)' : i < sorted.indexOf(item.middle) ? 'Under-exposed' : 'Over-exposed'
            const badgeCls = isMiddle ? 'bg-success' : i < sorted.indexOf(item.middle) ? 'bg-warning text-dark' : 'bg-info text-dark'
            return (
              <div key={i} className="col-6 col-md-4">
                <div className={`border rounded p-2 ${isMiddle ? 'border-success' : ''}`}>
                  <span className={`badge ${badgeCls} mb-1`}>{label}</span>
                  <div className="small text-muted">{f.name}</div>
                  <div className="small">{formatBytes(f.size)}</div>
                </div>
              </div>
            )
          })}
        </div>

        <h6 className="text-uppercase text-muted mb-3">Camera Settings (middle exposure)</h6>
        <div className="row g-2 mb-4">
          <MetaTile label="Date Taken" value={exif.dateTimeOriginal ? formatDate(exif.dateTimeOriginal) : '—'} />
          <MetaTile label="ISO" value={exif.iso?.toString() ?? '—'} />
          <MetaTile label="Aperture" value={exif.fNumber != null ? `f/${exif.fNumber}` : '—'} />
          <MetaTile label="Shutter" value={exif.exposureTime != null ? formatShutter(exif.exposureTime) : '—'} />
          <MetaTile label="Focal Length" value={exif.focalLength != null ? `${exif.focalLength} mm` : '—'} />
        </div>

        <h6 className="text-uppercase text-muted mb-3">DJI Flight Data</h6>
        <div className="row g-2">
          <MetaTile label="GPS" value={`${lat}, ${lng}`} />
          <MetaTile label="Altitude (Abs)" value={dji.AbsoluteAltitude ? `${dji.AbsoluteAltitude} m` : '—'} />
          <MetaTile label="Altitude (Rel)" value={dji.RelativeAltitude ? `${dji.RelativeAltitude} m` : '—'} />
          <MetaTile label="Gimbal Pitch" value={dji.GimbalPitchDegree ? `${dji.GimbalPitchDegree}°` : '—'} />
          <MetaTile label="Gimbal Yaw" value={dji.GimbalYawDegree ? `${dji.GimbalYawDegree}°` : '—'} />
          <MetaTile label="Flight Yaw" value={dji.FlightYawDegree ? `${dji.FlightYawDegree}°` : '—'} />
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add components/detail/HdrDetail.tsx
git commit -m "feat: HdrDetail component with bracket set and EXIF metadata"
```

---

## Task 11: PanoramaDetail

**Files:**
- Create: `components/detail/PanoramaDetail.tsx`

- [ ] **Step 1: Create `components/detail/PanoramaDetail.tsx`**

```tsx
// components/detail/PanoramaDetail.tsx
'use client'

import { useEffect, useState } from 'react'
import type { PanoramaItem } from '@/lib/media-types'
import { formatBytes } from './format'
import DetailNav from './DetailNav'
import MetaTile from './MetaTile'

export default function PanoramaDetail({ item }: { item: PanoramaItem }) {
  const [iframeUrl, setIframeUrl] = useState('')

  useEffect(() => {
    const objectUrl = URL.createObjectURL(item.htmlFile)
    setIframeUrl(objectUrl)
    return () => URL.revokeObjectURL(objectUrl)
  }, [item.htmlFile])

  const totalSize = item.tiles.reduce((sum, f) => sum + f.size, item.htmlFile.size)

  return (
    <div>
      <DetailNav
        filename={item.htmlFile.name}
        badge={<span className="badge bg-info text-dark">PANORAMA</span>}
      />

      {iframeUrl && (
        <iframe
          src={iframeUrl}
          sandbox="allow-scripts allow-same-origin"
          className="w-100"
          style={{ height: '70vh', border: 'none' }}
          title="DJI Panorama Viewer"
        />
      )}

      <div className="container-fluid py-4">
        <h6 className="text-uppercase text-muted mb-3">Panorama Info</h6>
        <div className="row g-2">
          <MetaTile label="Viewer File" value={item.htmlFile.name} />
          <MetaTile label="Tiles" value={`${item.tiles.length}`} />
          <MetaTile label="Total Size" value={formatBytes(totalSize)} />
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add components/detail/PanoramaDetail.tsx
git commit -m "feat: PanoramaDetail with DJI iframe viewer"
```

---

## Task 12: Detail page route

**Files:**
- Create: `app/media/[index]/page.tsx`

- [ ] **Step 1: Create `app/media/[index]/page.tsx`**

```tsx
// app/media/[index]/page.tsx
'use client'

import { useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useMediaContext } from '@/lib/media-context'
import PhotoDetail from '@/components/detail/PhotoDetail'
import VideoDetail from '@/components/detail/VideoDetail'
import HdrDetail from '@/components/detail/HdrDetail'
import PanoramaDetail from '@/components/detail/PanoramaDetail'

export default function MediaDetailPage() {
  const params = useParams<{ index: string }>()
  const { items } = useMediaContext()
  const router = useRouter()

  const index = Number(params.index)
  const item = items?.[index] ?? null

  // Redirect to gallery if context is empty (page refresh) or index is invalid
  useEffect(() => {
    if (items === null || isNaN(index) || index < 0 || index >= items.length) {
      router.replace('/')
    }
  }, [items, index, router])

  // Escape key → go back
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') router.back()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [router])

  if (!items || !item) {
    return (
      <div className="d-flex align-items-center justify-content-center vh-100">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading…</span>
        </div>
      </div>
    )
  }

  return (
    <>
      {item.type === 'photo' && <PhotoDetail item={item} />}
      {item.type === 'video' && <VideoDetail item={item} />}
      {item.type === 'hdr' && <HdrDetail item={item} />}
      {item.type === 'panorama' && <PanoramaDetail item={item} />}
    </>
  )
}
```

- [ ] **Step 2: Build to confirm everything compiles**

```bash
npm run build 2>&1 | tail -30
```

Expected: clean build, no TypeScript errors.

- [ ] **Step 3: Run all tests**

```bash
npm test
```

Expected: all tests pass.

- [ ] **Step 4: Commit**

```bash
git add app/media/
git commit -m "feat: /media/[index] detail page with Escape key and redirect guard"
```

---

## Task 13: Manual smoke test checklist

Start the dev server:
```bash
npm run dev
```

Open `http://localhost:3000` and:

- [ ] Pick a folder with DJI media
- [ ] Confirm gallery loads and all cards are visually clickable (pointer cursor)
- [ ] Click a **photo** card → navigates to `/media/N` → full-res image displayed, metadata tiles populated
- [ ] Click a **video** card → video player loads, codec/fps/bitrate tiles appear after a moment
- [ ] Click an **HDR** card → middle exposure shown, bracket set listed with under/middle/over labels
- [ ] Click a **panorama** card → DJI iframe viewer loads and is interactive
- [ ] Click "← Back to gallery" → returns to gallery
- [ ] Press `Escape` key on detail page → returns to gallery
- [ ] Click browser back button → returns to gallery
- [ ] Manually navigate to `/media/9999` → immediately redirected to `/`
- [ ] Refresh the page on a detail URL → immediately redirected to `/`

- [ ] **Final commit if any fixes were needed**

```bash
git add -p
git commit -m "fix: smoke test corrections for detail page"
```
