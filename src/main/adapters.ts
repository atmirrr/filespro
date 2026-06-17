import type { Adapter, Files as FilesType } from "files-sdk";
import type { AdapterKind, ConnectionConfig } from "../shared/types.js";

type AnyFiles = FilesType<Adapter>;

/** An adapter factory with its option type erased, so we can call any of them
 *  with a plain cleaned-options bag without fighting each provider's strict
 *  option interface. */
type LooseFactory = (o: Record<string, unknown>) => Adapter;

function mergeOptions(config: ConnectionConfig): Record<string, unknown> {
  const opts: Record<string, unknown> = { ...(config.options ?? {}) };
  if (config.secrets) {
    for (const [k, v] of Object.entries(config.secrets)) {
      if (v !== undefined && v !== "") opts[k] = v;
    }
  }
  return opts;
}

function nonEmpty(o: Record<string, unknown>): Record<string, unknown> {
  const r: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(o)) {
    if (v === undefined || v === "" || v === null) continue;
    r[k] = v;
  }
  return r;
}

/** Invoke an adapter factory with cleaned options, erasing the strict option
 *  type so a `Record<string, unknown>` is accepted. The factory still
 *  validates required fields at runtime. */
function make(factory: (o: never) => Adapter, opts: Record<string, unknown>): Adapter {
  return (factory as unknown as LooseFactory)(nonEmpty(opts));
}

async function loadFiles() {
  return (await import("files-sdk")).Files;
}

/**
 * S3-compatible object stores. Every one of these shares the same option shape
 * — a bucket, an optional region/endpoint, and a top-level access-key pair —
 * so a single code path builds them all. Each value lazily imports just that
 * adapter's subpath so we never load an SDK the user isn't using.
 */
const S3_COMPATIBLE: Partial<Record<AdapterKind, () => Promise<(o: never) => Adapter>>> = {
  minio: async () => (await import("files-sdk/minio")).minio,
  "digitalocean-spaces": async () =>
    (await import("files-sdk/digitalocean-spaces")).digitaloceanSpaces,
  storj: async () => (await import("files-sdk/storj")).storj,
  hetzner: async () => (await import("files-sdk/hetzner")).hetzner,
  akamai: async () => (await import("files-sdk/akamai")).akamai,
  "backblaze-b2": async () => (await import("files-sdk/backblaze-b2")).backblazeB2,
  wasabi: async () => (await import("files-sdk/wasabi")).wasabi,
  tigris: async () => (await import("files-sdk/tigris")).tigris,
  scaleway: async () => (await import("files-sdk/scaleway")).scaleway,
  vultr: async () => (await import("files-sdk/vultr")).vultr,
  ovhcloud: async () => (await import("files-sdk/ovhcloud")).ovhcloud,
  "idrive-e2": async () => (await import("files-sdk/idrive-e2")).idriveE2,
  filebase: async () => (await import("files-sdk/filebase")).filebase,
  exoscale: async () => (await import("files-sdk/exoscale")).exoscale,
  "oracle-cloud": async () => (await import("files-sdk/oracle-cloud")).oracleCloud,
  "ibm-cos": async () => (await import("files-sdk/ibm-cos")).ibmCos,
  tencent: async () => (await import("files-sdk/tencent")).tencent,
  alibaba: async () => (await import("files-sdk/alibaba")).alibaba,
  yandex: async () => (await import("files-sdk/yandex")).yandex,
};

export async function buildFilesClient(config: ConnectionConfig): Promise<AnyFiles> {
  const opts = mergeOptions(config);
  const Files = await loadFiles();

  // S3-compatible family — one builder for all of them.
  const loadFamilyFactory = S3_COMPATIBLE[config.kind];
  if (loadFamilyFactory) {
    if (!opts.bucket) throw new Error(`The ${config.kind} source requires a bucket`);
    const factory = await loadFamilyFactory();
    return new Files({ adapter: make(factory, opts) }) as AnyFiles;
  }

  switch (config.kind) {
    case "fs": {
      const { fs } = await import("files-sdk/fs");
      const root = (opts.root as string) ?? "";
      if (!root) throw new Error("Root path is required for the Local Filesystem adapter");
      return new Files({ adapter: make(fs, { root }) }) as AnyFiles;
    }
    case "s3": {
      const { s3 } = await import("files-sdk/s3");
      const { accessKeyId, secretAccessKey, bucket, region, endpoint, publicBaseUrl } =
        opts as Record<string, string | undefined>;
      if (!bucket || !region) throw new Error("S3 requires bucket and region");
      const credentials =
        accessKeyId && secretAccessKey ? { accessKeyId, secretAccessKey } : undefined;
      return new Files({
        adapter: make(s3, { bucket, region, endpoint, publicBaseUrl, credentials }),
      }) as AnyFiles;
    }
    case "r2": {
      const { r2 } = await import("files-sdk/r2");
      const { bucket, accountId } = opts as Record<string, string | undefined>;
      if (!bucket || !accountId) throw new Error("R2 requires bucket and accountId");
      return new Files({ adapter: make(r2, opts) }) as AnyFiles;
    }
    case "gcs": {
      const { gcs } = await import("files-sdk/gcs");
      const { credentialsJson, bucket, projectId, publicBaseUrl } = opts as Record<
        string,
        string | undefined
      >;
      if (!bucket) throw new Error("GCS requires bucket");
      let credentials: Record<string, unknown> | undefined;
      if (credentialsJson) {
        try {
          credentials = JSON.parse(credentialsJson);
        } catch {
          throw new Error("GCS service account JSON is malformed");
        }
      }
      return new Files({
        adapter: make(gcs, { bucket, projectId, publicBaseUrl, credentials }),
      }) as AnyFiles;
    }
    case "azure": {
      const { azure } = await import("files-sdk/azure");
      const { container } = opts as Record<string, string | undefined>;
      if (!container) throw new Error("Azure requires container");
      return new Files({ adapter: make(azure, opts) }) as AnyFiles;
    }
    case "vercel-blob": {
      const { vercelBlob } = await import("files-sdk/vercel-blob");
      const { BLOB_READ_WRITE_TOKEN, ...rest } = opts as Record<string, string | undefined>;
      if (BLOB_READ_WRITE_TOKEN) process.env.BLOB_READ_WRITE_TOKEN = BLOB_READ_WRITE_TOKEN;
      return new Files({ adapter: make(vercelBlob, rest) }) as AnyFiles;
    }
    case "netlify-blobs": {
      const { netlifyBlobs } = await import("files-sdk/netlify-blobs");
      return new Files({ adapter: make(netlifyBlobs, opts) }) as AnyFiles;
    }
    case "supabase": {
      const { supabase } = await import("files-sdk/supabase");
      return new Files({ adapter: make(supabase, opts) }) as AnyFiles;
    }
    case "uploadthing": {
      const { uploadthing } = await import("files-sdk/uploadthing");
      return new Files({ adapter: make(uploadthing, opts) }) as AnyFiles;
    }
    case "dropbox": {
      const { dropbox } = await import("files-sdk/dropbox");
      return new Files({ adapter: make(dropbox, opts) }) as AnyFiles;
    }
    case "onedrive": {
      const { onedrive } = await import("files-sdk/onedrive");
      return new Files({ adapter: make(onedrive, opts) }) as AnyFiles;
    }
    case "google-drive": {
      const { googleDrive } = await import("files-sdk/google-drive");
      const { credentialsJson, subject, rootFolderId } = opts as Record<string, string | undefined>;
      let credentials: { client_email: string; private_key: string } | undefined;
      if (credentialsJson) {
        try {
          const parsed = JSON.parse(credentialsJson) as Record<string, string>;
          if (parsed.client_email && parsed.private_key) {
            credentials = {
              client_email: parsed.client_email,
              private_key: parsed.private_key,
            };
          }
        } catch {
          throw new Error("Google Drive service account JSON is malformed");
        }
      }
      return new Files({
        adapter: make(googleDrive, { credentials, subject, rootFolderId }),
      }) as AnyFiles;
    }
    case "box": {
      const { box } = await import("files-sdk/box");
      return new Files({ adapter: make(box, opts) }) as AnyFiles;
    }
    default: {
      throw new Error(`Unsupported adapter: ${String(config.kind)}`);
    }
  }
}

const cache = new Map<string, { signature: string; client: AnyFiles }>();

function signature(config: ConnectionConfig): string {
  return JSON.stringify({
    kind: config.kind,
    options: config.options,
    secrets: config.secrets,
  });
}

export async function getCachedClient(config: ConnectionConfig): Promise<AnyFiles> {
  const sig = signature(config);
  const hit = cache.get(config.id);
  if (hit && hit.signature === sig) return hit.client;
  const client = await buildFilesClient(config);
  cache.set(config.id, { signature: sig, client });
  return client;
}

export function invalidateClient(id: string) {
  cache.delete(id);
}
