# Media Inspect CLI — Design Spec

**Date:** 2026-07-02  
**Status:** Approved

## Overview

A single Bun script that parses a DJI media file on disk and prints the parsed metadata to stdout. Useful for inspecting parser output without opening the web app.

## Usage

```
bun scripts/inspect-media.ts <file> [--json]
```

- `<file>` — required positional argument: path to a `.mp4`, `.mov`, `.jpg`, or `.jpeg` file
- `--json` — optional flag: emit raw JSON instead of human-readable output

## File

`scripts/inspect-media.ts` — standalone script, no build step required.

## Arg Parsing

Use `parseArgs` from `node:util`. Configuration:

- One positional: file path
- One boolean option: `--json`

Error cases (exit 1, message to stderr):
- Missing file path argument
- Unknown flag
- Unsupported file extension
- File not found / unreadable

## File Type Detection

Infer parser from file extension (case-insensitive):

| Extension | Parser |
|-----------|--------|
| `.mp4`, `.mov` | `parseVideoMetadata` |
| `.jpg`, `.jpeg` | `parsePhotoMetadata` |
| anything else | error |

## Parser Invocation

Follow the same pattern used in the integration tests:

```ts
const buffer = readFileSync(filePath);
const file = new File([buffer], basename(filePath));
const metadata = await parseVideoMetadata(file); // or parsePhotoMetadata
```

## Output: Human-Readable (default)

Grouped sections printed to stdout. Numbers formatted to reasonable precision.

**Video file sections:**

- **File** — name, size, timestamp
- **Video** — duration, resolution, frame rate, codec, bitrate
- **Subtitle track** — sample count; if samples exist, first sample's GPS, speeds, altitude, camera settings

**Photo file sections:**

- **File** — name, size, timestamp
- **Camera** — resolution, ISO, aperture, shutter speed, focal length, exposure compensation
- **GPS** — latitude, longitude, altitude, relative altitude
- **Gimbal** — pitch, yaw, roll
- **Flight** — pitch, yaw, roll

## Output: JSON (`--json`)

`JSON.stringify(metadata, null, 2)` to stdout. Dates serialize as ISO 8601 strings via default JSON behavior. No transformation applied — the raw parser output is emitted.

## Dependencies

No new packages. Uses only:
- `node:util` (`parseArgs`)
- `node:fs` (`readFileSync`)
- `node:path` (`basename`, `extname`)
- Existing parsers: `lib/parsers/video.ts`, `lib/parsers/photo.ts`
