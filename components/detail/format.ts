// components/detail/format.ts

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 ** 3) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 ** 3).toFixed(2)} GB`;
}

export function formatShutter(seconds: number): string {
  if (seconds >= 1) return `${seconds} s`;
  return `1/${Math.round(1 / seconds)} s`;
}

export function formatDate(d: Date): string {
  return d.toLocaleString();
}
