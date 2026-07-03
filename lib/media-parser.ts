// lib/media-parser.ts
// NOTE: This module uses browser APIs (File, exifr). Call only from Client Components.
import exifr from "exifr";
import type { MediaItem } from "./media-types";
import { groupIntoBrackets } from "./hdr-detector";
import type { JpgWithExif } from "./hdr-detector";
import { parsePhotoMetadata } from "./parsers/photo";
import { parseHdrMetadata } from "./parsers/hdr";

const VIDEO_EXTS = new Set([".mp4", ".mov"]);
const JPG_EXTS = new Set([".jpg", ".jpeg"]);

function ext(file: File): string {
  return file.name.slice(file.name.lastIndexOf(".")).toLowerCase();
}

export interface ParseMediaResult {
  items: MediaItem[];
  warnings: string[];
}

export async function parseMediaFiles(
  files: File[],
): Promise<ParseMediaResult> {
  const allFiles = Array.from(files);
  const warnings: string[] = [];

  // Partition by type
  const videos: File[] = [];
  const jpgs: File[] = [];

  for (const file of allFiles) {
    const e = ext(file);
    if (VIDEO_EXTS.has(e)) videos.push(file);
    else if (JPG_EXTS.has(e)) jpgs.push(file);
  }

  // Sort JPGs by filename (preserves capture order)
  jpgs.sort((a, b) => a.name.localeCompare(b.name));

  // Read EXIF for all JPGs in one batch
  const exifResults = await Promise.all(
    jpgs.map((file) =>
      exifr
        .parse(file, {
          pick: ["DateTimeOriginal", "ExposureCompensation"],
        })
        .catch(() => null),
    ),
  );

  const jpgsWithExif: JpgWithExif[] = jpgs.map((file, i) => {
    const exif = exifResults[i];
    return {
      file,
      dateTimeOriginal:
        exif?.DateTimeOriginal instanceof Date
          ? exif.DateTimeOriginal
          : undefined,
      exposureBiasValue:
        typeof exif?.ExposureCompensation === "number"
          ? exif.ExposureCompensation
          : undefined,
    };
  });

  const photoAndHdrItems = await Promise.all(
    groupIntoBrackets(jpgsWithExif).map(async (group) => {
      if (group.type === "photo") {
        const metadata = await parsePhotoMetadata(group.file);
        return { type: "photo" as const, file: group.file, metadata };
      }
      const metadata = await parseHdrMetadata(group.files);
      return { type: "hdr" as const, files: group.files, metadata };
    }),
  );

  // TODO: breaking change — VideoItem no longer has .date; VideoItem now requires metadata: VideoMetadata
  // Orchestration will be updated in a follow-up phase to call parseVideoMetadata for each video file
  const videoItems: MediaItem[] = [];

  return {
    items: [...videoItems, ...photoAndHdrItems],
    warnings,
  };
}
