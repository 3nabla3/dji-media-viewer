import { parseArgs } from "node:util";
import { readFileSync, existsSync } from "node:fs";
import { basename, extname } from "node:path";
import { parseVideoMetadata } from "../lib/parsers/video";
import { parsePhotoMetadata } from "../lib/parsers/photo";
import { parseHdrMetadata } from "../lib/parsers/hdr";
import type {
  VideoMetadata,
  PhotoMetadata,
  HdrMetadata,
} from "../lib/media-types";

const { values, positionals } = parseArgs({
  args: process.argv.slice(2),
  options: {
    json: { type: "boolean", default: false },
  },
  allowPositionals: true,
  strict: true,
});

const subcommand = positionals[0];
const isHdrSubcommand = subcommand === "hdr";
const filePath = isHdrSubcommand ? undefined : subcommand;
const hdrFilePaths = isHdrSubcommand ? positionals.slice(1) : [];

if (!isHdrSubcommand && !filePath) {
  process.stderr.write(
    "Error: file path is required\n" +
      "Usage:\n" +
      "  bun scripts/inspect-media.ts <file> [--json]\n" +
      "  bun scripts/inspect-media.ts hdr <file1> <file2> [<file3>] [--json]\n",
  );
  process.exit(1);
}

if (isHdrSubcommand && hdrFilePaths.length < 2) {
  process.stderr.write(
    "Error: hdr subcommand requires at least 2 file paths\n" +
      "Usage: bun scripts/inspect-media.ts hdr <file1> <file2> [<file3>] [--json]\n",
  );
  process.exit(1);
}

if (!isHdrSubcommand && filePath && !existsSync(filePath)) {
  process.stderr.write(`Error: file not found: ${filePath}\n`);
  process.exit(1);
}

for (const path of hdrFilePaths) {
  if (!existsSync(path)) {
    process.stderr.write(`Error: file not found: ${path}\n`);
    process.exit(1);
  }
}

const extension = filePath ? extname(filePath).toLowerCase() : "";
const isVideo = extension === ".mp4" || extension === ".mov";
const isPhoto = extension === ".jpg" || extension === ".jpeg";

if (!isHdrSubcommand && !isVideo && !isPhoto) {
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
  console.log(`  name:      ${basename(filePath!)}`);
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
    console.log(
      `    horizontal speed: ${first.horizontalSpeed.toFixed(2)} m/s`,
    );
    console.log(`    vertical speed:   ${first.verticalSpeed.toFixed(2)} m/s`);
    console.log(`    aperture:         f/${first.aperture.toFixed(1)}`);
    console.log(
      `    shutter speed:    ${formatShutterSpeed(first.shutterSpeed)}`,
    );
    console.log(`    iso:              ${first.iso}`);
    console.log(
      `    ev:               ${first.exposureCompensation.toFixed(2)}`,
    );
    console.log(`    digital zoom:     ${first.digitalZoom.toFixed(2)}x`);
  }
}

function printPhotoMetadata(metadata: PhotoMetadata, name: string): void {
  console.log("\n[File]");
  console.log(`  name:      ${name}`);
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

function printHdrMetadata(metadata: HdrMetadata, fileNames: string[]): void {
  const middleIndex = Math.floor(metadata.photos.length / 2);
  const middle = metadata.photos[middleIndex];
  const labels = metadata.photos.map((_, i) =>
    i === middleIndex
      ? "Middle"
      : i < middleIndex
        ? "Under-exposed"
        : "Over-exposed",
  );

  console.log("\n[HDR Bracket Set]");
  console.log(`  brackets: ${metadata.photos.length}`);
  console.log(`  timestamp: ${middle.timestamp.toISOString()}`);
  console.log(`  resolution: ${middle.width}x${middle.height}`);

  metadata.photos.forEach((photo, i) => {
    console.log(`\n  [${labels[i]}] ${fileNames[i]}`);
    console.log(`    size:          ${formatBytes(photo.fileSize)}`);
    console.log(`    ev:            ${photo.exposureCompensation.toFixed(2)}`);
    console.log(`    iso:           ${photo.iso}`);
    console.log(`    shutter speed: ${formatShutterSpeed(photo.shutterSpeed)}`);
  });

  console.log("\n[GPS] (middle exposure)");
  console.log(`  latitude:          ${middle.gps.latitude.toFixed(6)}`);
  console.log(`  longitude:         ${middle.gps.longitude.toFixed(6)}`);
  console.log(`  altitude:          ${middle.gps.altitude.toFixed(1)}m`);
  console.log(`  relative altitude: ${middle.relativeAltitude.toFixed(1)}m`);

  console.log("\n[Gimbal] (middle exposure)");
  console.log(`  pitch: ${middle.gimbalPitch.toFixed(1)}°`);
  console.log(`  yaw:   ${middle.gimbalYaw.toFixed(1)}°`);
  console.log(`  roll:  ${middle.gimbalRoll.toFixed(1)}°`);
}

(async () => {
  try {
    if (isHdrSubcommand) {
      const files = hdrFilePaths.map((path) => {
        const buffer = readFileSync(path);
        return new File([buffer], basename(path), { type: "image/jpeg" });
      });
      const metadata = await parseHdrMetadata(files);
      if (values.json) {
        console.log(JSON.stringify(metadata, null, 2));
      } else {
        printHdrMetadata(
          metadata,
          hdrFilePaths.map((p) => basename(p)),
        );
      }
      return;
    }

    const buffer = readFileSync(filePath!);
    const file = new File([buffer], basename(filePath!));
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
        printPhotoMetadata(metadata, basename(filePath!));
      }
    }
  } catch (error) {
    process.stderr.write(
      `Error: ${error instanceof Error ? error.message : String(error)}\n`,
    );
    process.exit(1);
  }
})();
