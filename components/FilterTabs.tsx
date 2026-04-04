"use client";

import { Nav, Badge } from "react-bootstrap";
import type { MediaItem } from "@/lib/media-types";

export type FilterType = "all" | "video" | "photo" | "hdr" | "panorama";

interface FilterTabsProps {
  items: MediaItem[];
  active: FilterType;
  onChange: (filter: FilterType) => void;
}

const TABS: { key: FilterType; label: string }[] = [
  { key: "all", label: "All" },
  { key: "video", label: "Videos" },
  { key: "photo", label: "Photos" },
  { key: "hdr", label: "HDR" },
  { key: "panorama", label: "Panoramas" },
];

export default function FilterTabs({
  items,
  active,
  onChange,
}: FilterTabsProps) {
  function count(type: FilterType) {
    if (type === "all") return items.length;
    return items.filter((i) => i.type === type).length;
  }

  return (
    <Nav
      variant="tabs"
      className="mb-3"
      activeKey={active}
      onSelect={(k) => k && onChange(k as FilterType)}
    >
      {TABS.map(({ key, label }) => (
        <Nav.Item key={key}>
          <Nav.Link eventKey={key}>
            {label} <Badge bg="secondary">{count(key)}</Badge>
          </Nav.Link>
        </Nav.Item>
      ))}
    </Nav>
  );
}
