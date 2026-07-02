// lib/media-types.ts

export interface GpsCoordinates {
  latitude: number;
  longitude: number;
  altitude: number;
}

export interface DjiSubtitleSample {
  timestampSeconds: number;
  aperture: number;
  shutterSpeed: number;
  iso: number;
  exposureCompensation: number;
  digitalZoom: number;
  gps: GpsCoordinates;
  distanceFromHome: number;
  height: number;
  horizontalSpeed: number;
  verticalSpeed: number;
}

export interface VideoMetadata {
  duration: number;
  width: number;
  height: number;
  frameRate: number;
  codec: string;
  bitrate: number;
  fileSize: number;
  timestamp: Date;
  subtitleTrack: DjiSubtitleSample[];
}

export interface VideoItem {
  type: "video";
  file: File;
  metadata: VideoMetadata;
}

export interface PhotoItem {
  type: "photo";
  file: File;
  date: Date;
}

/**
 * HDR bracket set. `middle` is the median-EV exposure used as the preview
 * thumbnail. `files` contains all 2–3 bracketed exposures sorted ascending
 * by ExposureBiasValue. `date` is the capture time of the middle exposure.
 */
export interface HdrItem {
  type: "hdr";
  files: File[];
  middle: File;
  date: Date;
}

export interface PanoramaItem {
  type: "panorama";
  htmlFile: File;
  tiles: File[];
  date: Date;
}

export type MediaItem = VideoItem | PhotoItem | HdrItem | PanoramaItem;
