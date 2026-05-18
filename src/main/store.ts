import { app, safeStorage } from "electron";
import { promises as fs } from "node:fs";
import path from "node:path";
import type { ConnectionConfig } from "../shared/types.js";
import { SECRET_FIELDS } from "../shared/types.js";

const FILE_NAME = "connections.json";

interface StoredConnection extends Omit<ConnectionConfig, "secrets"> {
  secretsEncrypted?: string;
}

function storePath() {
  return path.join(app.getPath("userData"), FILE_NAME);
}

async function readRaw(): Promise<StoredConnection[]> {
  try {
    const buf = await fs.readFile(storePath(), "utf8");
    const parsed = JSON.parse(buf) as StoredConnection[];
    return Array.isArray(parsed) ? parsed : [];
  } catch (e: unknown) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw e;
  }
}

async function writeRaw(items: StoredConnection[]) {
  const target = storePath();
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.writeFile(target, JSON.stringify(items, null, 2), "utf8");
}

function encryptSecrets(secrets: Record<string, string> | undefined): string | undefined {
  if (!secrets || Object.keys(secrets).length === 0) return undefined;
  if (!safeStorage.isEncryptionAvailable()) {
    return Buffer.from(JSON.stringify(secrets), "utf8").toString("base64");
  }
  return safeStorage.encryptString(JSON.stringify(secrets)).toString("base64");
}

function decryptSecrets(blob: string | undefined): Record<string, string> | undefined {
  if (!blob) return undefined;
  try {
    if (!safeStorage.isEncryptionAvailable()) {
      return JSON.parse(Buffer.from(blob, "base64").toString("utf8")) as Record<string, string>;
    }
    const buf = Buffer.from(blob, "base64");
    return JSON.parse(safeStorage.decryptString(buf)) as Record<string, string>;
  } catch {
    return undefined;
  }
}

function splitSecrets(config: ConnectionConfig): {
  options: Record<string, unknown>;
  secrets: Record<string, string>;
} {
  const secretKeys = new Set(SECRET_FIELDS[config.kind] ?? []);
  const options: Record<string, unknown> = {};
  const secrets: Record<string, string> = { ...(config.secrets ?? {}) };
  for (const [k, v] of Object.entries(config.options ?? {})) {
    if (secretKeys.has(k) && typeof v === "string" && v.length > 0) {
      secrets[k] = v;
    } else {
      options[k] = v;
    }
  }
  return { options, secrets };
}

export async function listConnections(): Promise<ConnectionConfig[]> {
  const items = await readRaw();
  return items.map((it) => ({
    id: it.id,
    name: it.name,
    kind: it.kind,
    createdAt: it.createdAt,
    options: it.options,
    secrets: decryptSecrets(it.secretsEncrypted),
  }));
}

export async function getConnection(id: string): Promise<ConnectionConfig | null> {
  const all = await listConnections();
  return all.find((c) => c.id === id) ?? null;
}

export async function saveConnection(config: ConnectionConfig): Promise<ConnectionConfig> {
  const items = await readRaw();
  const { options, secrets } = splitSecrets(config);
  const stored: StoredConnection = {
    id: config.id,
    name: config.name,
    kind: config.kind,
    createdAt: config.createdAt || Date.now(),
    options,
    secretsEncrypted: encryptSecrets(secrets),
  };
  const idx = items.findIndex((it) => it.id === stored.id);
  if (idx >= 0) items[idx] = stored;
  else items.push(stored);
  await writeRaw(items);
  return {
    id: stored.id,
    name: stored.name,
    kind: stored.kind,
    createdAt: stored.createdAt,
    options: stored.options,
    secrets,
  };
}

export async function deleteConnection(id: string): Promise<void> {
  const items = await readRaw();
  await writeRaw(items.filter((it) => it.id !== id));
}
