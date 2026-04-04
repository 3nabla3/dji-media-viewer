// components/cards/PanoramaCard.tsx
"use client";

import { Card, Badge, Row, Col } from "react-bootstrap";
import type { PanoramaItem } from "@/lib/media-types";
import { useThumbnail } from "@/lib/use-thumbnail";

function TileThumb({ file }: { file: File }) {
  console.log(file);
  const { url } = useThumbnail(file);
  return url ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={url}
      alt=""
      className="img-fluid"
      style={{ height: "60px", objectFit: "cover", width: "100%" }}
    />
  ) : (
    <div
      className="bg-secondary-subtle"
      style={{ height: "60px", width: "100%" }}
    />
  );
}

export default function PanoramaCard({
  item,
  onClick,
}: {
  item: PanoramaItem;
  onClick: () => void;
}) {
  console.log(item);
  const { ref } = useThumbnail(item.tiles[0]);

  return (
    <Card
      ref={ref}
      className="h-100"
      style={{ cursor: "pointer" }}
      onClick={onClick}
    >
      <Card.Header className="p-2">
        <Badge bg="info" text="dark" className="me-1">
          PANORAMA
        </Badge>
        <small className="text-muted">
          {item.htmlFile.name} · {item.tiles.length} tiles
        </small>
      </Card.Header>
      <Card.Body className="p-2">
        <Row xs={4} className="g-1">
          {item.tiles.map((tile, i) => (
            <Col key={i}>
              <TileThumb file={tile} />
            </Col>
          ))}
        </Row>
      </Card.Body>
    </Card>
  );
}
