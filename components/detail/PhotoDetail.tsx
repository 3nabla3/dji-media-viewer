// components/detail/PhotoDetail.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import exifr from "exifr";
import { Badge, Container, Row } from "react-bootstrap";
import type { PhotoItem } from "@/lib/media-types";
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
  latitude?: number;
  longitude?: number;
  gpsLatitudeRef?: string;
  gpsLongitudeRef?: string;
  absoluteAltitude?: number;
  relativeAltitude?: number;
  gimbalRollDegree?: number;
  gimbalYawDegree?: number;
  gimbalPitchDegree?: number;
  flightRollDegree?: number;
  flightYawDegree?: number;
  flightPitchDegree?: number;
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
      .parse(item.file, { xmp: true })
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
          latitude:
            typeof data.latitude === "number" ? data.latitude : undefined,
          longitude:
            typeof data.longitude === "number" ? data.longitude : undefined,
          gpsLatitudeRef:
            typeof data.GPSLatitudeRef === "string"
              ? data.GPSLatitudeRef
              : undefined,
          gpsLongitudeRef:
            typeof data.GPSLongitudeRef === "string"
              ? data.GPSLongitudeRef
              : undefined,
          absoluteAltitude:
            typeof data.AbsoluteAltitude === "number"
              ? data.AbsoluteAltitude
              : undefined,
          relativeAltitude:
            typeof data.RelativeAltitude === "number"
              ? data.RelativeAltitude
              : undefined,
          gimbalRollDegree:
            typeof data.GimbalRollDegree === "number"
              ? data.GimbalRollDegree
              : undefined,
          gimbalYawDegree:
            typeof data.GimbalYawDegree === "number"
              ? data.GimbalYawDegree
              : undefined,
          gimbalPitchDegree:
            typeof data.GimbalPitchDegree === "number"
              ? data.GimbalPitchDegree
              : undefined,
          flightRollDegree:
            typeof data.FlightRollDegree === "number"
              ? data.FlightRollDegree
              : undefined,
          flightYawDegree:
            typeof data.FlightYawDegree === "number"
              ? data.FlightYawDegree
              : undefined,
          flightPitchDegree:
            typeof data.FlightPitchDegree === "number"
              ? data.FlightPitchDegree
              : undefined,
        });
      })
      .catch(() => {});
  }, [item.file]);

  const lat =
    exif.latitude != null
      ? `${exif.latitude.toFixed(4)}° ${exif.gpsLatitudeRef ?? ""}`
      : "—";
  const lng =
    exif.longitude != null
      ? `${exif.longitude.toFixed(4)}° ${exif.gpsLongitudeRef ?? ""}`
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
            value={
              exif.absoluteAltitude != null ? `${exif.absoluteAltitude} m` : "—"
            }
          />
          <MetaTile
            label="Altitude (Rel)"
            value={
              exif.relativeAltitude != null ? `${exif.relativeAltitude} m` : "—"
            }
          />
          <MetaTile
            label="Gimbal Pitch"
            value={
              exif.gimbalPitchDegree != null
                ? `${exif.gimbalPitchDegree}°`
                : "—"
            }
          />
          <MetaTile
            label="Gimbal Yaw"
            value={
              exif.gimbalYawDegree != null ? `${exif.gimbalYawDegree}°` : "—"
            }
          />
          <MetaTile
            label="Gimbal Roll"
            value={
              exif.gimbalRollDegree != null ? `${exif.gimbalRollDegree}°` : "—"
            }
          />
          <MetaTile
            label="Flight Yaw"
            value={
              exif.flightYawDegree != null ? `${exif.flightYawDegree}°` : "—"
            }
          />
          <MetaTile
            label="Flight Pitch"
            value={
              exif.flightPitchDegree != null
                ? `${exif.flightPitchDegree}°`
                : "—"
            }
          />
          <MetaTile
            label="Flight Roll"
            value={
              exif.flightRollDegree != null ? `${exif.flightRollDegree}°` : "—"
            }
          />
        </Row>
      </Container>
    </div>
  );
}
