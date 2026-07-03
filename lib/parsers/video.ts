import { createFile } from "mp4box";
import type { Movie } from "mp4box";
import type { VideoMetadata } from "../media-types";
import { parseDjiSubtitleTrack } from "./subtitle";
import { suppressMp4BoxErrors } from "./mp4box-utils";

const CHUNK = 4 * 1024 * 1024; // 4 MiB

async function readMp4Info(file: File): Promise<Movie> {
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

  const mp4file = createFile();

  return new Promise((resolve, reject) => {
    mp4file.onReady = resolve;
    mp4file.onError = (_, message) => reject(new Error(message));
    for (const buf of buffers) {
      mp4file.appendBuffer(buf);
    }
    mp4file.flush();
  });
}

function computeFrameRate(info: Movie): number | null {
  const track = info.videoTracks?.[0];
  if (!track) return null;
  const { nb_samples, duration, timescale } = track;
  if (!nb_samples || !duration || !timescale) return null;
  return (nb_samples * timescale) / duration;
}

async function doParseVideoMetadata(file: File): Promise<VideoMetadata> {
  const restoreConsole = suppressMp4BoxErrors();

  try {
    const [mp4Info, subtitleTrack] = await Promise.all([
      readMp4Info(file),
      parseDjiSubtitleTrack(file),
    ]);

    const videoTrack = mp4Info.videoTracks[0];

    const frameRate = computeFrameRate(mp4Info);
    if (frameRate === null)
      throw new Error(`No video track found in ${file.name}`);

    const timestamp = mp4Info.created;
    if (!timestamp)
      throw new Error(`No creation timestamp in mvhd for ${file.name}`);

    return {
      duration: mp4Info.duration / mp4Info.timescale,
      width: videoTrack?.video?.width ?? 0,
      height: videoTrack?.video?.height ?? 0,
      frameRate,
      codec: videoTrack?.codec ?? "",
      bitrate: videoTrack?.bitrate ?? 0,
      fileSize: file.size,
      timestamp,
      subtitleTrack,
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
