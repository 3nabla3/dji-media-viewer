// components/detail/HdrDetail.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { Badge, Col, Row, Spinner, Toast } from "react-bootstrap";
import type { HdrItem } from "@/lib/media-types";
import { type MediaExif, parseExif } from "./exif";
import { formatBytes } from "./format";
import DetailNav from "./DetailNav";
import ExifSections from "./ExifSections";
import { renderHdr } from "@/lib/opencv-hdr";

export default function HdrDetail({ item }: { item: HdrItem }) {
  const middleIndex = item.files.findIndex((f) => f.name === item.middle.name);

  const [url, setUrl] = useState("");
  const [exifList, setExifList] = useState<MediaExif[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number>(middleIndex);
  const [hdrRendering, setHdrRendering] = useState(false);
  const [hdrError, setHdrError] = useState(false);
  const mediaRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const previewUrl = URL.createObjectURL(item.middle);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setUrl(previewUrl);
    setHdrRendering(true);
    setHdrError(false);

    let hdrBlobUrl: string | null = null;
    let cancelled = false;
    let errorTimer: ReturnType<typeof setTimeout> | null = null;
    let previewRevoked = false;

    renderHdr(item.files)
      .then((blob) => {
        if (cancelled) return;
        URL.revokeObjectURL(previewUrl);
        previewRevoked = true;
        hdrBlobUrl = URL.createObjectURL(blob);
        setUrl(hdrBlobUrl);
        setHdrRendering(false);
      })
      .catch((e) => {
        console.error(e);
        if (cancelled) return;
        setHdrRendering(false);
        setHdrError(true);
        errorTimer = setTimeout(() => setHdrError(false), 5000);
      });

    return () => {
      cancelled = true;
      if (!previewRevoked) URL.revokeObjectURL(previewUrl);
      if (hdrBlobUrl) URL.revokeObjectURL(hdrBlobUrl);
      if (errorTimer) clearTimeout(errorTimer);
    };
  }, [item.files, item.middle]);

  useEffect(() => {
    Promise.all(item.files.map(parseExif)).then(setExifList);
  }, [item.files]);

  return (
    <div>
      <DetailNav
        filename={item.middle.name}
        badge={
          <Badge bg="warning" text="dark">
            HDR
          </Badge>
        }
        onFullscreen={() => mediaRef.current?.requestFullscreen()}
      />

      {url && (
        <div className="position-relative">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            ref={mediaRef}
            src={url}
            alt={item.middle.name}
            className="img-fluid w-100"
          />
          {hdrRendering && (
            <div className="position-absolute top-0 end-0 m-2">
              <span className="badge bg-dark bg-opacity-75 d-flex align-items-center gap-1">
                <Spinner
                  animation="border"
                  size="sm"
                  role="status"
                  aria-hidden="true"
                />
                Rendering HDR…
              </span>
            </div>
          )}
        </div>
      )}

      <Toast
        show={hdrError}
        onClose={() => setHdrError(false)}
        className="position-fixed top-0 end-0 m-3"
        style={{ zIndex: 1100 }}
      >
        <Toast.Header>
          <strong className="me-auto text-danger">HDR Rendering Failed</strong>
        </Toast.Header>
        <Toast.Body>Showing middle exposure instead.</Toast.Body>
      </Toast>

      <div className="px-3 pt-4">
        <h6 className="text-uppercase text-muted mb-3">HDR Bracket Set</h6>
        <Row className="g-2 mb-4">
          {item.files.map((f, i) => {
            const isMiddle = f.name === item.middle.name;
            const isSelected = i === selectedIndex;
            const label = isMiddle
              ? "Middle"
              : i < middleIndex
                ? "Under-exposed"
                : "Over-exposed";
            return (
              <Col key={i} xs={6} md={4}>
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => setSelectedIndex(i)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") setSelectedIndex(i);
                  }}
                  className={`border rounded p-2 h-100 ${
                    isSelected &&
                    "border-primary border-2 bg-primary bg-opacity-10"
                  }`}
                  style={{ cursor: "pointer" }}
                >
                  <Badge className="mb-1" bg="secondary">
                    {label}
                  </Badge>
                  <div className="small text-muted">{f.name}</div>
                  <div className="small">{formatBytes(f.size)}</div>
                </div>
              </Col>
            );
          })}
        </Row>
      </div>

      {exifList[selectedIndex] && (
        <ExifSections
          exif={exifList[selectedIndex]}
          file={item.files[selectedIndex]}
        />
      )}
    </div>
  );
}
