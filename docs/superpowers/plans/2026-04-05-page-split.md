# Page Split: `/select` and `/` Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Split the monolithic `app/page.tsx` into two pages — `/select` for folder picking and `/` for the gallery — removing `folderName` entirely.

**Architecture:** Move folder-picking, loading, and error states to a new `app/select/page.tsx`. Reduce `app/page.tsx` to gallery-only (Navbar + FilterTabs + MediaGrid), with a redirect to `/select` when no items are loaded. `MediaContext` is unchanged.

**Tech Stack:** Next.js (App Router), React, TypeScript, React Bootstrap

---

### Task 1: Create `app/select/page.tsx`

**Files:**
- Create: `app/select/page.tsx`

- [ ] **Step 1: Create the file with the full implementation**

```tsx
// app/select/page.tsx
"use client";

import { Suspense, useState } from "react";
import { useRouter } from "next/navigation";
import { Stack, Alert, Spinner } from "react-bootstrap";
import { parseMediaFiles } from "@/lib/media-parser";
import { loadOpenCV } from "@/lib/opencv-hdr";
import { useMediaContext } from "@/lib/media-context";
import FolderPicker from "@/components/FolderPicker";
import { useToastContext } from "@/lib/toast-context";

export default function SelectPage() {
  return (
    <Suspense>
      <FolderSelect />
    </Suspense>
  );
}

function FolderSelect() {
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
```

- [ ] **Step 2: Verify the dev server compiles without errors**

Run: `bun run dev`
Expected: No TypeScript or compilation errors. Visiting `http://localhost:3000/select` shows the folder picker UI.

- [ ] **Step 3: Commit**

```bash
but commit page-split -m "add /select page with folder picker, loading, and error states" --changes <id-of-app/select/page.tsx> --status-after
```

---

### Task 2: Simplify `app/page.tsx` to gallery-only

**Files:**
- Modify: `app/page.tsx`

- [ ] **Step 1: Replace the entire file contents**

```tsx
// app/page.tsx
"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Navbar, Container } from "react-bootstrap";
import Link from "next/link";
import { useMediaContext } from "@/lib/media-context";
import FilterTabs, { type FilterType } from "@/components/FilterTabs";
import MediaGrid from "@/components/MediaGrid";

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
  const { items } = useMediaContext();
  const router = useRouter();
  const searchParams = useSearchParams();

  const tabParam = searchParams.get("tab");
  const [filter, setFilter] = useState<FilterType>(
    isFilterType(tabParam) ? tabParam : "all",
  );

  useEffect(() => {
    if (!items) {
      router.replace("/select");
    }
  }, [items, router]);

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

  function handleSelect(index: number) {
    router.push(`/media/${index}`);
  }

  if (!items) {
    return null;
  }

  return (
    <div>
      <Navbar className="border-bottom mb-4">
        <Container fluid>
          <Navbar.Brand className="mb-0 h1">DJI Media Viewer</Navbar.Brand>
          <Link
            href="/select"
            className="btn btn-outline-secondary btn-sm ms-auto"
          >
            Change folder
          </Link>
        </Container>
      </Navbar>
      <Container fluid>
        <FilterTabs
          items={items}
          active={filter}
          onChange={handleFilterChange}
        />
        <MediaGrid items={items} filter={filter} onSelect={handleSelect} />
      </Container>
    </div>
  );
}
```

- [ ] **Step 2: Verify the full flow in the browser**

Run: `bun run dev`

Check these flows:
1. Visit `http://localhost:3000/` → should immediately redirect to `/select`
2. Pick a folder on `/select` → loading spinner appears → redirects to `/` showing the gallery
3. On the gallery, the navbar shows "DJI Media Viewer" and a "Change folder" button
4. Click "Change folder" → navigates to `/select`
5. Visit `http://localhost:3000/media/0` with no items in context → redirects to `/` → which redirects to `/select`
6. On the gallery, filter tabs still work (check `?tab=video` in URL)

- [ ] **Step 3: Commit**

```bash
but commit page-split -m "simplify gallery page: remove folder selection logic and folderName" --changes <id-of-app/page.tsx> --status-after
```
