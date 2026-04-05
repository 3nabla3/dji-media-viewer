"use client";

import { useEffect, useState } from "react";
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";
import { sortIntoGrid } from "@/lib/tile-geometry";
import type { ViewerProps } from "@/lib/use-tile-angles";

// Pixel dimensions of each DJI panorama tile
const TILE_W = 2000;
const TILE_H = 1500;

export default function SectorViewer({ tiles }: ViewerProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(0);

  useEffect(() => {
    let compositeUrl: string | null = null;
    let cancelled = false;

    async function composite() {
      const grid = sortIntoGrid(tiles);
      const cols = grid[0]?.length ?? 0;
      const rows = grid.length;

      const canvas = document.createElement("canvas");
      canvas.width = cols * TILE_W;
      canvas.height = rows * TILE_H;
      const ctx = canvas.getContext("2d")!;

      let count = 0;
      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < (grid[row]?.length ?? 0); col++) {
          if (cancelled) return;
          const tile = grid[row][col];
          const objUrl = URL.createObjectURL(tile.file);

          await new Promise<void>((resolve) => {
            const img = new Image();
            img.onload = () => {
              ctx.drawImage(img, col * TILE_W, row * TILE_H, TILE_W, TILE_H);
              URL.revokeObjectURL(objUrl);
              count++;
              if (!cancelled) setLoaded(count);
              resolve();
            };
            img.onerror = () => {
              URL.revokeObjectURL(objUrl);
              resolve();
            };
            img.src = objUrl;
          });
        }
      }

      if (cancelled) return;

      canvas.toBlob(
        (blob) => {
          if (!cancelled && blob) {
            compositeUrl = URL.createObjectURL(blob);
            setImageUrl(compositeUrl);
          }
        },
        "image/jpeg",
        0.92,
      );
    }

    composite();

    return () => {
      cancelled = true;
      if (compositeUrl) URL.revokeObjectURL(compositeUrl);
    };
  }, [tiles]);

  if (!imageUrl) {
    return (
      <div
        className="d-flex align-items-center justify-content-center bg-black"
        style={{ height: "70vh" }}
      >
        <span className="text-muted">
          Loading tiles ({loaded}/{tiles.length})…
        </span>
      </div>
    );
  }

  return (
    <TransformWrapper
      initialScale={1}
      minScale={0.05}
      maxScale={10}
      centerOnInit
    >
      <TransformComponent
        wrapperStyle={{ width: "100%", height: "70vh", background: "#000" }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imageUrl}
          alt="Sector panorama"
          style={{ maxWidth: "none", display: "block" }}
        />
      </TransformComponent>
    </TransformWrapper>
  );
}
