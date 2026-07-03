// TODO: breaking change — EXIF parsing moved to lib/parsers/photo.ts (PhotoMetadata).
// MediaExif and parseExif are no longer used; PhotoDetail now reads item.metadata directly.

// import exifr from "exifr";
//
// export interface MediaExif {
//   dateTimeOriginal?: Date;
//   imageWidth?: number;
//   imageHeight?: number;
//   iso?: number;
//   fNumber?: number;
//   exposureTime?: number;
//   focalLength?: number;
//   latitude?: number;
//   longitude?: number;
//   gpsLatitudeRef?: string;
//   gpsLongitudeRef?: string;
//   absoluteAltitude?: number;
//   relativeAltitude?: number;
//   gimbalRollDegree?: number;
//   gimbalYawDegree?: number;
//   gimbalPitchDegree?: number;
//   flightRollDegree?: number;
//   flightYawDegree?: number;
//   flightPitchDegree?: number;
// }
//
// export async function parseExif(file: File): Promise<MediaExif> {
//   try {
//     const data = await exifr.parse(file, { xmp: true });
//     if (!data) return {};
//     return { ... };
//   } catch {
//     return {};
//   }
// }
