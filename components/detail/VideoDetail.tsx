// components/detail/VideoDetail.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { Badge, Container, Row, Toast } from "react-bootstrap";
import type { VideoItem } from "@/lib/media-types";
import { formatBytes, formatDate } from "./format";
import DetailNav from "./DetailNav";
import MetaTile from "./MetaTile";
import * as MP4Box from "mp4box";
import { MP4Info } from "mp4box";

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}m ${s.toString().padStart(2, "0")}s`;
}

function formatAspectRatio(w: number, h: number): string {
  const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
  const d = gcd(w, h);
  return `${w / d}:${h / d}`;
}

/// patch the console error method to avoid annoying error that nextjs
/// picks up on
function patchMp4boxErrors() {
  const originalErr = console.error;

  console.error = (...args) => {
    if (typeof args[0] === "string" && args[1].includes("[BoxParser]")) {
      return;
    }
    originalErr(...args);
  };

  return () => {
    console.error = originalErr;
  };
}

async function readMetadata(file: File): Promise<MP4Box.MP4Info> {
  const CHUNK = 4 * 1024 * 1024; // 4 MiB

  // DJI (and most cameras) write moov at the end of the file.
  // Append first chunk (ftyp/mdat start) + last chunk (moov) so mp4box
  // can resolve without reading the full file.
  const slices: { start: number; end: number }[] = [{ start: 0, end: CHUNK }];
  if (file.size > CHUNK * 2) {
    slices.push({ start: file.size - CHUNK, end: file.size });
  }

  const buffers = await Promise.all(
    slices.map(async ({ start, end }) => {
      const ab = await file.slice(start, end).arrayBuffer() as ArrayBuffer & { fileStart: number };
      ab.fileStart = start;
      return ab;
    })
  );

  const mp4box = MP4Box.createFile();

  return new Promise((resolve, reject) => {
    mp4box.onReady = resolve;
    mp4box.onError = reject;

    for (const buf of buffers) {
      mp4box.appendBuffer(buf);
    }
    mp4box.flush();
  });
}

export function getFrameRate(info: MP4Info): number | null {
  const track = info.videoTracks?.[0];
  if (!track) return null;

  const { nb_samples, duration, timescale } = track;
  if (!nb_samples || !duration || !timescale) return null;

  return (nb_samples * timescale) / duration;
}

export default function VideoDetail({ item }: { item: VideoItem }) {
  const [url, setUrl] = useState("");
  const [videoMeta, setVideoMeta] = useState<MP4Box.MP4Info>();
  const [parseError, setParseError] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const objectUrl = URL.createObjectURL(item.file);
    setUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [item.file]);

  useEffect(() => {
    const restore = patchMp4boxErrors();
    let cancelled = false;

    readMetadata(item.file)
      .then((metadata) => {
        if (!cancelled) setVideoMeta(metadata);
      })
      .catch((e) => {
        console.error(e);
        if (!cancelled) setParseError(true);
      });

    return () => {
      cancelled = true;
      restore();
    };
  }, [item.file]);

  const videoTrack = videoMeta?.videoTracks[0];

  return (
    <div>
      <DetailNav
        filename={item.file.name}
        badge={<Badge bg="secondary">VIDEO</Badge>}
        onFullscreen={() => videoRef.current?.requestFullscreen()}
      />

      {url && <video ref={videoRef} src={url} controls className="w-100" />}

      <Toast
        show={parseError}
        onClose={() => setParseError(false)}
        className="position-fixed top-0 end-0 m-3"
        style={{ zIndex: 1100 }}
      >
        <Toast.Header>
          <strong className="me-auto text-danger">Metadata Parse Failed</strong>
        </Toast.Header>
        <Toast.Body>Could not read video metadata.</Toast.Body>
      </Toast>

      <Container fluid className="py-4">
        <h6 className="text-uppercase text-muted mb-3">File Info</h6>
        <Row className="g-2 mb-4">
          <MetaTile label="Filename" value={item.file.name} />
          <MetaTile label="File Size" value={formatBytes(item.file.size)} />
          <MetaTile
            label="Date Taken"
            value={videoMeta?.created ? formatDate(videoMeta.created) : "—"}
          />
        </Row>

        <h6 className="text-uppercase text-muted mb-3">Video Properties</h6>
        <Row className="g-2 mb-4">
          <MetaTile
            label="Duration"
            value={videoMeta?.duration != null ? formatDuration(videoMeta.duration / 1000) : "—"}
          />
          <MetaTile
            label="Resolution"
            value={
              videoTrack?.video.width && videoTrack?.video.height
                ? `${videoTrack.video.width} x ${videoTrack.video.height}`
                : "—"
            }
          />
          <MetaTile
            label="Aspect Ratio"
            value={
              videoTrack?.video.width && videoTrack?.video.height
                ? formatAspectRatio(videoTrack.video.width, videoTrack.video.height)
                : "—"
            }
          />
        </Row>

        <Row className="g-2">
          <MetaTile label="Video Codec" value={videoTrack?.codec ?? "—"} />
          <MetaTile
            label="Frame Rate"
            value={videoTrack && videoMeta ? `${getFrameRate(videoMeta)?.toFixed(2)} fps` : "—"}
          />
          <MetaTile
            label="Bitrate"
            value={videoTrack?.bitrate != null ? `${(videoTrack.bitrate / 1_000_000).toFixed(2)} Mbps` : "—"}
          />
        </Row>
      </Container>
    </div>
  );
}
