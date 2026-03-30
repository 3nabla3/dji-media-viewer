# Media Detail Page — Design Spec

**Date:** 2026-03-29
**Status:** Approved

---

## Overview

Add a dedicated detail page for each media item in the DJI Media Viewer. Clicking any card in the gallery navigates to `/media/[index]`, which shows the item at full size alongside metadata not visible in the gallery. Supports all four media types: Photo, Video, HDR, Panorama.

---

## Navigation

**Approach:** Next.js dynamic route `/media/[index]`.

Media items are held in memory as `File` objects (not URL-serializable), so they are shared via a React Context provider wrapping the entire app. The detail page looks up `items[index]` from context.

**Empty context guard:** If a user lands on `/media/42` with no items loaded (e.g. page refresh), the detail page redirects to `/`.

**Exit UX — three ways to go back:**
1. "← Back to gallery" button in the navbar (always visible)
2. Browser back button (works because it's a real URL)
3. `Escape` key (keyboard shortcut via `keydown` listener)

---

## Layout

**Stacked:** media full-width on top, metadata grid below.

- Navbar at the top: back button + filename + type badge
- Media area: full-width at natural aspect ratio
- Metadata section: grouped tiles in a responsive CSS grid (`col` Bootstrap grid)

---

## File Changes

### New files

| File | Purpose |
|------|---------|
| `lib/media-context.tsx` | `MediaContext` + `MediaProvider` holding `items: MediaItem[] \| null` and `setItems` setter |
| `app/media/[index]/page.tsx` | Detail page — reads `params.index`, resolves item from context, renders the correct detail component. Redirects to `/` if context is empty. |
| `components/detail/PhotoDetail.tsx` | Full-res `<img>` + on-demand EXIF via `exifr` |
| `components/detail/VideoDetail.tsx` | `<video controls>` + duration/resolution from element + codec/fps/bitrate from `mp4box.js` |
| `components/detail/HdrDetail.tsx` | Middle-exposure `<img>` + bracket set list + EXIF from middle file via `exifr` |
| `components/detail/PanoramaDetail.tsx` | `<iframe>` with blob URL of the DJI HTML viewer |

### Modified files

| File | Change |
|------|--------|
| `app/layout.tsx` | Wrap `{children}` in `<MediaProvider>` |
| `app/page.tsx` | Read `setItems` from context; on card click call `router.push('/media/${index}')` |
| `components/MediaGrid.tsx` | Accept `onSelect: (index: number) => void` prop; pass index down to each card |
| `components/cards/VideoCard.tsx` | Accept and call `onClick` prop; add pointer cursor |
| `components/cards/PhotoCard.tsx` | Accept and call `onClick` prop; add pointer cursor |
| `components/cards/HdrCard.tsx` | Accept and call `onClick` prop; add pointer cursor |
| `components/cards/PanoramaCard.tsx` | Accept and call `onClick` prop; add pointer cursor |

---

## Metadata by Type

### Photo (`PhotoItem`)

Loaded on-demand via `exifr.parse(item.file, { pick: [...] })` in the detail component.

**File info:** filename, file size, date taken (`DateTimeOriginal`), dimensions (from `<img>` `naturalWidth`/`naturalHeight`), camera model

**Camera settings:** ISO, aperture (`FNumber`), shutter speed (`ExposureTime`), focal length

**DJI flight data** (parsed from `XPComment` key=value string): GPS latitude/longitude, absolute altitude, relative altitude, gimbal pitch/yaw/roll, flight yaw

### Video (`VideoItem`)

**File info:** filename, file size, last modified

**Video properties** (from `<video>` element `loadedmetadata`): duration, resolution (`videoWidth` × `videoHeight`), aspect ratio

**Container & codec** (from `mp4box.js` parsing file `ArrayBuffer`): video codec (e.g. H.265/HEVC), frame rate, bitrate, audio codec, creation time, color profile

### HDR (`HdrItem`)

**Bracket set:** list of all files with their EV bias values (under / middle / over), color-coded

**Camera & flight** (from `exifr` on `item.middle`): same fields as Photo — ISO, aperture, GPS, altitude, gimbal data, date taken

### Panorama (`PanoramaItem`)

**Interactive viewer:** `<iframe>` embedding the DJI HTML viewer via a blob URL. The blob URL is created on mount and revoked on unmount. The iframe must include `sandbox="allow-scripts allow-same-origin"` since DJI's viewer requires JavaScript to render the 360° scene.

**Panorama info:** viewer filename, tile count, total file size (sum of all tile file sizes)

---

## Dependencies

- `exifr` — already in use; extend the `pick` list for detail-page reads
- `mp4box.js` — new dependency; used only in `VideoDetail`, loaded on mount

---

## Bootstrap Elements Used

- `navbar` + `btn btn-outline-secondary` — back button and header
- `badge` — media type indicator
- `img-fluid` — photo display
- `w-100` — video and iframe width
- Bootstrap grid (`row` / `col`) — metadata tiles

---

## Error Handling

- EXIF read failures are caught and silently skipped; fields show "—" if unavailable
- `mp4box.js` parse failures are caught; codec section shows "unavailable"
- If `items` context is null on the detail page, redirect to `/` immediately
- If `index` is out of bounds, redirect to `/`
