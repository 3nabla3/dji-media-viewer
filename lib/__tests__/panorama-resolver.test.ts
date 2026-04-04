// lib/__tests__/panorama-resolver.test.ts
import { describe, it, expect } from "vitest";
import {
  parsePanoramaRedirectUrl,
  resolveRelativePath,
  collectPanoramaTiles,
} from "../panorama-resolver";

describe("parsePanoramaRedirectUrl", () => {
  it("extracts redirect URL from DJI panorama HTML", () => {
    const html = `<html><head>
<meta http-equiv="refresh" content="0;url=../PANORAMA/100_0255/">
<meta data-PANOMODE="BALL  ">
</head></html>`;
    expect(parsePanoramaRedirectUrl(html)).toBe("../PANORAMA/100_0255/");
  });

  it("returns null when no refresh meta tag is present", () => {
    expect(parsePanoramaRedirectUrl("<html></html>")).toBeNull();
  });

  it("handles url= with surrounding whitespace in content attribute", () => {
    const html = `<meta http-equiv="refresh" content="0; url=../PANORAMA/100_0010/">`;
    expect(parsePanoramaRedirectUrl(html)).toBe("../PANORAMA/100_0010/");
  });
});

describe("resolveRelativePath", () => {
  it("resolves ../PANORAMA/100_0255/ relative to DCIM/100MEDIA", () => {
    expect(
      resolveRelativePath("DJI_SD/DCIM/100MEDIA", "../PANORAMA/100_0255/"),
    ).toBe("DJI_SD/DCIM/PANORAMA/100_0255");
  });

  it("resolves single-level parent correctly", () => {
    expect(resolveRelativePath("root/a/b", "../c")).toBe("root/a/c");
  });

  it("handles trailing slash in relative path", () => {
    expect(resolveRelativePath("root/a", "b/")).toBe("root/a/b");
  });
});

describe("collectPanoramaTiles", () => {
  it("returns files whose webkitRelativePath starts with the resolved folder", () => {
    const makeFile = (path: string) =>
      Object.assign(new File([], path.split("/").pop()!), {
        webkitRelativePath: path,
      });

    const htmlFile = makeFile("DJI_SD/DCIM/100MEDIA/DJI_0255.html");
    const tile1 = makeFile("DJI_SD/DCIM/PANORAMA/100_0255/DJI_0001.JPG");
    const tile2 = makeFile("DJI_SD/DCIM/PANORAMA/100_0255/DJI_0002.JPG");
    const other = makeFile("DJI_SD/DCIM/100MEDIA/DJI_0001.JPG");

    const html = `<meta http-equiv="refresh" content="0;url=../PANORAMA/100_0255/">`;
    const result = collectPanoramaTiles(htmlFile, html, [
      htmlFile,
      tile1,
      tile2,
      other,
    ]);

    expect(result).toHaveLength(2);
    expect(result).toContain(tile1);
    expect(result).toContain(tile2);
  });

  it("returns empty array when redirect URL cannot be parsed", () => {
    const makeFile = (path: string) =>
      Object.assign(new File([], path.split("/").pop()!), {
        webkitRelativePath: path,
      });
    const htmlFile = makeFile("root/DJI_0255.html");
    expect(collectPanoramaTiles(htmlFile, "<html></html>", [])).toEqual([]);
  });
});
