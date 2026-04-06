// components/detail/PhotoDetail.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { Badge } from "react-bootstrap";
import type { PhotoItem } from "@/lib/media-types";
import { type MediaExif, parseExif } from "./exif";
import DetailNav from "./DetailNav";
import ExifSections from "./ExifSections";

export default function PhotoDetail({ item }: { item: PhotoItem }) {
  const [url, setUrl] = useState("");
  const [exif, setExif] = useState<MediaExif>({});
  const mediaRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const objectUrl = URL.createObjectURL(item.file);
    setUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [item.file]);

  useEffect(() => {
    parseExif(item.file).then(setExif);
  }, [item.file]);

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

      <ExifSections exif={exif} file={item.file} />
    </div>
  );
}
