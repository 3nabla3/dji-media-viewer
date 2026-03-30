// lib/media-types.ts

export interface VideoItem {
  type: 'video'
  file: File
}

export interface PhotoItem {
  type: 'photo'
  file: File
}

/**
 * HDR bracket set. `middle` is the exposure closest to 0 EV bias — used as
 * the preview thumbnail until full blending is implemented.
 * `files` contains all 2–3 bracketed exposures sorted ascending by ExposureBiasValue.
 */
export interface HdrItem {
  type: 'hdr'
  files: File[]
  middle: File
}

export interface PanoramaItem {
  type: 'panorama'
  htmlFile: File
  tiles: File[]
}

export type MediaItem = VideoItem | PhotoItem | HdrItem | PanoramaItem
