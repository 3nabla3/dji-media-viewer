// components/cards/PanoramaCard.tsx
"use client";

import { Card, Badge } from "react-bootstrap";
import type { PanoramaItem } from "@/lib/media-types";
import { useThumbnail } from "@/lib/use-thumbnail";

export default function PanoramaCard({
  item,
  onClick,
}: {
  item: PanoramaItem;
  onClick: () => void;
}) {
  const { url, ref } = useThumbnail(item.tiles[0]);

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
          {item.htmlFile.name} - {item.tiles.length} tiles
        </small>
      </Card.Body>
    </Card>
  );
}
