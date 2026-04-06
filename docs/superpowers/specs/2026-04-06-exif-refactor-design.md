# EXIF Refactor — Shared Type, Parser, and Display Component

**Date:** 2026-04-06

## Goal

Eliminate the duplicated EXIF type, parsing code, and display JSX between `PhotoDetail` and `HdrDetail`. Add per-exposure metadata selection to `HdrDetail`.

---

## Section 1: Shared type and parse function

**New file: `components/detail/exif.ts`**

### `MediaExif` interface

Single shared EXIF type (based on `HdrExif` — no `make`/`model`):

```ts
interface MediaExif {
  dateTimeOriginal?: Date;
  imageWidth?: number;
  imageHeight?: number;
  iso?: number;
  fNumber?: number;
  exposureTime?: number;
  focalLength?: number;
  latitude?: number;
  longitude?: number;
  gpsLatitudeRef?: string;
  gpsLongitudeRef?: string;
  absoluteAltitude?: number;
  relativeAltitude?: number;
  gimbalRollDegree?: number;
  gimbalYawDegree?: number;
  gimbalPitchDegree?: number;
  flightRollDegree?: number;
  flightYawDegree?: number;
  flightPitchDegree?: number;
}
```

### `parseExif(file: File): Promise<MediaExif>`

Extracted from the existing parsing logic in both components. Calls `exifr.parse(file, { xmp: true })` and maps the raw data to `MediaExif`. Includes `ExifImageWidth` / `ExifImageHeight` (the `PixelXDimension` / `PixelYDimension` EXIF tags) mapped to `imageWidth` / `imageHeight`.

---

## Section 2: Shared display component

**New file: `components/detail/ExifSections.tsx`**

### Props

```ts
interface ExifSectionsProps {
  exif: MediaExif;
  file: { name: string; size: number };
}
```

### Renders three sections

1. **File Info** — Filename, File Size, Date Taken, Dimensions (`imageWidth × imageHeight`, or `—` if absent)
2. **Camera Settings** — ISO, Aperture, Shutter, Focal Length
3. **DJI Flight Data** — GPS (lat/lng with ref), Altitude (Abs), Altitude (Rel), Gimbal Pitch/Yaw/Roll, Flight Yaw/Pitch/Roll

Uses existing `MetaTile` + Bootstrap `Container`/`Row`. No new dependencies.

---

## Section 3: HdrDetail changes

### Exposure selector (Option A — inline)

- **New state:** `selectedIndex: number` — defaults to `middleIndex`
- **New state:** `exifList: MediaExif[]` — populated by running `parseExif` on each file in `item.files` on mount (one entry per file, in the same sorted order)
- **Bracket row:** same 3 colored boxes (Under/Middle/Over badges unchanged). Clicking a box sets `selectedIndex`. The active box gets a `border-primary` highlight ring.
- **Metadata:** `<ExifSections exif={exifList[selectedIndex]} file={item.files[selectedIndex]} />` renders below the bracket row. Updates when selection changes.
- The "Camera Settings (middle exposure)" subheading is removed — `ExifSections` replaces it.
- The "HDR Bracket Set" section heading stays above the bracket row.

---

## Section 4: PhotoDetail changes

- Remove `naturalSize` state and `onLoad` handler from `<img>`
- Change local `PhotoExif` state type to `MediaExif` (imported from `exif.ts`)
- Replace the inline `exifr.parse` call with the shared `parseExif(item.file)`
- Replace the three metadata `<Container>` sections with `<ExifSections exif={exif} file={item.file} />`

---

## Files touched

| File | Action |
|------|--------|
| `components/detail/exif.ts` | **Create** — `MediaExif` type + `parseExif` function |
| `components/detail/ExifSections.tsx` | **Create** — shared display component |
| `components/detail/PhotoDetail.tsx` | **Edit** — use shared type, parser, and display component |
| `components/detail/HdrDetail.tsx` | **Edit** — use shared type, parser, display component; add per-exposure selection |

No other files are affected.
