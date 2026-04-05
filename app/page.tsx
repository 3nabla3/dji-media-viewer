// app/page.tsx
"use client";

import { Suspense, useEffect } from "react";
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

  const rawTab = searchParams.get("tab");
  const filter: FilterType = isFilterType(rawTab) ? rawTab : "all";

  useEffect(() => {
    if (!items) {
      router.replace("/select");
    }
  }, [items, router]);

  function handleFilterChange(f: FilterType) {
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
