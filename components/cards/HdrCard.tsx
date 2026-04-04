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
  console.log(item);
  const { url, ref } = useThumbnail(item.middle);

  return (
    <Card
      ref={ref}
      border="warning"
      className="h-100"
      style={{ cursor: "pointer" }}
      onClick={onClick}
    >
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={url}
          alt={item.middle.name}
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
        <small className="text-muted">
          {item.files.length} exposures · {item.middle.name}
        </small>
      </Card.Body>
    </Card>
  );
}
