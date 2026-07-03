import { createFile } from "mp4box";
import type { Movie, Track, Sample } from "mp4box";
import type { DjiSubtitleSample } from "../media-types";
import { suppressMp4BoxErrors } from "./mp4box-utils";

const CHUNK = 4 * 1024 * 1024;

function findDjiSubtitleTrack(movie: Movie): Track | undefined {
  const isDjiSubtitle = (track: Track) => {
    const name = track.name.toLowerCase();
    return name.includes("dji") && name.includes("subtitle");
  };
  return movie.subtitleTracks.find(isDjiSubtitle) ?? movie.otherTracks.find(isDjiSubtitle);
}

function decodeSampleText(sample: Sample): string {
  if (!sample.data) return "";
  // DJI QuickTime text samples: 2-byte big-endian uint16 length prefix,
  // followed by that many bytes (text + null padding to fixed sample size)
  const view = new DataView(sample.data.buffer, sample.data.byteOffset);
  const prefixLength = view.getUint16(0);
  const payload =
    prefixLength === sample.data.byteLength - 2
      ? sample.data.slice(2)
      : sample.data;
  return new TextDecoder().decode(payload).replace(/\0/g, "").trim();
}

export function parseDjiSubtitleSampleText(
  raw: string,
  timestampSeconds: number,
): DjiSubtitleSample {
  const extractNumber = (pattern: RegExp): number => {
    const match = raw.match(pattern);
    return match ? parseFloat(match[1]) : NaN;
  };

  const gpsMatch = raw.match(/GPS \(([+-]?[\d.]+), ([+-]?[\d.]+), ([+-]?[\d.]+)\)/);

  return {
    timestampSeconds,
    aperture: extractNumber(/F\/([\d.]+)/),
    shutterSpeed: extractNumber(/SS ([\d.]+)/),
    iso: extractNumber(/ISO (\d+)/),
    exposureCompensation: extractNumber(/EV ([+-]?[\d.]+)/),
    digitalZoom: extractNumber(/DZOOM ([\d.]+)/),
    gps: {
      longitude: gpsMatch ? parseFloat(gpsMatch[1]) : NaN,
      latitude: gpsMatch ? parseFloat(gpsMatch[2]) : NaN,
      altitude: gpsMatch ? parseFloat(gpsMatch[3]) : NaN,
    },
    distanceFromHome: extractNumber(/D ([\d.]+)m/),
    relativeAltitude: extractNumber(/ H ([\d.]+)m/),
    horizontalSpeed: extractNumber(/H\.S ([+-]?[\d.]+)m\/s/),
    verticalSpeed: extractNumber(/V\.S ([+-]?[\d.]+)m\/s/),
  };
}

export function parseDjiSubtitleTrack(file: File): Promise<DjiSubtitleSample[]> {
  const restoreConsole = suppressMp4BoxErrors();
  return new Promise((resolve, reject) => {
    const samples: DjiSubtitleSample[] = [];
    // keepMdatData=true retains mdat buffers so sample .data can be populated.
    // DJI writes moov at the end of the file, so without this flag the mdat
    // chunks are discarded before onReady fires and extraction yields nothing.
    const mp4file = createFile(true);

    mp4file.onReady = (movie: Movie) => {
      const track = findDjiSubtitleTrack(movie);
      if (!track) {
        resolve([]);
        return;
      }
      mp4file.setExtractionOptions(track.id, undefined, {
        nbSamples: track.nb_samples,
      });
      mp4file.start();
    };

    mp4file.onSamples = (_trackId: number, _user: unknown, newSamples: Sample[]) => {
      for (const sample of newSamples) {
        samples.push(
          parseDjiSubtitleSampleText(decodeSampleText(sample), sample.dts / sample.timescale),
        );
      }
    };

    mp4file.onError = (_module: string, message: string) => {
      reject(new Error(message));
    };

    (async () => {
      try {
        for (let offset = 0; offset < file.size; offset += CHUNK) {
          const ab = (await file
            .slice(offset, offset + CHUNK)
            .arrayBuffer()) as ArrayBuffer & { fileStart: number };
          ab.fileStart = offset;
          mp4file.appendBuffer(ab);
        }
        mp4file.flush();
        restoreConsole();
        resolve(samples);
      } catch (err) {
        restoreConsole();
        reject(err);
      }
    })();
  });
}
