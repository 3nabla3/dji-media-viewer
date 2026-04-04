// app/layout.tsx
import type { Metadata } from "next";
import "bootstrap/dist/css/bootstrap.min.css";
import "./globals.css";
import { MediaProvider } from "@/lib/media-context";
import ToastSection from "@/components/ToastSection";
import { ToastProvider } from "@/lib/toast-context";
import Footer from "@/components/Footer";
export const metadata: Metadata = {
  title: "DJI Media Viewer",
  description: "View drone footage from your SD card",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" data-scroll-behavior="smooth" data-bs-theme="dark">
      <body className="d-flex flex-column min-vh-100">
        <ToastProvider>
          <MediaProvider>
            <main className="flex-grow-1 d-flex">{children}</main>
          </MediaProvider>
          <ToastSection />
        </ToastProvider>

        <Footer />
      </body>
    </html>
  );
}
