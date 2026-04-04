// components/cards/VideoCard.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { Card, Badge } from "react-bootstrap";
import type { VideoItem } from "@/lib/media-types";

export default function VideoCard({
  item,
  onClick,
}: {
  item: VideoItem;
  onClick: () => void;
}) {
  const [url, setUrl] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const obs = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        obs.disconnect();
        const objectUrl = URL.createObjectURL(item.file);
        setUrl(objectUrl);
      },
      { rootMargin: "400px" },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [item.file]);

  return (
    <Card
      ref={ref}
      className="h-100"
      style={{ cursor: "pointer" }}
      onClick={onClick}
    >
      {url ? (
        <video
          src={url}
          preload="metadata"
          className="card-img-top"
          style={{ height: "200px", objectFit: "cover" }}
        />
      ) : (
        <div
          className="card-img-top bg-secondary-subtle"
          style={{ height: "200px" }}
        />
      )}
      <Card.Body className="p-2">
        <Badge bg="secondary" className="me-1">
          VIDEO
        </Badge>
        <small className="text-muted">{item.file.name}</small>
      </Card.Body>
    </Card>
  );
}
