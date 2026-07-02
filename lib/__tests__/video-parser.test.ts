import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";
import { parseVideoMetadata } from "../parsers/video";

const assetPath = resolve(__dirname, "assets/DJI_0376.MP4");
const videoBuffer = readFileSync(assetPath);
const videoFile = new File([videoBuffer], "DJI_0376.MP4", {
  type: "video/mp4",
});

describe("parseVideoMetadata", () => {
  it("parses duration", async () => {
    const metadata = await parseVideoMetadata(videoFile);
    expect(metadata.duration).toBeCloseTo(2.27, 2);
  });

  it("parses width", async () => {
    const metadata = await parseVideoMetadata(videoFile);
    expect(metadata.width).toBe(3840);
  });

  it("parses height", async () => {
    const metadata = await parseVideoMetadata(videoFile);
    expect(metadata.height).toBe(2160);
  });

  it("parses frameRate", async () => {
    const metadata = await parseVideoMetadata(videoFile);
    expect(metadata.frameRate).toBeCloseTo(29.97, 2);
  });

  it("parses codec", async () => {
    const metadata = await parseVideoMetadata(videoFile);
    expect(metadata.codec).toBe("avc1.640033");
  });

  it("parses fileSize", async () => {
    const metadata = await parseVideoMetadata(videoFile);
    expect(metadata.fileSize).toBe(19614170);
  });

  it("parses bitrate", async () => {
    const metadata = await parseVideoMetadata(videoFile);
    expect(metadata.bitrate).toBeCloseTo(68_874_520, -3);
  });

  it("parses timestamp from mvhd creation time", async () => {
    const metadata = await parseVideoMetadata(videoFile);
    expect(metadata.timestamp).toEqual(new Date("2026-03-31T01:28:01.000Z"));
  });

  it("parses gps as null (DJI_0376.MP4 has no XMP GPS)", async () => {
    const metadata = await parseVideoMetadata(videoFile);
    expect(metadata.gps).toBeNull();
  });

  it("returns the same Promise on repeated calls (cache hit)", () => {
    const promise1 = parseVideoMetadata(videoFile);
    const promise2 = parseVideoMetadata(videoFile);
    expect(promise1).toBe(promise2);
  });
});
