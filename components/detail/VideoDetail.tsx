// components/detail/VideoDetail.tsx
'use client'

import { useEffect, useRef, useState } from 'react'
import type { VideoItem } from '@/lib/media-types'
import { formatBytes, formatDate } from './format'
import DetailNav from './DetailNav'
import MetaTile from './MetaTile'

interface VideoMeta {
  duration?: number
  width?: number
  height?: number
}

interface Mp4Meta {
  videoCodec?: string
  audioCodec?: string
  frameRate?: number
  bitrate?: number
  creationTime?: Date
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}m ${s.toString().padStart(2, '0')}s`
}

function formatAspectRatio(w: number, h: number): string {
  const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b))
  const d = gcd(w, h)
  return `${w / d}:${h / d}`
}

export default function VideoDetail({ item }: { item: VideoItem }) {
  const [url, setUrl] = useState('')
  const [videoMeta, setVideoMeta] = useState<VideoMeta>({})
  const [mp4Meta, setMp4Meta] = useState<Mp4Meta>({})
  const [mp4Error, setMp4Error] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    const objectUrl = URL.createObjectURL(item.file)
    setUrl(objectUrl)
    return () => URL.revokeObjectURL(objectUrl)
  }, [item.file])

  // Parse mp4box metadata from the first 1 MB of the file
  useEffect(() => {
    let cancelled = false
    async function parseMp4() {
      try {
        const MP4Box = await import('mp4box')
        const mp4File = MP4Box.createFile()

        await new Promise<void>((resolve, reject) => {
          mp4File.onReady = (info) => {
            if (cancelled) return
            const vt = info.videoTracks?.[0]
            const at = info.audioTracks?.[0]
            const fps =
              vt && vt.timescale > 0
                ? Math.round((vt.nb_samples / (vt.duration / vt.timescale)) * 100) / 100
                : undefined
            setMp4Meta({
              videoCodec: vt?.codec,
              audioCodec: at?.codec,
              frameRate: fps,
              bitrate: vt ? Math.round(vt.bitrate / 1_000_000) : undefined,
              creationTime: info.created instanceof Date ? info.created : undefined,
            })
            resolve()
          }
          mp4File.onError = (e) => reject(new Error(e))

          const CHUNK = 1024 * 1024
          item.file.slice(0, CHUNK).arrayBuffer().then((buf) => {
            const buffer = buf as ArrayBuffer & { fileStart: number }
            buffer.fileStart = 0
            mp4File.appendBuffer(buffer)
            mp4File.flush()
          })
        })
      } catch {
        if (!cancelled) setMp4Error(true)
      }
    }
    parseMp4()
    return () => { cancelled = true }
  }, [item.file])

  return (
    <div>
      <DetailNav
        filename={item.file.name}
        badge={<span className="badge bg-secondary">VIDEO</span>}
      />

      {url && (
        <video
          ref={videoRef}
          src={url}
          controls
          className="w-100"
          onLoadedMetadata={() => {
            const v = videoRef.current
            if (!v) return
            setVideoMeta({ duration: v.duration, width: v.videoWidth, height: v.videoHeight })
          }}
        />
      )}

      <div className="container-fluid py-4">
        <h6 className="text-uppercase text-muted mb-3">File Info</h6>
        <div className="row g-2 mb-4">
          <MetaTile label="Filename" value={item.file.name} />
          <MetaTile label="File Size" value={formatBytes(item.file.size)} />
          <MetaTile
            label="Last Modified"
            value={item.file.lastModified ? formatDate(new Date(item.file.lastModified)) : '—'}
          />
        </div>

        <h6 className="text-uppercase text-muted mb-3">Video Properties</h6>
        <div className="row g-2 mb-4">
          <MetaTile
            label="Duration"
            value={videoMeta.duration != null ? formatDuration(videoMeta.duration) : '—'}
          />
          <MetaTile
            label="Resolution"
            value={
              videoMeta.width && videoMeta.height
                ? `${videoMeta.width} × ${videoMeta.height}`
                : '—'
            }
          />
          <MetaTile
            label="Aspect Ratio"
            value={
              videoMeta.width && videoMeta.height
                ? formatAspectRatio(videoMeta.width, videoMeta.height)
                : '—'
            }
          />
        </div>

        <h6 className="text-uppercase text-muted mb-3">
          Container &amp; Codec
          {mp4Error && (
            <span className="badge bg-secondary ms-2 text-lowercase fw-normal">unavailable</span>
          )}
        </h6>
        <div className="row g-2">
          <MetaTile label="Video Codec" value={mp4Meta.videoCodec ?? '—'} />
          <MetaTile
            label="Frame Rate"
            value={mp4Meta.frameRate != null ? `${mp4Meta.frameRate} fps` : '—'}
          />
          <MetaTile
            label="Bitrate"
            value={mp4Meta.bitrate != null ? `${mp4Meta.bitrate} Mbps` : '—'}
          />
          <MetaTile label="Audio Codec" value={mp4Meta.audioCodec ?? '—'} />
          <MetaTile
            label="Creation Time"
            value={mp4Meta.creationTime ? formatDate(mp4Meta.creationTime) : '—'}
          />
        </div>
      </div>
    </div>
  )
}
