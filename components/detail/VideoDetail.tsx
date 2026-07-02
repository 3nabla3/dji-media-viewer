// components/detail/VideoDetail.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { Badge } from "react-bootstrap";
import type { VideoItem } from "@/lib/media-types";
import DetailNav from "./DetailNav";

// TODO: breaking change — mp4box.d.ts removed and VideoItem shape changed; metadata display commented out pending rewrite
// import { Badge, Container, Row, Toast } from "react-bootstrap";
// import { formatBytes, formatDate } from "./format";
// import MetaTile from "./MetaTile";
// import * as MP4Box from "mp4box";
//
// function formatDuration(seconds: number): string { ... }
// function formatAspectRatio(w: number, h: number): string { ... }
// function patchMp4boxErrors() { ... }
// async function readMetadata(file: File): Promise<Movie> { ... }
// export function getFrameRate(info: Movie): number | null { ... }

export default function VideoDetail({ item }: { item: VideoItem }) {
  const [url, setUrl] = useState("");
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const objectUrl = URL.createObjectURL(item.file);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [item.file]);

  return (
    <div>
      <DetailNav
        filename={item.file.name}
        badge={<Badge bg="secondary">VIDEO</Badge>}
        onFullscreen={() => videoRef.current?.requestFullscreen()}
      />

      {url && <video ref={videoRef} src={url} controls className="w-100" />}
    </div>
  );
}
