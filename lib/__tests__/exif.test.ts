import { describe, it, expect, vi, beforeEach } from "vitest";
import { parseExif } from "../../components/detail/exif";

// Mock exifr so tests don't need real JPEG files
vi.mock("exifr", () => ({
  default: {
    parse: vi.fn(),
  },
}));

import exifr from "exifr";

const mockParse = vi.mocked(exifr.parse);

beforeEach(() => {
  mockParse.mockReset();
});

const fakeFile = new File([], "test.jpg", { type: "image/jpeg" });

describe("parseExif", () => {
  it("returns empty object when exifr returns null", async () => {
    mockParse.mockResolvedValue(null);
    const result = await parseExif(fakeFile);
    expect(result).toEqual({});
  });

  it("maps standard EXIF fields", async () => {
    const date = new Date("2024-01-15T10:00:00");
    mockParse.mockResolvedValue({
      DateTimeOriginal: date,
      ISO: 100,
      FNumber: 2.8,
      ExposureTime: 0.002,
      FocalLength: 24,
      ExifImageWidth: 4000,
      ExifImageHeight: 2250,
    });
    const result = await parseExif(fakeFile);
    expect(result.dateTimeOriginal).toBe(date);
    expect(result.iso).toBe(100);
    expect(result.fNumber).toBe(2.8);
    expect(result.exposureTime).toBe(0.002);
    expect(result.focalLength).toBe(24);
    expect(result.imageWidth).toBe(4000);
    expect(result.imageHeight).toBe(2250);
  });

  it("maps GPS fields", async () => {
    mockParse.mockResolvedValue({
      latitude: 45.1234,
      longitude: -75.5678,
      GPSLatitudeRef: "N",
      GPSLongitudeRef: "W",
    });
    const result = await parseExif(fakeFile);
    expect(result.latitude).toBe(45.1234);
    expect(result.longitude).toBe(-75.5678);
    expect(result.gpsLatitudeRef).toBe("N");
    expect(result.gpsLongitudeRef).toBe("W");
  });

  it("maps DJI XMP fields", async () => {
    mockParse.mockResolvedValue({
      AbsoluteAltitude: 120.5,
      RelativeAltitude: 80.0,
      GimbalPitchDegree: -45.0,
      GimbalYawDegree: 30.0,
      GimbalRollDegree: 0.0,
      FlightPitchDegree: 2.1,
      FlightYawDegree: 180.0,
      FlightRollDegree: -1.5,
    });
    const result = await parseExif(fakeFile);
    expect(result.absoluteAltitude).toBe(120.5);
    expect(result.relativeAltitude).toBe(80.0);
    expect(result.gimbalPitchDegree).toBe(-45.0);
    expect(result.gimbalYawDegree).toBe(30.0);
    expect(result.gimbalRollDegree).toBe(0.0);
    expect(result.flightPitchDegree).toBe(2.1);
    expect(result.flightYawDegree).toBe(180.0);
    expect(result.flightRollDegree).toBe(-1.5);
  });

  it("ignores fields with wrong types", async () => {
    mockParse.mockResolvedValue({
      ISO: "not-a-number",
      FNumber: null,
      DateTimeOriginal: "not-a-date",
      latitude: "45.1",
    });
    const result = await parseExif(fakeFile);
    expect(result.iso).toBeUndefined();
    expect(result.fNumber).toBeUndefined();
    expect(result.dateTimeOriginal).toBeUndefined();
    expect(result.latitude).toBeUndefined();
  });

  it("returns empty object when exifr throws", async () => {
    mockParse.mockRejectedValue(new Error("parse error"));
    const result = await parseExif(fakeFile);
    expect(result).toEqual({});
  });
});
