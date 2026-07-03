// components/cards/HdrCard.tsx
"use client";

import { Card, Badge } from "react-bootstrap";
import type { HdrItem } from "@/lib/media-types";
import { useThumbnail } from "@/lib/use-thumbnail";

export default function HdrCard({
  item,
  onClick,
}: {
  item: HdrItem;
  onClick: () => void;
}) {
  const middleFile = item.files[Math.floor(item.files.length / 2)];
  const { url, ref } = useThumbnail(middleFile);

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
          alt={middleFile.name}
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
        <Badge bg="warning" text="dark" className="me-1">
          HDR
        </Badge>
        <small className="text-muted">{middleFile.name}</small>
      </Card.Body>
    </Card>
  );
}
