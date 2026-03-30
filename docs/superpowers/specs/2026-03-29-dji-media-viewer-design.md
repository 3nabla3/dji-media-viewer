# DJI Media Viewer — Design Spec

**Date:** 2026-03-29
**Status:** Approved

---

## Overview

A Next.js web app that lets users open their drone SD card folder and view all media in a unified, human-readable interface. All processing runs entirely in the browser — no server, no uploads.

---

## Architecture

**Pure client-side.** The Next.js app is effectively a static SPA. No API routes are needed.

**Stack:**
- Next.js 16 (App Router)
- Bootstrap (UI)
- `exifr` — in-browser EXIF parsing from `File` objects

---

## UI Layout

**Two states:**

1. **Empty state** — full-page centered prompt with a single "Open Folder" button (`<input type="file" webkitdirectory accept="image/*,video/*,.html">`)
2. **Loaded state:**
   - Navbar: app name, folder name, item count, "Change Folder" button
   - Filter tabs: All / Videos / Photos / HDR / Panoramas (with counts)
   - Responsive Bootstrap grid of `MediaCard` components

---

## Media Types

The app recognises four media types, each rendered differently:

| Type | Identifier | Rendering |
|------|-----------|-----------|
| **Video** | `.mp4`, `.mov` extensions | Native `<video>` element with controls |
| **Photo** | Standalone JPG (see parsing logic) | `<img>` with blob URL |
| **HDR Set** | 2–3 JPGs sharing `DateTimeOriginal` (see parsing logic) | Middle exposure `<img>` + amber "HDR preview" badge |
| **Panorama** | `.html` file with `<meta http-equiv="refresh">` redirect | Grid of component tile JPGs |

---

## File Parsing (`lib/media-parser.ts`)

Pure function: `parseMediaFiles(files: File[]): MediaItem[]`

### Step 1 — Partition by type
- `.mp4`, `.mov` → `VideoItem`
- `.html` → parse as panorama pointer (see below)
- `.jpg`, `.jpeg` → queue for EXIF-based grouping

### Step 2 — Panorama resolution
For each `.html` file:
1. Read file text content
2. Extract redirect URL from `<meta http-equiv="refresh" content="0;url=...">`
3. Normalise path (e.g. `../PANORAMA/100_0255/` relative to the HTML file's directory)
4. Collect all `File` objects whose `webkitRelativePath` falls under that folder
5. Emit `PanoramaItem { htmlFile, tiles: File[] }`

### Step 3 — HDR bracket detection
Process all JPG files:

1. Sort by filename (preserves capture order)
2. Batch-read EXIF from all JPGs using `exifr`: `DateTimeOriginal`, `ExposureBiasValue`, `XPComment`
3. **Discard panorama tiles:** exclude any JPG where `XPComment.Type === 'P'`
   - `XPComment` is a Windows XP Unicode tag (0x9C9C). `exifr` requires explicit tag inclusion in its config to read it.
   - The exact serialisation format (JSON, key=value, etc.) must be confirmed against real DJI files before implementation. Parse defensively.
4. **Group by timestamp:**
   - Primary key: `DateTimeOriginal` string
   - Edge case: if two consecutive files (by sort order) have `DateTimeOriginal` values differing by exactly 1 second, treat them as the same bracket group
5. **Classify groups:**
   - Group size 2 or 3 → `HdrItem`; identify exposures by `ExposureBiasValue`:
     - Middle: value closest to 0 (or `+1/3 EV`)
     - Under: most negative value
     - Over: most positive value
   - Group size 1 → `PhotoItem`

### Types

```ts
type MediaItem = VideoItem | PhotoItem | HdrItem | PanoramaItem;

interface VideoItem   { type: 'video';    file: File; }
interface PhotoItem   { type: 'photo';    file: File; }
interface HdrItem     { type: 'hdr';      under: File; middle: File; over: File; }
interface PanoramaItem{ type: 'panorama'; htmlFile: File; tiles: File[]; }
```

---

## Component Tree

```
app/page.tsx
├── FolderPicker         — <input webkitdirectory>, emits File[]
├── FilterTabs           — All / Videos / Photos / HDR / Panoramas
└── MediaGrid
    └── MediaCard × N    — dispatches to card variant by type
        ├── VideoCard    — <video controls src={blobUrl}>
        ├── PhotoCard    — <img src={blobUrl}>
        ├── HdrCard      — middle exposure <img> + amber badge (see below)
        └── PanoramaCard — Bootstrap grid of tile <img> elements
```

---

## HDR Rendering (Temporary)

**Current behaviour:** `HdrCard` renders the middle exposure image only.

An amber Bootstrap badge reads: **"HDR preview — full blend not yet implemented"**

```tsx
// TODO: Replace with OpenCV.js createMergeMertens exposure fusion.
// See: https://docs.opencv.org/4.x/d6/df5/group__photo__hdr.html
// cv.MergeMertens takes an array of Mat images and produces a blended result.
// OpenCV.js is ~9MB WASM — defer until HDR quality becomes a priority.
```

**Target dependency when implemented:** `opencv.js` (`cv.MergeMertens`) — the industry-standard Mertens exposure fusion implementation, widely used and trusted.

---

## Panorama Rendering

`PanoramaCard` displays the component tile JPGs in a Bootstrap responsive grid. Each tile is an `<img>` with a blob URL created from the corresponding `File` object.

No stitching is performed. The card header shows: **"Panorama — N tiles"**

---

## File Structure

```
app/
  page.tsx                   — page state, folder picker, grid
  layout.tsx                 — Bootstrap import, global styles
  globals.css
lib/
  media-parser.ts            — parseMediaFiles(), MediaItem types
components/
  FolderPicker.tsx
  FilterTabs.tsx
  MediaGrid.tsx
  cards/
    VideoCard.tsx
    PhotoCard.tsx
    HdrCard.tsx
    PanoramaCard.tsx
```

---

## Dependencies to Add

| Package | Purpose |
|---------|---------|
| `bootstrap` | UI layout and components |
| `exifr` | In-browser EXIF reading from File objects |

---

## Out of Scope (This Version)

- HDR merging (placeholder renders middle exposure)
- 360° panorama viewer / stitching
- Telemetry / GPS map overlay
- Lightbox / full-screen viewer modal
- Download / export
