// components/detail/exif.ts
import exifr from "exifr";

export interface MediaExif {
  dateTimeOriginal?: Date;
  imageWidth?: number;
  imageHeight?: number;
  iso?: number;
  fNumber?: number;
  exposureTime?: number;
  focalLength?: number;
  latitude?: number;
  longitude?: number;
  gpsLatitudeRef?: string;
  gpsLongitudeRef?: string;
  absoluteAltitude?: number;
  relativeAltitude?: number;
  gimbalRollDegree?: number;
  gimbalYawDegree?: number;
  gimbalPitchDegree?: number;
  flightRollDegree?: number;
  flightYawDegree?: number;
  flightPitchDegree?: number;
}

export async function parseExif(file: File): Promise<MediaExif> {
  try {
    const data = await exifr.parse(file, { xmp: true });
    if (!data) return {};
    return {
      dateTimeOriginal:
        data.DateTimeOriginal instanceof Date
          ? data.DateTimeOriginal
          : undefined,
      imageWidth:
        typeof data.ExifImageWidth === "number"
          ? data.ExifImageWidth
          : undefined,
      imageHeight:
        typeof data.ExifImageHeight === "number"
          ? data.ExifImageHeight
          : undefined,
      iso: typeof data.ISO === "number" ? data.ISO : undefined,
      fNumber: typeof data.FNumber === "number" ? data.FNumber : undefined,
      exposureTime:
        typeof data.ExposureTime === "number" ? data.ExposureTime : undefined,
      focalLength:
        typeof data.FocalLength === "number" ? data.FocalLength : undefined,
      latitude:
        typeof data.latitude === "number" ? data.latitude : undefined,
      longitude:
        typeof data.longitude === "number" ? data.longitude : undefined,
      gpsLatitudeRef:
        typeof data.GPSLatitudeRef === "string"
          ? data.GPSLatitudeRef
          : undefined,
      gpsLongitudeRef:
        typeof data.GPSLongitudeRef === "string"
          ? data.GPSLongitudeRef
          : undefined,
      absoluteAltitude:
        typeof data.AbsoluteAltitude === "number"
          ? data.AbsoluteAltitude
          : undefined,
      relativeAltitude:
        typeof data.RelativeAltitude === "number"
          ? data.RelativeAltitude
          : undefined,
      gimbalRollDegree:
        typeof data.GimbalRollDegree === "number"
          ? data.GimbalRollDegree
          : undefined,
      gimbalYawDegree:
        typeof data.GimbalYawDegree === "number"
          ? data.GimbalYawDegree
          : undefined,
      gimbalPitchDegree:
        typeof data.GimbalPitchDegree === "number"
          ? data.GimbalPitchDegree
          : undefined,
      flightRollDegree:
        typeof data.FlightRollDegree === "number"
          ? data.FlightRollDegree
          : undefined,
      flightYawDegree:
        typeof data.FlightYawDegree === "number"
          ? data.FlightYawDegree
          : undefined,
      flightPitchDegree:
        typeof data.FlightPitchDegree === "number"
          ? data.FlightPitchDegree
          : undefined,
    };
  } catch {
    return {};
  }
}
