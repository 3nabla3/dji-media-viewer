import { describe, it, expect } from "vitest";
import {
  formatBytes,
  formatShutter,
  formatDate,
} from "../../components/detail/format";

describe("formatBytes", () => {
  it("formats bytes", () => expect(formatBytes(512)).toBe("512 B"));
  it("formats KB", () => expect(formatBytes(2048)).toBe("2.0 KB"));
  it("formats MB", () => expect(formatBytes(4.2 * 1024 * 1024)).toBe("4.2 MB"));
  it("formats GB", () => expect(formatBytes(1.2 * 1024 ** 3)).toBe("1.20 GB"));
});

describe("formatShutter", () => {
  it("formats sub-second shutter speeds as fractions", () => {
    expect(formatShutter(1 / 1000)).toBe("1/1000 s");
    expect(formatShutter(1 / 250)).toBe("1/250 s");
  });
  it("formats whole-second shutter speeds", () => {
    expect(formatShutter(2)).toBe("2 s");
  });
});

describe("formatDate", () => {
  it("returns a non-empty string for a valid Date", () => {
    const result = formatDate(new Date("2024-03-15T10:32:00"));
    expect(typeof result).toBe("string");
    expect(result.length).toBeGreaterThan(0);
  });
});
