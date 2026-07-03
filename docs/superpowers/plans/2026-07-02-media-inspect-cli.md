# Media Inspect CLI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `scripts/inspect-media.ts` — a Bun script that parses a DJI photo or video file and prints its metadata to stdout, with an optional `--json` flag.

**Architecture:** Single standalone script. Reads the file via `readFileSync`, wraps it in a `File` object (same pattern as the integration tests), calls the appropriate parser, and prints either JSON or formatted sections.

**Tech Stack:** Bun, `node:util` (`parseArgs`), `node:fs`, `node:path`, existing parsers in `lib/parsers/`.

---

## File Map

| Action | Path | Responsibility |
|--------|------|----------------|
| Create | `scripts/inspect-media.ts` | Entire CLI: arg parsing, dispatch, formatting, output |

No other files are touched.

---

### Task 1: Scaffold — arg parsing, file detection, and error handling

**Files:**
- Create: `scripts/inspect-media.ts`

- [ ] **Step 1: Create `scripts/inspect-media.ts` with arg parsing and error handling**

```typescript
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
```

- [ ] **Step 2: Verify error cases**

Run each and confirm exit code 1 + message to stderr:

```bash
# Missing arg
bun scripts/inspect-media.ts
# Expected stderr: Error: file path is required
#                  Usage: bun scripts/inspect-media.ts <file> [--json]

# File not found
bun scripts/inspect-media.ts /tmp/nonexistent.mp4
# Expected stderr: Error: file not found: /tmp/nonexistent.mp4

# Bad extension
bun scripts/inspect-media.ts package.json
# Expected stderr: Error: unsupported file extension ".json" — expected .mp4, .mov, .jpg, or .jpeg

# Unknown flag (parseArgs strict mode handles this)
bun scripts/inspect-media.ts lib/__tests__/assets/DJI_0376.MP4 --verbose
# Expected stderr: TypeError [ERR_PARSE_ARGS_UNKNOWN_OPTION]: Unknown option '--verbose'
```

---

### Task 2: Verify human-readable and JSON output against test assets

**Files:**
- No changes — verify the script created in Task 1 works correctly.

- [ ] **Step 1: Run human-readable output on the test video**

```bash
bun scripts/inspect-media.ts lib/__tests__/assets/DJI_0376.MP4
```

Expected output shape (values will match what the video parser returns):

```
[File]
  name:      DJI_0376.MP4
  size:      19.61 MB
  timestamp: 2026-03-31T01:28:01.000Z

[Video]
  duration:   2.27s
  resolution: 3840x2160
  frame rate: 29.97 fps
  codec:      avc1.640033
  bitrate:    68.87 Mbps

[Subtitle Track]
  samples: 3
  [first sample @ ...]
    gps:              ...
    ...
```

- [ ] **Step 2: Run human-readable output on the test photo**

```bash
bun scripts/inspect-media.ts lib/__tests__/assets/DJI_0158.JPG
```

Expected output shape:

```
[File]
  name:      DJI_0158.JPG
  size:      7.99 MB
  timestamp: 2026-01-18T21:23:46.000Z

[Camera]
  resolution:    4000x2250
  iso:           100
  aperture:      f/2.8
  shutter speed: 1/160s
  focal length:  4.5mm
  ev:            0.33

[GPS]
  latitude:          45.501500
  longitude:         -73.617300
  altitude:          192.6m
  relative altitude: 56.7m

[Gimbal]
  pitch: 0.0°
  yaw:   0.0°
  roll:  0.0°

[Flight]
  pitch: -23.9°
  yaw:   167.8°
  roll:  7.1°
```

- [ ] **Step 3: Run JSON output on both assets**

```bash
bun scripts/inspect-media.ts lib/__tests__/assets/DJI_0376.MP4 --json
# Expected: valid JSON with duration, width, height, frameRate, codec, bitrate, fileSize, timestamp, subtitleTrack

bun scripts/inspect-media.ts lib/__tests__/assets/DJI_0158.JPG --json
# Expected: valid JSON with fileSize, timestamp, width, height, iso, aperture, shutterSpeed, etc.
```

Pipe through `bun -e "console.log(JSON.parse(require('fs').readFileSync('/dev/stdin','utf8')))"` or just visually confirm the JSON is well-formed.

---

### Task 3: Commit

**Files:**
- Commit: `scripts/inspect-media.ts`

- [ ] **Step 1: Check status and commit**

```bash
but status -fv
# Note the file ID for scripts/inspect-media.ts

but commit refactor/video-parsing -m "feat: add inspect-media CLI script" --changes <id> --status-after
```
