import exifr from "exifr";
import type { PhotoMetadata } from "../media-types";

const photoMetadataCache = new Map<File, Promise<PhotoMetadata>>();

function requireNumber(
  value: unknown,
  field: string,
  fileName: string,
): number {
  if (typeof value !== "number") {
    throw new Error(`Missing required field "${field}" in ${fileName}`);
  }
  return value;
}

function requireDate(value: unknown, field: string, fileName: string): Date {
  if (!(value instanceof Date)) {
    throw new Error(`Missing required field "${field}" in ${fileName}`);
  }
  return value;
}

async function doParsePhotoMetadata(file: File): Promise<PhotoMetadata> {
  // Pass ArrayBuffer instead of File: exifr uses FileReader for File objects,
  // which is not available in Node.js test environments.
  const buffer = await file.arrayBuffer();
  const data = await exifr.parse(buffer, { xmp: true });
  if (!data) throw new Error(`Failed to parse EXIF from ${file.name}`);

  const req = (value: unknown, field: string) =>
    requireNumber(value, field, file.name);

  return {
    fileSize: file.size,
    timestamp: requireDate(
      data.DateTimeOriginal,
      "DateTimeOriginal",
      file.name,
    ),
    width: req(data.ExifImageWidth, "ExifImageWidth"),
    height: req(data.ExifImageHeight, "ExifImageHeight"),
    iso: req(data.ISO, "ISO"),
    aperture: req(data.FNumber, "FNumber"),
    shutterSpeed: req(data.ExposureTime, "ExposureTime"),
    focalLength: req(data.FocalLength, "FocalLength"),
    exposureCompensation: req(
      data.ExposureCompensation,
      "ExposureCompensation",
    ),
    gps: {
      latitude: req(data.latitude, "latitude"),
      longitude: req(data.longitude, "longitude"),
      altitude: req(data.GPSAltitude, "GPSAltitude"),
    },
    relativeAltitude: req(data.RelativeAltitude, "RelativeAltitude"),
    gimbalPitch: req(data.GimbalPitchDegree, "GimbalPitchDegree"),
    gimbalYaw: req(data.GimbalYawDegree, "GimbalYawDegree"),
    gimbalRoll: req(data.GimbalRollDegree, "GimbalRollDegree"),
    flightPitch: req(data.FlightPitchDegree, "FlightPitchDegree"),
    flightYaw: req(data.FlightYawDegree, "FlightYawDegree"),
    flightRoll: req(data.FlightRollDegree, "FlightRollDegree"),
  };
}

export function parsePhotoMetadata(file: File): Promise<PhotoMetadata> {
  const cached = photoMetadataCache.get(file);
  if (cached) return cached;
  const promise = doParsePhotoMetadata(file);
  photoMetadataCache.set(file, promise);
  return promise;
}
