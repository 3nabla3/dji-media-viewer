import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";
import { parsePhotoMetadata } from "../parsers/photo";

const assetPath = resolve(__dirname, "assets/DJI_0158.JPG");
const photoBuffer = readFileSync(assetPath);
const photoFile = new File([photoBuffer], "DJI_0158.JPG", {
  type: "image/jpeg",
});

describe("parsePhotoMetadata", () => {
  it("parses fileSize", async () => {
    const metadata = await parsePhotoMetadata(photoFile);
    expect(metadata.fileSize).toBe(7992923);
  });

  it("parses timestamp", async () => {
    const metadata = await parsePhotoMetadata(photoFile);
    expect(metadata.timestamp).toEqual(new Date("2026-01-18T21:23:46.000Z"));
  });

  it("parses width", async () => {
    const metadata = await parsePhotoMetadata(photoFile);
    expect(metadata.width).toBe(4000);
  });

  it("parses height", async () => {
    const metadata = await parsePhotoMetadata(photoFile);
    expect(metadata.height).toBe(2250);
  });

  it("parses iso", async () => {
    const metadata = await parsePhotoMetadata(photoFile);
    expect(metadata.iso).toBe(100);
  });

  it("parses aperture", async () => {
    const metadata = await parsePhotoMetadata(photoFile);
    expect(metadata.aperture).toBeCloseTo(2.8, 1);
  });

  it("parses shutterSpeed", async () => {
    const metadata = await parsePhotoMetadata(photoFile);
    expect(metadata.shutterSpeed).toBeCloseTo(0.00625, 5);
  });

  it("parses focalLength", async () => {
    const metadata = await parsePhotoMetadata(photoFile);
    expect(metadata.focalLength).toBeCloseTo(4.5, 1);
  });

  it("parses exposureCompensation", async () => {
    const metadata = await parsePhotoMetadata(photoFile);
    expect(metadata.exposureCompensation).toBeCloseTo(1 / 3, 4);
  });

  it("parses GPS latitude", async () => {
    const metadata = await parsePhotoMetadata(photoFile);
    expect(metadata.gps.latitude).toBeCloseTo(45.5015, 3);
  });

  it("parses GPS longitude", async () => {
    const metadata = await parsePhotoMetadata(photoFile);
    expect(metadata.gps.longitude).toBeCloseTo(-73.6173, 3);
  });

  it("parses GPS altitude", async () => {
    const metadata = await parsePhotoMetadata(photoFile);
    expect(metadata.gps.altitude).toBeCloseTo(192.6, 1);
  });

  it("parses relativeAltitude", async () => {
    const metadata = await parsePhotoMetadata(photoFile);
    expect(metadata.relativeAltitude).toBeCloseTo(56.7, 1);
  });

  it("parses gimbalPitch", async () => {
    const metadata = await parsePhotoMetadata(photoFile);
    expect(metadata.gimbalPitch).toBeCloseTo(0, 2);
  });

  it("parses gimbalYaw", async () => {
    const metadata = await parsePhotoMetadata(photoFile);
    expect(metadata.gimbalYaw).toBeCloseTo(0, 2);
  });

  it("parses gimbalRoll", async () => {
    const metadata = await parsePhotoMetadata(photoFile);
    expect(metadata.gimbalRoll).toBeCloseTo(0, 2);
  });

  it("parses flightPitch", async () => {
    const metadata = await parsePhotoMetadata(photoFile);
    expect(metadata.flightPitch).toBeCloseTo(-23.9, 1);
  });

  it("parses flightYaw", async () => {
    const metadata = await parsePhotoMetadata(photoFile);
    expect(metadata.flightYaw).toBeCloseTo(167.8, 1);
  });

  it("parses flightRoll", async () => {
    const metadata = await parsePhotoMetadata(photoFile);
    expect(metadata.flightRoll).toBeCloseTo(7.1, 1);
  });

  it("returns the same Promise on repeated calls (cache hit)", () => {
    const promise1 = parsePhotoMetadata(photoFile);
    const promise2 = parsePhotoMetadata(photoFile);
    expect(promise1).toBe(promise2);
  });
});
