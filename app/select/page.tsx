// app/select/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Stack, Alert, Spinner } from "react-bootstrap";
import { parseMediaFiles } from "@/lib/media-parser";
import { loadOpenCV } from "@/lib/opencv-hdr";
import { useMediaContext } from "@/lib/media-context";
import FolderPicker from "@/components/FolderPicker";
import { useToastContext } from "@/lib/toast-context";

export default function SelectPage() {
  const { setItems } = useMediaContext();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const { addNotification } = useToastContext();

  async function handleFiles(files: File[]) {
    if (files.length === 0) return;
    setLoading(true);
    setError(null);
    try {
      const { items: parsed, warnings: parseWarnings } =
        await parseMediaFiles(files);
      setItems(parsed);
      parseWarnings.forEach((w) =>
        addNotification({ header: "Warning", message: w, severity: "warning" }),
      );
      if (parsed.some((item) => item.type === "hdr")) {
        loadOpenCV().catch(() => {}); // preload WASM while user browses gallery
      }
      router.replace("/");
    } catch (err) {
      if (err instanceof Error) setError(err.message);
      else setError("Failed to parse media files.");
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <Stack className="align-items-center justify-content-center">
        <Spinner animation="border" variant="primary" className="mb-3" />
        <p className="text-muted">Reading media files…</p>
      </Stack>
    );
  }

  if (error) {
    return (
      <Stack className="align-items-center justify-content-center">
        <Alert variant="danger">{error}</Alert>
        <FolderPicker onFiles={handleFiles} />
      </Stack>
    );
  }

  return (
    <Stack className="align-items-center justify-content-center">
      <h1 className="mb-3">DJI Media Viewer</h1>
      <p className="text-muted mb-4">
        Select your drone SD card folder to get started.
      </p>
      <Alert
        variant="info"
        className="d-flex align-items-start gap-2 mb-4"
        style={{ maxWidth: 480 }}
      >
        <span style={{ fontSize: "1.1rem" }}>🔒</span>
        <div>
          <strong>Your files never leave your device.</strong>
          <br />
          All image and video processing happens entirely in your browser. No
          data is uploaded or sent to any server.
        </div>
      </Alert>
      <FolderPicker onFiles={handleFiles} />
    </Stack>
  );
}
