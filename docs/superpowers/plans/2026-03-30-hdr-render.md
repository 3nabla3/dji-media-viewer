# HDR Rendering Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the under/over-exposure label bug in `HdrDetail`, then implement real HDR exposure fusion using OpenCV.js MergeMertens, lazily rendering on detail page load while showing the middle-exposure frame as an immediate preview.

**Architecture:** A new `lib/opencv-hdr.ts` module loads OpenCV.js from CDN on demand (singleton), decodes the bracket files to `cv.Mat`, runs `MergeMertens.process()`, and returns a `Blob`. `HdrDetail.tsx` shows the middle-exposure image immediately, kicks off `renderHdr()` in a `useEffect`, then swaps to the HDR result or shows a Bootstrap toast on failure. The gallery card (`HdrCard.tsx`) is unchanged — always shows `item.middle`.

**Tech Stack:** Next.js 16.2.1, React 19, TypeScript, Bootstrap 5.3.8, Vitest 4, OpenCV.js (loaded from jsDelivr CDN at runtime). Package manager: `bun`.

---

## File Map

| File | Action | Purpose |
|---|---|---|
| `components/detail/HdrDetail.tsx` | Modify | Bug fix (line 73) + HDR rendering state/UI |
| `lib/opencv-hdr.ts` | Create | OpenCV.js loader + `renderHdr()` function |

---

## Task 1: Fix the exposure label bug in HdrDetail.tsx

**Files:**
- Modify: `components/detail/HdrDetail.tsx:73`

**Background:** `item.files` is already sorted ascending by `ExposureBiasValue` in `hdr-detector.ts`. The component re-sorts by filename, which breaks label assignment when DJI captures in normal → over → under order (causing both non-middle files to be labeled "Over-exposed").

- [ ] **Step 1: Open the file and locate the sort**

  In `components/detail/HdrDetail.tsx` at line 73:

  ```typescript
  const sorted = [...item.files].sort((a, b) => a.name.localeCompare(b.name))
  ```

- [ ] **Step 2: Replace with EV-sorted array**

  Change line 73 to:

  ```typescript
  const sorted = item.files  // already sorted ascending by ExposureBiasValue in hdr-detector.ts
  ```

- [ ] **Step 3: Run the existing tests to verify nothing broke**

  ```bash
  bun test
  ```

  Expected: all tests pass (the fix is in display logic, not in the detector itself).

- [ ] **Step 4: Commit**

  ```bash
  git add components/detail/HdrDetail.tsx
  git commit -m "fix: use EV-sorted item.files for bracket labels in HdrDetail

  Re-sorting by filename broke label assignment when DJI captures
  brackets in normal→over→under order, causing the under-exposed
  frame to be labelled Over-exposed. item.files is already sorted
  ascending by ExposureBiasValue from hdr-detector.ts."
  ```

---

## Task 2: Create lib/opencv-hdr.ts

**Files:**
- Create: `lib/opencv-hdr.ts`

This module has two responsibilities: lazily loading OpenCV.js from CDN (once per session) and performing Mertens exposure fusion on a set of `File` objects.

**Why no unit tests:** The module depends entirely on browser APIs (`document`, `createImageBitmap`, `URL.createObjectURL`, `canvas.toBlob`) and OpenCV WASM. The existing vitest setup runs in a `node` environment with no DOM, so these APIs are unavailable. Testing is done via the running app in Task 3.

- [ ] **Step 1: Create the file**

  Create `lib/opencv-hdr.ts` with the following content:

  ```typescript
  // lib/opencv-hdr.ts
  // Browser-only: loads OpenCV.js from CDN and performs Mertens HDR exposure fusion.

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  type CV = any

  declare global {
    interface Window {
      cv: CV
    }
  }

  let cvLoadPromise: Promise<void> | null = null

  function loadOpenCV(): Promise<void> {
    if (cvLoadPromise) return cvLoadPromise
    cvLoadPromise = new Promise<void>((resolve, reject) => {
      // Already loaded and initialized
      if (typeof window.cv !== 'undefined' && window.cv.Mat) {
        resolve()
        return
      }
      const script = document.createElement('script')
      script.src = 'https://cdn.jsdelivr.net/npm/opencv.js@1.2.1/opencv.js'
      script.async = true
      script.onerror = () => reject(new Error('Failed to load OpenCV.js from CDN'))
      script.onload = () => {
        // cv may already be initialized synchronously, or need to wait for WASM
        if (window.cv?.Mat) {
          resolve()
        } else {
          window.cv = window.cv ?? {}
          window.cv['onRuntimeInitialized'] = resolve
        }
      }
      document.head.appendChild(script)
    })
    return cvLoadPromise
  }

  /**
   * Merges 2–3 bracketed exposure files into a single HDR-fused image using
   * OpenCV.js MergeMertens. Files must be sorted ascending by ExposureBiasValue
   * (as stored in HdrItem.files). Returns a JPEG Blob of the fused result.
   */
  export async function renderHdr(files: File[]): Promise<Blob> {
    await loadOpenCV()
    const cv = window.cv

    const mats: CV[] = []
    const srcVec = new cv.MatVector()
    let dst: CV | null = null
    let result: CV | null = null
    let rgba: CV | null = null

    try {
      for (const file of files) {
        const bitmap = await createImageBitmap(file)
        const canvas = document.createElement('canvas')
        canvas.width = bitmap.width
        canvas.height = bitmap.height
        const ctx = canvas.getContext('2d')!
        ctx.drawImage(bitmap, 0, 0)
        bitmap.close()

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
        const rgba8 = cv.matFromImageData(imageData)
        const bgr = new cv.Mat()
        cv.cvtColor(rgba8, bgr, cv.COLOR_RGBA2BGR)
        rgba8.delete()

        mats.push(bgr)
        srcVec.push_back(bgr)
      }

      dst = new cv.Mat()
      const merger = cv.createMergeMertens()
      merger.process(srcVec, dst)
      merger.delete()

      // dst is CV_32FC3 in [0,1] — scale to uint8
      result = new cv.Mat()
      dst.convertTo(result, cv.CV_8U, 255)

      // Convert BGR → RGBA for canvas display
      rgba = new cv.Mat()
      cv.cvtColor(result, rgba, cv.COLOR_BGR2RGBA)

      const outputCanvas = document.createElement('canvas')
      outputCanvas.width = rgba.cols
      outputCanvas.height = rgba.rows
      cv.imshow(outputCanvas, rgba)

      return new Promise<Blob>((resolve, reject) => {
        outputCanvas.toBlob(
          (blob) => {
            blob ? resolve(blob) : reject(new Error('canvas.toBlob returned null'))
          },
          'image/jpeg',
          0.95,
        )
      })
    } finally {
      srcVec.delete()
      mats.forEach((m) => m.delete())
      dst?.delete()
      result?.delete()
      rgba?.delete()
    }
  }
  ```

- [ ] **Step 2: Run the existing tests to confirm nothing is broken**

  ```bash
  bun test
  ```

  Expected: all tests pass (the new file has no unit tests — it's browser-only).

- [ ] **Step 3: Commit**

  ```bash
  git add lib/opencv-hdr.ts
  git commit -m "feat: add opencv-hdr module with MergeMertens exposure fusion

  Loads OpenCV.js from jsDelivr CDN on first use (singleton promise,
  cached for the browser session). Decodes each bracketed File to a
  cv.Mat, runs createMergeMertens().process(), scales float32→uint8,
  and returns a JPEG Blob. All cv.Mat objects freed in finally block."
  ```

---

## Task 3: Integrate HDR rendering into HdrDetail.tsx

**Files:**
- Modify: `components/detail/HdrDetail.tsx`

Replace the existing `url` effect with a merged effect that: (1) shows the middle frame immediately, (2) kicks off `renderHdr()`, (3) swaps to HDR on success, (4) shows an error toast on failure. Add a spinner overlay and Bootstrap toast to the JSX.

- [ ] **Step 1: Add the import and new state variables**

  At the top of `components/detail/HdrDetail.tsx`, add the import after the existing imports:

  ```typescript
  import { renderHdr } from '@/lib/opencv-hdr'
  ```

  Inside `HdrDetail`, add two new state variables after the existing `const [exif, setExif] = useState<HdrExif>({})` line:

  ```typescript
  const [hdrRendering, setHdrRendering] = useState(false)
  const [hdrError, setHdrError] = useState(false)
  ```

- [ ] **Step 2: Replace the url useEffect with a merged effect**

  Remove the existing `url` effect (lines 30–34):

  ```typescript
  useEffect(() => {
    const objectUrl = URL.createObjectURL(item.middle)
    setUrl(objectUrl)
    return () => URL.revokeObjectURL(objectUrl)
  }, [item.middle])
  ```

  Replace it with:

  ```typescript
  useEffect(() => {
    const previewUrl = URL.createObjectURL(item.middle)
    setUrl(previewUrl)
    setHdrRendering(true)

    let hdrBlobUrl: string | null = null
    let cancelled = false
    let errorTimer: ReturnType<typeof setTimeout> | null = null

    renderHdr(item.files)
      .then((blob) => {
        if (cancelled) return
        URL.revokeObjectURL(previewUrl)
        hdrBlobUrl = URL.createObjectURL(blob)
        setUrl(hdrBlobUrl)
        setHdrRendering(false)
      })
      .catch(() => {
        if (cancelled) return
        setHdrRendering(false)
        setHdrError(true)
        errorTimer = setTimeout(() => setHdrError(false), 5000)
      })

    return () => {
      cancelled = true
      URL.revokeObjectURL(previewUrl)
      if (hdrBlobUrl) URL.revokeObjectURL(hdrBlobUrl)
      if (errorTimer) clearTimeout(errorTimer)
    }
  }, [item.files, item.middle])
  ```

- [ ] **Step 3: Wrap the image in a position-relative container with a spinner overlay**

  Find the current image JSX (lines 84–87):

  ```tsx
  {url && (
    // eslint-disable-next-line @next/next/no-img-element
    <img ref={mediaRef} src={url} alt={item.middle.name} className="img-fluid w-100" />
  )}
  ```

  Replace it with:

  ```tsx
  {url && (
    <div className="position-relative">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img ref={mediaRef} src={url} alt={item.middle.name} className="img-fluid w-100" />
      {hdrRendering && (
        <div className="position-absolute top-0 end-0 m-2">
          <span className="badge bg-dark bg-opacity-75 d-flex align-items-center gap-1">
            <span
              className="spinner-border spinner-border-sm"
              role="status"
              aria-hidden="true"
            />
            Rendering HDR…
          </span>
        </div>
      )}
    </div>
  )}
  ```

- [ ] **Step 4: Add the error toast**

  Directly after the image block (after the closing `}`), add:

  ```tsx
  {hdrError && (
    <div
      className="toast show position-fixed top-0 end-0 m-3"
      role="alert"
      aria-live="assertive"
      style={{ zIndex: 1100 }}
    >
      <div className="toast-header">
        <strong className="me-auto text-danger">HDR Rendering Failed</strong>
      </div>
      <div className="toast-body">Showing middle exposure instead.</div>
    </div>
  )}
  ```

- [ ] **Step 5: Run the existing tests**

  ```bash
  bun test
  ```

  Expected: all tests pass.

- [ ] **Step 6: Verify in the browser**

  Start the dev server:

  ```bash
  bun run dev
  ```

  1. Open the gallery, click an HDR item.
  2. The middle-exposure image appears immediately with a "Rendering HDR…" spinner badge in the top-right corner of the image.
  3. After a few seconds (OpenCV.js WASM loads + processes), the image swaps to the HDR-fused result and the spinner disappears.
  4. The "HDR Bracket Set" section below the image correctly labels the files: the lowest-EV file is "Under-exposed", the middle is "Middle (preview)", and the highest-EV file is "Over-exposed".
  5. Navigate back to the gallery — the thumbnail still shows the middle-exposure frame, not the HDR result.
  6. Navigate to a second HDR item — the spinner reappears, HDR re-renders. (OpenCV.js is already loaded so it renders faster.)

  To test the error toast: temporarily make `renderHdr` throw (e.g., replace the CDN URL with a bad URL in `lib/opencv-hdr.ts`), reload, click an HDR item — the middle image shows and a red toast appears in the top-right for 5 seconds.

- [ ] **Step 7: Commit**

  ```bash
  git add components/detail/HdrDetail.tsx
  git commit -m "feat: render HDR on detail page load using OpenCV.js MergeMertens

  Shows middle-exposure frame immediately with a spinner overlay, then
  swaps to the Mertens-fused result when ready. Error toast auto-
  dismisses after 5s if rendering fails; middle frame stays visible."
  ```

---

## Self-Review

**Spec coverage:**
- [x] Bug fix (filename sort → EV sort): Task 1
- [x] `lib/opencv-hdr.ts` with CDN singleton loader: Task 2
- [x] Decode files → cv.Mat → MergeMertens → Blob: Task 2
- [x] Free all cv.Mat in finally: Task 2
- [x] Immediate middle-exposure preview: Task 3 (previewUrl shown before renderHdr call)
- [x] Spinner overlay while rendering: Task 3 Step 3
- [x] Swap to HDR on success: Task 3 Step 2
- [x] Error toast auto-dismissing after 5s: Task 3 Steps 2 & 4
- [x] HdrCard.tsx unchanged: not in plan (correct)
- [x] Cleanup of object URLs and timers on unmount/navigation: Task 3 Step 2 (`return () => { ... }`)

**Placeholder scan:** No TBDs, TODOs, or vague steps — all code is complete.

**Type consistency:**
- `renderHdr(files: File[]): Promise<Blob>` — defined in Task 2, called in Task 3 with `item.files` (which is `File[]`). ✓
- `hdrRendering: boolean`, `hdrError: boolean` — defined and used consistently in Task 3. ✓
- `cancelled`, `hdrBlobUrl`, `errorTimer` — scoped correctly to the effect closure. ✓
