// lib/media-parser.ts
// NOTE: This module uses browser APIs (File, exifr). Call only from Client Components.
import exifr from 'exifr'
import type { MediaItem, VideoItem } from './media-types'
import { collectPanoramaTiles } from './panorama-resolver'
import { groupIntoBrackets } from './hdr-detector'
import type { JpgWithExif } from './hdr-detector'

const VIDEO_EXTS = new Set(['.mp4', '.mov'])
const JPG_EXTS = new Set(['.jpg', '.jpeg'])

function ext(file: File): string {
  return file.name.slice(file.name.lastIndexOf('.')).toLowerCase()
}

/**
 * Parses a raw XPComment value from exifr.
 * DJI encodes it as a semicolon-separated key=value string, e.g. "Type=P;...".
 * Returns the value of the `Type` key, or undefined if not found.
 */
function parseXpCommentType(raw: unknown): string | undefined {
  if (typeof raw !== 'string') return undefined
  const match = raw.match(/Type=([^;]+)/i)
  return match ? match[1].trim() : undefined
}

export async function parseMediaFiles(files: File[]): Promise<MediaItem[]> {
  const allFiles = Array.from(files)

  // Partition by type
  const videos: File[] = []
  const jpgs: File[] = []
  const htmls: File[] = []

  for (const file of allFiles) {
    const e = ext(file)
    if (VIDEO_EXTS.has(e)) videos.push(file)
    else if (JPG_EXTS.has(e)) jpgs.push(file)
    else if (e === '.html') htmls.push(file)
  }

  // Sort JPGs by filename (preserves capture order)
  jpgs.sort((a, b) => a.name.localeCompare(b.name))

  // Read EXIF for all JPGs in one batch
  const exifResults = await Promise.all(
    jpgs.map((file) =>
      exifr
        .parse(file, {
          pick: ['DateTimeOriginal', 'ExposureCompensation', 'XPComment'],
        })
        .catch(() => null)
    )
  )

  const jpgsWithExif: JpgWithExif[] = jpgs.map((file, i) => {
    const exif = exifResults[i]
    return {
      file,
      dateTimeOriginal: exif?.DateTimeOriginal instanceof Date
        ? exif.DateTimeOriginal
        : undefined,
      exposureBiasValue:
        typeof exif?.ExposureCompensation === 'number' ? exif.ExposureCompensation : undefined,
      xpCommentType: parseXpCommentType(exif?.XPComment),
    }
  })

  // Resolve panoramas — read HTML file text, find tiles
  const panoramaItems = await Promise.all(
    htmls.map(async (htmlFile) => {
      const html = await htmlFile.text()
      const tiles = collectPanoramaTiles(htmlFile, html, allFiles)
      return { type: 'panorama' as const, htmlFile, tiles }
    })
  )

  // Collect file paths used as panorama tiles so we can exclude them from HDR logic
  const panoramaTilePaths = new Set(
    panoramaItems.flatMap((p) =>
      p.tiles.map(
        (f) => (f as File & { webkitRelativePath: string }).webkitRelativePath
      )
    )
  )

  // Filter out panorama tile JPGs before HDR detection (belt-and-suspenders alongside XPComment check)
  const nonTileJpgs = jpgsWithExif.filter(
    (item) =>
      !panoramaTilePaths.has(
        (item.file as File & { webkitRelativePath: string }).webkitRelativePath
      )
  )

  const photoAndHdrItems = groupIntoBrackets(nonTileJpgs)

  const videoItems: VideoItem[] = videos.map((file) => ({ type: 'video', file }))

  return [...videoItems, ...photoAndHdrItems, ...panoramaItems]
}
