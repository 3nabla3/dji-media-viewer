// lib/panorama-resolver.ts

/**
 * Extracts the redirect URL from a DJI panorama HTML file.
 * DJI writes: <meta http-equiv="refresh" content="0;url=../PANORAMA/100_0255/">
 */
export function parsePanoramaRedirectUrl(html: string): string | null {
  const match = html.match(/http-equiv=["']refresh["'][^>]*content=["'][^"']*;\s*url=([^"']+)/i)
  return match ? match[1].trim() : null
}

/**
 * Resolves a relative path against a base directory path.
 * Both arguments use forward slashes (matching webkitRelativePath).
 * Trailing slashes in `relative` are stripped from the result.
 */
export function resolveRelativePath(baseDir: string, relative: string): string {
  const parts = baseDir.split('/')
  const relParts = relative.replace(/\/$/, '').split('/')
  for (const part of relParts) {
    if (part === '..') {
      parts.pop()
    } else if (part !== '.') {
      parts.push(part)
    }
  }
  return parts.join('/')
}

/**
 * Finds all tile files for a panorama.
 * @param htmlFile  The .html pointer file
 * @param htmlContent  Text content of the HTML file
 * @param allFiles  All files from the folder input
 */
export function collectPanoramaTiles(
  htmlFile: File,
  htmlContent: string,
  allFiles: File[]
): File[] {
  const redirectUrl = parsePanoramaRedirectUrl(htmlContent)
  if (!redirectUrl) return []

  const htmlPath = htmlFile.webkitRelativePath
  const htmlDir = htmlPath.substring(0, htmlPath.lastIndexOf('/'))
  const tileFolder = resolveRelativePath(htmlDir, redirectUrl)

  return allFiles.filter((f) => {
    const rel = f.webkitRelativePath
    return rel.startsWith(tileFolder + '/')
  })
}
