// components/cards/PanoramaCard.tsx
"use client";

import { Card, Badge } from "react-bootstrap";
import type { PanoramaItem } from "@/lib/media-types";
import { useThumbnail } from "@/lib/use-thumbnail";
import { useEffect, useState } from "react";

async function getPanoramaMode(item: PanoramaItem): Promise<string | null> {
  const content = await item.htmlFile.text();
  const doc = new DOMParser().parseFromString(content, "text/html");
  const value = doc
    .querySelector("meta[data-PANOMODE]")
    ?.getAttribute("data-PANOMODE");
  return value?.trim().toLocaleLowerCase() ?? null;
}

function usePanoramaMode(item: PanoramaItem): string | null {
  const [panoramaMode, setPanoramaMode] = useState<string | null>(null);

  useEffect(() => {
    getPanoramaMode(item).then(setPanoramaMode);
  }, [item]);

  return panoramaMode;
}

export default function PanoramaCard({
  item,
  onClick,
}: {
  item: PanoramaItem;
  onClick: () => void;
}) {
  const { url, ref } = useThumbnail(item.tiles[0]);
  const panoramaMode = usePanoramaMode(item);

  return (
    <Card
      ref={ref}
      className="h-100"
      style={{ cursor: "pointer" }}
      onClick={onClick}
    >
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={url}
          alt={item.htmlFile.name}
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
        <Badge bg="info" text="dark" className="me-1">
          PANORAMA
        </Badge>
        <small className="text-muted">
          {item.htmlFile.name} {panoramaMode && `- ${panoramaMode}`}
        </small>
      </Card.Body>
    </Card>
  );
}
