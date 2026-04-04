// components/Toast.tsx
'use client'

import { useEffect, useRef } from 'react'

interface ToastProps {
  messages: string[]
  variant?: 'warning' | 'danger' | 'info'
  onDismiss: () => void
}

export default function Toast({ messages, variant = 'warning', onDismiss }: ToastProps) {
  const toastRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const toastEl = toastRef.current
    if (!toastEl) return

    let cancelled = false
    let toast: { show(): void; dispose(): void } | null = null

    async function initAndShow() {
      const { Toast: BsToast } = await import('bootstrap/dist/js/bootstrap.esm.js')
      if (cancelled || !toastEl) return

      toast = new BsToast(toastEl, { autohide: false })
      toastEl.addEventListener('hidden.bs.toast', onDismiss)
      toast.show()
    }

    initAndShow()

    return () => {
      cancelled = true
      toastEl.removeEventListener('hidden.bs.toast', onDismiss)
      toast?.dispose()
    }
  }, [messages, onDismiss])

  const label = variant === 'warning' ? 'Warning' : variant === 'danger' ? 'Error' : 'Info'

  return (
    <div className="toast-container position-fixed bottom-0 end-0 p-3" style={{ zIndex: 1100 }}>
      <div
        ref={toastRef}
        className="toast"
        role="alert"
        aria-live="assertive"
        aria-atomic="true"
      >
        <div className={`toast-header text-bg-${variant}`}>
          <strong className="me-auto">{label}</strong>
          <button
            type="button"
            className="btn-close btn-close-white"
            data-bs-dismiss="toast"
            aria-label="Close"
          />
        </div>
        <div className="toast-body">
          {messages.length === 1 ? (
            messages[0]
          ) : (
            <ul className="mb-0 ps-3">
              {messages.map((msg, i) => (
                <li key={i}>{msg}</li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
