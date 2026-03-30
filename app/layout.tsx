// app/layout.tsx
import type { Metadata } from 'next'
import 'bootstrap/dist/css/bootstrap.min.css'
import './globals.css'
import { MediaProvider } from '@/lib/media-context'

export const metadata: Metadata = {
  title: 'DJI Media Viewer',
  description: 'View drone footage from your SD card',
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <MediaProvider>{children}</MediaProvider>
      </body>
    </html>
  )
}
