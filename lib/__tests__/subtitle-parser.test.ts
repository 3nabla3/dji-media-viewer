import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";
import { parseDjiSubtitleTrack, parseDjiSubtitleSampleText } from "../parsers/subtitle";

const assetPath = resolve(__dirname, "assets/DJI_0376.MP4");
const videoBuffer = readFileSync(assetPath);
const videoFile = new File([videoBuffer], "DJI_0376.MP4", { type: "video/mp4" });

const FIRST_SAMPLE_RAW =
  "F/2.8, SS 30.15, ISO 3200, EV +1.3, DZOOM 1.000, GPS (-73.5393, 45.5120, 21), D 552.38m, H 67.60m, H.S 14.54m/s, V.S -0.30m/s";

describe("parseDjiSubtitleSampleText", () => {
  it("passes through timestampSeconds", () => {
    const sample = parseDjiSubtitleSampleText(FIRST_SAMPLE_RAW, 42);
    expect(sample.timestampSeconds).toBe(42);
  });

  it("parses aperture", () => {
    const sample = parseDjiSubtitleSampleText(FIRST_SAMPLE_RAW, 0);
    expect(sample.aperture).toBeCloseTo(2.8, 2);
  });

  it("parses shutterSpeed", () => {
    const sample = parseDjiSubtitleSampleText(FIRST_SAMPLE_RAW, 0);
    expect(sample.shutterSpeed).toBeCloseTo(30.15, 2);
  });

  it("parses iso", () => {
    const sample = parseDjiSubtitleSampleText(FIRST_SAMPLE_RAW, 0);
    expect(sample.iso).toBe(3200);
  });

  it("parses exposureCompensation", () => {
    const sample = parseDjiSubtitleSampleText(FIRST_SAMPLE_RAW, 0);
    expect(sample.exposureCompensation).toBeCloseTo(1.3, 2);
  });

  it("parses digitalZoom", () => {
    const sample = parseDjiSubtitleSampleText(FIRST_SAMPLE_RAW, 0);
    expect(sample.digitalZoom).toBeCloseTo(1.0, 3);
  });

  it("parses GPS longitude", () => {
    const sample = parseDjiSubtitleSampleText(FIRST_SAMPLE_RAW, 0);
    expect(sample.gps.longitude).toBeCloseTo(-73.5393, 4);
  });

  it("parses GPS latitude", () => {
    const sample = parseDjiSubtitleSampleText(FIRST_SAMPLE_RAW, 0);
    expect(sample.gps.latitude).toBeCloseTo(45.512, 3);
  });

  it("parses GPS altitude", () => {
    const sample = parseDjiSubtitleSampleText(FIRST_SAMPLE_RAW, 0);
    expect(sample.gps.altitude).toBe(21);
  });

  it("parses distanceFromHome", () => {
    const sample = parseDjiSubtitleSampleText(FIRST_SAMPLE_RAW, 0);
    expect(sample.distanceFromHome).toBeCloseTo(552.38, 2);
  });

  it("parses relativeAltitude", () => {
    const sample = parseDjiSubtitleSampleText(FIRST_SAMPLE_RAW, 0);
    expect(sample.relativeAltitude).toBeCloseTo(67.6, 2);
  });

  it("parses horizontalSpeed", () => {
    const sample = parseDjiSubtitleSampleText(FIRST_SAMPLE_RAW, 0);
    expect(sample.horizontalSpeed).toBeCloseTo(14.54, 2);
  });

  it("parses negative verticalSpeed", () => {
    const sample = parseDjiSubtitleSampleText(FIRST_SAMPLE_RAW, 0);
    expect(sample.verticalSpeed).toBeCloseTo(-0.3, 2);
  });
});

describe("parseDjiSubtitleTrack", () => {
  it("returns the expected number of samples", async () => {
    const samples = await parseDjiSubtitleTrack(videoFile);
    expect(samples.length).toBe(3);
  });

  it("first sample has timestampSeconds of 0", async () => {
    const samples = await parseDjiSubtitleTrack(videoFile);
    expect(samples[0].timestampSeconds).toBe(0);
  });

  it("samples are in ascending timestamp order", async () => {
    const samples = await parseDjiSubtitleTrack(videoFile);
    expect(samples[samples.length - 1].timestampSeconds).toBeGreaterThan(
      samples[0].timestampSeconds,
    );
  });

  it("first sample has the expected aperture", async () => {
    const samples = await parseDjiSubtitleTrack(videoFile);
    expect(samples[0].aperture).toBeCloseTo(2.8, 2);
  });

  it("first sample has the expected GPS coordinates", async () => {
    const samples = await parseDjiSubtitleTrack(videoFile);
    expect(samples[0].gps.longitude).toBeCloseTo(-73.5393, 4);
    expect(samples[0].gps.latitude).toBeCloseTo(45.512, 3);
    expect(samples[0].gps.altitude).toBe(21);
  });
});
