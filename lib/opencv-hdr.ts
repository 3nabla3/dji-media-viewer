// lib/opencv-hdr.ts
// Browser-only: loads OpenCV.js and performs Mertens HDR exposure fusion.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type CV = any

declare global {
  interface Window {
    cv: CV
  }
}

let cvLoadPromise: Promise<void> | null = null

export function loadOpenCV(): Promise<void> {
  if (cvLoadPromise) return cvLoadPromise
  cvLoadPromise = new Promise<void>((resolve, reject) => {
    // Already initialized: cv is the module object, not the async factory function
    if (typeof window.cv !== 'undefined' && typeof window.cv !== 'function') {
      resolve()
      return
    }
    const script = document.createElement('script')
    script.src = '/opencv_js.js'
    script.async = true
    script.onerror = () => reject(new Error('Failed to load OpenCV.js'))
    script.onload = () => {
      // window.cv is now the async factory from the Emscripten build.
      // Call it to initialize the WASM module, then replace the factory with the module.
      ;(window.cv as () => Promise<CV>)()
        .then((module) => {
          window.cv = module
          resolve()
        })
        .catch(reject)
    }
    document.head.appendChild(script)
  })
  cvLoadPromise.catch(() => {
    cvLoadPromise = null
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

  if (files.length < 2) throw new Error('renderHdr requires at least 2 exposure files')

  const mats: CV[] = []
  const srcVec = new cv.MatVector()
  let dst: CV | null = null
  let merger: CV | null = null
  let result: CV | null = null
  let rgba: CV | null = null

  try {
    for (const file of files) {
      const bitmap = await createImageBitmap(file)
      const canvas = document.createElement('canvas')
      canvas.width = bitmap.width
      canvas.height = bitmap.height
      const ctx = canvas.getContext('2d')
      if (!ctx) throw new Error('Failed to get 2D canvas context')
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
    merger = new cv.MergeMertens()
    merger.process1(srcVec, dst)

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
    // Safe to free mats here: cv.imshow() has already copied pixel data into
    // outputCanvas's own browser-managed buffer. toBlob() reads from that buffer,
    // not from the cv.Mat objects.
    srcVec.delete()
    mats.forEach((m) => m.delete())
    dst?.delete()
    result?.delete()
    rgba?.delete()
    merger?.delete()
  }
}
