// components/detail/PhotoDetail.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import exifr from "exifr";
import { Badge, Container, Row } from "react-bootstrap";
import type { PhotoItem } from "@/lib/media-types";
import { parseXpComment } from "@/lib/dji-xp-comment";
import { formatBytes, formatDate, formatShutter } from "./format";
import DetailNav from "./DetailNav";
import MetaTile from "./MetaTile";

interface PhotoExif {
  dateTimeOriginal?: Date;
  make?: string;
  model?: string;
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

export default function PhotoDetail({ item }: { item: PhotoItem }) {
  const [url, setUrl] = useState("");
  const [exif, setExif] = useState<PhotoExif>({});
  const [naturalSize, setNaturalSize] = useState<{
    w: number;
    h: number;
  } | null>(null);
  const mediaRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const objectUrl = URL.createObjectURL(item.file);
    setUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [item.file]);

  useEffect(() => {
    exifr
      .parse(item.file, {
        pick: [
          "DateTimeOriginal",
          "Make",
          "Model",
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
          make: typeof data.Make === "string" ? data.Make : undefined,
          model: typeof data.Model === "string" ? data.Model : undefined,
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
  }, [item.file]);

  const dji = parseXpComment(exif.xpComment);

  const lat =
    exif.gpsLatitude != null
      ? `${exif.gpsLatitude.toFixed(4)}° ${exif.gpsLatitudeRef ?? ""}`
      : "—";
  const lng =
    exif.gpsLongitude != null
      ? `${exif.gpsLongitude.toFixed(4)}° ${exif.gpsLongitudeRef ?? ""}`
      : "—";

  return (
    <div>
      <DetailNav
        filename={item.file.name}
        badge={<Badge bg="success">PHOTO</Badge>}
        onFullscreen={() => mediaRef.current?.requestFullscreen()}
      />

      {url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          ref={mediaRef}
          src={url}
          alt={item.file.name}
          className="img-fluid w-100"
          onLoad={(e) => {
            const img = e.currentTarget;
            setNaturalSize({ w: img.naturalWidth, h: img.naturalHeight });
          }}
        />
      )}

      <Container fluid className="py-4">
        <h6 className="text-uppercase text-muted mb-3">File Info</h6>
        <Row className="g-2 mb-4">
          <MetaTile label="Filename" value={item.file.name} />
          <MetaTile label="File Size" value={formatBytes(item.file.size)} />
          <MetaTile
            label="Date Taken"
            value={
              exif.dateTimeOriginal ? formatDate(exif.dateTimeOriginal) : "—"
            }
          />
          <MetaTile
            label="Dimensions"
            value={naturalSize ? `${naturalSize.w} × ${naturalSize.h}` : "—"}
          />
          <MetaTile label="Make" value={exif.make ?? "—"} />
          <MetaTile label="Model" value={exif.model ?? "—"} />
        </Row>

        <h6 className="text-uppercase text-muted mb-3">Camera Settings</h6>
        <Row className="g-2 mb-4">
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
            label="Gimbal Roll"
            value={dji.GimbalRollDegree ? `${dji.GimbalRollDegree}°` : "—"}
          />
          <MetaTile
            label="Flight Yaw"
            value={dji.FlightYawDegree ? `${dji.FlightYawDegree}°` : "—"}
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
