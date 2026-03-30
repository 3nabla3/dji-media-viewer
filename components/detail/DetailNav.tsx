// components/detail/DetailNav.tsx
'use client'

import { useRouter } from 'next/navigation'
import type { ReactNode } from 'react'

interface DetailNavProps {
  filename: string
  badge: ReactNode
}

export default function DetailNav({ filename, badge }: DetailNavProps) {
  const router = useRouter()
  return (
    <nav className="navbar navbar-dark bg-dark border-bottom sticky-top">
      <div className="container-fluid">
        <button
          type="button"
          className="btn btn-outline-secondary btn-sm"
          onClick={() => router.back()}
        >
          ← Back to gallery
        </button>
        <span className="text-light ms-3 me-2">{filename}</span>
        {badge}
      </div>
    </nav>
  )
}
