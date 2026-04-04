'use client'

import { useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useMediaContext } from '@/lib/media-context'
import PhotoDetail from '@/components/detail/PhotoDetail'
import VideoDetail from '@/components/detail/VideoDetail'
import HdrDetail from '@/components/detail/HdrDetail'
import PanoramaDetail from '@/components/detail/PanoramaDetail'

export default function MediaDetailPage() {
  const params = useParams<{ index: string }>()
  const { items } = useMediaContext()
  const router = useRouter()

  const index = Number(params.index)
  const item = items?.[index] ?? null

  // Redirect to gallery if context is empty (page refresh) or index is invalid
  useEffect(() => {
    if (items === null || isNaN(index) || index < 0 || index >= items.length) {
      router.replace('/')
    }
  }, [items, index, router])

  // Escape key → go back
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') router.back()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [router])

  if (!items || !item) {
    return (
      <div className="d-flex align-items-center justify-content-center">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading…</span>
        </div>
      </div>
    )
  }

  return (
    <>
      {item.type === 'photo' && <PhotoDetail item={item} />}
      {item.type === 'video' && <VideoDetail item={item} />}
      {item.type === 'hdr' && <HdrDetail item={item} />}
      {item.type === 'panorama' && <PanoramaDetail item={item} />}
    </>
  )
}
