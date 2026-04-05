// lib/use-tile-angles.ts
"use client";

import { useEffect, useState } from "react";
import exifr from "exifr";
import { parseTileAngles, type TileAngles } from "./tile-geometry";

export interface TileWithAngles extends TileAngles {
  file: File;
}

/**
 * Props interface shared by all panorama viewer components.
 * Defined here (not in panorama-viewers.ts) to avoid a circular
 * dependency: panorama-viewers.ts dynamically imports the viewers,
 * and the viewers need ViewerProps — so ViewerProps must live in a
 * module neither side imports from the other.
 */
export interface ViewerProps {
  tiles: TileWithAngles[];
}

/**
 * Reads GimbalYawDegree + GimbalPitchDegree from the EXIF of each tile.
 * Returns null while loading, the enriched array once all EXIF is read.
 */
export function useTileAngles(tiles: File[]): TileWithAngles[] | null {
  const [result, setResult] = useState<TileWithAngles[] | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const enriched = await Promise.all(
        tiles.map(async (file) => {
          const raw = await exifr
            .parse(file, { pick: ["GimbalYawDegree", "GimbalPitchDegree"] })
            .catch(() => null);
          return { file, ...parseTileAngles(raw) };
        }),
      );
      if (!cancelled) setResult(enriched);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [tiles]);

  return result;
}
