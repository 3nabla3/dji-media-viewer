// components/detail/PhotoDetail.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { Badge } from "react-bootstrap";
import type { PhotoItem } from "@/lib/media-types";
import DetailNav from "./DetailNav";

// TODO: breaking change — ExifSections and parseExif removed; rewrite to display item.metadata (PhotoMetadata) directly
// import { type MediaExif, parseExif } from "./exif";
// import ExifSections from "./ExifSections";

export default function PhotoDetail({ item }: { item: PhotoItem }) {
  const [url, setUrl] = useState("");
  const mediaRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const objectUrl = URL.createObjectURL(item.file);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [item.file]);

  // TODO: breaking change — was: useEffect(() => { parseExif(item.file).then(setExif); }, [item.file]);
  // Now use item.metadata directly (PhotoMetadata is pre-parsed at load time)

  return (
    <div>
      <DetailNav
        filename={item.file.name}
        badge={<Badge bg="success">PHOTO</Badge>}
        onFullscreen={() => mediaRef.current?.requestFullscreen()}
      />

      {url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          ref={mediaRef}
          src={url}
          alt={item.file.name}
          className="img-fluid w-100"
        />
      )}

      {/* TODO: breaking change — ExifSections expects MediaExif; rewrite to accept PhotoMetadata */}
      {/* <ExifSections exif={exif} file={item.file} /> */}
    </div>
  );
}
