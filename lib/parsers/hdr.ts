// lib/parsers/hdr.ts
import { parsePhotoMetadata } from "./photo";
import type { HdrMetadata } from "../media-types";

const cache = new Map<string, Promise<HdrMetadata>>();

export function parseHdrMetadata(files: File[]): Promise<HdrMetadata> {
  const cacheKey = files.map((f) => f.name).join("|");
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  const promise = Promise.all(files.map((f) => parsePhotoMetadata(f))).then(
    (photos) => {
      photos.sort((a, b) => a.exposureCompensation - b.exposureCompensation);
      return { photos };
    },
  );

  cache.set(cacheKey, promise);
  return promise;
}
