# Panorama Detail Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the iframe-based PanoramaDetail with interactive viewers for SECTOR (zoomable 3×3 grid) and BALL (Three.js 360° sphere), driven by a mode registry expandable to future pano types.

**Architecture:** EXIF `GimbalYawDegree`/`GimbalPitchDegree` in every tile eliminates stitching. SECTOR composites 9 tiles onto a canvas and wraps with react-zoom-pan-pinch. BALL places 26 `PlaneGeometry` meshes at their spherical coordinates inside a Three.js scene with OrbitControls. A `VIEWERS` registry in `lib/panorama-viewers.ts` maps mode strings to components — adding a new mode = one dynamic import + one registry line.

**Tech Stack:** Three.js (dynamic-imported inside useEffect for SSR safety), react-zoom-pan-pinch, exifr (already in deps), vitest (already in deps).

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `lib/media-types.ts` | Modify | Add `panoramaMode: string` to `PanoramaItem` |
| `lib/panorama-resolver.ts` | Modify | Add `parsePanoramaMode(html)` helper |
| `lib/__tests__/panorama-resolver.test.ts` | Modify | Add tests for `parsePanoramaMode` |
| `lib/media-parser.ts` | Modify | Call `parsePanoramaMode` at parse time |
| `lib/tile-geometry.ts` | Create | Pure math helpers: `parseTileAngles`, `sortIntoGrid`, `yawPitchToXYZ` |
| `lib/__tests__/tile-geometry.test.ts` | Create | Unit tests for all three helpers |
| `lib/use-tile-angles.ts` | Create | React hook: reads EXIF angles for all tiles |
| `lib/panorama-viewers.ts` | Create | Mode registry: maps string → dynamic viewer component |
| `components/cards/PanoramaCard.tsx` | Modify | Drop `usePanoramaMode` hook, use `item.panoramaMode` |
| `components/detail/SectorViewer.tsx` | Create | Canvas composite + react-zoom-pan-pinch |
| `components/detail/BallViewer.tsx` | Create | Three.js sphere viewer with OrbitControls |
| `components/detail/PanoramaDetail.tsx` | Rewrite | Remove iframe, dispatch to registry viewer |

---

## Task 1: Install dependencies

**Files:** `package.json` (modified by bun)

- [ ] **Install three.js and react-zoom-pan-pinch**

```bash
bun install three @types/three react-zoom-pan-pinch
```

Expected: packages appear in `node_modules/three`, `node_modules/react-zoom-pan-pinch`, `node_modules/@types/three`.

- [ ] **Verify three.js types are available**

```bash
ls node_modules/@types/three/index.d.ts
```

Expected: file exists.

- [ ] **Commit**

Stage and commit via GitButler with message: `chore: add three.js and react-zoom-pan-pinch`

---

## Task 2: Add `panoramaMode` to the data layer

**Files:**
- Modify: `lib/panorama-resolver.ts`
- Modify: `lib/__tests__/panorama-resolver.test.ts`
- Modify: `lib/media-types.ts`
- Modify: `lib/media-parser.ts`
- Modify: `components/cards/PanoramaCard.tsx`

### Step 1: Write failing tests for `parsePanoramaMode`

Add this describe block to `lib/__tests__/panorama-resolver.test.ts` (after the existing ones):

```typescript
describe("parsePanoramaMode", () => {
  it("extracts and normalises BALL mode", () => {
    const html = `<html><head>
<meta http-equiv="refresh" content="0;url=../PANORAMA/100_0123/">
<meta data-PANOMODE="BALL  ">
</head></html>`;
    expect(parsePanoramaMode(html)).toBe("ball");
  });

  it("extracts and normalises SECTOR mode", () => {
    const html = `<meta data-PANOMODE="SECTOR">`;
    expect(parsePanoramaMode(html)).toBe("sector");
  });

  it("returns empty string when no PANOMODE meta tag", () => {
    expect(parsePanoramaMode("<html></html>")).toBe("");
  });
});
```

Also add `parsePanoramaMode` to the import at the top of the test file:

```typescript
import {
  parsePanoramaRedirectUrl,
  resolveRelativePath,
  collectPanoramaTiles,
  parsePanoramaMode,
} from "../panorama-resolver";
```

- [ ] **Run tests to verify they fail**

```bash
bun test lib/__tests__/panorama-resolver.test.ts
```

Expected: 3 failures — `parsePanoramaMode is not a function`.

### Step 2: Implement `parsePanoramaMode` in `lib/panorama-resolver.ts`

Add this export after `collectPanoramaTiles`:

```typescript
/**
 * Extracts the panorama mode from a DJI panorama HTML file.
 * DJI writes: <meta data-PANOMODE="BALL  ">
 * Returns the value trimmed and lowercased, or "" if not found.
 */
export function parsePanoramaMode(html: string): string {
  const match = html.match(/data-PANOMODE=["']([^"']+)["']/i);
  return match ? match[1].trim().toLowerCase() : "";
}
```

- [ ] **Run tests to verify they pass**

```bash
bun test lib/__tests__/panorama-resolver.test.ts
```

Expected: all existing tests + 3 new ones pass.

### Step 3: Add `panoramaMode` to `PanoramaItem` in `lib/media-types.ts`

Replace the `PanoramaItem` interface:

```typescript
export interface PanoramaItem {
  type: "panorama";
  htmlFile: File;
  tiles: File[];
  panoramaMode: string;
  date: Date;
}
```

### Step 4: Update `lib/media-parser.ts` to populate `panoramaMode`

Add `parsePanoramaMode` to the import at the top:

```typescript
import { collectPanoramaTiles, parsePanoramaMode } from "./panorama-resolver";
```

In the `panoramaResults` mapping (around line 82), add `panoramaMode` to the returned object:

```typescript
return {
  type: "panorama" as const,
  htmlFile,
  tiles,
  panoramaMode: parsePanoramaMode(html),
  date: new Date(htmlFile.lastModified),
};
```

### Step 5: Update `components/cards/PanoramaCard.tsx` to use `item.panoramaMode`

Remove `getPanoramaMode`, `usePanoramaMode`, and their imports. Replace with direct field access.

The file should look like this after the change:

```typescript
// components/cards/PanoramaCard.tsx
"use client";

import { Card, Badge } from "react-bootstrap";
import type { PanoramaItem } from "@/lib/media-types";
import { useThumbnail } from "@/lib/use-thumbnail";

export default function PanoramaCard({
  item,
  onClick,
}: {
  item: PanoramaItem;
  onClick: () => void;
}) {
  const { url, ref } = useThumbnail(item.tiles[0]);

  return (
    <Card
      ref={ref}
      className="h-100"
      style={{ cursor: "pointer" }}
      onClick={onClick}
    >
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={url}
          alt={item.htmlFile.name}
          className="card-img-top"
          style={{ height: "200px", objectFit: "cover" }}
        />
      ) : (
        <div
          className="card-img-top bg-secondary-subtle"
          style={{ height: "200px" }}
        />
      )}
      <Card.Body className="p-2">
        <Badge bg="info" text="dark" className="me-1">
          PANORAMA
        </Badge>
        <small className="text-muted">
          {item.htmlFile.name}
          {item.panoramaMode && ` - ${item.panoramaMode}`}
        </small>
      </Card.Body>
    </Card>
  );
}
```

- [ ] **Run full test suite**

```bash
bun test
```

Expected: all tests pass (TypeScript compilation verifies the new field is set everywhere).

- [ ] **Commit**

Stage and commit via GitButler with message: `feat: add panoramaMode to PanoramaItem, parse from HTML at load time`

---

## Task 3: Pure geometry helpers + tests (TDD)

**Files:**
- Create: `lib/tile-geometry.ts`
- Create: `lib/__tests__/tile-geometry.test.ts`

### Step 1: Write the failing tests first

Create `lib/__tests__/tile-geometry.test.ts`:

```typescript
// lib/__tests__/tile-geometry.test.ts
import { describe, it, expect } from "vitest";
import { parseTileAngles, sortIntoGrid, yawPitchToXYZ } from "../tile-geometry";

describe("parseTileAngles", () => {
  it("extracts yaw and pitch from exifr output", () => {
    const result = parseTileAngles({
      GimbalYawDegree: 45.5,
      GimbalPitchDegree: -30.0,
    });
    expect(result).toEqual({ yaw: 45.5, pitch: -30.0 });
  });

  it("returns 0,0 for null input", () => {
    expect(parseTileAngles(null)).toEqual({ yaw: 0, pitch: 0 });
  });

  it("returns 0,0 when fields are absent", () => {
    expect(parseTileAngles({})).toEqual({ yaw: 0, pitch: 0 });
  });

  it("returns 0,0 when fields are non-numeric", () => {
    expect(parseTileAngles({ GimbalYawDegree: "north", GimbalPitchDegree: null }))
      .toEqual({ yaw: 0, pitch: 0 });
  });
});

describe("sortIntoGrid", () => {
  // Real SECTOR angles from DJI_0144 panorama
  const SECTOR_TILES = [
    { yaw: 72.96,  pitch: -6.83  },
    { yaw: 72.90,  pitch: 17.91  },
    { yaw: 97.67,  pitch: 17.99  },
    { yaw: 97.79,  pitch: -6.15  },
    { yaw: 97.79,  pitch: -31.15 },
    { yaw: 73.05,  pitch: -31.89 },
    { yaw: 48.17,  pitch: -31.31 },
    { yaw: 48.11,  pitch: -6.44  },
    { yaw: 48.11,  pitch: 17.86  },
  ];

  it("produces 3 rows and 3 columns from 9 sector tiles", () => {
    const grid = sortIntoGrid(SECTOR_TILES);
    expect(grid).toHaveLength(3);
    expect(grid[0]).toHaveLength(3);
    expect(grid[1]).toHaveLength(3);
    expect(grid[2]).toHaveLength(3);
  });

  it("top row has the highest pitch values", () => {
    const grid = sortIntoGrid(SECTOR_TILES);
    const topRowPitches = grid[0].map((t) => t.pitch);
    const midRowPitches = grid[1].map((t) => t.pitch);
    expect(Math.min(...topRowPitches)).toBeGreaterThan(Math.max(...midRowPitches));
  });

  it("each row is sorted left-to-right by yaw ascending", () => {
    const grid = sortIntoGrid(SECTOR_TILES);
    for (const row of grid) {
      for (let i = 1; i < row.length; i++) {
        expect(row[i].yaw).toBeGreaterThan(row[i - 1].yaw);
      }
    }
  });
});

describe("yawPitchToXYZ", () => {
  it("yaw=0 pitch=0 points along positive Z axis", () => {
    const [x, y, z] = yawPitchToXYZ(0, 0, 1);
    expect(x).toBeCloseTo(0);
    expect(y).toBeCloseTo(0);
    expect(z).toBeCloseTo(1);
  });

  it("yaw=90 pitch=0 points along positive X axis", () => {
    const [x, y, z] = yawPitchToXYZ(90, 0, 1);
    expect(x).toBeCloseTo(1);
    expect(y).toBeCloseTo(0);
    expect(z).toBeCloseTo(0);
  });

  it("yaw=180 pitch=0 points along negative Z axis", () => {
    const [x, y, z] = yawPitchToXYZ(180, 0, 1);
    expect(x).toBeCloseTo(0);
    expect(y).toBeCloseTo(0);
    expect(z).toBeCloseTo(-1);
  });

  it("pitch=-90 points along negative Y axis (nadir)", () => {
    const [x, y, z] = yawPitchToXYZ(0, -90, 1);
    expect(x).toBeCloseTo(0);
    expect(y).toBeCloseTo(-1);
    expect(z).toBeCloseTo(0);
  });

  it("pitch=+90 points along positive Y axis (zenith)", () => {
    const [x, y, z] = yawPitchToXYZ(0, 90, 1);
    expect(x).toBeCloseTo(0);
    expect(y).toBeCloseTo(1);
    expect(z).toBeCloseTo(0);
  });

  it("scales result by radius", () => {
    const [x, y, z] = yawPitchToXYZ(0, 0, 100);
    expect(z).toBeCloseTo(100);
  });

  it("result vector has magnitude equal to radius", () => {
    const [x, y, z] = yawPitchToXYZ(37, -22, 50);
    const mag = Math.sqrt(x * x + y * y + z * z);
    expect(mag).toBeCloseTo(50);
  });
});
```

- [ ] **Run tests to verify they fail**

```bash
bun test lib/__tests__/tile-geometry.test.ts
```

Expected: all 12 tests fail with `Cannot find module '../tile-geometry'`.

### Step 2: Implement `lib/tile-geometry.ts`

Create `lib/tile-geometry.ts`:

```typescript
// lib/tile-geometry.ts

export interface TileAngles {
  yaw: number;   // degrees, GimbalYawDegree
  pitch: number; // degrees, GimbalPitchDegree
}

/**
 * Extracts yaw and pitch from a raw exifr.parse() result.
 * Returns { yaw: 0, pitch: 0 } if either field is absent or non-numeric.
 */
export function parseTileAngles(raw: unknown): TileAngles {
  if (raw !== null && typeof raw === "object") {
    const r = raw as Record<string, unknown>;
    const yaw =
      typeof r.GimbalYawDegree === "number" ? r.GimbalYawDegree : 0;
    const pitch =
      typeof r.GimbalPitchDegree === "number" ? r.GimbalPitchDegree : 0;
    return { yaw, pitch };
  }
  return { yaw: 0, pitch: 0 };
}

/**
 * Sorts tiles into a row-major 2D grid.
 * Rows are ordered by descending pitch (highest pitch = top row).
 * Within each row, tiles are ordered by ascending yaw (left to right).
 *
 * Tiles with similar pitch values (within 10°) are grouped into the same row.
 * This handles minor gimbal variation between captures.
 */
export function sortIntoGrid<T extends TileAngles>(tiles: T[]): T[][] {
  // Round pitch to nearest 10° to group tiles in the same row together
  const key = (t: T) => Math.round(t.pitch / 10) * 10;

  const groups = new Map<number, T[]>();
  for (const tile of tiles) {
    const k = key(tile);
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k)!.push(tile);
  }

  // Sort rows highest pitch first (top of image = highest pitch)
  const sortedKeys = [...groups.keys()].sort((a, b) => b - a);

  return sortedKeys.map((k) =>
    [...groups.get(k)!].sort((a, b) => a.yaw - b.yaw),
  );
}

/**
 * Converts gimbal yaw + pitch (degrees) to a 3D Cartesian point on a sphere.
 *
 * Convention (matches DJI gimbal axes):
 *   yaw=0,   pitch=0  →  (0, 0, +radius)   forward / north
 *   yaw=90,  pitch=0  →  (+radius, 0, 0)    east
 *   yaw=0,   pitch=90 →  (0, +radius, 0)    zenith
 *   yaw=0,   pitch=-90→  (0, -radius, 0)    nadir
 */
export function yawPitchToXYZ(
  yaw: number,
  pitch: number,
  radius: number,
): [number, number, number] {
  const yawRad = (yaw * Math.PI) / 180;
  const pitchRad = (pitch * Math.PI) / 180;
  const x = radius * Math.cos(pitchRad) * Math.sin(yawRad);
  const y = radius * Math.sin(pitchRad);
  const z = radius * Math.cos(pitchRad) * Math.cos(yawRad);
  return [x, y, z];
}
```

- [ ] **Run tests to verify they all pass**

```bash
bun test lib/__tests__/tile-geometry.test.ts
```

Expected: all 12 tests pass.

- [ ] **Run full test suite to check for regressions**

```bash
bun test
```

Expected: all tests pass.

- [ ] **Commit**

Stage and commit via GitButler with message: `feat: add tile-geometry helpers (parseTileAngles, sortIntoGrid, yawPitchToXYZ)`

---

## Task 4: `use-tile-angles` hook

**Files:**
- Create: `lib/use-tile-angles.ts`

- [ ] **Create `lib/use-tile-angles.ts`**

```typescript
// lib/use-tile-angles.ts
"use client";

import { useEffect, useState } from "react";
import exifr from "exifr";
import { parseTileAngles, type TileAngles } from "./tile-geometry";

export interface TileWithAngles extends TileAngles {
  file: File;
}

/**
 * Props interface shared by all panorama viewer components.
 * Defined here (not in panorama-viewers.ts) to avoid a circular
 * dependency: panorama-viewers.ts dynamically imports the viewers,
 * and the viewers need ViewerProps — so ViewerProps must live in a
 * module neither side imports from the other.
 */
export interface ViewerProps {
  tiles: TileWithAngles[];
}

/**
 * Reads GimbalYawDegree + GimbalPitchDegree from the EXIF of each tile.
 * Returns null while loading, the enriched array once all EXIF is read.
 */
export function useTileAngles(tiles: File[]): TileWithAngles[] | null {
  const [result, setResult] = useState<TileWithAngles[] | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const enriched = await Promise.all(
        tiles.map(async (file) => {
          const raw = await exifr
            .parse(file, { pick: ["GimbalYawDegree", "GimbalPitchDegree"] })
            .catch(() => null);
          return { file, ...parseTileAngles(raw) };
        }),
      );
      if (!cancelled) setResult(enriched);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [tiles]);

  return result;
}
```

- [ ] **Commit**

Stage and commit via GitButler with message: `feat: add useTileAngles hook`

---

## Task 5: Viewer registry

**Files:**
- Create: `lib/panorama-viewers.ts`

- [ ] **Create `lib/panorama-viewers.ts`**

```typescript
// lib/panorama-viewers.ts
"use client";

import dynamic from "next/dynamic";
import type { ComponentType } from "react";
import type { ViewerProps } from "./use-tile-angles";

// Re-export so consumers only need one import
export type { ViewerProps };

// Dynamic imports: Three.js loads only when BallViewer is actually rendered.
const SectorViewer = dynamic(
  () => import("@/components/detail/SectorViewer"),
  { ssr: false },
) as ComponentType<ViewerProps>;

const BallViewer = dynamic(
  () => import("@/components/detail/BallViewer"),
  { ssr: false },
) as ComponentType<ViewerProps>;

const VIEWERS: Partial<Record<string, ComponentType<ViewerProps>>> = {
  sector: SectorViewer,
  ball: BallViewer,
};

/**
 * Returns the viewer component for the given panorama mode string,
 * or null if the mode is not yet supported.
 * Add new modes here as one line.
 */
export function getViewer(mode: string): ComponentType<ViewerProps> | null {
  return VIEWERS[mode] ?? null;
}
```

- [ ] **Commit**

Stage and commit via GitButler with message: `feat: add panorama viewer registry`

---

## Task 6: `SectorViewer` component

**Files:**
- Create: `components/detail/SectorViewer.tsx`

- [ ] **Create `components/detail/SectorViewer.tsx`**

```typescript
// components/detail/SectorViewer.tsx
"use client";

import { useEffect, useState } from "react";
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";
import { sortIntoGrid } from "@/lib/tile-geometry";
import type { ViewerProps } from "@/lib/use-tile-angles";

// Pixel dimensions of each DJI panorama tile
const TILE_W = 2000;
const TILE_H = 1500;

export default function SectorViewer({ tiles }: ViewerProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(0);

  useEffect(() => {
    let compositeUrl: string | null = null;
    let cancelled = false;

    async function composite() {
      const grid = sortIntoGrid(tiles);
      const cols = grid[0]?.length ?? 0;
      const rows = grid.length;

      const canvas = document.createElement("canvas");
      canvas.width = cols * TILE_W;
      canvas.height = rows * TILE_H;
      const ctx = canvas.getContext("2d")!;

      let count = 0;
      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < (grid[row]?.length ?? 0); col++) {
          if (cancelled) return;
          const tile = grid[row][col];
          const objUrl = URL.createObjectURL(tile.file);

          await new Promise<void>((resolve) => {
            const img = new Image();
            img.onload = () => {
              ctx.drawImage(img, col * TILE_W, row * TILE_H, TILE_W, TILE_H);
              URL.revokeObjectURL(objUrl);
              count++;
              if (!cancelled) setLoaded(count);
              resolve();
            };
            img.onerror = () => {
              URL.revokeObjectURL(objUrl);
              resolve();
            };
            img.src = objUrl;
          });
        }
      }

      if (cancelled) return;

      canvas.toBlob(
        (blob) => {
          if (!cancelled && blob) {
            compositeUrl = URL.createObjectURL(blob);
            setImageUrl(compositeUrl);
          }
        },
        "image/jpeg",
        0.92,
      );
    }

    composite();

    return () => {
      cancelled = true;
      if (compositeUrl) URL.revokeObjectURL(compositeUrl);
    };
  }, [tiles]);

  if (!imageUrl) {
    return (
      <div
        className="d-flex align-items-center justify-content-center bg-black"
        style={{ height: "70vh" }}
      >
        <span className="text-muted">
          Loading tiles ({loaded}/{tiles.length})…
        </span>
      </div>
    );
  }

  return (
    <TransformWrapper
      initialScale={1}
      minScale={0.05}
      maxScale={10}
      centerOnInit
    >
      <TransformComponent
        wrapperStyle={{ width: "100%", height: "70vh", background: "#000" }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imageUrl}
          alt="Sector panorama"
          style={{ maxWidth: "none", display: "block" }}
        />
      </TransformComponent>
    </TransformWrapper>
  );
}
```

- [ ] **Commit**

Stage and commit via GitButler with message: `feat: add SectorViewer (canvas composite + zoom/pan)`

---

## Task 7: `BallViewer` component

**Files:**
- Create: `components/detail/BallViewer.tsx`

- [ ] **Create `components/detail/BallViewer.tsx`**

```typescript
// components/detail/BallViewer.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { yawPitchToXYZ } from "@/lib/tile-geometry";
import type { ViewerProps } from "@/lib/use-tile-angles";

// Sphere radius — all tiles are placed at this distance from the camera
const SPHERE_RADIUS = 100;

// DJI Mini 4 Pro approximate FOV for 4:3 panorama tiles
const HFOV_DEG = 69.4;
const VFOV_DEG = 54.3;

// Width/height of each tile plane at SPHERE_RADIUS distance
const TILE_W =
  2 * SPHERE_RADIUS * Math.tan(((HFOV_DEG / 2) * Math.PI) / 180);
const TILE_H =
  2 * SPHERE_RADIUS * Math.tan(((VFOV_DEG / 2) * Math.PI) / 180);

export default function BallViewer({ tiles }: ViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [tilesLoaded, setTilesLoaded] = useState(0);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    let animId: number;
    const blobUrls: string[] = [];
    let cleanupFn: (() => void) | undefined;

    async function init() {
      // Dynamic import keeps Three.js out of the SSR bundle
      const THREE = await import("three");
      const { OrbitControls } = await import(
        "three/examples/jsm/controls/OrbitControls.js"
      );

      const renderer = new THREE.WebGLRenderer({ antialias: true });
      renderer.setSize(el.clientWidth, el.clientHeight);
      renderer.setPixelRatio(window.devicePixelRatio);
      el.appendChild(renderer.domElement);

      const scene = new THREE.Scene();
      scene.background = new THREE.Color(0x111111);

      const camera = new THREE.PerspectiveCamera(
        75,
        el.clientWidth / el.clientHeight,
        0.1,
        1000,
      );
      // Camera at origin; OrbitControls will set up the target
      camera.position.set(0, 0, 0.001); // tiny offset avoids degenerate lookAt

      const controls = new OrbitControls(camera, renderer.domElement);
      controls.enableZoom = true;
      controls.enablePan = false;
      controls.rotateSpeed = -0.4; // negative = natural drag direction
      controls.zoomSpeed = 0.5;
      controls.target.set(0, 0, 1); // look forward
      controls.update();

      const loader = new THREE.TextureLoader();
      let loaded = 0;

      for (const tile of tiles) {
        const blobUrl = URL.createObjectURL(tile.file);
        blobUrls.push(blobUrl);

        const [x, y, z] = yawPitchToXYZ(tile.yaw, tile.pitch, SPHERE_RADIUS);
        const geometry = new THREE.PlaneGeometry(TILE_W, TILE_H);

        const texture = loader.load(blobUrl, () => {
          loaded++;
          setTilesLoaded(loaded);
        });
        texture.colorSpace = THREE.SRGBColorSpace;

        const material = new THREE.MeshBasicMaterial({
          map: texture,
          side: THREE.DoubleSide,
          depthWrite: false,
        });

        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(x, y, z);
        // lookAt(origin) makes the plane face inward toward the camera
        mesh.lookAt(0, 0, 0);
        scene.add(mesh);
      }

      function animate() {
        animId = requestAnimationFrame(animate);
        controls.update();
        renderer.render(scene, camera);
      }
      animate();

      const resizeObserver = new ResizeObserver(() => {
        renderer.setSize(el.clientWidth, el.clientHeight);
        camera.aspect = el.clientWidth / el.clientHeight;
        camera.updateProjectionMatrix();
      });
      resizeObserver.observe(el);

      cleanupFn = () => {
        resizeObserver.disconnect();
        cancelAnimationFrame(animId);
        controls.dispose();
        scene.traverse((obj) => {
          if (obj instanceof THREE.Mesh) {
            obj.geometry.dispose();
            const mat = obj.material as THREE.MeshBasicMaterial;
            mat.map?.dispose();
            mat.dispose();
          }
        });
        renderer.dispose();
        if (el.contains(renderer.domElement)) {
          el.removeChild(renderer.domElement);
        }
        blobUrls.forEach((u) => URL.revokeObjectURL(u));
      };
    }

    init();

    return () => {
      cleanupFn?.();
    };
  }, [tiles]);

  return (
    <div style={{ position: "relative", height: "70vh" }}>
      <div
        ref={containerRef}
        style={{ width: "100%", height: "100%", cursor: "grab" }}
      />
      {tilesLoaded < tiles.length && (
        <div
          style={{
            position: "absolute",
            bottom: 12,
            left: 0,
            right: 0,
            textAlign: "center",
            pointerEvents: "none",
          }}
        >
          <span className="text-muted" style={{ fontSize: "0.8rem" }}>
            Loading tiles ({tilesLoaded}/{tiles.length})…
          </span>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Commit**

Stage and commit via GitButler with message: `feat: add BallViewer (Three.js sphere with OrbitControls)`

---

## Task 8: Rewrite `PanoramaDetail`

**Files:**
- Rewrite: `components/detail/PanoramaDetail.tsx`

- [ ] **Rewrite `components/detail/PanoramaDetail.tsx`**

```typescript
// components/detail/PanoramaDetail.tsx
"use client";

import { Badge, Container, Row, Spinner } from "react-bootstrap";
import type { PanoramaItem } from "@/lib/media-types";
import { formatBytes } from "./format";
import DetailNav from "./DetailNav";
import MetaTile from "./MetaTile";
import { useTileAngles } from "@/lib/use-tile-angles";
import { getViewer } from "@/lib/panorama-viewers";

export default function PanoramaDetail({ item }: { item: PanoramaItem }) {
  const tiles = useTileAngles(item.tiles);
  const Viewer = getViewer(item.panoramaMode);

  const totalSize = item.tiles.reduce(
    (sum, f) => sum + f.size,
    item.htmlFile.size,
  );

  function renderViewer() {
    if (!tiles) {
      return (
        <div
          className="d-flex align-items-center justify-content-center bg-black"
          style={{ height: "70vh" }}
        >
          <Spinner animation="border" variant="secondary" />
        </div>
      );
    }
    if (!Viewer) {
      return (
        <div
          className="d-flex align-items-center justify-content-center bg-black"
          style={{ height: "70vh" }}
        >
          <span className="text-muted">
            Unsupported panorama mode:{" "}
            <strong>{item.panoramaMode || "(unknown)"}</strong>
          </span>
        </div>
      );
    }
    return <Viewer tiles={tiles} />;
  }

  return (
    <div>
      <DetailNav
        filename={item.htmlFile.name}
        badge={
          <Badge bg="info" text="dark">
            PANORAMA
          </Badge>
        }
      />

      {renderViewer()}

      <Container fluid className="py-4">
        <h6 className="text-uppercase text-muted mb-3">Panorama Info</h6>
        <Row className="g-2">
          <MetaTile label="Mode" value={item.panoramaMode || "unknown"} />
          <MetaTile label="Viewer File" value={item.htmlFile.name} />
          <MetaTile label="Tiles" value={`${item.tiles.length}`} />
          <MetaTile label="Total Size" value={formatBytes(totalSize)} />
        </Row>
      </Container>
    </div>
  );
}
```

Note: `onFullscreen` is removed from `DetailNav` — the old iframe-based fullscreen button no longer applies. If fullscreen support is needed later it can be re-added for the canvas/Three.js elements.

- [ ] **Run full test suite**

```bash
bun test
```

Expected: all tests pass.

- [ ] **Commit**

Stage and commit via GitButler with message: `feat: rewrite PanoramaDetail — remove iframe, dispatch to viewer registry`

---

## Self-Review Checklist

- [x] `parsePanoramaMode` tested in panorama-resolver tests ✓
- [x] `PanoramaItem.panoramaMode` added to types and populated in parser ✓
- [x] `PanoramaCard` no longer uses async hook for mode ✓
- [x] `tile-geometry.ts` fully unit-tested ✓
- [x] `useTileAngles` hook reads EXIF, returns null while loading ✓
- [x] Registry uses `getViewer(mode)` with clear null fallback ✓
- [x] `SectorViewer` composites 9 tiles, shows progress, pan/zoom ✓
- [x] `BallViewer` places tiles by gimbal angles, OrbitControls, cleans up ✓
- [x] `PanoramaDetail` removes iframe, handles loading/unsupported states ✓
- [x] `DetailNav` `onFullscreen` prop removed (iframe gone) — check `DetailNav` props to confirm it's optional or remove it ✓

**One pre-flight check:** read `components/detail/DetailNav.tsx` before Task 8 to confirm whether `onFullscreen` is required or optional. If required, make it optional first.
