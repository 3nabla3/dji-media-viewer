// app/page.tsx
"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Stack, Alert, Spinner, Navbar, Container } from "react-bootstrap";
import { parseMediaFiles } from "@/lib/media-parser";
import { loadOpenCV } from "@/lib/opencv-hdr";
import { useMediaContext } from "@/lib/media-context";
import FolderPicker from "@/components/FolderPicker";
import FilterTabs, { type FilterType } from "@/components/FilterTabs";
import MediaGrid from "@/components/MediaGrid";
import { useToastContext } from "@/lib/toast-context";

const VALID_FILTERS = new Set<FilterType>([
  "all",
  "video",
  "photo",
  "hdr",
  "panorama",
]);

function isFilterType(s: string | null): s is FilterType {
  return s != null && VALID_FILTERS.has(s as FilterType);
}

export default function Page() {
  return (
    <Suspense>
      <Gallery />
    </Suspense>
  );
}

function Gallery() {
  const { items, setItems } = useMediaContext();
  const [folderName, setFolderName] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { addNotification } = useToastContext();

  const tabParam = searchParams.get("tab");
  const [filter, setFilter] = useState<FilterType>(
    isFilterType(tabParam) ? tabParam : "all",
  );

  function handleFilterChange(f: FilterType) {
    setFilter(f);
    const params = new URLSearchParams(searchParams.toString());
    if (f === "all") {
      params.delete("tab");
    } else {
      params.set("tab", f);
    }
    const qs = params.toString();
    router.replace(qs ? `/?${qs}` : "/", { scroll: false });
  }

  async function handleFiles(files: File[]) {
    if (files.length === 0) return;
    const firstPath = files[0].webkitRelativePath;
    setFolderName(firstPath.split("/")[0] ?? "Unknown folder");
    setFilter("all");
    router.replace("/", { scroll: false });
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
    } catch (err) {
      if (err instanceof Error) setError(err.message);
      else setError("Failed to parse media files.");
    } finally {
      setLoading(false);
    }
  }

  function handleSelect(index: number) {
    router.push(`/media/${index}`);
  }

  // ── Empty state ──────────────────────────────────────────────────────────
  if (!items && !loading) {
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

  // ── Loading state ────────────────────────────────────────────────────────
  if (loading) {
    return (
      <Stack className="align-items-center justify-content-center">
        <Spinner animation="border" variant="primary" className="mb-3" />
        <p className="text-muted">Reading media files…</p>
      </Stack>
    );
  }

  // ── Error state ──────────────────────────────────────────────────────────
  if (error) {
    return (
      <Stack className="align-items-center justify-content-center">
        <Alert variant="danger">{error}</Alert>
        <FolderPicker onFiles={handleFiles} />
      </Stack>
    );
  }

  // ── Loaded state ─────────────────────────────────────────────────────────
  return (
    <div>
      <Navbar className="border-bottom mb-4">
        <Container fluid>
          <Navbar.Brand className="mb-0 h1">DJI Media Viewer</Navbar.Brand>
          <span className="text-muted small me-auto ms-3">
            {folderName} · {items!.length} items
          </span>
          <FolderPicker onFiles={handleFiles} />
        </Container>
      </Navbar>
      <Container fluid>
        <FilterTabs
          items={items!}
          active={filter}
          onChange={handleFilterChange}
        />
        <MediaGrid items={items!} filter={filter} onSelect={handleSelect} />
      </Container>
    </div>
  );
}
