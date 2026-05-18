import { promises as fsp, createWriteStream } from "node:fs";
import path from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import type { StoredFile } from "files-sdk";
import { getCachedClient } from "./adapters.js";
import { getConnection } from "./store.js";
import type { ConnectionConfig, ListResult, RemoteEntry } from "../shared/types.js";

const PAGE_SIZE = 500;

async function getConfig(id: string): Promise<ConnectionConfig> {
  const c = await getConnection(id);
  if (!c) throw new Error(`Connection not found: ${id}`);
  return c;
}

function normalizePrefix(prefix: string): string {
  if (!prefix) return "";
  let p = prefix;
  if (p.startsWith("/")) p = p.slice(1);
  if (p.length > 0 && !p.endsWith("/")) p = p + "/";
  return p;
}

function keyBasename(key: string): string {
  const k = key.endsWith("/") ? key.slice(0, -1) : key;
  const i = k.lastIndexOf("/");
  return i >= 0 ? k.slice(i + 1) : k;
}

function toIso(ms?: number): string | undefined {
  if (ms === undefined || ms === null || Number.isNaN(ms)) return undefined;
  try {
    return new Date(ms).toISOString();
  } catch {
    return undefined;
  }
}

function storedFileToEntry(f: StoredFile, displayKey: string): RemoteEntry {
  return {
    key: displayKey,
    name: keyBasename(displayKey),
    size: f.size,
    lastModified: toIso(f.lastModified),
    contentType: f.type,
    isDir: false,
  };
}

function dedupe(items: RemoteEntry[]): RemoteEntry[] {
  const seen = new Map<string, RemoteEntry>();
  for (const it of items) {
    const existing = seen.get(it.key);
    if (!existing) {
      seen.set(it.key, it);
    } else if (it.isDir && !existing.isDir) {
      seen.set(it.key, it);
    }
  }
  return Array.from(seen.values());
}

async function shallowFsList(root: string, prefix: string): Promise<ListResult> {
  const norm = normalizePrefix(prefix);
  const dir = path.join(root, norm);
  let entries;
  try {
    entries = await fsp.readdir(dir, { withFileTypes: true });
  } catch (e: unknown) {
    throw e;
  }
  const items: RemoteEntry[] = [];
  await Promise.all(
    entries.map(async (e) => {
      const name = e.name;
      // Skip macOS noise that's not user-visible
      if (name === ".DS_Store") {
        // still surface it so the renderer's hidden filter can hide it
      }
      try {
        if (e.isDirectory()) {
          items.push({ key: norm + name + "/", name, isDir: true });
        } else if (e.isFile()) {
          const st = await fsp.stat(path.join(dir, name));
          items.push({
            key: norm + name,
            name,
            isDir: false,
            size: st.size,
            lastModified: st.mtime.toISOString(),
          });
        } else if (e.isSymbolicLink()) {
          try {
            const st = await fsp.stat(path.join(dir, name));
            if (st.isDirectory()) {
              items.push({ key: norm + name + "/", name, isDir: true });
            } else {
              items.push({
                key: norm + name,
                name,
                isDir: false,
                size: st.size,
                lastModified: st.mtime.toISOString(),
              });
            }
          } catch {
            /* broken symlink — skip */
          }
        }
      } catch {
        /* unreadable entry — skip */
      }
    }),
  );
  items.sort((a, b) => {
    if (a.isDir !== b.isDir) return a.isDir ? -1 : 1;
    return a.name.localeCompare(b.name, undefined, { sensitivity: "base", numeric: true });
  });
  return { items, prefix: norm };
}

export async function list(
  connectionId: string,
  prefix: string,
  cursor?: string,
): Promise<ListResult> {
  const config = await getConfig(connectionId);

  // Fast path: native filesystem. Bypass the SDK's flat-key recursive list
  // (which scans every nested file just to surface the current directory).
  if (config.kind === "fs") {
    const root = (config.options?.root as string) ?? "";
    if (!root) throw new Error("Root path is required for the Local Filesystem source");
    return shallowFsList(root, prefix);
  }

  const client = await getCachedClient(config);
  const norm = normalizePrefix(prefix);
  const res = await client.list({ prefix: norm, limit: PAGE_SIZE, cursor });
  const items: RemoteEntry[] = [];
  const seenFolders = new Set<string>();

  for (const it of res.items ?? []) {
    if (!it.key) continue;
    const rest = norm && it.key.startsWith(norm) ? it.key.slice(norm.length) : it.key;
    if (rest === "") continue;
    if (rest.endsWith("/.keep")) {
      // virtual folder marker — show only the folder, not the marker
      const folderName = rest.slice(0, -"/.keep".length);
      const folderKey = norm + folderName + "/";
      if (folderName && !seenFolders.has(folderKey)) {
        seenFolders.add(folderKey);
        items.push({ key: folderKey, name: folderName, isDir: true });
      }
      continue;
    }
    const slash = rest.indexOf("/");
    if (slash >= 0) {
      const folderName = rest.slice(0, slash);
      const folderKey = norm + folderName + "/";
      if (!seenFolders.has(folderKey)) {
        seenFolders.add(folderKey);
        items.push({ key: folderKey, name: folderName, isDir: true });
      }
    } else {
      items.push(storedFileToEntry(it, it.key));
    }
  }

  const merged = dedupe(items);
  merged.sort((a, b) => {
    if (a.isDir !== b.isDir) return a.isDir ? -1 : 1;
    return a.name.localeCompare(b.name);
  });

  return {
    items: merged,
    cursor: res.cursor,
    prefix: norm,
  };
}

export async function head(connectionId: string, key: string): Promise<RemoteEntry | null> {
  const config = await getConfig(connectionId);
  const client = await getCachedClient(config);
  try {
    const h = await client.head(key);
    if (!h) return null;
    return storedFileToEntry(h, h.key ?? key);
  } catch {
    return null;
  }
}

async function blobToBuffer(blob: Blob): Promise<Buffer> {
  const ab = await blob.arrayBuffer();
  return Buffer.from(ab);
}

export async function downloadToFile(
  connectionId: string,
  key: string,
  destPath: string,
): Promise<{ bytes: number }> {
  const config = await getConfig(connectionId);
  const client = await getCachedClient(config);
  await fsp.mkdir(path.dirname(destPath), { recursive: true });

  try {
    const result = await client.download(key, { as: "stream" });
    if (typeof result.stream === "function") {
      const webStream = result.stream();
      const nodeStream =
        webStream instanceof Readable
          ? webStream
          : Readable.fromWeb(webStream as unknown as ReadableStream<Uint8Array>);
      await pipeline(nodeStream, createWriteStream(destPath));
      const stat = await fsp.stat(destPath);
      return { bytes: stat.size };
    }
  } catch {
    /* fall through */
  }

  const result = await client.download(key);
  const buf = await blobToBuffer(await result.blob());
  await fsp.writeFile(destPath, buf);
  return { bytes: buf.byteLength };
}

export async function uploadLocalFile(
  connectionId: string,
  destKey: string,
  sourcePath: string,
): Promise<{ bytes: number }> {
  const config = await getConfig(connectionId);
  const client = await getCachedClient(config);
  const buf = await fsp.readFile(sourcePath);
  await client.upload(destKey, buf);
  return { bytes: buf.byteLength };
}

export async function deleteEntry(connectionId: string, key: string): Promise<void> {
  const config = await getConfig(connectionId);
  const client = await getCachedClient(config);

  if (key.endsWith("/")) {
    let cursor: string | undefined;
    do {
      const page = await client.list({ prefix: key, limit: PAGE_SIZE, cursor });
      for (const it of page.items ?? []) {
        if (it.key) await client.delete(it.key);
      }
      cursor = page.cursor;
    } while (cursor);
    return;
  }
  await client.delete(key);
}

export async function copy(
  sourceConnectionId: string,
  sourceKey: string,
  destConnectionId: string,
  destKey: string,
): Promise<{ bytes: number }> {
  if (sourceConnectionId === destConnectionId) {
    const config = await getConfig(sourceConnectionId);
    const client = await getCachedClient(config);
    if (sourceKey.endsWith("/")) {
      let cursor: string | undefined;
      let totalBytes = 0;
      do {
        const page = await client.list({ prefix: sourceKey, limit: PAGE_SIZE, cursor });
        for (const it of page.items ?? []) {
          if (!it.key) continue;
          const rest = it.key.slice(sourceKey.length);
          const dst = (destKey.endsWith("/") ? destKey : destKey + "/") + rest;
          await client.copy(it.key, dst);
          totalBytes += it.size ?? 0;
        }
        cursor = page.cursor;
      } while (cursor);
      return { bytes: totalBytes };
    }
    await client.copy(sourceKey, destKey);
    try {
      const h = await client.head(destKey);
      return { bytes: h?.size ?? 0 };
    } catch {
      return { bytes: 0 };
    }
  }

  const sourceClient = await getCachedClient(await getConfig(sourceConnectionId));
  const destClient = await getCachedClient(await getConfig(destConnectionId));
  if (sourceKey.endsWith("/")) {
    let cursor: string | undefined;
    let totalBytes = 0;
    do {
      const page = await sourceClient.list({ prefix: sourceKey, limit: PAGE_SIZE, cursor });
      for (const it of page.items ?? []) {
        if (!it.key) continue;
        const rest = it.key.slice(sourceKey.length);
        const dst = (destKey.endsWith("/") ? destKey : destKey + "/") + rest;
        const dl = await sourceClient.download(it.key);
        const buf = await blobToBuffer(await dl.blob());
        await destClient.upload(dst, buf);
        totalBytes += buf.byteLength;
      }
      cursor = page.cursor;
    } while (cursor);
    return { bytes: totalBytes };
  }
  const dl = await sourceClient.download(sourceKey);
  const buf = await blobToBuffer(await dl.blob());
  await destClient.upload(destKey, buf);
  return { bytes: buf.byteLength };
}

export async function move(
  sourceConnectionId: string,
  sourceKey: string,
  destConnectionId: string,
  destKey: string,
): Promise<{ bytes: number }> {
  const res = await copy(sourceConnectionId, sourceKey, destConnectionId, destKey);
  await deleteEntry(sourceConnectionId, sourceKey);
  return res;
}

export async function mkdir(connectionId: string, key: string): Promise<void> {
  const config = await getConfig(connectionId);
  const client = await getCachedClient(config);
  const folderKey = key.endsWith("/") ? key + ".keep" : key + "/.keep";
  await client.upload(folderKey, new Uint8Array(0));
}

/**
 * Returns a URL that the renderer can use as an <img src> for thumbnails.
 * For local-fs sources we resolve to a file:// URL; for cloud we use a short
 * signed URL when the adapter supports it. Returns null if not previewable.
 */
export async function thumbUrl(connectionId: string, key: string): Promise<string | null> {
  if (!key || key.endsWith("/")) return null;
  const config = await getConfig(connectionId);

  if (config.kind === "fs") {
    const root = (config.options?.root as string) ?? "";
    if (!root) return null;
    const cleanKey = key.startsWith("/") ? key.slice(1) : key;
    const full = path.join(root, cleanKey);
    return "file://" + encodeURI(full).replace(/#/g, "%23");
  }

  const client = await getCachedClient(config);
  try {
    return await client.url(key, { expiresIn: 300 });
  } catch {
    return null;
  }
}

/**
 * Read up to `maxBytes` (default 64 KB) from a remote file as UTF-8 text for
 * inline preview. Caller is responsible for deciding whether the file is text.
 */
export async function readTextPreview(
  connectionId: string,
  key: string,
  maxBytes = 64 * 1024,
): Promise<string> {
  const config = await getConfig(connectionId);
  const client = await getCachedClient(config);
  const result = await client.download(key);
  const blob = await result.blob();
  const buf = Buffer.from(await blob.arrayBuffer());
  const slice = buf.length > maxBytes ? buf.subarray(0, maxBytes) : buf;
  return slice.toString("utf8");
}

export async function url(
  connectionId: string,
  key: string,
  opts?: { expiresIn?: number },
): Promise<string | null> {
  const config = await getConfig(connectionId);
  const client = await getCachedClient(config);
  try {
    return await client.url(key, opts);
  } catch {
    return null;
  }
}

export async function testConnection(config: ConnectionConfig): Promise<{ ok: boolean; error?: string }> {
  try {
    // Fast path for local fs: just check the root path is readable.
    if (config.kind === "fs") {
      const root = (config.options?.root as string) ?? "";
      if (!root) return { ok: false, error: "Root path is required" };
      await fsp.access(root);
      return { ok: true };
    }
    const client = await getCachedClient(config);
    await client.list({ limit: 1 });
    return { ok: true };
  } catch (e: unknown) {
    return { ok: false, error: (e as Error)?.message ?? String(e) };
  }
}
