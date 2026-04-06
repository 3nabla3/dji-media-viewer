// components/detail/ExifSections.tsx
import { Container, Row } from "react-bootstrap";
import type { MediaExif } from "./exif";
import { formatBytes, formatDate, formatShutter } from "./format";
import MetaTile from "./MetaTile";

interface ExifSectionsProps {
  exif: MediaExif;
  file: { name: string; size: number };
}

export default function ExifSections({ exif, file }: ExifSectionsProps) {
  const gps =
    exif.latitude != null && exif.longitude != null
      ? `${exif.latitude.toFixed(4)}° ${exif.gpsLatitudeRef ?? ""}, ${exif.longitude.toFixed(4)}° ${exif.gpsLongitudeRef ?? ""}`
      : "—";

  return (
    <Container fluid className="py-4">
      <h6 className="text-uppercase text-muted mb-3">File Info</h6>
      <Row className="g-2 mb-4">
        <MetaTile label="Filename" value={file.name} />
        <MetaTile label="File Size" value={formatBytes(file.size)} />
        <MetaTile
          label="Date Taken"
          value={
            exif.dateTimeOriginal ? formatDate(exif.dateTimeOriginal) : "—"
          }
        />
        <MetaTile
          label="Dimensions"
          value={
            exif.imageWidth != null && exif.imageHeight != null
              ? `${exif.imageWidth} × ${exif.imageHeight}`
              : "—"
          }
        />
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
        <MetaTile label="GPS" value={gps} />
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
            exif.gimbalPitchDegree != null ? `${exif.gimbalPitchDegree}°` : "—"
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
            exif.flightPitchDegree != null ? `${exif.flightPitchDegree}°` : "—"
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
  );
}
