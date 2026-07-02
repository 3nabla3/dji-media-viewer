import * as MP4Box from "mp4box";
import type { VideoMetadata } from "../media-types";

const CHUNK = 4 * 1024 * 1024; // 4 MiB

// DJI (and most cameras) write the moov atom at the end of the file.
// Suppresses a spurious mp4box BoxParser console.error that Next.js surfaces as an overlay error.
function suppressMp4BoxErrors(): () => void {
  const originalError = console.error;
  console.error = (...args: unknown[]) => {
    if (typeof args[1] === "string" && args[1].includes("[BoxParser]")) return;
    originalError(...args);
  };
  return () => {
    console.error = originalError;
  };
}

async function readMp4Info(file: File): Promise<MP4Box.MP4Info> {
  const slices: { start: number; end: number }[] = [{ start: 0, end: CHUNK }];
  if (file.size > CHUNK * 2) {
    slices.push({ start: file.size - CHUNK, end: file.size });
  }

  const buffers = await Promise.all(
    slices.map(async ({ start, end }) => {
      const ab = (await file.slice(start, end).arrayBuffer()) as ArrayBuffer & {
        fileStart: number;
      };
      ab.fileStart = start;
      return ab;
    }),
  );

  const mp4file = MP4Box.createFile();

  return new Promise((resolve, reject) => {
    mp4file.onReady = resolve;
    mp4file.onError = reject;
    for (const buf of buffers) {
      mp4file.appendBuffer(buf);
    }
    mp4file.flush();
  });
}

function computeFrameRate(info: MP4Box.MP4Info): number | null {
  const track = info.videoTracks?.[0];
  if (!track) return null;
  const { nb_samples, duration, timescale } = track;
  if (!nb_samples || !duration || !timescale) return null;
  return (nb_samples * timescale) / duration;
}

async function doParseVideoMetadata(file: File): Promise<VideoMetadata> {
  const restoreConsole = suppressMp4BoxErrors();

  try {
    const mp4Info = await readMp4Info(file);
    const videoTrack = mp4Info.videoTracks[0];

    const frameRate = computeFrameRate(mp4Info);
    if (frameRate === null) throw new Error(`No video track found in ${file.name}`);

    const timestamp = mp4Info.created;
    if (!timestamp) throw new Error(`No creation timestamp in mvhd for ${file.name}`);

    return {
      duration: mp4Info.duration / mp4Info.timescale,
      width: videoTrack?.video.width ?? 0,
      height: videoTrack?.video.height ?? 0,
      frameRate,
      codec: videoTrack?.codec ?? "",
      bitrate: videoTrack?.bitrate ?? 0,
      fileSize: file.size,
      timestamp,
      gps: null,
    };
  } finally {
    restoreConsole();
  }
}

const videoMetadataCache = new Map<string, Promise<VideoMetadata>>();

export function parseVideoMetadata(file: File): Promise<VideoMetadata> {
  const cached = videoMetadataCache.get(file.name);
  if (cached) return cached;
  const promise = doParseVideoMetadata(file);
  videoMetadataCache.set(file.name, promise);
  return promise;
}
