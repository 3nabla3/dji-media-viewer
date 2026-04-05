# Panorama Detail Page — Design Spec

**Date:** 2026-04-05

## Overview

Replace the current iframe-based `PanoramaDetail` with a proper interactive viewer.
Two modes are implemented now (SECTOR, BALL); the architecture is a registry so future
modes (SPHERE, 180°, etc.) each require only one new component and one registry line.

## Key Insight

Every DJI panorama tile has `GimbalYawDegree` and `GimbalPitchDegree` in its EXIF.
No stitching is required — tiles can be placed directly at their capture coordinates.

## Data Layer

### `lib/use-tile-angles.ts`

Hook that enriches `PanoramaItem.tiles` with EXIF angles.

```ts
interface TileWithAngles {
  file:  File;
  yaw:   number;   // GimbalYawDegree, degrees
  pitch: number;   // GimbalPitchDegree, degrees
}

function useTileAngles(tiles: File[]): TileWithAngles[] | null
// Returns null while loading, array once all EXIF is read.
// Uses exifr (already in deps), picks only GimbalYawDegree + GimbalPitchDegree.
```

### Pure helpers (lib/tile-geometry.ts)

Extracted as pure functions for unit-testability:

```ts
// Parse raw exifr result → { yaw, pitch }
parseTileAngles(raw: unknown): { yaw: number; pitch: number }

// Sort tiles into row-major grid for SECTOR viewer.
// Groups by pitch (descending = top row first), then yaw (ascending = left to right).
sortIntoGrid(tiles: TileWithAngles[]): TileWithAngles[][]

// Spherical coords → Three.js XYZ (camera at origin, looking inside sphere).
yawPitchToXYZ(yaw: number, pitch: number, radius: number): [number, number, number]
```

## Viewer Registry

### `lib/panorama-viewers.ts`

```ts
export type PanoramaMode = string;   // open-ended for future modes

interface ViewerProps {
  tiles: TileWithAngles[];
}

const VIEWERS: Partial<Record<PanoramaMode, ComponentType<ViewerProps>>> = {
  sector: SectorViewer,
  ball:   BallViewer,
};

export function getViewer(mode: PanoramaMode): ComponentType<ViewerProps> | null
```

### `components/detail/PanoramaDetail.tsx`

- Removes the iframe entirely.
- Reads `item.panoramaMode` (already parsed from HTML `<meta data-PANOMODE>`).
- Calls `useTileAngles(item.tiles)` → loading spinner while EXIF loads.
- Looks up viewer in registry. If not found → renders a "Unsupported panorama mode: X" notice.
- Passes `tiles` (with angles) to the resolved viewer component.

Note: `PanoramaItem` currently has no `panoramaMode` field — it must be added.
`media-types.ts` → add `panoramaMode: string` to `PanoramaItem`.
`media-parser.ts` → parse the mode from the HTML text (already read at parse time)
using a shared helper `parsePanoramaMode(html: string): string` in `panorama-resolver.ts`.
Normalize with `.trim().toLowerCase()` before storing and before registry lookup.
`PanoramaCard.tsx` can then drop its `usePanoramaMode` hook and read `item.panoramaMode` directly.

## SECTOR Viewer

**File:** `components/detail/SectorViewer.tsx`

**Input:** 9 tiles (GimbalYaw ~48°/73°/97°, GimbalPitch ~+18°/-6°/-31°)

**Rendering:**
1. Sort tiles into a 3×3 grid using `sortIntoGrid()`.
2. Create blob URLs for each tile.
3. Draw all 9 images onto a single offscreen `HTMLCanvasElement`
   (3 columns × 3 rows, each image 2000×1500 px → canvas ~6000×4500 px).
4. Convert canvas to blob URL and pass to `<img>` wrapped in `react-zoom-pan-pinch`.

**Interaction:** Pinch/wheel zoom, drag to pan. `react-zoom-pan-pinch` handles this.

**Loading:** Shows a spinner + "Loading tiles (N/9)…" while images decode.

**Why canvas composite instead of a CSS grid of `<img>`:**
One blob URL = one `<img>` = smoother zoom performance, no tile seam rendering
artefacts on zoom levels that land between tiles.

## BALL Viewer

**File:** `components/detail/BallViewer.tsx`

**Input:** 26 tiles with gimbal angles spanning the full sphere.

**Rendering (Three.js):**
1. Create a scene with a `PerspectiveCamera` at origin (FOV 75°).
2. For each tile:
   - Create a blob URL → load as `THREE.Texture`.
   - Create a `PlaneGeometry` sized to cover the tile's angular extent
     (use DJI Mini 4 Pro HFOV ≈ 69° for 4:3 tiles as a constant, adjustable).
   - Position mesh on the sphere surface at `yawPitchToXYZ(yaw, pitch, 100)`.
   - Rotate mesh normal to point toward origin (inward-facing).
   - Apply texture; set `side: THREE.FrontSide`.
3. Add `OrbitControls` (mouse drag = look around, scroll = zoom FOV).
4. Animate with `requestAnimationFrame`.

**Initial orientation:** Camera starts at yaw=0°, pitch=0° (horizon, north).

**Loading:** Shows "Loading tiles (N/26)…" progress; tiles appear incrementally as
textures load (Three.js loads each `PlaneGeometry` as its texture becomes ready).

**Cleanup:** On component unmount, dispose all textures, geometries, materials,
renderer, and revoke all blob URLs.

## Dependencies to Add

```
bun install three @types/three react-zoom-pan-pinch
```

No other new dependencies.

## Tests

Location: `lib/__tests__/tile-geometry.test.ts`

- `parseTileAngles`: given mock exifr output, asserts correct yaw/pitch extraction;
  handles missing fields gracefully (returns `{yaw: 0, pitch: 0}`).
- `sortIntoGrid`: given 9 tiles with the real SECTOR angles, asserts 3 rows × 3 cols,
  top-left is highest pitch + lowest yaw.
- `yawPitchToXYZ`: spot-check known angles against expected XYZ (yaw=0 pitch=0 →
  positive Z axis; yaw=90 pitch=0 → positive X axis; pitch=-90 → negative Y axis).

## Files Changed / Created

| File | Action |
|------|--------|
| `lib/media-types.ts` | Add `panoramaMode: string` to `PanoramaItem` |
| `lib/panorama-resolver.ts` | Add `parsePanoramaMode(html)` helper |
| `lib/media-parser.ts` | Call `parsePanoramaMode` at parse time |
| `components/cards/PanoramaCard.tsx` | Drop `usePanoramaMode` hook, read `item.panoramaMode` |
| `components/detail/PanoramaDetail.tsx` | Rewrite (remove iframe) |
| `components/detail/SectorViewer.tsx` | New |
| `components/detail/BallViewer.tsx` | New |
| `lib/panorama-viewers.ts` | New |
| `lib/tile-geometry.ts` | New |
| `lib/use-tile-angles.ts` | New |
| `lib/__tests__/tile-geometry.test.ts` | New |

## Out of Scope

- Stitching / blending at tile seams.
- Other panorama modes (SPHERE, 180°, HYPERLAPSE) — registry is ready for them.
- Mobile touch on BALL viewer (OrbitControls handles basic touch, no extra work needed).
