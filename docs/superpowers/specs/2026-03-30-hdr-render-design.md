# HDR Rendering — Design Spec

**Date:** 2026-03-30
**Status:** Approved

---

## Overview

Implement real HDR exposure fusion for bracket sets using OpenCV.js (Mertens algorithm), replacing the temporary middle-exposure preview in `HdrDetail`. Fix a pre-existing label bug where under-exposed images are incorrectly marked as over-exposed.

---

## Bug Fix: Exposure Labels in HdrDetail

**File:** `components/detail/HdrDetail.tsx` line 73

**Problem:** The component re-sorts `item.files` by filename instead of using the existing EV-sorted order from `hdr-detector.ts`. DJI captures HDR brackets in order normal → over → under, so the under-exposed file (last in EV sort) ends up at a high filename index and is incorrectly labeled "Over-exposed".

**Fix:** Remove the filename sort; use `item.files` directly — it is already sorted ascending by `ExposureBiasValue` in `hdr-detector.ts`.

```diff
- const sorted = [...item.files].sort((a, b) => a.name.localeCompare(b.name))
+ const sorted = item.files  // already sorted ascending by ExposureBiasValue
```

`middleIndex` is then correct relative to EV order, so indices below it are under-exposed and indices above it are over-exposed.

---

## HDR Rendering Architecture

### New module: `lib/opencv-hdr.ts`

Single exported function:

```typescript
export async function renderHdr(files: File[]): Promise<Blob>
```

**Responsibilities:**
1. Load OpenCV.js from CDN (jsDelivr) via a dynamic `<script>` tag — module-level singleton promise so the WASM is only downloaded once per session regardless of navigation.
2. Decode each `File` → `ImageBitmap` via `createImageBitmap()` → draw to offscreen `<canvas>` → read pixels into a `cv.Mat` (CV_8UC4).
3. Convert each mat from RGBA → BGR (OpenCV native format).
4. Build a `cv.MatVector` from all source mats.
5. Call `cv.createMergeMertens().process(srcVec, dst)` — Mertens exposure fusion.
6. Scale float32 result to uint8: `dst.convertTo(out, cv.CV_8U, 255)`.
7. Convert BGR → RGBA, draw to canvas, call `canvas.toBlob('image/png')`.
8. Free all `cv.Mat` and `cv.MatVector` in a `finally` block to prevent memory leaks.
9. Return the resulting `Blob`.

### Changes to `HdrDetail.tsx`

**State additions:**
- `hdrRendering: boolean` — true while OpenCV is loading/processing
- `hdrError: boolean` — true if rendering failed (triggers toast, auto-clears after 5s)

**On mount (useEffect):**
1. Immediately create object URL from `item.middle` → set as `url` (existing behavior, unchanged).
2. Set `hdrRendering = true`, call `renderHdr(item.files)`:
   - **Success:** revoke old object URL, set new blob URL, set `hdrRendering = false`.
   - **Error:** set `hdrRendering = false`, set `hdrError = true` (toast auto-dismisses after 5s via `setTimeout`). Middle image remains visible.

**UI changes:**
- The `<img>` element is wrapped in a `position-relative` container.
- While `hdrRendering` is true: a small badge overlay in the top-right corner shows a Bootstrap spinner + "Rendering HDR…" text.
- A Bootstrap toast (fixed, top-right, `position-fixed top-0 end-0 p-3`) renders when `hdrError` is true: "HDR rendering failed — showing middle exposure instead."

### Gallery card (`HdrCard.tsx`)

No changes. Continues to show `item.middle` as the thumbnail preview.

---

## Error Handling

| Scenario | Behaviour |
|---|---|
| OpenCV.js fails to load (no internet, CDN down) | `renderHdr` rejects → toast shown, middle image kept |
| File decoding fails | `renderHdr` rejects → same |
| Mertens processing throws | `renderHdr` rejects → same |
| User navigates away before render completes | Effect cleanup revokes any pending object URLs; OpenCV singleton load continues in background but result is discarded |

---

## Constraints

- OpenCV.js is loaded from CDN on demand (~8–10 MB WASM). This is a one-time cost per browser session.
- HDR rendering is CPU-bound and may take 2–10 seconds on large images. The middle-exposure preview is always shown immediately so the page is never blank.
- `HdrCard.tsx` (gallery thumbnail) always shows `item.middle` — no HDR rendering in the gallery.
