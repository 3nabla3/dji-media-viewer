// lib/tile-geometry.ts

export interface TileAngles {
  yaw: number;   // degrees, GimbalYawDegree
  pitch: number; // degrees, GimbalPitchDegree
}

/**
 * Extracts yaw and pitch from a raw exifr.parse() result.
 * Returns { yaw: 0, pitch: 0 } if either field is absent or non-numeric.
 */
export function parseTileAngles(raw: unknown): TileAngles {
  if (raw !== null && typeof raw === "object") {
    const r = raw as Record<string, unknown>;
    const yaw =
      typeof r.GimbalYawDegree === "number" ? r.GimbalYawDegree : 0;
    const pitch =
      typeof r.GimbalPitchDegree === "number" ? r.GimbalPitchDegree : 0;
    return { yaw, pitch };
  }
  return { yaw: 0, pitch: 0 };
}

/**
 * Sorts tiles into a row-major 2D grid.
 * Rows are ordered by descending pitch (highest pitch = top row).
 * Within each row, tiles are ordered by ascending yaw (left to right).
 *
 * Tiles with similar pitch values (within 10°) are grouped into the same row.
 */
export function sortIntoGrid<T extends TileAngles>(tiles: T[]): T[][] {
  const key = (t: T) => Math.round(t.pitch / 10) * 10;

  const groups = new Map<number, T[]>();
  for (const tile of tiles) {
    const k = key(tile);
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k)!.push(tile);
  }

  const sortedKeys = [...groups.keys()].sort((a, b) => b - a);

  return sortedKeys.map((k) =>
    [...groups.get(k)!].sort((a, b) => a.yaw - b.yaw),
  );
}

/**
 * Converts gimbal yaw + pitch (degrees) to a 3D Cartesian point on a sphere.
 *
 * Convention:
 *   yaw=0,   pitch=0   → (0, 0, +radius)   forward
 *   yaw=90,  pitch=0   → (+radius, 0, 0)    east
 *   yaw=0,   pitch=90  → (0, +radius, 0)    zenith
 *   yaw=0,   pitch=-90 → (0, -radius, 0)    nadir
 */
export function yawPitchToXYZ(
  yaw: number,
  pitch: number,
  radius: number,
): [number, number, number] {
  const yawRad = (yaw * Math.PI) / 180;
  const pitchRad = (pitch * Math.PI) / 180;
  const x = radius * Math.cos(pitchRad) * Math.sin(yawRad);
  const y = radius * Math.sin(pitchRad);
  const z = radius * Math.cos(pitchRad) * Math.cos(yawRad);
  return [x, y, z];
}
