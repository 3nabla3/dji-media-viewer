// lib/media-types.ts

export interface VideoItem {
  type: 'video'
  file: File
  date: Date
}

export interface PhotoItem {
  type: 'photo'
  file: File
  date: Date
}

/**
 * HDR bracket set. `middle` is the median-EV exposure used as the preview
 * thumbnail. `files` contains all 2–3 bracketed exposures sorted ascending
 * by ExposureBiasValue. `date` is the capture time of the middle exposure.
 */
export interface HdrItem {
  type: 'hdr'
  files: File[]
  middle: File
  date: Date
}

export interface PanoramaItem {
  type: 'panorama'
  htmlFile: File
  tiles: File[]
  date: Date
}

export type MediaItem = VideoItem | PhotoItem | HdrItem | PanoramaItem
