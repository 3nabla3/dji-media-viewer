// lib/hdr-detector.ts
import type { PhotoItem, HdrItem } from "./media-types";

export interface JpgWithExif {
  file: File;
  dateTimeOriginal: Date | undefined;
  exposureBiasValue: number | undefined;
  /** Value of XPComment.Type field — 'P' means panorama tile, exclude from HDR logic */
  xpCommentType: string | undefined;
}

/**
 * Groups JPG files (pre-sorted by filename) into PhotoItems and HdrItems.
 *
 * Rules:
 * - Files with xpCommentType === 'P' are excluded entirely.
 * - Consecutive files (adjacent in sort order) are merged into the same
 *   bracket group if they share the same DateTimeOriginal OR their timestamps
 *   differ by exactly 1 second.
 * - Groups of 2–3 become HdrItems; groups of 1 become PhotoItems.
 * - Within an HdrItem, `files` are sorted ascending by ExposureBiasValue.
 *   `middle` is the file with ExposureBiasValue closest to 0.
 */
export function groupIntoBrackets(
  items: JpgWithExif[],
): (PhotoItem | HdrItem)[] {
  // Exclude panorama tiles
  const eligible = items.filter((item) => item.xpCommentType !== "P");
  if (eligible.length === 0) return [];

  // Group consecutive items by timestamp proximity
  const groups: JpgWithExif[][] = [];
  let current: JpgWithExif[] = [eligible[0]];

  for (let i = 1; i < eligible.length; i++) {
    const prev = current[current.length - 1];
    const curr = eligible[i];
    const prevTs = prev.dateTimeOriginal?.getTime();
    const currTs = curr.dateTimeOriginal?.getTime();

    const sameTimestamp =
      prevTs !== undefined && currTs !== undefined && prevTs === currTs;
    const oneSecondBoundary =
      prevTs !== undefined &&
      currTs !== undefined &&
      Math.abs(currTs - prevTs) === 1000;

    if ((sameTimestamp || oneSecondBoundary) && current.length < 3) {
      current.push(curr);
    } else {
      groups.push(current);
      current = [curr];
    }
  }
  groups.push(current);

  return groups.map((group): PhotoItem | HdrItem => {
    if (group.length === 1) {
      const item = group[0];
      return {
        type: "photo",
        file: item.file,
        date: item.dateTimeOriginal ?? new Date(item.file.lastModified),
      };
    }

    // Sort by ExposureBiasValue ascending (undefined bias goes last)
    const sorted = [...group].sort((a, b) => {
      const aBias = a.exposureBiasValue ?? Infinity;
      const bBias = b.exposureBiasValue ?? Infinity;
      return aBias - bBias;
    });

    // Middle = median position in the EV-sorted array (index floor(n/2)).
    // Using the median instead of "closest to 0" avoids the tie-breaking problem
    // where two equidistant frames (e.g. -1/3 and +1/3) would place the middle
    // at index 0, leaving nothing to its left to label as under-exposed.
    const middle = sorted[Math.floor(sorted.length / 2)];

    return {
      type: "hdr",
      files: sorted.map((s) => s.file),
      middle: middle.file,
      date: middle.dateTimeOriginal ?? new Date(middle.file.lastModified),
    };
  });
}
