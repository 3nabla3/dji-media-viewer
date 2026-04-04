# react-bootstrap Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace all raw Bootstrap class-string component markup with react-bootstrap components and eliminate the Bootstrap JS dynamic import in `Toast.tsx`.

**Architecture:** Install `react-bootstrap`, then rewrite each component file one at a time replacing Bootstrap class-string patterns (`<div className="card">`, `<span className="badge">`, etc.) with react-bootstrap JSX components (`<Card>`, `<Badge>`, etc.). Utility classes (`text-muted`, `fw-semibold`, `mb-3`, etc.) remain as `className` strings — react-bootstrap does not replace those. Run `bunx prettier --write <file>` after every file edit.

**Tech Stack:** Next.js 16, React 19, react-bootstrap v2 (Bootstrap 5 compatible), bun

---

## File Map

| File | Action |
|---|---|
| `package.json` | Add `react-bootstrap` dependency |
| `components/Toast.tsx` | Full rewrite — drop dynamic BS JS import |
| `components/FolderPicker.tsx` | `<Button>` |
| `components/FilterTabs.tsx` | `<Nav>`, `<Badge>` |
| `components/MediaGrid.tsx` | `<Row>`, `<Col>` |
| `components/cards/VideoCard.tsx` | `<Card>`, `<Badge>` |
| `components/cards/PhotoCard.tsx` | `<Card>`, `<Badge>` |
| `components/cards/HdrCard.tsx` | `<Card>`, `<Badge>` |
| `components/cards/PanoramaCard.tsx` | `<Card>`, `<Badge>`, `<Row>`, `<Col>` |
| `components/detail/DetailNav.tsx` | `<Navbar>`, `<Container>`, `<Button>` |
| `components/detail/MetaTile.tsx` | `<Col>` |
| `components/detail/HdrDetail.tsx` | `<Badge>`, `<Spinner>`, `<Toast>`, `<Container>`, `<Row>`, `<Col>` |
| `components/detail/PhotoDetail.tsx` | `<Badge>`, `<Container>`, `<Row>` |
| `components/detail/VideoDetail.tsx` | `<Badge>`, `<Container>`, `<Row>` |
| `components/detail/PanoramaDetail.tsx` | `<Badge>`, `<Container>`, `<Row>` |
| `app/page.tsx` | `<Stack>`, `<Alert>`, `<Spinner>`, `<Navbar>`, `<Container>` |

---

## Task 1: Install react-bootstrap

**Files:**
- Modify: `package.json` (via bun install)

- [ ] **Step 1: Install the package**

```bash
cd D:/Code/dji-media-viewer && bun install react-bootstrap
```

Expected: `react-bootstrap` appears in `package.json` dependencies and `bun.lock` is updated.

- [ ] **Step 2: Verify TypeScript types are available**

react-bootstrap v2 ships its own types — no `@types/react-bootstrap` needed. Verify:

```bash
cd D:/Code/dji-media-viewer && bunx tsc --noEmit 2>&1 | head -20
```

Expected: zero errors (or only pre-existing errors unrelated to react-bootstrap).

- [ ] **Step 3: Commit**

```bash
but status -fv
```

Note the file IDs for `package.json` and `bun.lock`, then:

```bash
but commit ag-branch-1 -m "chore: install react-bootstrap" --changes <pkg-id>,<lock-id> --status-after
```

---

## Task 2: Rewrite `components/Toast.tsx`

This is the core goal — eliminate the dynamic `import('bootstrap/dist/js/bootstrap.esm.js')`. The rewrite replaces `useEffect`/`useRef`/imperative JS with a controlled react-bootstrap `<Toast>`.

**Files:**
- Modify: `components/Toast.tsx`

- [ ] **Step 1: Rewrite the file**

Replace the entire contents of `components/Toast.tsx` with:

```tsx
// components/Toast.tsx
'use client'

import { Toast as BsToast, ToastContainer } from 'react-bootstrap'

interface ToastProps {
  messages: string[]
  variant?: 'warning' | 'danger' | 'info'
  onDismiss: () => void
}

export default function Toast({ messages, variant = 'warning', onDismiss }: ToastProps) {
  const label = variant === 'warning' ? 'Warning' : variant === 'danger' ? 'Error' : 'Info'

  return (
    <ToastContainer position="bottom-end" className="p-3" style={{ zIndex: 1100 }}>
      <BsToast show={messages.length > 0} onClose={onDismiss} bg={variant}>
        <BsToast.Header>
          <strong className="me-auto">{label}</strong>
        </BsToast.Header>
        <BsToast.Body>
          {messages.length === 1 ? (
            messages[0]
          ) : (
            <ul className="mb-0 ps-3">
              {messages.map((msg, i) => (
                <li key={i}>{msg}</li>
              ))}
            </ul>
          )}
        </BsToast.Body>
      </BsToast>
    </ToastContainer>
  )
}
```

- [ ] **Step 2: Format**

```bash
cd D:/Code/dji-media-viewer && bunx prettier --write components/Toast.tsx
```

- [ ] **Step 3: Type check**

```bash
cd D:/Code/dji-media-viewer && bunx tsc --noEmit 2>&1 | head -30
```

Expected: zero new errors.

- [ ] **Step 4: Commit**

```bash
but status -fv
```

Note the file ID for `components/Toast.tsx`, then:

```bash
but commit ag-branch-1 -m "refactor: rewrite Toast with react-bootstrap, remove BS JS import" --changes <id> --status-after
```

---

## Task 3: Refactor `components/FolderPicker.tsx`

**Files:**
- Modify: `components/FolderPicker.tsx`

- [ ] **Step 1: Replace the file**

```tsx
// components/FolderPicker.tsx
'use client'

import { useRef } from 'react'
import { Button } from 'react-bootstrap'

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
        accept="image/*,video/*,.html"
        className="d-none"
        onChange={handleChange}
      />
      <Button variant="primary" size="lg" onClick={() => inputRef.current?.click()}>
        Open Folder
      </Button>
    </>
  )
}
```

- [ ] **Step 2: Format**

```bash
cd D:/Code/dji-media-viewer && bunx prettier --write components/FolderPicker.tsx
```

- [ ] **Step 3: Commit**

```bash
but status -fv
# note ID for FolderPicker.tsx
but commit ag-branch-1 -m "refactor: use react-bootstrap Button in FolderPicker" --changes <id> --status-after
```

---

## Task 4: Refactor `components/FilterTabs.tsx`

react-bootstrap `Nav` manages the active state via `activeKey` + `eventKey` — no manual active class needed. `onSelect` types as `(key: string | null) => void`; narrow with a guard.

**Files:**
- Modify: `components/FilterTabs.tsx`

- [ ] **Step 1: Replace the file**

```tsx
'use client'

import { Nav, Badge } from 'react-bootstrap'
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
    <Nav
      variant="tabs"
      className="mb-3"
      activeKey={active}
      onSelect={(k) => k && onChange(k as FilterType)}
    >
      {TABS.map(({ key, label }) => (
        <Nav.Item key={key}>
          <Nav.Link eventKey={key}>
            {label} <Badge bg="secondary">{count(key)}</Badge>
          </Nav.Link>
        </Nav.Item>
      ))}
    </Nav>
  )
}
```

- [ ] **Step 2: Format**

```bash
cd D:/Code/dji-media-viewer && bunx prettier --write components/FilterTabs.tsx
```

- [ ] **Step 3: Commit**

```bash
but status -fv
but commit ag-branch-1 -m "refactor: use react-bootstrap Nav/Badge in FilterTabs" --changes <id> --status-after
```

---

## Task 5: Refactor `components/MediaGrid.tsx`

`row-cols-*` maps to `xs/sm/md/lg` numeric props on `<Row>`.

**Files:**
- Modify: `components/MediaGrid.tsx`

- [ ] **Step 1: Replace the file**

```tsx
'use client'

import { Row, Col } from 'react-bootstrap'
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
  const visible =
    filter === 'all'
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
          <Row xs={1} sm={2} md={3} lg={4} className="g-3">
            {section.items.map(({ item, idx }) => (
              <Col key={idx}>
                {item.type === 'video' && <VideoCard item={item} onClick={() => onSelect(idx)} />}
                {item.type === 'photo' && <PhotoCard item={item} onClick={() => onSelect(idx)} />}
                {item.type === 'hdr' && <HdrCard item={item} onClick={() => onSelect(idx)} />}
                {item.type === 'panorama' && (
                  <PanoramaCard item={item} onClick={() => onSelect(idx)} />
                )}
              </Col>
            ))}
          </Row>
        </div>
      ))}
    </>
  )
}
```

- [ ] **Step 2: Format**

```bash
cd D:/Code/dji-media-viewer && bunx prettier --write components/MediaGrid.tsx
```

- [ ] **Step 3: Commit**

```bash
but status -fv
but commit ag-branch-1 -m "refactor: use react-bootstrap Row/Col in MediaGrid" --changes <id> --status-after
```

---

## Task 6: Refactor card components

All four cards in one commit. `<video>` and `<img>` elements inside cards keep `className="card-img-top"` because `Card.Img` only renders `<img>` — not appropriate for videos or lazy-loaded placeholders.

**Files:**
- Modify: `components/cards/VideoCard.tsx`
- Modify: `components/cards/PhotoCard.tsx`
- Modify: `components/cards/HdrCard.tsx`
- Modify: `components/cards/PanoramaCard.tsx`

- [ ] **Step 1: Rewrite `VideoCard.tsx`**

```tsx
// components/cards/VideoCard.tsx
'use client'

import { useEffect, useRef, useState } from 'react'
import { Card, Badge } from 'react-bootstrap'
import type { VideoItem } from '@/lib/media-types'

export default function VideoCard({ item, onClick }: { item: VideoItem; onClick: () => void }) {
  const [url, setUrl] = useState<string | null>(null)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const obs = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return
        obs.disconnect()
        const objectUrl = URL.createObjectURL(item.file)
        setUrl(objectUrl)
      },
      { rootMargin: '400px' },
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [item.file])

  return (
    <Card ref={ref} className="h-100" style={{ cursor: 'pointer' }} onClick={onClick}>
      {url ? (
        <video
          src={url}
          preload="metadata"
          className="card-img-top"
          style={{ maxHeight: '200px', objectFit: 'cover' }}
        />
      ) : (
        <div className="card-img-top bg-secondary-subtle" style={{ height: '200px' }} />
      )}
      <Card.Body className="p-2">
        <Badge bg="secondary" className="me-1">
          VIDEO
        </Badge>
        <small className="text-muted">{item.file.name}</small>
      </Card.Body>
    </Card>
  )
}
```

- [ ] **Step 2: Format VideoCard**

```bash
cd D:/Code/dji-media-viewer && bunx prettier --write components/cards/VideoCard.tsx
```

- [ ] **Step 3: Rewrite `PhotoCard.tsx`**

```tsx
// components/cards/PhotoCard.tsx
'use client'

import { Card, Badge } from 'react-bootstrap'
import type { PhotoItem } from '@/lib/media-types'
import { useThumbnail } from '@/lib/use-thumbnail'

export default function PhotoCard({ item, onClick }: { item: PhotoItem; onClick: () => void }) {
  const { url, ref } = useThumbnail(item.file)

  return (
    <Card ref={ref} className="h-100" style={{ cursor: 'pointer' }} onClick={onClick}>
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={url}
          alt={item.file.name}
          className="card-img-top"
          style={{ height: '200px', objectFit: 'cover' }}
        />
      ) : (
        <div className="card-img-top bg-secondary-subtle" style={{ height: '200px' }} />
      )}
      <Card.Body className="p-2">
        <Badge bg="success" className="me-1">
          PHOTO
        </Badge>
        <small className="text-muted">{item.file.name}</small>
      </Card.Body>
    </Card>
  )
}
```

- [ ] **Step 4: Format PhotoCard**

```bash
cd D:/Code/dji-media-viewer && bunx prettier --write components/cards/PhotoCard.tsx
```

- [ ] **Step 5: Rewrite `HdrCard.tsx`**

`Card` accepts a `border` prop that applies `border-{variant}` — replaces `border-warning` className.

```tsx
// components/cards/HdrCard.tsx
'use client'

import { Card, Badge } from 'react-bootstrap'
import type { HdrItem } from '@/lib/media-types'
import { useThumbnail } from '@/lib/use-thumbnail'

export default function HdrCard({ item, onClick }: { item: HdrItem; onClick: () => void }) {
  console.log(item)
  const { url, ref } = useThumbnail(item.middle)

  return (
    <Card ref={ref} border="warning" className="h-100" style={{ cursor: 'pointer' }} onClick={onClick}>
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={url}
          alt={item.middle.name}
          className="card-img-top"
          style={{ height: '200px', objectFit: 'cover' }}
        />
      ) : (
        <div className="card-img-top bg-secondary-subtle" style={{ height: '200px' }} />
      )}
      <Card.Body className="p-2">
        <Badge bg="warning" text="dark" className="me-1">
          HDR
        </Badge>
        <small className="text-muted">
          {item.files.length} exposures · {item.middle.name}
        </small>
      </Card.Body>
    </Card>
  )
}
```

- [ ] **Step 6: Format HdrCard**

```bash
cd D:/Code/dji-media-viewer && bunx prettier --write components/cards/HdrCard.tsx
```

- [ ] **Step 7: Rewrite `PanoramaCard.tsx`**

```tsx
// components/cards/PanoramaCard.tsx
'use client'

import { Card, Badge, Row, Col } from 'react-bootstrap'
import type { PanoramaItem } from '@/lib/media-types'
import { useThumbnail } from '@/lib/use-thumbnail'

function TileThumb({ file }: { file: File }) {
  console.log(file)
  const { url } = useThumbnail(file)
  return url ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={url} alt="" className="img-fluid" style={{ height: '60px', objectFit: 'cover', width: '100%' }} />
  ) : (
    <div className="bg-secondary-subtle" style={{ height: '60px', width: '100%' }} />
  )
}

export default function PanoramaCard({ item, onClick }: { item: PanoramaItem; onClick: () => void }) {
  console.log(item)
  const { ref } = useThumbnail(item.tiles[0])

  return (
    <Card ref={ref} className="h-100" style={{ cursor: 'pointer' }} onClick={onClick}>
      <Card.Header className="p-2">
        <Badge bg="info" text="dark" className="me-1">
          PANORAMA
        </Badge>
        <small className="text-muted">
          {item.htmlFile.name} · {item.tiles.length} tiles
        </small>
      </Card.Header>
      <Card.Body className="p-2">
        <Row xs={4} className="g-1">
          {item.tiles.map((tile, i) => (
            <Col key={i}>
              <TileThumb file={tile} />
            </Col>
          ))}
        </Row>
      </Card.Body>
    </Card>
  )
}
```

- [ ] **Step 8: Format PanoramaCard**

```bash
cd D:/Code/dji-media-viewer && bunx prettier --write components/cards/PanoramaCard.tsx
```

- [ ] **Step 9: Type check all cards**

```bash
cd D:/Code/dji-media-viewer && bunx tsc --noEmit 2>&1 | head -30
```

Expected: zero new errors.

- [ ] **Step 10: Commit all cards**

```bash
but status -fv
# note IDs for all four card files
but commit ag-branch-1 -m "refactor: use react-bootstrap Card/Badge/Row/Col in card components" --changes <vc-id>,<pc-id>,<hc-id>,<pan-id> --status-after
```

---

## Task 7: Refactor `components/detail/DetailNav.tsx` and `components/detail/MetaTile.tsx`

**Files:**
- Modify: `components/detail/DetailNav.tsx`
- Modify: `components/detail/MetaTile.tsx`

- [ ] **Step 1: Rewrite `DetailNav.tsx`**

`navbar-dark` is obsolete in Bootstrap 5 with `data-bs-theme="dark"` on `<html>`. `bg="dark"` applies the background color.

```tsx
// components/detail/DetailNav.tsx
'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Navbar, Container, Button } from 'react-bootstrap'
import type { ReactNode } from 'react'

interface DetailNavProps {
  filename: string
  badge: ReactNode
  onFullscreen?: () => void
}

export default function DetailNav({ filename, badge, onFullscreen }: DetailNavProps) {
  const router = useRouter()
  const [visible, setVisible] = useState(true)
  const lastScrollY = useRef(0)

  useEffect(() => {
    function onScroll() {
      const y = window.scrollY
      if (y > lastScrollY.current + 5) setVisible(false)
      else if (y < lastScrollY.current - 5) setVisible(true)
      lastScrollY.current = y
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <Navbar
      bg="dark"
      className="border-bottom sticky-top"
      style={{
        transform: visible ? 'none' : 'translateY(-100%)',
        transition: 'transform 0.3s ease',
      }}
    >
      <Container fluid>
        <Button variant="outline-secondary" size="sm" onClick={() => router.back()}>
          ← Back to gallery
        </Button>
        <span className="text-light ms-3 me-auto">{filename}</span>
        {badge}
        {onFullscreen && (
          <Button
            variant="outline-secondary"
            size="sm"
            className="ms-2"
            onClick={onFullscreen}
            title="Fullscreen"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              fill="currentColor"
              viewBox="0 0 16 16"
            >
              <path d="M1.5 1h4a.5.5 0 0 1 0 1H2v3.5a.5.5 0 0 1-1 0v-4A.5.5 0 0 1 1.5 1zm9 0h4a.5.5 0 0 1 .5.5v4a.5.5 0 0 1-1 0V2h-3.5a.5.5 0 0 1 0-1zM1 10.5a.5.5 0 0 1 .5-.5h0a.5.5 0 0 1 .5.5V14h3.5a.5.5 0 0 1 0 1h-4a.5.5 0 0 1-.5-.5v-4zm13 0v4a.5.5 0 0 1-.5.5h-4a.5.5 0 0 1 0-1H14v-3.5a.5.5 0 0 1 1 0z" />
            </svg>
          </Button>
        )}
      </Container>
    </Navbar>
  )
}
```

- [ ] **Step 2: Format DetailNav**

```bash
cd D:/Code/dji-media-viewer && bunx prettier --write components/detail/DetailNav.tsx
```

- [ ] **Step 3: Rewrite `MetaTile.tsx`**

```tsx
// components/detail/MetaTile.tsx
import { Col } from 'react-bootstrap'

interface MetaTileProps {
  label: string
  value: string
}

export default function MetaTile({ label, value }: MetaTileProps) {
  return (
    <Col xs={6} md={4} lg={3}>
      <div className="rounded p-2">
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
    </Col>
  )
}
```

- [ ] **Step 4: Format MetaTile**

```bash
cd D:/Code/dji-media-viewer && bunx prettier --write components/detail/MetaTile.tsx
```

- [ ] **Step 5: Commit**

```bash
but status -fv
but commit ag-branch-1 -m "refactor: use react-bootstrap in DetailNav and MetaTile" --changes <nav-id>,<tile-id> --status-after
```

---

## Task 8: Refactor `components/detail/HdrDetail.tsx`

This file uses the most Bootstrap patterns: badge, spinner, inline toast, container, row, col.

Note: The inline HDR error toast gains a close button from `Toast.Header` (react-bootstrap renders one by default). The existing `setTimeout(() => setHdrError(false), 5000)` still handles auto-dismiss; the close button adds manual dismiss.

**Files:**
- Modify: `components/detail/HdrDetail.tsx`

- [ ] **Step 1: Update imports**

Replace the existing import block at the top of `components/detail/HdrDetail.tsx`:

```tsx
// components/detail/HdrDetail.tsx
'use client'

import { useEffect, useRef, useState } from 'react'
import exifr from 'exifr'
import { Badge, Spinner, Toast, Container, Row, Col } from 'react-bootstrap'
import type { HdrItem } from '@/lib/media-types'
import { parseXpComment } from '@/lib/dji-xp-comment'
import { formatBytes, formatDate, formatShutter } from './format'
import DetailNav from './DetailNav'
import MetaTile from './MetaTile'
import { renderHdr } from '@/lib/opencv-hdr'
```

- [ ] **Step 2: Replace the JSX return**

Replace the `return (...)` block (lines 109–199) with:

```tsx
  return (
    <div>
      <DetailNav
        filename={item.middle.name}
        badge={<Badge bg="warning" text="dark">HDR</Badge>}
        onFullscreen={() => mediaRef.current?.requestFullscreen()}
      />

      {url && (
        <div className="position-relative">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img ref={mediaRef} src={url} alt={item.middle.name} className="img-fluid w-100" />
          {hdrRendering && (
            <div className="position-absolute top-0 end-0 m-2">
              <span className="badge bg-dark bg-opacity-75 d-flex align-items-center gap-1">
                <Spinner animation="border" size="sm" role="status" aria-hidden="true" />
                Rendering HDR…
              </span>
            </div>
          )}
        </div>
      )}

      <Toast
        show={hdrError}
        onClose={() => setHdrError(false)}
        className="position-fixed top-0 end-0 m-3"
        style={{ zIndex: 1100 }}
      >
        <Toast.Header>
          <strong className="me-auto text-danger">HDR Rendering Failed</strong>
        </Toast.Header>
        <Toast.Body>Showing middle exposure instead.</Toast.Body>
      </Toast>

      <Container fluid className="py-4">
        <h6 className="text-uppercase text-muted mb-3">HDR Bracket Set</h6>
        <Row className="g-2 mb-4">
          {sorted.map((f, i) => {
            const isMiddle = f.name === item.middle.name
            const label = isMiddle
              ? 'Middle (preview)'
              : i < middleIndex
                ? 'Under-exposed'
                : 'Over-exposed'
            const badgeBg = isMiddle ? 'success' : i < middleIndex ? 'warning' : 'info'
            const badgeText = isMiddle ? undefined : 'dark'
            return (
              <Col key={i} xs={6} md={4}>
                <div className={`border rounded p-2 ${isMiddle ? 'border-success' : ''}`}>
                  <Badge bg={badgeBg} text={badgeText} className="mb-1">
                    {label}
                  </Badge>
                  <div className="small text-muted">{f.name}</div>
                  <div className="small">{formatBytes(f.size)}</div>
                </div>
              </Col>
            )
          })}
        </Row>

        <h6 className="text-uppercase text-muted mb-3">Camera Settings (middle exposure)</h6>
        <Row className="g-2 mb-4">
          <MetaTile label="Date Taken" value={exif.dateTimeOriginal ? formatDate(exif.dateTimeOriginal) : '—'} />
          <MetaTile label="ISO" value={exif.iso?.toString() ?? '—'} />
          <MetaTile label="Aperture" value={exif.fNumber != null ? `f/${exif.fNumber}` : '—'} />
          <MetaTile label="Shutter" value={exif.exposureTime != null ? formatShutter(exif.exposureTime) : '—'} />
          <MetaTile label="Focal Length" value={exif.focalLength != null ? `${exif.focalLength} mm` : '—'} />
        </Row>

        <h6 className="text-uppercase text-muted mb-3">DJI Flight Data</h6>
        <Row className="g-2">
          <MetaTile label="GPS" value={`${lat}, ${lng}`} />
          <MetaTile label="Altitude (Abs)" value={dji.AbsoluteAltitude ? `${dji.AbsoluteAltitude} m` : '—'} />
          <MetaTile label="Altitude (Rel)" value={dji.RelativeAltitude ? `${dji.RelativeAltitude} m` : '—'} />
          <MetaTile label="Gimbal Pitch" value={dji.GimbalPitchDegree ? `${dji.GimbalPitchDegree}°` : '—'} />
          <MetaTile label="Gimbal Yaw" value={dji.GimbalYawDegree ? `${dji.GimbalYawDegree}°` : '—'} />
          <MetaTile label="Flight Yaw" value={dji.FlightYawDegree ? `${dji.FlightYawDegree}°` : '—'} />
          <MetaTile label="Gimbal Roll" value={dji.GimbalRollDegree ? `${dji.GimbalRollDegree}°` : '—'} />
          <MetaTile label="Flight Pitch" value={dji.FlightPitchDegree ? `${dji.FlightPitchDegree}°` : '—'} />
          <MetaTile label="Flight Roll" value={dji.FlightRollDegree ? `${dji.FlightRollDegree}°` : '—'} />
        </Row>
      </Container>
    </div>
  )
```

- [ ] **Step 3: Format**

```bash
cd D:/Code/dji-media-viewer && bunx prettier --write components/detail/HdrDetail.tsx
```

- [ ] **Step 4: Type check**

```bash
cd D:/Code/dji-media-viewer && bunx tsc --noEmit 2>&1 | head -30
```

- [ ] **Step 5: Commit**

```bash
but status -fv
but commit ag-branch-1 -m "refactor: use react-bootstrap in HdrDetail" --changes <id> --status-after
```

---

## Task 9: Refactor `components/detail/PhotoDetail.tsx`

**Files:**
- Modify: `components/detail/PhotoDetail.tsx`

- [ ] **Step 1: Update imports**

Replace the import block:

```tsx
// components/detail/PhotoDetail.tsx
'use client'

import { useEffect, useRef, useState } from 'react'
import exifr from 'exifr'
import { Badge, Container, Row } from 'react-bootstrap'
import type { PhotoItem } from '@/lib/media-types'
import { parseXpComment } from '@/lib/dji-xp-comment'
import { formatBytes, formatDate, formatShutter } from './format'
import DetailNav from './DetailNav'
import MetaTile from './MetaTile'
```

- [ ] **Step 2: Replace the JSX return**

Replace the `return (...)` block (lines 80–135):

```tsx
  return (
    <div>
      <DetailNav
        filename={item.file.name}
        badge={<Badge bg="success">PHOTO</Badge>}
        onFullscreen={() => mediaRef.current?.requestFullscreen()}
      />

      {url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          ref={mediaRef}
          src={url}
          alt={item.file.name}
          className="img-fluid w-100"
          onLoad={(e) => {
            const img = e.currentTarget
            setNaturalSize({ w: img.naturalWidth, h: img.naturalHeight })
          }}
        />
      )}

      <Container fluid className="py-4">
        <h6 className="text-uppercase text-muted mb-3">File Info</h6>
        <Row className="g-2 mb-4">
          <MetaTile label="Filename" value={item.file.name} />
          <MetaTile label="File Size" value={formatBytes(item.file.size)} />
          <MetaTile label="Date Taken" value={exif.dateTimeOriginal ? formatDate(exif.dateTimeOriginal) : '—'} />
          <MetaTile label="Dimensions" value={naturalSize ? `${naturalSize.w} × ${naturalSize.h}` : '—'} />
          <MetaTile label="Make" value={exif.make ?? '—'} />
          <MetaTile label="Model" value={exif.model ?? '—'} />
        </Row>

        <h6 className="text-uppercase text-muted mb-3">Camera Settings</h6>
        <Row className="g-2 mb-4">
          <MetaTile label="ISO" value={exif.iso?.toString() ?? '—'} />
          <MetaTile label="Aperture" value={exif.fNumber != null ? `f/${exif.fNumber}` : '—'} />
          <MetaTile label="Shutter" value={exif.exposureTime != null ? formatShutter(exif.exposureTime) : '—'} />
          <MetaTile label="Focal Length" value={exif.focalLength != null ? `${exif.focalLength} mm` : '—'} />
        </Row>

        <h6 className="text-uppercase text-muted mb-3">DJI Flight Data</h6>
        <Row className="g-2">
          <MetaTile label="GPS" value={`${lat}, ${lng}`} />
          <MetaTile label="Altitude (Abs)" value={dji.AbsoluteAltitude ? `${dji.AbsoluteAltitude} m` : '—'} />
          <MetaTile label="Altitude (Rel)" value={dji.RelativeAltitude ? `${dji.RelativeAltitude} m` : '—'} />
          <MetaTile label="Gimbal Pitch" value={dji.GimbalPitchDegree ? `${dji.GimbalPitchDegree}°` : '—'} />
          <MetaTile label="Gimbal Yaw" value={dji.GimbalYawDegree ? `${dji.GimbalYawDegree}°` : '—'} />
          <MetaTile label="Gimbal Roll" value={dji.GimbalRollDegree ? `${dji.GimbalRollDegree}°` : '—'} />
          <MetaTile label="Flight Yaw" value={dji.FlightYawDegree ? `${dji.FlightYawDegree}°` : '—'} />
          <MetaTile label="Flight Pitch" value={dji.FlightPitchDegree ? `${dji.FlightPitchDegree}°` : '—'} />
          <MetaTile label="Flight Roll" value={dji.FlightRollDegree ? `${dji.FlightRollDegree}°` : '—'} />
        </Row>
      </Container>
    </div>
  )
```

- [ ] **Step 3: Format**

```bash
cd D:/Code/dji-media-viewer && bunx prettier --write components/detail/PhotoDetail.tsx
```

- [ ] **Step 4: Commit**

```bash
but status -fv
but commit ag-branch-1 -m "refactor: use react-bootstrap in PhotoDetail" --changes <id> --status-after
```

---

## Task 10: Refactor `components/detail/VideoDetail.tsx`

**Files:**
- Modify: `components/detail/VideoDetail.tsx`

- [ ] **Step 1: Update imports**

```tsx
// components/detail/VideoDetail.tsx
'use client'

import { useEffect, useRef, useState } from 'react'
import { Badge, Container, Row } from 'react-bootstrap'
import type { VideoItem } from '@/lib/media-types'
import { formatBytes, formatDate } from './format'
import DetailNav from './DetailNav'
import MetaTile from './MetaTile'
```

- [ ] **Step 2: Replace the JSX return**

Replace the `return (...)` block (lines 93–175):

```tsx
  return (
    <div>
      <DetailNav
        filename={item.file.name}
        badge={<Badge bg="secondary">VIDEO</Badge>}
        onFullscreen={() => videoRef.current?.requestFullscreen()}
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

      <Container fluid className="py-4">
        <h6 className="text-uppercase text-muted mb-3">File Info</h6>
        <Row className="g-2 mb-4">
          <MetaTile label="Filename" value={item.file.name} />
          <MetaTile label="File Size" value={formatBytes(item.file.size)} />
          <MetaTile
            label="Last Modified"
            value={item.file.lastModified ? formatDate(new Date(item.file.lastModified)) : '—'}
          />
        </Row>

        <h6 className="text-uppercase text-muted mb-3">Video Properties</h6>
        <Row className="g-2 mb-4">
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
        </Row>

        <h6 className="text-uppercase text-muted mb-3">
          Container &amp; Codec
          {mp4Error && (
            <Badge bg="secondary" className="ms-2 text-lowercase fw-normal">
              unavailable
            </Badge>
          )}
        </h6>
        <Row className="g-2">
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
        </Row>
      </Container>
    </div>
  )
```

- [ ] **Step 3: Format**

```bash
cd D:/Code/dji-media-viewer && bunx prettier --write components/detail/VideoDetail.tsx
```

- [ ] **Step 4: Commit**

```bash
but status -fv
but commit ag-branch-1 -m "refactor: use react-bootstrap in VideoDetail" --changes <id> --status-after
```

---

## Task 11: Refactor `components/detail/PanoramaDetail.tsx`

**Files:**
- Modify: `components/detail/PanoramaDetail.tsx`

- [ ] **Step 1: Update imports**

```tsx
// components/detail/PanoramaDetail.tsx
'use client'

import { useEffect, useRef, useState } from 'react'
import { Badge, Container, Row } from 'react-bootstrap'
import type { PanoramaItem } from '@/lib/media-types'
import { formatBytes } from './format'
import DetailNav from './DetailNav'
import MetaTile from './MetaTile'
```

- [ ] **Step 2: Replace the JSX return**

Replace the `return (...)` block (lines 22–50):

```tsx
  return (
    <div>
      <DetailNav
        filename={item.htmlFile.name}
        badge={
          <Badge bg="info" text="dark">
            PANORAMA
          </Badge>
        }
        onFullscreen={() => mediaRef.current?.requestFullscreen()}
      />

      {iframeUrl && (
        <iframe
          ref={mediaRef}
          src={iframeUrl}
          sandbox="allow-scripts allow-same-origin"
          className="w-100"
          style={{ height: '70vh', border: 'none' }}
          title="DJI Panorama Viewer"
        />
      )}

      <Container fluid className="py-4">
        <h6 className="text-uppercase text-muted mb-3">Panorama Info</h6>
        <Row className="g-2">
          <MetaTile label="Viewer File" value={item.htmlFile.name} />
          <MetaTile label="Tiles" value={`${item.tiles.length}`} />
          <MetaTile label="Total Size" value={formatBytes(totalSize)} />
        </Row>
      </Container>
    </div>
  )
```

- [ ] **Step 3: Format**

```bash
cd D:/Code/dji-media-viewer && bunx prettier --write components/detail/PanoramaDetail.tsx
```

- [ ] **Step 4: Commit**

```bash
but status -fv
but commit ag-branch-1 -m "refactor: use react-bootstrap in PanoramaDetail" --changes <id> --status-after
```

---

## Task 12: Refactor `app/page.tsx`

`<Stack>` replaces `<div className="d-flex flex-column ...">` (Stack is vertical/flex-column by default).

**Files:**
- Modify: `app/page.tsx`

- [ ] **Step 1: Update imports**

Replace the existing import block:

```tsx
// app/page.tsx
'use client'

import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Stack, Alert, Spinner, Navbar, Container } from 'react-bootstrap'
import { parseMediaFiles } from '@/lib/media-parser'
import Toast from '@/components/Toast'
import { loadOpenCV } from '@/lib/opencv-hdr'
import { useMediaContext } from '@/lib/media-context'
import FolderPicker from '@/components/FolderPicker'
import FilterTabs, { type FilterType } from '@/components/FilterTabs'
import MediaGrid from '@/components/MediaGrid'
```

- [ ] **Step 2: Replace the JSX returns**

Replace the three state-based returns and the final loaded-state return (lines 84–146):

```tsx
  // ── Empty state ──────────────────────────────────────────────────────────
  if (!items && !loading) {
    return (
      <Stack className="align-items-center justify-content-center vh-100">
        <h1 className="mb-3">DJI Media Viewer</h1>
        <p className="text-muted mb-4">Select your drone SD card folder to get started.</p>
        <Alert variant="info" className="d-flex align-items-start gap-2 mb-4" style={{ maxWidth: 480 }}>
          <span style={{ fontSize: '1.1rem' }}>🔒</span>
          <div>
            <strong>Your files never leave your device.</strong>
            <br />
            All image and video processing happens entirely in your browser. No data is uploaded or
            sent to any server.
          </div>
        </Alert>
        <FolderPicker onFiles={handleFiles} />
      </Stack>
    )
  }

  // ── Loading state ────────────────────────────────────────────────────────
  if (loading) {
    return (
      <Stack className="align-items-center justify-content-center vh-100">
        <Spinner animation="border" variant="primary" className="mb-3" />
        <p className="text-muted">Reading media files…</p>
      </Stack>
    )
  }

  // ── Error state ──────────────────────────────────────────────────────────
  if (error) {
    return (
      <Stack className="align-items-center justify-content-center vh-100">
        <Alert variant="danger">{error}</Alert>
        <FolderPicker onFiles={handleFiles} />
      </Stack>
    )
  }

  // ── Loaded state ─────────────────────────────────────────────────────────
  return (
    <div>
      <Navbar className="border-bottom mb-4">
        <Container fluid>
          <Navbar.Brand className="mb-0 h1">DJI Media Viewer</Navbar.Brand>
          <span className="text-muted small me-auto ms-3">
            {folderName} · {items!.length} items
          </span>
          <FolderPicker onFiles={handleFiles} />
        </Container>
      </Navbar>
      <Container fluid>
        <FilterTabs items={items!} active={filter} onChange={handleFilterChange} />
        <MediaGrid items={items!} filter={filter} onSelect={handleSelect} />
      </Container>
      {warnings.length > 0 && (
        <Toast messages={warnings} variant="warning" onDismiss={() => setWarnings([])} />
      )}
    </div>
  )
```

- [ ] **Step 3: Format**

```bash
cd D:/Code/dji-media-viewer && bunx prettier --write app/page.tsx
```

- [ ] **Step 4: Type check**

```bash
cd D:/Code/dji-media-viewer && bunx tsc --noEmit 2>&1 | head -30
```

- [ ] **Step 5: Commit**

```bash
but status -fv
but commit ag-branch-1 -m "refactor: use react-bootstrap in page.tsx" --changes <id> --status-after
```

---

## Task 13: Final build verification

- [ ] **Step 1: Full build**

```bash
cd D:/Code/dji-media-viewer && bun run build 2>&1
```

Expected: build completes successfully with no TypeScript errors. Next.js may emit warnings about `console.log` statements left in card components — those are pre-existing and can be ignored.

- [ ] **Step 2: Fix any type errors**

If `bunx tsc --noEmit` or the build reports errors, fix them before proceeding. Common issues:
- `Card` ref type: ensure `useRef<HTMLDivElement>` (Card renders as a div)
- `Badge text` prop: `text="dark"` expects a Bootstrap text color string
- `Nav.onSelect` narrowing: ensure the `(k) => k && onChange(k as FilterType)` pattern is in place

- [ ] **Step 3: Commit fix if needed**

If Step 2 required changes, format the affected files and commit:

```bash
bunx prettier --write <file>
but status -fv
but commit ag-branch-1 -m "fix: resolve type errors from react-bootstrap refactor" --changes <ids> --status-after
```
