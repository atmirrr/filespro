export type AdapterKind =
  | "fs"
  | "s3"
  | "r2"
  | "gcs"
  | "azure"
  | "minio"
  | "digitalocean-spaces"
  | "storj"
  | "hetzner"
  | "akamai"
  | "vercel-blob"
  | "netlify-blobs"
  | "supabase"
  | "uploadthing"
  | "dropbox"
  | "onedrive"
  | "google-drive"
  | "box"
  | "backblaze-b2"
  | "wasabi"
  | "tigris"
  | "scaleway"
  | "vultr"
  | "ovhcloud"
  | "idrive-e2"
  | "filebase"
  | "exoscale"
  | "oracle-cloud"
  | "ibm-cos"
  | "tencent"
  | "alibaba"
  | "yandex";

export interface ConnectionBase {
  id: string;
  name: string;
  kind: AdapterKind;
  createdAt: number;
}

export type ConnectionConfig = ConnectionBase & {
  options: Record<string, unknown>;
  secrets?: Record<string, string>;
};

export interface RemoteEntry {
  key: string;
  name: string;
  size?: number;
  lastModified?: string;
  isDir: boolean;
  contentType?: string;
}

export interface ListResult {
  items: RemoteEntry[];
  cursor?: string;
  prefix: string;
}

/** Subset of the SDK's adapter capabilities the renderer reacts to. */
export interface SourceCapabilities {
  /** `true` when `url()` can mint a shareable/signed link for this source. */
  signedUrl: boolean;
  /** `true` when the adapter copies server-side without re-transferring bytes. */
  serverSideCopy: boolean;
}

export interface TransferProgress {
  id: string;
  direction: "upload" | "download" | "copy" | "move" | "delete";
  source: { connectionId: string; key: string };
  destination?: { connectionId: string; key: string };
  bytesDone: number;
  bytesTotal: number;
  status: "queued" | "active" | "done" | "error";
  error?: string;
  startedAt: number;
  finishedAt?: number;
}

export interface AdapterDescriptor {
  kind: AdapterKind;
  label: string;
  category: "Local" | "Object" | "Cloud" | "Edge";
  fields: AdapterField[];
}

export interface AdapterField {
  name: string;
  label: string;
  type: "text" | "password" | "number" | "boolean" | "textarea";
  required?: boolean;
  placeholder?: string;
  hint?: string;
  isSecret?: boolean;
  default?: string | number | boolean;
}

/**
 * Standard field set for the S3-compatible object stores. They all share the
 * same shape: a bucket, a region that drives the endpoint, and a top-level
 * access-key pair. `endpoint` is offered as an optional override for the
 * providers whose default host can vary.
 */
function s3Fields(opts?: {
  regionRequired?: boolean;
  regionPlaceholder?: string;
  endpointHint?: string;
  bucketLabel?: string;
}): AdapterField[] {
  return [
    { name: "bucket", label: opts?.bucketLabel ?? "Bucket", type: "text", required: true },
    {
      name: "region",
      label: "Region",
      type: "text",
      required: opts?.regionRequired ?? true,
      placeholder: opts?.regionPlaceholder,
    },
    { name: "accessKeyId", label: "Access Key ID", type: "text", required: true, isSecret: true },
    {
      name: "secretAccessKey",
      label: "Secret Access Key",
      type: "password",
      required: true,
      isSecret: true,
    },
    {
      name: "endpoint",
      label: "Endpoint (optional)",
      type: "text",
      hint: opts?.endpointHint,
    },
  ];
}

export const ADAPTERS: AdapterDescriptor[] = [
  {
    kind: "fs",
    label: "Local Filesystem",
    category: "Local",
    fields: [
      {
        name: "root",
        label: "Root path",
        type: "text",
        required: true,
        placeholder: "/Users/me/Documents",
      },
    ],
  },
  {
    kind: "s3",
    label: "Amazon S3",
    category: "Object",
    fields: [
      { name: "bucket", label: "Bucket", type: "text", required: true },
      { name: "region", label: "Region", type: "text", required: true, placeholder: "us-east-1" },
      { name: "accessKeyId", label: "Access Key ID", type: "text", isSecret: true },
      { name: "secretAccessKey", label: "Secret Access Key", type: "password", isSecret: true },
      { name: "endpoint", label: "Endpoint (optional)", type: "text" },
    ],
  },
  {
    kind: "r2",
    label: "Cloudflare R2",
    category: "Object",
    fields: [
      { name: "bucket", label: "Bucket", type: "text", required: true },
      { name: "accountId", label: "Account ID", type: "text", required: true },
      { name: "accessKeyId", label: "Access Key ID", type: "text", isSecret: true },
      { name: "secretAccessKey", label: "Secret Access Key", type: "password", isSecret: true },
    ],
  },
  {
    kind: "minio",
    label: "MinIO",
    category: "Object",
    fields: [
      { name: "bucket", label: "Bucket", type: "text", required: true },
      {
        name: "endpoint",
        label: "Endpoint",
        type: "text",
        required: true,
        placeholder: "https://minio.example.com",
      },
      { name: "accessKeyId", label: "Access Key ID", type: "text", required: true, isSecret: true },
      {
        name: "secretAccessKey",
        label: "Secret Access Key",
        type: "password",
        required: true,
        isSecret: true,
      },
      { name: "region", label: "Region", type: "text", placeholder: "us-east-1" },
    ],
  },
  {
    kind: "digitalocean-spaces",
    label: "DigitalOcean Spaces",
    category: "Object",
    fields: [
      { name: "bucket", label: "Space name", type: "text", required: true },
      { name: "region", label: "Region", type: "text", required: true, placeholder: "nyc3" },
      { name: "accessKeyId", label: "Access Key ID", type: "text", required: true, isSecret: true },
      {
        name: "secretAccessKey",
        label: "Secret Access Key",
        type: "password",
        required: true,
        isSecret: true,
      },
    ],
  },
  {
    kind: "gcs",
    label: "Google Cloud Storage",
    category: "Cloud",
    fields: [
      { name: "bucket", label: "Bucket", type: "text", required: true },
      { name: "projectId", label: "Project ID", type: "text" },
      {
        name: "credentialsJson",
        label: "Service Account JSON",
        type: "textarea",
        isSecret: true,
        hint: "Paste full JSON. Leave empty to use ADC.",
      },
    ],
  },
  {
    kind: "azure",
    label: "Azure Blob Storage",
    category: "Cloud",
    fields: [
      { name: "container", label: "Container", type: "text", required: true },
      {
        name: "connectionString",
        label: "Connection String",
        type: "password",
        isSecret: true,
      },
      { name: "accountName", label: "Account Name", type: "text" },
      { name: "accountKey", label: "Account Key", type: "password", isSecret: true },
    ],
  },
  {
    kind: "vercel-blob",
    label: "Vercel Blob",
    category: "Edge",
    fields: [
      {
        name: "BLOB_READ_WRITE_TOKEN",
        label: "Read/Write Token",
        type: "password",
        required: true,
        isSecret: true,
      },
    ],
  },
  {
    kind: "netlify-blobs",
    label: "Netlify Blobs",
    category: "Edge",
    fields: [
      { name: "name", label: "Store Name", type: "text", required: true },
      { name: "siteID", label: "Site ID", type: "text" },
      { name: "token", label: "Token", type: "password", isSecret: true },
    ],
  },
  {
    kind: "supabase",
    label: "Supabase Storage",
    category: "Cloud",
    fields: [
      { name: "bucket", label: "Bucket", type: "text", required: true },
      {
        name: "url",
        label: "Project URL",
        type: "text",
        required: true,
        placeholder: "https://xxxxx.supabase.co",
      },
      {
        name: "key",
        label: "API Key",
        type: "password",
        required: true,
        isSecret: true,
        hint: "Use the service_role key for read/write. The anon key requires RLS policies and a logged-in session — it will fail on upload otherwise.",
      },
    ],
  },
  {
    kind: "dropbox",
    label: "Dropbox",
    category: "Cloud",
    fields: [
      { name: "accessToken", label: "Access Token", type: "password", isSecret: true },
      { name: "refreshToken", label: "Refresh Token", type: "password", isSecret: true },
      { name: "appKey", label: "App Key", type: "text" },
      { name: "appSecret", label: "App Secret", type: "password", isSecret: true },
      { name: "rootFolderPath", label: "Root Folder Path", type: "text", placeholder: "/" },
    ],
  },
  {
    kind: "onedrive",
    label: "OneDrive",
    category: "Cloud",
    fields: [
      { name: "accessToken", label: "Access Token", type: "password", isSecret: true },
      { name: "driveId", label: "Drive ID (optional)", type: "text" },
      { name: "rootFolderPath", label: "Root Folder Path", type: "text", placeholder: "/" },
    ],
  },
  {
    kind: "google-drive",
    label: "Google Drive",
    category: "Cloud",
    fields: [
      {
        name: "credentialsJson",
        label: "Service Account JSON",
        type: "textarea",
        isSecret: true,
        hint: "Paste service-account JSON or leave empty if using OAuth elsewhere.",
      },
      { name: "subject", label: "Impersonated User (optional)", type: "text" },
      { name: "rootFolderId", label: "Root Folder ID", type: "text" },
    ],
  },
  {
    kind: "box",
    label: "Box",
    category: "Cloud",
    fields: [
      { name: "developerToken", label: "Developer Token", type: "password", isSecret: true },
      { name: "rootFolderId", label: "Root Folder ID", type: "text", placeholder: "0" },
    ],
  },
  {
    kind: "uploadthing",
    label: "UploadThing",
    category: "Edge",
    fields: [
      {
        name: "token",
        label: "Token",
        type: "password",
        required: true,
        isSecret: true,
      },
    ],
  },
  {
    kind: "storj",
    label: "Storj",
    category: "Object",
    fields: [
      { name: "bucket", label: "Bucket", type: "text", required: true },
      { name: "accessKeyId", label: "Access Key ID", type: "text", required: true, isSecret: true },
      {
        name: "secretAccessKey",
        label: "Secret Access Key",
        type: "password",
        required: true,
        isSecret: true,
      },
      { name: "endpoint", label: "Endpoint (optional)", type: "text" },
    ],
  },
  {
    kind: "hetzner",
    label: "Hetzner Object Storage",
    category: "Object",
    fields: [
      { name: "bucket", label: "Bucket", type: "text", required: true },
      { name: "region", label: "Region", type: "text", required: true, placeholder: "fsn1" },
      { name: "accessKeyId", label: "Access Key ID", type: "text", required: true, isSecret: true },
      {
        name: "secretAccessKey",
        label: "Secret Access Key",
        type: "password",
        required: true,
        isSecret: true,
      },
    ],
  },
  {
    kind: "akamai",
    label: "Akamai NetStorage",
    category: "Object",
    fields: [
      { name: "bucket", label: "Bucket", type: "text", required: true },
      { name: "region", label: "Region", type: "text", required: true },
      { name: "accessKeyId", label: "Access Key ID", type: "text", required: true, isSecret: true },
      {
        name: "secretAccessKey",
        label: "Secret Access Key",
        type: "password",
        required: true,
        isSecret: true,
      },
    ],
  },
  {
    kind: "backblaze-b2",
    label: "Backblaze B2",
    category: "Object",
    fields: s3Fields({ regionPlaceholder: "us-west-004" }),
  },
  {
    kind: "wasabi",
    label: "Wasabi",
    category: "Object",
    fields: s3Fields({ regionPlaceholder: "us-east-1" }),
  },
  {
    kind: "tigris",
    label: "Tigris",
    category: "Object",
    fields: s3Fields({
      regionRequired: false,
      regionPlaceholder: "auto",
      endpointHint: "Defaults to https://fly.storage.tigris.dev",
    }),
  },
  {
    kind: "scaleway",
    label: "Scaleway",
    category: "Object",
    fields: s3Fields({ regionPlaceholder: "fr-par" }),
  },
  {
    kind: "vultr",
    label: "Vultr Object Storage",
    category: "Object",
    fields: s3Fields({ regionPlaceholder: "ewr" }),
  },
  {
    kind: "ovhcloud",
    label: "OVHcloud",
    category: "Object",
    fields: s3Fields({ regionPlaceholder: "gra" }),
  },
  {
    kind: "idrive-e2",
    label: "IDrive e2",
    category: "Object",
    fields: s3Fields({
      regionPlaceholder: "us-west-1",
      endpointHint: "Your region endpoint, e.g. https://q9o2.la.idrivee2-optional.com",
    }),
  },
  {
    kind: "filebase",
    label: "Filebase",
    category: "Object",
    fields: s3Fields({
      regionPlaceholder: "us-east-1",
      endpointHint: "Defaults to https://s3.filebase.com",
    }),
  },
  {
    kind: "exoscale",
    label: "Exoscale",
    category: "Object",
    fields: s3Fields({ regionPlaceholder: "ch-gva-2" }),
  },
  {
    kind: "oracle-cloud",
    label: "Oracle Cloud (OCI)",
    category: "Object",
    fields: s3Fields({
      regionPlaceholder: "us-ashburn-1",
      endpointHint: "https://<namespace>.compat.objectstorage.<region>.oraclecloud.com",
    }),
  },
  {
    kind: "ibm-cos",
    label: "IBM Cloud Object Storage",
    category: "Object",
    fields: s3Fields({
      regionPlaceholder: "us-south",
      endpointHint: "e.g. https://s3.us-south.cloud-object-storage.appdomain.cloud",
    }),
  },
  {
    kind: "tencent",
    label: "Tencent COS",
    category: "Object",
    fields: s3Fields({ regionPlaceholder: "ap-guangzhou" }),
  },
  {
    kind: "alibaba",
    label: "Alibaba OSS",
    category: "Object",
    fields: s3Fields({ regionPlaceholder: "oss-cn-hangzhou" }),
  },
  {
    kind: "yandex",
    label: "Yandex Object Storage",
    category: "Object",
    fields: s3Fields({ regionPlaceholder: "ru-central1" }),
  },
];

export const SECRET_FIELDS: Record<AdapterKind, string[]> = ADAPTERS.reduce(
  (acc, a) => {
    acc[a.kind] = a.fields.filter((f) => f.isSecret).map((f) => f.name);
    return acc;
  },
  {} as Record<AdapterKind, string[]>,
);
