# EXIF Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extract duplicated EXIF type, parsing logic, and display JSX into shared modules, and add per-exposure metadata selection to HdrDetail.

**Architecture:** Create `components/detail/exif.ts` (type + parser) and `components/detail/ExifSections.tsx` (display component), then simplify `PhotoDetail` and `HdrDetail` to use them. HdrDetail gains a `selectedIndex` state so clicking any exposure box shows its metadata.

**Tech Stack:** TypeScript, React 19, exifr 7, React-Bootstrap 5, Next.js 16, Vitest 4

---

## File Map

| File | Action |
|------|--------|
| `components/detail/exif.ts` | **Create** — `MediaExif` interface + `parseExif(file)` |
| `lib/__tests__/exif.test.ts` | **Create** — unit tests for `parseExif` |
| `components/detail/ExifSections.tsx` | **Create** — renders File Info, Camera Settings, DJI Flight Data |
| `components/detail/PhotoDetail.tsx` | **Modify** — remove local type/parser/JSX, use shared modules |
| `components/detail/HdrDetail.tsx` | **Modify** — remove local type/parser/JSX, add per-exposure selection |

---

## Task 1: Create `exif.ts` — shared type and parse function

**Files:**
- Create: `components/detail/exif.ts`
- Create: `lib/__tests__/exif.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `lib/__tests__/exif.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { parseExif } from "../../components/detail/exif";

// Mock exifr so tests don't need real JPEG files
vi.mock("exifr", () => ({
  default: {
    parse: vi.fn(),
  },
}));

import exifr from "exifr";

const mockParse = vi.mocked(exifr.parse);

beforeEach(() => {
  mockParse.mockReset();
});

const fakeFile = new File([], "test.jpg", { type: "image/jpeg" });

describe("parseExif", () => {
  it("returns empty object when exifr returns null", async () => {
    mockParse.mockResolvedValue(null);
    const result = await parseExif(fakeFile);
    expect(result).toEqual({});
  });

  it("maps standard EXIF fields", async () => {
    const date = new Date("2024-01-15T10:00:00");
    mockParse.mockResolvedValue({
      DateTimeOriginal: date,
      ISO: 100,
      FNumber: 2.8,
      ExposureTime: 0.002,
      FocalLength: 24,
      ExifImageWidth: 4000,
      ExifImageHeight: 2250,
    });
    const result = await parseExif(fakeFile);
    expect(result.dateTimeOriginal).toBe(date);
    expect(result.iso).toBe(100);
    expect(result.fNumber).toBe(2.8);
    expect(result.exposureTime).toBe(0.002);
    expect(result.focalLength).toBe(24);
    expect(result.imageWidth).toBe(4000);
    expect(result.imageHeight).toBe(2250);
  });

  it("maps GPS fields", async () => {
    mockParse.mockResolvedValue({
      latitude: 45.1234,
      longitude: -75.5678,
      GPSLatitudeRef: "N",
      GPSLongitudeRef: "W",
    });
    const result = await parseExif(fakeFile);
    expect(result.latitude).toBe(45.1234);
    expect(result.longitude).toBe(-75.5678);
    expect(result.gpsLatitudeRef).toBe("N");
    expect(result.gpsLongitudeRef).toBe("W");
  });

  it("maps DJI XMP fields", async () => {
    mockParse.mockResolvedValue({
      AbsoluteAltitude: 120.5,
      RelativeAltitude: 80.0,
      GimbalPitchDegree: -45.0,
      GimbalYawDegree: 30.0,
      GimbalRollDegree: 0.0,
      FlightPitchDegree: 2.1,
      FlightYawDegree: 180.0,
      FlightRollDegree: -1.5,
    });
    const result = await parseExif(fakeFile);
    expect(result.absoluteAltitude).toBe(120.5);
    expect(result.relativeAltitude).toBe(80.0);
    expect(result.gimbalPitchDegree).toBe(-45.0);
    expect(result.gimbalYawDegree).toBe(30.0);
    expect(result.gimbalRollDegree).toBe(0.0);
    expect(result.flightPitchDegree).toBe(2.1);
    expect(result.flightYawDegree).toBe(180.0);
    expect(result.flightRollDegree).toBe(-1.5);
  });

  it("ignores fields with wrong types", async () => {
    mockParse.mockResolvedValue({
      ISO: "not-a-number",
      FNumber: null,
      DateTimeOriginal: "not-a-date",
      latitude: "45.1",
    });
    const result = await parseExif(fakeFile);
    expect(result.iso).toBeUndefined();
    expect(result.fNumber).toBeUndefined();
    expect(result.dateTimeOriginal).toBeUndefined();
    expect(result.latitude).toBeUndefined();
  });

  it("returns empty object when exifr throws", async () => {
    mockParse.mockRejectedValue(new Error("parse error"));
    const result = await parseExif(fakeFile);
    expect(result).toEqual({});
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
bun run test
```

Expected: all `parseExif` tests fail with "Cannot find module" or "parseExif is not a function".

- [ ] **Step 3: Create `components/detail/exif.ts`**

```ts
// components/detail/exif.ts
import exifr from "exifr";

export interface MediaExif {
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

export async function parseExif(file: File): Promise<MediaExif> {
  try {
    const data = await exifr.parse(file, { xmp: true });
    if (!data) return {};
    return {
      dateTimeOriginal:
        data.DateTimeOriginal instanceof Date
          ? data.DateTimeOriginal
          : undefined,
      imageWidth:
        typeof data.ExifImageWidth === "number"
          ? data.ExifImageWidth
          : undefined,
      imageHeight:
        typeof data.ExifImageHeight === "number"
          ? data.ExifImageHeight
          : undefined,
      iso: typeof data.ISO === "number" ? data.ISO : undefined,
      fNumber: typeof data.FNumber === "number" ? data.FNumber : undefined,
      exposureTime:
        typeof data.ExposureTime === "number" ? data.ExposureTime : undefined,
      focalLength:
        typeof data.FocalLength === "number" ? data.FocalLength : undefined,
      latitude:
        typeof data.latitude === "number" ? data.latitude : undefined,
      longitude:
        typeof data.longitude === "number" ? data.longitude : undefined,
      gpsLatitudeRef:
        typeof data.GPSLatitudeRef === "string"
          ? data.GPSLatitudeRef
          : undefined,
      gpsLongitudeRef:
        typeof data.GPSLongitudeRef === "string"
          ? data.GPSLongitudeRef
          : undefined,
      absoluteAltitude:
        typeof data.AbsoluteAltitude === "number"
          ? data.AbsoluteAltitude
          : undefined,
      relativeAltitude:
        typeof data.RelativeAltitude === "number"
          ? data.RelativeAltitude
          : undefined,
      gimbalRollDegree:
        typeof data.GimbalRollDegree === "number"
          ? data.GimbalRollDegree
          : undefined,
      gimbalYawDegree:
        typeof data.GimbalYawDegree === "number"
          ? data.GimbalYawDegree
          : undefined,
      gimbalPitchDegree:
        typeof data.GimbalPitchDegree === "number"
          ? data.GimbalPitchDegree
          : undefined,
      flightRollDegree:
        typeof data.FlightRollDegree === "number"
          ? data.FlightRollDegree
          : undefined,
      flightYawDegree:
        typeof data.FlightYawDegree === "number"
          ? data.FlightYawDegree
          : undefined,
      flightPitchDegree:
        typeof data.FlightPitchDegree === "number"
          ? data.FlightPitchDegree
          : undefined,
    };
  } catch {
    return {};
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
bun run test
```

Expected: all tests in `lib/__tests__/exif.test.ts` pass.

- [ ] **Step 5: Commit**

```bash
but status -fv
# note the file IDs for exif.ts and exif.test.ts
but commit fix-metadata -m "feat: add shared MediaExif type and parseExif function" --changes <id1>,<id2> --status-after
```

---

## Task 2: Create `ExifSections.tsx` — shared display component

**Files:**
- Create: `components/detail/ExifSections.tsx`

(No unit tests — component rendering tests are not set up in this codebase. Verify visually after Tasks 3–4.)

- [ ] **Step 1: Create `components/detail/ExifSections.tsx`**

```tsx
// components/detail/ExifSections.tsx
import { Container, Row } from "react-bootstrap";
import type { MediaExif } from "./exif";
import { formatBytes, formatDate, formatShutter } from "./format";
import MetaTile from "./MetaTile";

interface ExifSectionsProps {
  exif: MediaExif;
  file: { name: string; size: number };
}

export default function ExifSections({ exif, file }: ExifSectionsProps) {
  const lat =
    exif.latitude != null
      ? `${exif.latitude.toFixed(4)}° ${exif.gpsLatitudeRef ?? ""}`
      : "—";
  const lng =
    exif.longitude != null
      ? `${exif.longitude.toFixed(4)}° ${exif.gpsLongitudeRef ?? ""}`
      : "—";

  return (
    <Container fluid className="py-4">
      <h6 className="text-uppercase text-muted mb-3">File Info</h6>
      <Row className="g-2 mb-4">
        <MetaTile label="Filename" value={file.name} />
        <MetaTile label="File Size" value={formatBytes(file.size)} />
        <MetaTile
          label="Date Taken"
          value={exif.dateTimeOriginal ? formatDate(exif.dateTimeOriginal) : "—"}
        />
        <MetaTile
          label="Dimensions"
          value={
            exif.imageWidth != null && exif.imageHeight != null
              ? `${exif.imageWidth} × ${exif.imageHeight}`
              : "—"
          }
        />
      </Row>

      <h6 className="text-uppercase text-muted mb-3">Camera Settings</h6>
      <Row className="g-2 mb-4">
        <MetaTile label="ISO" value={exif.iso?.toString() ?? "—"} />
        <MetaTile
          label="Aperture"
          value={exif.fNumber != null ? `f/${exif.fNumber}` : "—"}
        />
        <MetaTile
          label="Shutter"
          value={
            exif.exposureTime != null ? formatShutter(exif.exposureTime) : "—"
          }
        />
        <MetaTile
          label="Focal Length"
          value={exif.focalLength != null ? `${exif.focalLength} mm` : "—"}
        />
      </Row>

      <h6 className="text-uppercase text-muted mb-3">DJI Flight Data</h6>
      <Row className="g-2">
        <MetaTile label="GPS" value={`${lat}, ${lng}`} />
        <MetaTile
          label="Altitude (Abs)"
          value={
            exif.absoluteAltitude != null ? `${exif.absoluteAltitude} m` : "—"
          }
        />
        <MetaTile
          label="Altitude (Rel)"
          value={
            exif.relativeAltitude != null ? `${exif.relativeAltitude} m` : "—"
          }
        />
        <MetaTile
          label="Gimbal Pitch"
          value={
            exif.gimbalPitchDegree != null ? `${exif.gimbalPitchDegree}°` : "—"
          }
        />
        <MetaTile
          label="Gimbal Yaw"
          value={
            exif.gimbalYawDegree != null ? `${exif.gimbalYawDegree}°` : "—"
          }
        />
        <MetaTile
          label="Gimbal Roll"
          value={
            exif.gimbalRollDegree != null ? `${exif.gimbalRollDegree}°` : "—"
          }
        />
        <MetaTile
          label="Flight Yaw"
          value={
            exif.flightYawDegree != null ? `${exif.flightYawDegree}°` : "—"
          }
        />
        <MetaTile
          label="Flight Pitch"
          value={
            exif.flightPitchDegree != null ? `${exif.flightPitchDegree}°` : "—"
          }
        />
        <MetaTile
          label="Flight Roll"
          value={
            exif.flightRollDegree != null ? `${exif.flightRollDegree}°` : "—"
          }
        />
      </Row>
    </Container>
  );
}
```

- [ ] **Step 2: Type-check**

```bash
bun next build 2>&1 | grep -E "error|Error" | head -20
```

Expected: no TypeScript errors referencing `ExifSections.tsx` or `exif.ts`.

- [ ] **Step 3: Commit**

```bash
but status -fv
# note the file ID for ExifSections.tsx
but commit fix-metadata -m "feat: add ExifSections shared display component" --changes <id> --status-after
```

---

## Task 3: Refactor `PhotoDetail.tsx`

**Files:**
- Modify: `components/detail/PhotoDetail.tsx`

- [ ] **Step 1: Replace `PhotoDetail.tsx` with the refactored version**

Replace the entire file content with:

```tsx
// components/detail/PhotoDetail.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { Badge } from "react-bootstrap";
import type { PhotoItem } from "@/lib/media-types";
import { type MediaExif, parseExif } from "./exif";
import DetailNav from "./DetailNav";
import ExifSections from "./ExifSections";

export default function PhotoDetail({ item }: { item: PhotoItem }) {
  const [url, setUrl] = useState("");
  const [exif, setExif] = useState<MediaExif>({});
  const mediaRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const objectUrl = URL.createObjectURL(item.file);
    setUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [item.file]);

  useEffect(() => {
    parseExif(item.file).then(setExif);
  }, [item.file]);

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
        />
      )}

      <ExifSections exif={exif} file={item.file} />
    </div>
  );
}
```

- [ ] **Step 2: Type-check**

```bash
bun next build 2>&1 | grep -E "error|Error" | head -20
```

Expected: no errors in `PhotoDetail.tsx`.

- [ ] **Step 3: Commit**

```bash
but status -fv
# note the file ID for PhotoDetail.tsx
but commit fix-metadata -m "refactor: simplify PhotoDetail using shared exif + ExifSections" --changes <id> --status-after
```

---

## Task 4: Refactor `HdrDetail.tsx` — per-exposure selection

**Files:**
- Modify: `components/detail/HdrDetail.tsx`

- [ ] **Step 1: Replace `HdrDetail.tsx` with the refactored version**

Replace the entire file content with:

```tsx
// components/detail/HdrDetail.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { Badge, Col, Row, Spinner, Toast } from "react-bootstrap";
import type { HdrItem } from "@/lib/media-types";
import { type MediaExif, parseExif } from "./exif";
import DetailNav from "./DetailNav";
import ExifSections from "./ExifSections";
import { renderHdr } from "@/lib/opencv-hdr";

export default function HdrDetail({ item }: { item: HdrItem }) {
  const [url, setUrl] = useState("");
  const [exifList, setExifList] = useState<MediaExif[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number>(() =>
    item.files.findIndex((f) => f.name === item.middle.name)
  );
  const [hdrRendering, setHdrRendering] = useState(false);
  const [hdrError, setHdrError] = useState(false);
  const mediaRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const previewUrl = URL.createObjectURL(item.middle);
    setUrl(previewUrl);
    setHdrRendering(true);
    setHdrError(false);

    let hdrBlobUrl: string | null = null;
    let cancelled = false;
    let errorTimer: ReturnType<typeof setTimeout> | null = null;
    let previewRevoked = false;

    renderHdr(item.files)
      .then((blob) => {
        if (cancelled) return;
        URL.revokeObjectURL(previewUrl);
        previewRevoked = true;
        hdrBlobUrl = URL.createObjectURL(blob);
        setUrl(hdrBlobUrl);
        setHdrRendering(false);
      })
      .catch((e) => {
        console.error(e);
        if (cancelled) return;
        setHdrRendering(false);
        setHdrError(true);
        errorTimer = setTimeout(() => setHdrError(false), 5000);
      });

    return () => {
      cancelled = true;
      if (!previewRevoked) URL.revokeObjectURL(previewUrl);
      if (hdrBlobUrl) URL.revokeObjectURL(hdrBlobUrl);
      if (errorTimer) clearTimeout(errorTimer);
    };
  }, [item.files, item.middle]);

  useEffect(() => {
    Promise.all(item.files.map(parseExif)).then(setExifList);
  }, [item.files]);

  const middleIndex = item.files.findIndex((f) => f.name === item.middle.name);

  return (
    <div>
      <DetailNav
        filename={item.middle.name}
        badge={
          <Badge bg="warning" text="dark">
            HDR
          </Badge>
        }
        onFullscreen={() => mediaRef.current?.requestFullscreen()}
      />

      {url && (
        <div className="position-relative">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            ref={mediaRef}
            src={url}
            alt={item.middle.name}
            className="img-fluid w-100"
          />
          {hdrRendering && (
            <div className="position-absolute top-0 end-0 m-2">
              <span className="badge bg-dark bg-opacity-75 d-flex align-items-center gap-1">
                <Spinner
                  animation="border"
                  size="sm"
                  role="status"
                  aria-hidden="true"
                />
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

      <div className="px-3 pt-4">
        <h6 className="text-uppercase text-muted mb-3">HDR Bracket Set</h6>
        <Row className="g-2 mb-4">
          {item.files.map((f, i) => {
            const isMiddle = f.name === item.middle.name;
            const isSelected = i === selectedIndex;
            const label = isMiddle
              ? "Middle (preview)"
              : i < middleIndex
                ? "Under-exposed"
                : "Over-exposed";
            const badgeBg = isMiddle
              ? "success"
              : i < middleIndex
                ? "warning"
                : "info";
            const badgeText = isMiddle ? undefined : "dark";
            return (
              <Col key={i} xs={6} md={4}>
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => setSelectedIndex(i)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") setSelectedIndex(i);
                  }}
                  className={`border rounded p-2 h-100 ${
                    isSelected
                      ? "border-primary border-2 bg-primary bg-opacity-10"
                      : isMiddle
                        ? "border-success"
                        : ""
                  }`}
                  style={{ cursor: "pointer" }}
                >
                  <Badge bg={badgeBg} text={badgeText} className="mb-1">
                    {label}
                  </Badge>
                  <div className="small text-muted">{f.name}</div>
                  <div className="small">{`${(f.size / 1024 / 1024).toFixed(1)} MB`}</div>
                </div>
              </Col>
            );
          })}
        </Row>
      </div>

      {exifList[selectedIndex] && (
        <ExifSections
          exif={exifList[selectedIndex]}
          file={item.files[selectedIndex]}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 2: Type-check**

```bash
bun next build 2>&1 | grep -E "error|Error" | head -20
```

Expected: no errors in `HdrDetail.tsx`.

- [ ] **Step 3: Run all tests**

```bash
bun run test
```

Expected: all tests pass (including the new `exif.test.ts` from Task 1).

- [ ] **Step 4: Commit**

```bash
but status -fv
# note the file ID for HdrDetail.tsx
but commit fix-metadata -m "refactor: HdrDetail with per-exposure selection and shared exif modules" --changes <id> --status-after
```

---

## Self-Review Notes

- `MediaExif` defined in Task 1, used consistently in Tasks 2, 3, 4
- `parseExif` signature `(file: File): Promise<MediaExif>` matches all call sites
- `ExifSectionsProps` uses `{ name: string; size: number }` — compatible with `File` objects passed in Tasks 3 and 4
- `exifList[selectedIndex]` guard (`&& exifList[selectedIndex]`) handles the async loading gap before exif is parsed
- `selectedIndex` initializes to `middleIndex` so default selection matches existing behaviour
- All spec sections covered: shared type ✓, shared parser ✓, shared display ✓, PhotoDetail cleanup ✓, HdrDetail exposure selection ✓
