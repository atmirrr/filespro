import { promises as fsp, createReadStream, createWriteStream } from "node:fs";
import path from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import type { StoredFile } from "files-sdk";
import { getCachedClient } from "./adapters.js";
import { getConnection } from "./store.js";
import type {
  ConnectionConfig,
  ListResult,
  RemoteEntry,
  SourceCapabilities,
} from "../shared/types.js";

/** Cast a Web ReadableStream to whatever `Readable.fromWeb` expects — the DOM
 *  and `node:stream/web` stream types are structurally identical but nominally
 *  distinct, so an explicit bridge keeps the call type-safe. */
function toNodeStream(web: ReadableStream<Uint8Array>): Readable {
  return Readable.fromWeb(web as unknown as Parameters<typeof Readable.fromWeb>[0]);
}

/** Bridge a Node read stream to the Web ReadableStream the SDK accepts as a
 *  body, so uploads stream from disk instead of buffering the whole file. */
function fileToWebStream(sourcePath: string): ReadableStream<Uint8Array> {
  return Readable.toWeb(createReadStream(sourcePath)) as unknown as ReadableStream<Uint8Array>;
}

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
      await pipeline(toNodeStream(result.stream()), createWriteStream(destPath));
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
  // Stream from disk rather than reading the whole file into memory — the SDK
  // promotes S3-family uploads to multipart and buffers generically elsewhere.
  const { size } = await fsp.stat(sourcePath);
  await client.upload(destKey, fileToWebStream(sourcePath));
  return { bytes: size };
}

export async function deleteEntry(connectionId: string, key: string): Promise<void> {
  const config = await getConfig(connectionId);
  const client = await getCachedClient(config);

  if (key.endsWith("/")) {
    let cursor: string | undefined;
    do {
      const page = await client.list({ prefix: key, limit: PAGE_SIZE, cursor });
      const keys = (page.items ?? [])
        .map((it) => it.key)
        .filter((k): k is string => typeof k === "string" && k.length > 0);
      // One batched delete per page — the SDK fans out with bounded concurrency.
      if (keys.length > 0) await client.delete(keys);
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
        // Stream straight from source to destination — no full-file buffering.
        const dl = await sourceClient.download(it.key, { as: "stream" });
        await destClient.upload(dst, dl.stream());
        totalBytes += dl.size ?? it.size ?? 0;
      }
      cursor = page.cursor;
    } while (cursor);
    return { bytes: totalBytes };
  }
  const dl = await sourceClient.download(sourceKey, { as: "stream" });
  const bytes = dl.size ?? 0;
  await destClient.upload(destKey, dl.stream());
  return { bytes };
}

export async function move(
  sourceConnectionId: string,
  sourceKey: string,
  destConnectionId: string,
  destKey: string,
): Promise<{ bytes: number }> {
  // Same source + a single object: use the adapter's native move (server-side
  // rename where supported) instead of copy-then-delete.
  if (sourceConnectionId === destConnectionId && !sourceKey.endsWith("/")) {
    const client = await getCachedClient(await getConfig(sourceConnectionId));
    await client.move(sourceKey, destKey);
    return { bytes: 0 };
  }
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

/**
 * Report what the source's adapter can do, so the renderer can adapt its UI
 * (e.g. hide "Copy shareable URL" for sources that can't sign one). Best-effort
 * — any failure resolves to a conservative all-false set.
 */
export async function capabilities(connectionId: string): Promise<SourceCapabilities> {
  try {
    const config = await getConfig(connectionId);
    if (config.kind === "fs") return { signedUrl: false, serverSideCopy: false };
    const client = await getCachedClient(config);
    const caps = client.capabilities;
    return {
      signedUrl: Boolean(caps.signedUrl?.supported),
      serverSideCopy: Boolean(caps.serverSideCopy),
    };
  } catch {
    return { signedUrl: false, serverSideCopy: false };
  }
}

/**
 * Stream every object under `prefix` into a single ZIP archive written to
 * `destPath`. Uses the SDK's `zip` plugin, which downloads and deflates one
 * entry at a time so memory stays flat regardless of folder size.
 */
export async function downloadZipFolder(
  connectionId: string,
  prefix: string,
  destPath: string,
): Promise<{ bytes: number }> {
  const config = await getConfig(connectionId);
  const [{ createFiles }, { zip }] = await Promise.all([
    import("files-sdk"),
    import("files-sdk/zip"),
  ]);
  const base = await getCachedClient(config);
  const zipper = createFiles({ adapter: base.adapter, plugins: [zip()] });
  const norm = normalizePrefix(prefix);
  await fsp.mkdir(path.dirname(destPath), { recursive: true });
  await pipeline(toNodeStream(zipper.zip({ prefix: norm })), createWriteStream(destPath));
  const stat = await fsp.stat(destPath);
  return { bytes: stat.size };
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
