export function formatBytes(bytes?: number): string {
  if (bytes === undefined || bytes === null || Number.isNaN(bytes)) return "—";
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB", "TB", "PB"];
  let v = bytes / 1024;
  let i = 0;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  return `${v.toFixed(v < 10 ? 1 : 0)} ${units[i]}`;
}

export function formatDate(iso?: string): string {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    const now = new Date();
    const sameYear = d.getFullYear() === now.getFullYear();
    const opts: Intl.DateTimeFormatOptions = sameYear
      ? { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }
      : { year: "numeric", month: "short", day: "numeric" };
    return d.toLocaleString(undefined, opts);
  } catch {
    return iso;
  }
}

export function basename(key: string): string {
  const k = key.endsWith("/") ? key.slice(0, -1) : key;
  const i = k.lastIndexOf("/");
  return i >= 0 ? k.slice(i + 1) : k;
}

export function parentPrefix(key: string): string {
  let k = key;
  if (k.endsWith("/")) k = k.slice(0, -1);
  const i = k.lastIndexOf("/");
  return i >= 0 ? k.slice(0, i + 1) : "";
}

export function joinKey(prefix: string, name: string): string {
  if (!prefix) return name;
  return prefix.endsWith("/") ? prefix + name : prefix + "/" + name;
}
