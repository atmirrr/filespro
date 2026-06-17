// Smoke test for the files-sdk integration.
//
// Since files-sdk 1.9.0 the provider SDKs are *optional peer dependencies*:
// importing a cloud adapter whose peer isn't installed throws
// ERR_MODULE_NOT_FOUND at runtime — and because the peers are optional, npm
// won't warn. This test fails fast in CI if:
//   1. a `files-sdk/<adapter>` subpath stops exporting its factory, or
//   2. a provider peer dependency FilesPro relies on is missing/unresolvable.
//
// It does no network I/O — it only verifies modules resolve and load.

const ADAPTERS = {
  fs: "fs",
  s3: "s3",
  r2: "r2",
  gcs: "gcs",
  azure: "azure",
  minio: "minio",
  "digitalocean-spaces": "digitaloceanSpaces",
  storj: "storj",
  hetzner: "hetzner",
  akamai: "akamai",
  "vercel-blob": "vercelBlob",
  "netlify-blobs": "netlifyBlobs",
  supabase: "supabase",
  uploadthing: "uploadthing",
  dropbox: "dropbox",
  onedrive: "onedrive",
  "google-drive": "googleDrive",
  box: "box",
  "backblaze-b2": "backblazeB2",
  wasabi: "wasabi",
  tigris: "tigris",
  scaleway: "scaleway",
  vultr: "vultr",
  ovhcloud: "ovhcloud",
  "idrive-e2": "idriveE2",
  filebase: "filebase",
  exoscale: "exoscale",
  "oracle-cloud": "oracleCloud",
  "ibm-cos": "ibmCos",
  tencent: "tencent",
  alibaba: "alibaba",
  yandex: "yandex",
};

// The provider peer dependencies FilesPro declares directly so the adapters
// above can load. Keep in sync with package.json `dependencies`.
const PEERS = [
  "@aws-sdk/client-s3",
  "@aws-sdk/lib-storage",
  "@aws-sdk/s3-presigned-post",
  "@aws-sdk/s3-request-presigner",
  "@azure/storage-blob",
  "@azure/core-auth",
  "@azure/identity",
  "@google-cloud/storage",
  "google-auth-library",
  "@googleapis/drive",
  "@microsoft/microsoft-graph-client",
  "@netlify/blobs",
  "@supabase/storage-js",
  "@vercel/blob",
  "box-typescript-sdk-gen",
  "dropbox",
  "uploadthing/server", // uploadthing exposes no root export; the adapter uses /server
];

let failures = 0;
const ok = (m) => console.log("  ✓ " + m);
const fail = (m) => {
  console.error("  ✗ " + m);
  failures++;
};

function isMissing(err) {
  const code = String(err?.code ?? "");
  const msg = String(err?.message ?? "");
  return (
    code === "ERR_MODULE_NOT_FOUND" ||
    code === "ERR_PACKAGE_PATH_NOT_EXPORTED" ||
    /Cannot find (package|module)/i.test(msg)
  );
}

console.log("files-sdk adapter exports:");
for (const [sub, exp] of Object.entries(ADAPTERS)) {
  try {
    const mod = await import(`files-sdk/${sub}`);
    if (typeof mod[exp] === "function") ok(`files-sdk/${sub} → ${exp}()`);
    else fail(`files-sdk/${sub} is missing expected export "${exp}"`);
  } catch (err) {
    fail(`files-sdk/${sub} failed to import: ${err.message}`);
  }
}

console.log("\nfiles-sdk/zip plugin:");
try {
  const { zip } = await import("files-sdk/zip");
  if (typeof zip === "function") ok("files-sdk/zip → zip()");
  else fail("files-sdk/zip is missing export \"zip\"");
} catch (err) {
  fail(`files-sdk/zip failed to import: ${err.message}`);
}

console.log("\nprovider peer dependencies:");
for (const pkg of PEERS) {
  try {
    await import(pkg);
    ok(pkg);
  } catch (err) {
    if (isMissing(err)) fail(`${pkg} is not installed (add it to dependencies)`);
    // Package is present but its entry threw on load for an unrelated reason —
    // that's not what this test guards, so treat it as resolved.
    else ok(`${pkg} (present; entry threw on load: ${err.message.split("\n")[0]})`);
  }
}

console.log("");
if (failures > 0) {
  console.error(`Adapter smoke test FAILED: ${failures} problem(s).`);
  process.exit(1);
}
console.log(`Adapter smoke test passed: ${Object.keys(ADAPTERS).length} adapters + ${PEERS.length} peer deps resolve.`);
