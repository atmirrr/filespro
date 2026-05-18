import type { Adapter, Files as FilesType } from "files-sdk";
import type { ConnectionConfig } from "../shared/types.js";

type AnyFiles = FilesType<Adapter>;

function mergeOptions(config: ConnectionConfig): Record<string, unknown> {
  const opts: Record<string, unknown> = { ...(config.options ?? {}) };
  if (config.secrets) {
    for (const [k, v] of Object.entries(config.secrets)) {
      if (v !== undefined && v !== "") opts[k] = v;
    }
  }
  return opts;
}

function nonEmpty<T extends Record<string, unknown>>(o: T): T {
  const r: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(o)) {
    if (v === undefined || v === "" || v === null) continue;
    r[k] = v;
  }
  return r as T;
}

export async function buildFilesClient(config: ConnectionConfig): Promise<AnyFiles> {
  const opts = mergeOptions(config);

  switch (config.kind) {
    case "fs": {
      const [{ Files }, { fs }] = await Promise.all([
        import("files-sdk"),
        import("files-sdk/fs"),
      ]);
      const root = (opts.root as string) ?? "";
      if (!root) throw new Error("Root path is required for the Local Filesystem adapter");
      return new Files({ adapter: fs({ root }) }) as AnyFiles;
    }
    case "s3": {
      const [{ Files }, { s3 }] = await Promise.all([
        import("files-sdk"),
        import("files-sdk/s3"),
      ]);
      const { accessKeyId, secretAccessKey, bucket, region, endpoint, publicBaseUrl } =
        opts as Record<string, string | undefined>;
      if (!bucket || !region) throw new Error("S3 requires bucket and region");
      const credentials =
        accessKeyId && secretAccessKey ? { accessKeyId, secretAccessKey } : undefined;
      return new Files({
        adapter: s3(nonEmpty({ bucket, region, endpoint, publicBaseUrl, credentials })),
      }) as AnyFiles;
    }
    case "r2": {
      const [{ Files }, { r2 }] = await Promise.all([
        import("files-sdk"),
        import("files-sdk/r2"),
      ]);
      const { bucket, accountId } = opts as Record<string, string | undefined>;
      if (!bucket || !accountId) throw new Error("R2 requires bucket and accountId");
      return new Files({
        adapter: r2(nonEmpty(opts as Parameters<typeof r2>[0])),
      }) as AnyFiles;
    }
    case "gcs": {
      const [{ Files }, { gcs }] = await Promise.all([
        import("files-sdk"),
        import("files-sdk/gcs"),
      ]);
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
        adapter: gcs(nonEmpty({ bucket, projectId, publicBaseUrl, credentials })),
      }) as AnyFiles;
    }
    case "azure": {
      const [{ Files }, { azure }] = await Promise.all([
        import("files-sdk"),
        import("files-sdk/azure"),
      ]);
      const { container } = opts as Record<string, string | undefined>;
      if (!container) throw new Error("Azure requires container");
      return new Files({
        adapter: azure(nonEmpty(opts as Parameters<typeof azure>[0])),
      }) as AnyFiles;
    }
    case "minio": {
      const [{ Files }, { minio }] = await Promise.all([
        import("files-sdk"),
        import("files-sdk/minio"),
      ]);
      return new Files({
        adapter: minio(nonEmpty(opts as Parameters<typeof minio>[0])),
      }) as AnyFiles;
    }
    case "digitalocean-spaces": {
      const [{ Files }, mod] = await Promise.all([
        import("files-sdk"),
        import("files-sdk/digitalocean-spaces"),
      ]);
      const factory = (mod as unknown as Record<string, (o: Record<string, unknown>) => Adapter>)
        .digitaloneSpaces;
      if (!factory) throw new Error("DigitalOcean Spaces adapter export not found");
      return new Files({ adapter: factory(nonEmpty(opts)) }) as AnyFiles;
    }
    case "storj": {
      const [{ Files }, { storj }] = await Promise.all([
        import("files-sdk"),
        import("files-sdk/storj"),
      ]);
      return new Files({
        adapter: storj(nonEmpty(opts as Parameters<typeof storj>[0])),
      }) as AnyFiles;
    }
    case "hetzner": {
      const [{ Files }, { hetzner }] = await Promise.all([
        import("files-sdk"),
        import("files-sdk/hetzner"),
      ]);
      return new Files({
        adapter: hetzner(nonEmpty(opts as Parameters<typeof hetzner>[0])),
      }) as AnyFiles;
    }
    case "akamai": {
      const [{ Files }, { akamai }] = await Promise.all([
        import("files-sdk"),
        import("files-sdk/akamai"),
      ]);
      return new Files({
        adapter: akamai(nonEmpty(opts as Parameters<typeof akamai>[0])),
      }) as AnyFiles;
    }
    case "vercel-blob": {
      const [{ Files }, { vercelBlob }] = await Promise.all([
        import("files-sdk"),
        import("files-sdk/vercel-blob"),
      ]);
      const { BLOB_READ_WRITE_TOKEN, ...rest } = opts as Record<string, string | undefined>;
      if (BLOB_READ_WRITE_TOKEN) process.env.BLOB_READ_WRITE_TOKEN = BLOB_READ_WRITE_TOKEN;
      return new Files({ adapter: vercelBlob(nonEmpty(rest)) }) as AnyFiles;
    }
    case "netlify-blobs": {
      const [{ Files }, { netlifyBlobs }] = await Promise.all([
        import("files-sdk"),
        import("files-sdk/netlify-blobs"),
      ]);
      return new Files({
        adapter: netlifyBlobs(nonEmpty(opts as Parameters<typeof netlifyBlobs>[0])),
      }) as AnyFiles;
    }
    case "supabase": {
      const [{ Files }, { supabase }] = await Promise.all([
        import("files-sdk"),
        import("files-sdk/supabase"),
      ]);
      return new Files({
        adapter: supabase(nonEmpty(opts as Parameters<typeof supabase>[0])),
      }) as AnyFiles;
    }
    case "uploadthing": {
      const [{ Files }, { uploadthing }] = await Promise.all([
        import("files-sdk"),
        import("files-sdk/uploadthing"),
      ]);
      return new Files({ adapter: uploadthing(nonEmpty(opts)) }) as AnyFiles;
    }
    case "dropbox": {
      const [{ Files }, { dropbox }] = await Promise.all([
        import("files-sdk"),
        import("files-sdk/dropbox"),
      ]);
      return new Files({
        adapter: dropbox(nonEmpty(opts as Parameters<typeof dropbox>[0])),
      }) as AnyFiles;
    }
    case "onedrive": {
      const [{ Files }, { onedrive }] = await Promise.all([
        import("files-sdk"),
        import("files-sdk/onedrive"),
      ]);
      return new Files({ adapter: onedrive(nonEmpty(opts)) }) as AnyFiles;
    }
    case "google-drive": {
      const [{ Files }, { googleDrive }] = await Promise.all([
        import("files-sdk"),
        import("files-sdk/google-drive"),
      ]);
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
        adapter: googleDrive(nonEmpty({ credentials, subject, rootFolderId })),
      }) as AnyFiles;
    }
    case "box": {
      const [{ Files }, { box }] = await Promise.all([
        import("files-sdk"),
        import("files-sdk/box"),
      ]);
      return new Files({ adapter: box(nonEmpty(opts)) }) as AnyFiles;
    }
    default: {
      const exhaustive: never = config.kind;
      throw new Error(`Unsupported adapter: ${String(exhaustive)}`);
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
