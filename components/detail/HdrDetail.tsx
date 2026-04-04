// components/detail/HdrDetail.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import exifr from "exifr";
import { Badge, Spinner, Toast, Container, Row, Col } from "react-bootstrap";
import type { HdrItem } from "@/lib/media-types";
import { parseXpComment } from "@/lib/dji-xp-comment";
import { formatBytes, formatDate, formatShutter } from "./format";
import DetailNav from "./DetailNav";
import MetaTile from "./MetaTile";
import { renderHdr } from "@/lib/opencv-hdr";

interface HdrExif {
  dateTimeOriginal?: Date;
  iso?: number;
  fNumber?: number;
  exposureTime?: number;
  focalLength?: number;
  gpsLatitude?: number;
  gpsLongitude?: number;
  gpsLatitudeRef?: string;
  gpsLongitudeRef?: string;
  xpComment?: string;
}

export default function HdrDetail({ item }: { item: HdrItem }) {
  const [url, setUrl] = useState("");
  const [exif, setExif] = useState<HdrExif>({});
  const [hdrRendering, setHdrRendering] = useState(false);
  const [hdrError, setHdrError] = useState(false);
  const mediaRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const previewUrl = URL.createObjectURL(item.middle);
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
    exifr
      .parse(item.middle, {
        pick: [
          "DateTimeOriginal",
          "ISO",
          "FNumber",
          "ExposureTime",
          "FocalLength",
          "GPSLatitude",
          "GPSLongitude",
          "GPSLatitudeRef",
          "GPSLongitudeRef",
          "XPComment",
        ],
      })
      .then((data) => {
        if (!data) return;
        setExif({
          dateTimeOriginal:
            data.DateTimeOriginal instanceof Date
              ? data.DateTimeOriginal
              : undefined,
          iso: typeof data.ISO === "number" ? data.ISO : undefined,
          fNumber: typeof data.FNumber === "number" ? data.FNumber : undefined,
          exposureTime:
            typeof data.ExposureTime === "number"
              ? data.ExposureTime
              : undefined,
          focalLength:
            typeof data.FocalLength === "number" ? data.FocalLength : undefined,
          gpsLatitude:
            typeof data.GPSLatitude === "number" ? data.GPSLatitude : undefined,
          gpsLongitude:
            typeof data.GPSLongitude === "number"
              ? data.GPSLongitude
              : undefined,
          gpsLatitudeRef:
            typeof data.GPSLatitudeRef === "string"
              ? data.GPSLatitudeRef
              : undefined,
          gpsLongitudeRef:
            typeof data.GPSLongitudeRef === "string"
              ? data.GPSLongitudeRef
              : undefined,
          xpComment:
            typeof data.XPComment === "string" ? data.XPComment : undefined,
        });
      })
      .catch(() => {});
  }, [item.middle]);

  const dji = parseXpComment(exif.xpComment);
  const lat =
    exif.gpsLatitude != null
      ? `${exif.gpsLatitude.toFixed(4)}° ${exif.gpsLatitudeRef ?? ""}`
      : "—";
  const lng =
    exif.gpsLongitude != null
      ? `${exif.gpsLongitude.toFixed(4)}° ${exif.gpsLongitudeRef ?? ""}`
      : "—";

  const sorted = item.files; // already sorted ascending by ExposureBiasValue in hdr-detector.ts
  const middleIndex = sorted.findIndex((f) => f.name === item.middle.name);

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

      <Container fluid className="py-4">
        <h6 className="text-uppercase text-muted mb-3">HDR Bracket Set</h6>
        <Row className="g-2 mb-4">
          {sorted.map((f, i) => {
            const isMiddle = f.name === item.middle.name;
            const label = isMiddle
              ? "Middle (preview)"
              : i < middleIndex
                ? "Under-exposed"
                : "Over-exposed";
            const badgeBg = isMiddle
              ? "success"
              : i < middleIndex
                ? "warning"
                : "info";
            const badgeText = isMiddle ? undefined : "dark";
            return (
              <Col key={i} xs={6} md={4}>
                <div
                  className={`border rounded p-2 ${isMiddle ? "border-success" : ""}`}
                >
                  <Badge bg={badgeBg} text={badgeText} className="mb-1">
                    {label}
                  </Badge>
                  <div className="small text-muted">{f.name}</div>
                  <div className="small">{formatBytes(f.size)}</div>
                </div>
              </Col>
            );
          })}
        </Row>

        <h6 className="text-uppercase text-muted mb-3">
          Camera Settings (middle exposure)
        </h6>
        <Row className="g-2 mb-4">
          <MetaTile
            label="Date Taken"
            value={
              exif.dateTimeOriginal ? formatDate(exif.dateTimeOriginal) : "—"
            }
          />
          <MetaTile label="ISO" value={exif.iso?.toString() ?? "—"} />
          <MetaTile
            label="Aperture"
            value={exif.fNumber != null ? `f/${exif.fNumber}` : "—"}
          />
          <MetaTile
            label="Shutter"
            value={
              exif.exposureTime != null ? formatShutter(exif.exposureTime) : "—"
            }
          />
          <MetaTile
            label="Focal Length"
            value={exif.focalLength != null ? `${exif.focalLength} mm` : "—"}
          />
        </Row>

        <h6 className="text-uppercase text-muted mb-3">DJI Flight Data</h6>
        <Row className="g-2">
          <MetaTile label="GPS" value={`${lat}, ${lng}`} />
          <MetaTile
            label="Altitude (Abs)"
            value={dji.AbsoluteAltitude ? `${dji.AbsoluteAltitude} m` : "—"}
          />
          <MetaTile
            label="Altitude (Rel)"
            value={dji.RelativeAltitude ? `${dji.RelativeAltitude} m` : "—"}
          />
          <MetaTile
            label="Gimbal Pitch"
            value={dji.GimbalPitchDegree ? `${dji.GimbalPitchDegree}°` : "—"}
          />
          <MetaTile
            label="Gimbal Yaw"
            value={dji.GimbalYawDegree ? `${dji.GimbalYawDegree}°` : "—"}
          />
          <MetaTile
            label="Flight Yaw"
            value={dji.FlightYawDegree ? `${dji.FlightYawDegree}°` : "—"}
          />
          <MetaTile
            label="Gimbal Roll"
            value={dji.GimbalRollDegree ? `${dji.GimbalRollDegree}°` : "—"}
          />
          <MetaTile
            label="Flight Pitch"
            value={dji.FlightPitchDegree ? `${dji.FlightPitchDegree}°` : "—"}
          />
          <MetaTile
            label="Flight Roll"
            value={dji.FlightRollDegree ? `${dji.FlightRollDegree}°` : "—"}
          />
        </Row>
      </Container>
    </div>
  );
}
