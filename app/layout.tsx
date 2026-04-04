// app/layout.tsx
import type { Metadata } from 'next'
import 'bootstrap/dist/css/bootstrap.min.css'
import './globals.css'
import { MediaProvider } from '@/lib/media-context'
import ToastSection from '@/components/ToastSection'
import { ToastProvider } from '@/lib/toast-context'
import { Container } from 'react-bootstrap'
import { Github, Heart } from 'react-bootstrap-icons'
export const metadata: Metadata = {
  title: 'DJI Media Viewer',
  description: 'View drone footage from your SD card',
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" data-scroll-behavior="smooth" data-bs-theme="dark">
      <body className='d-flex flex-column min-vh-100'>
        <ToastProvider>
          <MediaProvider>
            <main className='flex-grow-1 d-flex'>{children}</main>
          </MediaProvider>
          <ToastSection />
        </ToastProvider>
        
        <Container>
          <footer className="d-flex justify-content-around align-items-center py-3 my-4 border-top">
            <div className="d-flex align-items-center"><span className="me-2">Made with love</span><Heart /></div>
            <a href={process.env.NEXT_PUBLIC_REPO_URL} target='_blank' rel='noopener noreferrer' className='text-decoration-none text-white'>
              <Github size={25} className="me-1" />
              <i>{process.env.NEXT_PUBLIC_GIT_COMMIT_SHA}</i>
            </a>
          </footer>
        </Container>
      </body>
    </html>
  );
}
