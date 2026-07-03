import { parseArgs } from "node:util";
import { readFileSync, existsSync } from "node:fs";
import { basename, extname } from "node:path";
import { parseVideoMetadata } from "../lib/parsers/video";
import { parsePhotoMetadata } from "../lib/parsers/photo";
import type { VideoMetadata, PhotoMetadata } from "../lib/media-types";

const { values, positionals } = parseArgs({
  args: process.argv.slice(2),
  options: {
    json: { type: "boolean", default: false },
  },
  allowPositionals: true,
  strict: true,
});

const filePath = positionals[0];

if (!filePath) {
  process.stderr.write(
    "Error: file path is required\nUsage: bun scripts/inspect-media.ts <file> [--json]\n",
  );
  process.exit(1);
}

if (!existsSync(filePath)) {
  process.stderr.write(`Error: file not found: ${filePath}\n`);
  process.exit(1);
}

const extension = extname(filePath).toLowerCase();
const isVideo = extension === ".mp4" || extension === ".mov";
const isPhoto = extension === ".jpg" || extension === ".jpeg";

if (!isVideo && !isPhoto) {
  process.stderr.write(
    `Error: unsupported file extension "${extension}" — expected .mp4, .mov, .jpg, or .jpeg\n`,
  );
  process.exit(1);
}

function formatBytes(bytes: number): string {
  return `${(bytes / 1_000_000).toFixed(2)} MB`;
}

function formatBitrate(bitsPerSecond: number): string {
  return `${(bitsPerSecond / 1_000_000).toFixed(2)} Mbps`;
}

function formatShutterSpeed(exposureTime: number): string {
  if (!exposureTime || !isFinite(1 / exposureTime)) return `${exposureTime}s`;
  return `1/${Math.round(1 / exposureTime)}s`;
}

function printVideoMetadata(metadata: VideoMetadata): void {
  console.log("\n[File]");
  console.log(`  name:      ${basename(filePath)}`);
  console.log(`  size:      ${formatBytes(metadata.fileSize)}`);
  console.log(`  timestamp: ${metadata.timestamp.toISOString()}`);

  console.log("\n[Video]");
  console.log(`  duration:   ${metadata.duration.toFixed(2)}s`);
  console.log(`  resolution: ${metadata.width}x${metadata.height}`);
  console.log(`  frame rate: ${metadata.frameRate.toFixed(2)} fps`);
  console.log(`  codec:      ${metadata.codec}`);
  console.log(`  bitrate:    ${formatBitrate(metadata.bitrate)}`);

  console.log("\n[Subtitle Track]");
  console.log(`  samples: ${metadata.subtitleTrack.length}`);
  if (metadata.subtitleTrack.length > 0) {
    const first = metadata.subtitleTrack[0];
    console.log(`  [first sample @ ${first.timestampSeconds.toFixed(2)}s]`);
    console.log(
      `    gps:              ${first.gps.latitude.toFixed(6)}, ${first.gps.longitude.toFixed(6)}, ${first.gps.altitude.toFixed(1)}m`,
    );
    console.log(`    relative alt:     ${first.relativeAltitude.toFixed(1)}m`);
    console.log(`    distance home:    ${first.distanceFromHome.toFixed(1)}m`);
    console.log(`    horizontal speed: ${first.horizontalSpeed.toFixed(2)} m/s`);
    console.log(`    vertical speed:   ${first.verticalSpeed.toFixed(2)} m/s`);
    console.log(`    aperture:         f/${first.aperture.toFixed(1)}`);
    console.log(`    shutter speed:    ${formatShutterSpeed(first.shutterSpeed)}`);
    console.log(`    iso:              ${first.iso}`);
    console.log(`    ev:               ${first.exposureCompensation.toFixed(2)}`);
    console.log(`    digital zoom:     ${first.digitalZoom.toFixed(2)}x`);
  }
}

function printPhotoMetadata(metadata: PhotoMetadata): void {
  console.log("\n[File]");
  console.log(`  name:      ${basename(filePath)}`);
  console.log(`  size:      ${formatBytes(metadata.fileSize)}`);
  console.log(`  timestamp: ${metadata.timestamp.toISOString()}`);

  console.log("\n[Camera]");
  console.log(`  resolution:    ${metadata.width}x${metadata.height}`);
  console.log(`  iso:           ${metadata.iso}`);
  console.log(`  aperture:      f/${metadata.aperture.toFixed(1)}`);
  console.log(`  shutter speed: ${formatShutterSpeed(metadata.shutterSpeed)}`);
  console.log(`  focal length:  ${metadata.focalLength.toFixed(1)}mm`);
  console.log(`  ev:            ${metadata.exposureCompensation.toFixed(2)}`);

  console.log("\n[GPS]");
  console.log(`  latitude:          ${metadata.gps.latitude.toFixed(6)}`);
  console.log(`  longitude:         ${metadata.gps.longitude.toFixed(6)}`);
  console.log(`  altitude:          ${metadata.gps.altitude.toFixed(1)}m`);
  console.log(`  relative altitude: ${metadata.relativeAltitude.toFixed(1)}m`);

  console.log("\n[Gimbal]");
  console.log(`  pitch: ${metadata.gimbalPitch.toFixed(1)}°`);
  console.log(`  yaw:   ${metadata.gimbalYaw.toFixed(1)}°`);
  console.log(`  roll:  ${metadata.gimbalRoll.toFixed(1)}°`);

  console.log("\n[Flight]");
  console.log(`  pitch: ${metadata.flightPitch.toFixed(1)}°`);
  console.log(`  yaw:   ${metadata.flightYaw.toFixed(1)}°`);
  console.log(`  roll:  ${metadata.flightRoll.toFixed(1)}°`);
}

(async () => {
  try {
    const buffer = readFileSync(filePath);
    const file = new File([buffer], basename(filePath));
    if (isVideo) {
      const metadata = await parseVideoMetadata(file);
      if (values.json) {
        console.log(JSON.stringify(metadata, null, 2));
      } else {
        printVideoMetadata(metadata);
      }
    } else {
      const metadata = await parsePhotoMetadata(file);
      if (values.json) {
        console.log(JSON.stringify(metadata, null, 2));
      } else {
        printPhotoMetadata(metadata);
      }
    }
  } catch (error) {
    process.stderr.write(
      `Error: ${error instanceof Error ? error.message : String(error)}\n`,
    );
    process.exit(1);
  }
})();
