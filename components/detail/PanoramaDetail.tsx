// components/detail/PanoramaDetail.tsx
"use client";

import { Badge, Container, Row, Spinner } from "react-bootstrap";
import type { PanoramaItem } from "@/lib/media-types";
import { formatBytes } from "./format";
import DetailNav from "./DetailNav";
import MetaTile from "./MetaTile";
import { useTileAngles } from "@/lib/use-tile-angles";
import { getViewer } from "@/lib/panorama-viewers";

export default function PanoramaDetail({ item }: { item: PanoramaItem }) {
  const tiles = useTileAngles(item.tiles);
  const Viewer = getViewer(item.panoramaMode);

  const totalSize = item.tiles.reduce(
    (sum, f) => sum + f.size,
    item.htmlFile.size,
  );

  function renderViewer() {
    if (!tiles) {
      return (
        <div
          className="d-flex align-items-center justify-content-center bg-black"
          style={{ height: "70vh" }}
        >
          <Spinner animation="border" variant="secondary" />
        </div>
      );
    }
    if (!Viewer) {
      return (
        <div
          className="d-flex align-items-center justify-content-center bg-black"
          style={{ height: "70vh" }}
        >
          <span className="text-muted">
            Unsupported panorama mode:{" "}
            <strong>{item.panoramaMode || "(unknown)"}</strong>
          </span>
        </div>
      );
    }
    return <Viewer tiles={tiles} />;
  }

  return (
    <div className="w-100">
      <DetailNav
        filename={item.htmlFile.name}
        badge={
          <Badge bg="info" text="dark">
            PANORAMA
          </Badge>
        }
      />

      {renderViewer()}

      <Container fluid className="py-4">
        <h6 className="text-uppercase text-muted mb-3">Panorama Info</h6>
        <Row className="g-2">
          <MetaTile label="Mode" value={item.panoramaMode || "unknown"} />
          <MetaTile label="Viewer File" value={item.htmlFile.name} />
          <MetaTile label="Tiles" value={`${item.tiles.length}`} />
          <MetaTile label="Total Size" value={formatBytes(totalSize)} />
        </Row>
      </Container>
    </div>
  );
}
