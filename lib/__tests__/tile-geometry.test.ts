// lib/__tests__/tile-geometry.test.ts
import { describe, it, expect } from "vitest";
import { parseTileAngles, sortIntoGrid, yawPitchToXYZ } from "../tile-geometry";

describe("parseTileAngles", () => {
  it("extracts yaw and pitch from exifr output", () => {
    const result = parseTileAngles({
      GimbalYawDegree: 45.5,
      GimbalPitchDegree: -30.0,
    });
    expect(result).toEqual({ yaw: 45.5, pitch: -30.0 });
  });

  it("returns 0,0 for null input", () => {
    expect(parseTileAngles(null)).toEqual({ yaw: 0, pitch: 0 });
  });

  it("returns 0,0 when fields are absent", () => {
    expect(parseTileAngles({})).toEqual({ yaw: 0, pitch: 0 });
  });

  it("returns 0,0 when fields are non-numeric", () => {
    expect(
      parseTileAngles({ GimbalYawDegree: "north", GimbalPitchDegree: null }),
    ).toEqual({ yaw: 0, pitch: 0 });
  });
});

describe("sortIntoGrid", () => {
  // Real SECTOR angles from DJI_0144 panorama
  const SECTOR_TILES = [
    { yaw: 72.96, pitch: -6.83 },
    { yaw: 72.9, pitch: 17.91 },
    { yaw: 97.67, pitch: 17.99 },
    { yaw: 97.79, pitch: -6.15 },
    { yaw: 97.79, pitch: -31.15 },
    { yaw: 73.05, pitch: -31.89 },
    { yaw: 48.17, pitch: -31.31 },
    { yaw: 48.11, pitch: -6.44 },
    { yaw: 48.11, pitch: 17.86 },
  ];

  it("produces 3 rows and 3 columns from 9 sector tiles", () => {
    const grid = sortIntoGrid(SECTOR_TILES);
    expect(grid).toHaveLength(3);
    expect(grid[0]).toHaveLength(3);
    expect(grid[1]).toHaveLength(3);
    expect(grid[2]).toHaveLength(3);
  });

  it("top row has the highest pitch values", () => {
    const grid = sortIntoGrid(SECTOR_TILES);
    const topRowPitches = grid[0].map((t) => t.pitch);
    const midRowPitches = grid[1].map((t) => t.pitch);
    expect(Math.min(...topRowPitches)).toBeGreaterThan(
      Math.max(...midRowPitches),
    );
  });

  it("each row is sorted left-to-right by yaw ascending", () => {
    const grid = sortIntoGrid(SECTOR_TILES);
    for (const row of grid) {
      for (let i = 1; i < row.length; i++) {
        expect(row[i].yaw).toBeGreaterThan(row[i - 1].yaw);
      }
    }
  });
});

describe("yawPitchToXYZ", () => {
  it("yaw=0 pitch=0 points along positive Z axis", () => {
    const [x, y, z] = yawPitchToXYZ(0, 0, 1);
    expect(x).toBeCloseTo(0);
    expect(y).toBeCloseTo(0);
    expect(z).toBeCloseTo(1);
  });

  it("yaw=90 pitch=0 points along positive X axis", () => {
    const [x, y, z] = yawPitchToXYZ(90, 0, 1);
    expect(x).toBeCloseTo(1);
    expect(y).toBeCloseTo(0);
    expect(z).toBeCloseTo(0);
  });

  it("yaw=180 pitch=0 points along negative Z axis", () => {
    const [x, y, z] = yawPitchToXYZ(180, 0, 1);
    expect(x).toBeCloseTo(0);
    expect(y).toBeCloseTo(0);
    expect(z).toBeCloseTo(-1);
  });

  it("pitch=-90 points along negative Y axis (nadir)", () => {
    const [x, y, z] = yawPitchToXYZ(0, -90, 1);
    expect(x).toBeCloseTo(0);
    expect(y).toBeCloseTo(-1);
    expect(z).toBeCloseTo(0);
  });

  it("pitch=+90 points along positive Y axis (zenith)", () => {
    const [x, y, z] = yawPitchToXYZ(0, 90, 1);
    expect(x).toBeCloseTo(0);
    expect(y).toBeCloseTo(1);
    expect(z).toBeCloseTo(0);
  });

  it("scales result by radius", () => {
    const [x, y, z] = yawPitchToXYZ(0, 0, 100);
    expect(z).toBeCloseTo(100);
  });

  it("result vector has magnitude equal to radius", () => {
    const [x, y, z] = yawPitchToXYZ(37, -22, 50);
    const mag = Math.sqrt(x * x + y * y + z * z);
    expect(mag).toBeCloseTo(50);
  });
});
