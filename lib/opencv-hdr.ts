// lib/opencv-hdr.ts
// Browser-only: loads OpenCV.js and performs Mertens HDR exposure fusion.

import { openDB } from "idb";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type CV = any;

const DB_NAME = "dji-hdr-cache";
const STORE_NAME = "renders";
const DB_VERSION = 1;

function getCacheKey(files: File[]): string {
  return files.map((f) => `${f.name}:${f.size}:${f.lastModified}`).join("|");
}

// Singleton DB connection — idb memoizes internally but we avoid redundant promise chains
let dbPromise: ReturnType<typeof openDB> | null = null;

function getDb() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        db.createObjectStore(STORE_NAME);
      },
    });
    dbPromise.catch(() => {
      dbPromise = null;
    });
  }
  return dbPromise;
}

async function getCachedRender(key: string): Promise<Blob | undefined> {
  try {
    const db = await getDb();
    return db.get(STORE_NAME, key);
  } catch {
    return undefined;
  }
}

async function setCachedRender(key: string, blob: Blob): Promise<void> {
  try {
    const db = await getDb();
    await db.put(STORE_NAME, blob, key);
  } catch {
    // Cache write failures are non-fatal
  }
}

declare global {
  interface Window {
    cv: CV;
  }
}

let cvLoadPromise: Promise<void> | null = null;

export function loadOpenCV(): Promise<void> {
  if (cvLoadPromise) return cvLoadPromise;
  cvLoadPromise = new Promise<void>((resolve, reject) => {
    // Already initialized: cv is the module object, not the async factory function
    if (typeof window.cv !== "undefined" && typeof window.cv !== "function") {
      resolve();
      return;
    }
    const script = document.createElement("script");
    script.src = "/opencv_js.js";
    script.async = true;
    script.onerror = () => reject(new Error("Failed to load OpenCV.js"));
    script.onload = () => {
      // window.cv is now the async factory from the Emscripten build.
      // Call it to initialize the WASM module, then replace the factory with the module.
      (window.cv as () => Promise<CV>)()
        .then((module) => {
          window.cv = module;
          resolve();
        })
        .catch(reject);
    };
    document.head.appendChild(script);
  });
  cvLoadPromise.catch(() => {
    cvLoadPromise = null;
  });
  return cvLoadPromise;
}

/**
 * Merges 2–3 bracketed exposure files into a single HDR-fused image using
 * OpenCV.js MergeMertens. Files must be sorted ascending by ExposureBiasValue
 * (as stored in HdrItem.files). Returns a JPEG Blob of the fused result.
 */
function decodeOpenCVError(e: unknown): Error {
  if (typeof e === "number") {
    try {
      const msg = window.cv?.exceptionFromPtr?.(e)?.msg;
      return new Error(
        msg ? `OpenCV: ${msg}` : `OpenCV exception pointer: ${e}`,
      );
    } catch {
      return new Error(`OpenCV exception pointer: ${e}`);
    }
  }
  return e instanceof Error ? e : new Error(String(e));
}

export async function renderHdr(files: File[]): Promise<Blob> {
  const key = getCacheKey(files);
  const cached = await getCachedRender(key);
  if (cached) return cached;

  await loadOpenCV();
  const cv = window.cv;

  if (files.length < 2)
    throw new Error("renderHdr requires at least 2 exposure files");

  // mats mirrors srcVec so we can call .delete() on each individual Mat in finally —
  // cv.MatVector holds references but does not own (free) the underlying Mat objects.
  const mats: CV[] = [];
  const srcVec = new cv.MatVector();
  let dst: CV | null = null;
  let merger: CV | null = null;
  let result: CV | null = null;
  let rgba: CV | null = null;

  try {
    // Cap at 2048px on the longest side before passing to WASM.
    // A 12MP image × 3 inputs + float32 intermediates exceeds the WASM heap.
    const MAX_DIM = 2048;

    for (const file of files) {
      const bitmap = await createImageBitmap(file);
      const scale = Math.min(
        1,
        MAX_DIM / Math.max(bitmap.width, bitmap.height),
      );
      const w = Math.round(bitmap.width * scale);
      const h = Math.round(bitmap.height * scale);
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Failed to get 2D canvas context");
      ctx.drawImage(bitmap, 0, 0, w, h);
      bitmap.close();

      const imageData = ctx.getImageData(0, 0, w, h);
      const rgba8 = cv.matFromImageData(imageData);
      const bgr = new cv.Mat();
      cv.cvtColor(rgba8, bgr, cv.COLOR_RGBA2BGR);
      rgba8.delete();

      mats.push(bgr);
      srcVec.push_back(bgr);
    }

    dst = new cv.Mat();
    merger = new cv.MergeMertens();
    try {
      merger.process1(srcVec, dst);
    } catch (e) {
      throw decodeOpenCVError(e);
    }

    // dst is CV_32FC3 in [0,1] — scale to uint8
    result = new cv.Mat();
    dst.convertTo(result, cv.CV_8U, 255);

    // Convert BGR → RGBA for canvas display
    rgba = new cv.Mat();
    cv.cvtColor(result, rgba, cv.COLOR_BGR2RGBA);

    const outputCanvas = document.createElement("canvas");
    outputCanvas.width = rgba.cols;
    outputCanvas.height = rgba.rows;
    cv.imshow(outputCanvas, rgba);

    const blob = await new Promise<Blob>((resolve, reject) => {
      outputCanvas.toBlob(
        (b) => {
          b ? resolve(b) : reject(new Error("canvas.toBlob returned null"));
        },
        "image/jpeg",
        0.95,
      );
    });
    await setCachedRender(key, blob);
    return blob;
  } finally {
    // Safe to free mats here: cv.imshow() has already copied pixel data into
    // outputCanvas's own browser-managed buffer. toBlob() reads from that buffer,
    // not from the cv.Mat objects.
    srcVec.delete();
    mats.forEach((m) => m.delete());
    dst?.delete();
    result?.delete();
    rgba?.delete();
    merger?.delete();
  }
}
