import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";
import { parseHdrMetadata } from "../parsers/hdr";

const assetDir = resolve(__dirname, "assets/hdr");

const file132 = new File(
  [readFileSync(resolve(assetDir, "DJI_0132.JPG"))],
  "DJI_0132.JPG",
  { type: "image/jpeg" },
);
const file133 = new File(
  [readFileSync(resolve(assetDir, "DJI_0133.JPG"))],
  "DJI_0133.JPG",
  { type: "image/jpeg" },
);
const file134 = new File(
  [readFileSync(resolve(assetDir, "DJI_0134.JPG"))],
  "DJI_0134.JPG",
  { type: "image/jpeg" },
);

// Input files in filesystem order (not necessarily EV-ascending); parser is responsible for sorting
const bracketFiles = [file132, file133, file134];

describe("parseHdrMetadata", () => {
  it("returns 3 photos", async () => {
    const metadata = await parseHdrMetadata(bracketFiles);
    expect(metadata.photos).toHaveLength(3);
  });

  it("sorts photos ascending by exposureCompensation", async () => {
    const metadata = await parseHdrMetadata(bracketFiles);
    const evs = metadata.photos.map((p) => p.exposureCompensation);
    expect(evs[0]).toBeLessThan(evs[1]);
    expect(evs[1]).toBeLessThan(evs[2]);
  });

  it("middle is at index Math.floor(photos.length / 2)", async () => {
    const metadata = await parseHdrMetadata(bracketFiles);
    expect(Math.floor(metadata.photos.length / 2)).toBe(1);
  });

  // photos[0] — under-exposed (DJI_0132.JPG, EV -1/3)
  it("photos[0].fileSize", async () => {
    const metadata = await parseHdrMetadata(bracketFiles);
    expect(metadata.photos[0].fileSize).toBe(7746913);
  });

  it("photos[0].timestamp", async () => {
    const metadata = await parseHdrMetadata(bracketFiles);
    expect(metadata.photos[0].timestamp).toEqual(
      new Date("2026-01-18T20:09:27.000Z"),
    );
  });

  it("photos[0].width", async () => {
    const metadata = await parseHdrMetadata(bracketFiles);
    expect(metadata.photos[0].width).toBe(4000);
  });

  it("photos[0].height", async () => {
    const metadata = await parseHdrMetadata(bracketFiles);
    expect(metadata.photos[0].height).toBe(2250);
  });

  it("photos[0].exposureCompensation", async () => {
    const metadata = await parseHdrMetadata(bracketFiles);
    expect(metadata.photos[0].exposureCompensation).toBeCloseTo(-1 / 3, 4);
  });

  // photos[1] — middle (DJI_0133.JPG, EV +1/3)
  it("photos[1].fileSize", async () => {
    const metadata = await parseHdrMetadata(bracketFiles);
    expect(metadata.photos[1].fileSize).toBe(7766299);
  });

  it("photos[1].timestamp", async () => {
    const metadata = await parseHdrMetadata(bracketFiles);
    expect(metadata.photos[1].timestamp).toEqual(
      new Date("2026-01-18T20:09:27.000Z"),
    );
  });

  it("photos[1].exposureCompensation", async () => {
    const metadata = await parseHdrMetadata(bracketFiles);
    expect(metadata.photos[1].exposureCompensation).toBeCloseTo(1 / 3, 4);
  });

  // photos[2] — over-exposed (DJI_0134.JPG, EV +1)
  it("photos[2].fileSize", async () => {
    const metadata = await parseHdrMetadata(bracketFiles);
    expect(metadata.photos[2].fileSize).toBe(7564574);
  });

  it("photos[2].timestamp", async () => {
    const metadata = await parseHdrMetadata(bracketFiles);
    expect(metadata.photos[2].timestamp).toEqual(
      new Date("2026-01-18T20:09:27.000Z"),
    );
  });

  it("photos[2].exposureCompensation", async () => {
    const metadata = await parseHdrMetadata(bracketFiles);
    expect(metadata.photos[2].exposureCompensation).toBeCloseTo(1, 4);
  });

  // GPS from middle exposure
  it("photos[1].gps.latitude", async () => {
    const metadata = await parseHdrMetadata(bracketFiles);
    expect(metadata.photos[1].gps.latitude).toBeCloseTo(45.4914, 3);
  });

  it("photos[1].gps.longitude", async () => {
    const metadata = await parseHdrMetadata(bracketFiles);
    expect(metadata.photos[1].gps.longitude).toBeCloseTo(-73.6187, 3);
  });

  it("photos[1].gps.altitude", async () => {
    const metadata = await parseHdrMetadata(bracketFiles);
    expect(metadata.photos[1].gps.altitude).toBeCloseTo(217.4, 1);
  });

  it("photos[1].relativeAltitude", async () => {
    const metadata = await parseHdrMetadata(bracketFiles);
    expect(metadata.photos[1].relativeAltitude).toBeCloseTo(49.1, 1);
  });

  it("photos[1].gimbalPitch", async () => {
    const metadata = await parseHdrMetadata(bracketFiles);
    expect(metadata.photos[1].gimbalPitch).toBeCloseTo(0, 1);
  });

  it("photos[1].gimbalYaw", async () => {
    const metadata = await parseHdrMetadata(bracketFiles);
    expect(metadata.photos[1].gimbalYaw).toBeCloseTo(0, 1);
  });

  it("photos[1].gimbalRoll", async () => {
    const metadata = await parseHdrMetadata(bracketFiles);
    expect(metadata.photos[1].gimbalRoll).toBeCloseTo(0, 1);
  });

  // Cache: same file names → same Promise
  it("returns the same Promise for the same file names", async () => {
    const file132b = new File(
      [readFileSync(resolve(assetDir, "DJI_0132.JPG"))],
      "DJI_0132.JPG",
      { type: "image/jpeg" },
    );
    const file133b = new File(
      [readFileSync(resolve(assetDir, "DJI_0133.JPG"))],
      "DJI_0133.JPG",
      { type: "image/jpeg" },
    );
    const file134b = new File(
      [readFileSync(resolve(assetDir, "DJI_0134.JPG"))],
      "DJI_0134.JPG",
      { type: "image/jpeg" },
    );
    const promise1 = parseHdrMetadata([file132, file133, file134]);
    const promise2 = parseHdrMetadata([file132b, file133b, file134b]);
    expect(promise1).toBe(promise2);
  });
});
