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
  relativeAltitude: number;
  horizontalSpeed: number;
  verticalSpeed: number;
}

export interface PhotoMetadata {
  fileSize: number;
  timestamp: Date;
  width: number;
  height: number;
  iso: number;
  aperture: number;
  shutterSpeed: number;
  focalLength: number;
  exposureCompensation: number;
  gps: GpsCoordinates;
  relativeAltitude: number;
  gimbalPitch: number;
  gimbalYaw: number;
  gimbalRoll: number;
  flightPitch: number;
  flightYaw: number;
  flightRoll: number;
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
  metadata: PhotoMetadata;
}

export interface HdrMetadata {
  photos: PhotoMetadata[]; // ascending by exposureCompensation; middle is at index Math.floor(photos.length / 2)
}

/**
 * HDR bracket set. `middle` is the median-EV exposure used as the preview
 * thumbnail. `files` contains all 2–3 bracketed exposures sorted ascending
 * by ExposureBiasValue, matching the order of `metadata.photos`.
 */
export interface HdrItem {
  type: "hdr";
  files: File[]; // [underexposed, middle, overexposed] — middle is always files[Math.floor(files.length / 2)]
  metadata: HdrMetadata;
}

export type MediaItem = VideoItem | PhotoItem | HdrItem;
