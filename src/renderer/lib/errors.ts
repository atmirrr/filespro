/**
 * Returns true when a load error means "this source needs to be configured /
 * credentials are missing or wrong" — the renderer can then swap a generic
 * red error UI for a setup CTA.
 */
export function isSetupError(raw: string | null | undefined): boolean {
  if (!raw) return false;
  const m = raw.toLowerCase();
  return (
    m.includes("missing credentials") ||
    m.includes("no credentials") ||
    m.includes("could not load credentials") ||
    m.includes("missing apikey") ||
    m.includes("missing api key") ||
    m.includes("invalid api key") ||
    m.includes("invalid apikey") ||
    m.includes("credentials are required") ||
    m.includes("signature does not match") ||
    m.includes("signaturedoesnotmatch") ||
    m.includes("row-level security") ||
    m.includes("row level security") ||
    m.includes("root path is required") ||
    /pass\s+`?accesskeyid/i.test(raw) ||
    /pass\s+`?accountid/i.test(raw)
  );
}

/**
 * Map low-level/adapter errors to actionable user-facing messages.
 * Falls through to the original message when nothing matches.
 */
export function friendlyError(e: unknown): string {
  const raw = e instanceof Error ? e.message : String(e ?? "Unknown error");
  const m = raw.toLowerCase();

  // Supabase RLS
  if (m.includes("row-level security") || m.includes("row level security")) {
    return (
      "Supabase blocked this operation. The bucket has Row Level Security enabled. " +
      "Use the service_role key (Project Settings → API) for read/write, or add an RLS policy that allows your role to INSERT/UPDATE on storage.objects."
    );
  }
  if (m.includes("bucket not found")) {
    return "Bucket not found. Check the bucket name and that the API key has access to it.";
  }
  if (m.includes("invalid api key") || m.includes("invalid_api_key")) {
    return "Invalid API key. Double-check the key you pasted and that it has not been revoked.";
  }

  // S3 family
  if (m.includes("access denied") || m.includes("accessdenied")) {
    return "Access denied by the storage provider. The credentials are valid but lack permission for this operation (likely a missing IAM/bucket policy).";
  }
  if (m.includes("nosuchbucket")) {
    return "That bucket does not exist in the selected region.";
  }
  if (m.includes("signature does not match") || m.includes("signaturedoesnotmatch")) {
    return "Signature mismatch — the secret access key is incorrect.";
  }
  if (m.includes("could not load credentials")) {
    return "No credentials configured for this source.";
  }

  // macOS Files & Folders permissions
  if (m.includes("eperm") && m.includes("scandir")) {
    return (
      "macOS blocked access to that folder. Open System Settings → Privacy & Security → Files & Folders and grant access, or use a different root path."
    );
  }
  if (m.includes("enoent")) {
    return "File or folder not found.";
  }
  if (m.includes("eacces")) {
    return "Permission denied by the filesystem.";
  }

  // Network
  if (m.includes("enotfound") || m.includes("fetch failed")) {
    return "Network unreachable. Check your internet connection and the endpoint URL.";
  }
  if (m.includes("etimedout") || m.includes("timed out")) {
    return "The request timed out. The provider may be slow or unreachable.";
  }

  return raw;
}
