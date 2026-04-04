// components/detail/PanoramaDetail.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { Badge, Container, Row } from "react-bootstrap";
import type { PanoramaItem } from "@/lib/media-types";
import { formatBytes } from "./format";
import DetailNav from "./DetailNav";
import MetaTile from "./MetaTile";

export default function PanoramaDetail({ item }: { item: PanoramaItem }) {
  const [iframeUrl, setIframeUrl] = useState("");
  const mediaRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const objectUrl = URL.createObjectURL(item.htmlFile);
    setIframeUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [item.htmlFile]);

  const totalSize = item.tiles.reduce(
    (sum, f) => sum + f.size,
    item.htmlFile.size,
  );

  return (
    <div>
      <DetailNav
        filename={item.htmlFile.name}
        badge={
          <Badge bg="info" text="dark">
            PANORAMA
          </Badge>
        }
        onFullscreen={() => mediaRef.current?.requestFullscreen()}
      />

      {iframeUrl && (
        <iframe
          ref={mediaRef}
          src={iframeUrl}
          sandbox="allow-scripts allow-same-origin"
          className="w-100"
          style={{ height: "70vh", border: "none" }}
          title="DJI Panorama Viewer"
        />
      )}

      <Container fluid className="py-4">
        <h6 className="text-uppercase text-muted mb-3">Panorama Info</h6>
        <Row className="g-2">
          <MetaTile label="Viewer File" value={item.htmlFile.name} />
          <MetaTile label="Tiles" value={`${item.tiles.length}`} />
          <MetaTile label="Total Size" value={formatBytes(totalSize)} />
        </Row>
      </Container>
    </div>
  );
}
