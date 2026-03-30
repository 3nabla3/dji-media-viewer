// components/detail/HdrDetail.tsx
'use client'

import { useEffect, useRef, useState } from 'react'
import exifr from 'exifr'
import type { HdrItem } from '@/lib/media-types'
import { parseXpComment } from '@/lib/dji-xp-comment'
import { formatBytes, formatDate, formatShutter } from './format'
import DetailNav from './DetailNav'
import MetaTile from './MetaTile'

interface HdrExif {
  dateTimeOriginal?: Date
  iso?: number
  fNumber?: number
  exposureTime?: number
  focalLength?: number
  gpsLatitude?: number
  gpsLongitude?: number
  gpsLatitudeRef?: string
  gpsLongitudeRef?: string
  xpComment?: string
}

export default function HdrDetail({ item }: { item: HdrItem }) {
  const [url, setUrl] = useState('')
  const [exif, setExif] = useState<HdrExif>({})
  const mediaRef = useRef<HTMLImageElement>(null)

  useEffect(() => {
    const objectUrl = URL.createObjectURL(item.middle)
    setUrl(objectUrl)
    return () => URL.revokeObjectURL(objectUrl)
  }, [item.middle])

  useEffect(() => {
    exifr
      .parse(item.middle, {
        pick: [
          'DateTimeOriginal', 'ISO', 'FNumber', 'ExposureTime', 'FocalLength',
          'GPSLatitude', 'GPSLongitude', 'GPSLatitudeRef', 'GPSLongitudeRef',
          'XPComment',
        ],
      })
      .then((data) => {
        if (!data) return
        setExif({
          dateTimeOriginal: data.DateTimeOriginal instanceof Date ? data.DateTimeOriginal : undefined,
          iso: typeof data.ISO === 'number' ? data.ISO : undefined,
          fNumber: typeof data.FNumber === 'number' ? data.FNumber : undefined,
          exposureTime: typeof data.ExposureTime === 'number' ? data.ExposureTime : undefined,
          focalLength: typeof data.FocalLength === 'number' ? data.FocalLength : undefined,
          gpsLatitude: typeof data.GPSLatitude === 'number' ? data.GPSLatitude : undefined,
          gpsLongitude: typeof data.GPSLongitude === 'number' ? data.GPSLongitude : undefined,
          gpsLatitudeRef: typeof data.GPSLatitudeRef === 'string' ? data.GPSLatitudeRef : undefined,
          gpsLongitudeRef: typeof data.GPSLongitudeRef === 'string' ? data.GPSLongitudeRef : undefined,
          xpComment: typeof data.XPComment === 'string' ? data.XPComment : undefined,
        })
      })
      .catch(() => {})
  }, [item.middle])

  const dji = parseXpComment(exif.xpComment)
  const lat =
    exif.gpsLatitude != null
      ? `${exif.gpsLatitude.toFixed(4)}° ${exif.gpsLatitudeRef ?? ''}`
      : '—'
  const lng =
    exif.gpsLongitude != null
      ? `${exif.gpsLongitude.toFixed(4)}° ${exif.gpsLongitudeRef ?? ''}`
      : '—'

  const sorted = item.files  // already sorted ascending by ExposureBiasValue in hdr-detector.ts
  const middleIndex = sorted.findIndex((f) => f.name === item.middle.name)

  return (
    <div>
      <DetailNav
        filename={item.middle.name}
        badge={<span className="badge bg-warning text-dark">HDR</span>}
        onFullscreen={() => mediaRef.current?.requestFullscreen()}
      />

      {url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img ref={mediaRef} src={url} alt={item.middle.name} className="img-fluid w-100" />
      )}

      <div className="container-fluid py-4">
        <h6 className="text-uppercase text-muted mb-3">HDR Bracket Set</h6>
        <div className="row g-2 mb-4">
          {sorted.map((f, i) => {
            const isMiddle = f.name === item.middle.name
            const label = isMiddle
              ? 'Middle (preview)'
              : i < middleIndex
              ? 'Under-exposed'
              : 'Over-exposed'
            const badgeCls = isMiddle
              ? 'bg-success'
              : i < middleIndex
              ? 'bg-warning text-dark'
              : 'bg-info text-dark'
            return (
              <div key={i} className="col-6 col-md-4">
                <div className={`border rounded p-2 ${isMiddle ? 'border-success' : ''}`}>
                  <span className={`badge ${badgeCls} mb-1`}>{label}</span>
                  <div className="small text-muted">{f.name}</div>
                  <div className="small">{formatBytes(f.size)}</div>
                </div>
              </div>
            )
          })}
        </div>

        <h6 className="text-uppercase text-muted mb-3">Camera Settings (middle exposure)</h6>
        <div className="row g-2 mb-4">
          <MetaTile label="Date Taken" value={exif.dateTimeOriginal ? formatDate(exif.dateTimeOriginal) : '—'} />
          <MetaTile label="ISO" value={exif.iso?.toString() ?? '—'} />
          <MetaTile label="Aperture" value={exif.fNumber != null ? `f/${exif.fNumber}` : '—'} />
          <MetaTile label="Shutter" value={exif.exposureTime != null ? formatShutter(exif.exposureTime) : '—'} />
          <MetaTile label="Focal Length" value={exif.focalLength != null ? `${exif.focalLength} mm` : '—'} />
        </div>

        <h6 className="text-uppercase text-muted mb-3">DJI Flight Data</h6>
        <div className="row g-2">
          <MetaTile label="GPS" value={`${lat}, ${lng}`} />
          <MetaTile label="Altitude (Abs)" value={dji.AbsoluteAltitude ? `${dji.AbsoluteAltitude} m` : '—'} />
          <MetaTile label="Altitude (Rel)" value={dji.RelativeAltitude ? `${dji.RelativeAltitude} m` : '—'} />
          <MetaTile label="Gimbal Pitch" value={dji.GimbalPitchDegree ? `${dji.GimbalPitchDegree}°` : '—'} />
          <MetaTile label="Gimbal Yaw" value={dji.GimbalYawDegree ? `${dji.GimbalYawDegree}°` : '—'} />
          <MetaTile label="Flight Yaw" value={dji.FlightYawDegree ? `${dji.FlightYawDegree}°` : '—'} />
          <MetaTile label="Gimbal Roll" value={dji.GimbalRollDegree ? `${dji.GimbalRollDegree}°` : '—'} />
          <MetaTile label="Flight Pitch" value={dji.FlightPitchDegree ? `${dji.FlightPitchDegree}°` : '—'} />
          <MetaTile label="Flight Roll" value={dji.FlightRollDegree ? `${dji.FlightRollDegree}°` : '—'} />
        </div>
      </div>
    </div>
  )
}
