import React, { useEffect, useMemo, useRef, useState } from "react";
import { ADAPTERS, ConnectionConfig, RemoteEntry } from "@shared/types";
import { Plus, Pencil, Trash, Search, FileIcon, FolderClosed } from "../lib/icons";
import { BrandTile, BrandChipInline } from "../lib/BrandLogo";

interface Props {
  connections: ConnectionConfig[];
  onOpen: (id: string, prefix?: string) => void;
  onNew: () => void;
  onEdit: (c: ConnectionConfig) => void;
  onDelete: (c: ConnectionConfig) => void;
}

function adapterMeta(kind: string) {
  return ADAPTERS.find((a) => a.kind === kind);
}

type Status = "checking" | "ok" | "error";

function useConnectionStatuses(connections: ConnectionConfig[]) {
  const [statuses, setStatuses] = useState<Record<string, Status>>({});
  useEffect(() => {
    let cancelled = false;
    const next: Record<string, Status> = {};
    connections.forEach((c) => {
      // Demo / screenshot connections — surface as connected without an IPC test.
      const opts = c.options as Record<string, unknown> | undefined;
      if (opts && opts._demo === true) {
        next[c.id] = "ok";
        return;
      }
      next[c.id] = "checking";
    });
    setStatuses(next);

    // Run all tests in parallel — each result updates its own dot independently.
    connections.forEach((c) => {
      const opts = c.options as Record<string, unknown> | undefined;
      if (opts && opts._demo === true) return; // already marked ok
      (async () => {
        try {
          const r = await window.api.connections.test(c);
          if (cancelled) return;
          setStatuses((cur) => ({ ...cur, [c.id]: r.ok ? "ok" : "error" }));
        } catch {
          if (cancelled) return;
          setStatuses((cur) => ({ ...cur, [c.id]: "error" }));
        }
      })();
    });

    return () => {
      cancelled = true;
    };
  }, [connections]);

  return statuses;
}

function StatusDot({ status }: { status: Status | undefined }) {
  const bg =
    status === "ok"
      ? "#10B981"
      : status === "error"
        ? "#EF4444"
        : "#D1D5DB";
  const title =
    status === "ok" ? "Connected" : status === "error" ? "Cannot reach source" : "Checking…";
  return (
    <span
      className={`block shrink-0 rounded-full ${status === undefined || status === "checking" ? "animate-pulse" : ""}`}
      style={{
        height: 12,
        width: 12,
        background: bg,
        border: "2px solid #FFFFFF",
        boxShadow: "0 1px 2px rgba(0,0,0,0.15)",
      }}
      title={title}
    />
  );
}

interface CrossSearchHit {
  connection: ConnectionConfig;
  entry: RemoteEntry;
}

export function HomeView({ connections, onOpen, onNew, onEdit, onDelete }: Props) {
  const grouped = useMemo(() => {
    const groups: Record<string, ConnectionConfig[]> = {};
    for (const c of connections) {
      const cat = adapterMeta(c.kind)?.category ?? "Local";
      (groups[cat] ??= []).push(c);
    }
    return groups;
  }, [connections]);

  const statuses = useConnectionStatuses(connections);

  const order: Array<{ key: string; title: string }> = [
    { key: "Local", title: "On My Mac" },
    { key: "Cloud", title: "Cloud Services" },
    { key: "Object", title: "Object Storage" },
    { key: "Edge", title: "Edge Storage" },
  ];

  // --- Cross-source search ---
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<CrossSearchHit[]>([]);
  const [searching, setSearching] = useState(false);
  const debounceRef = useRef<number | null>(null);

  useEffect(() => {
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    if (!query.trim()) {
      setHits([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    debounceRef.current = window.setTimeout(async () => {
      const q = query.toLowerCase();
      const out: CrossSearchHit[] = [];
      // Issue list(prefix="") in parallel for each connection
      const results = await Promise.allSettled(
        connections.map((c) => window.api.fs.list(c.id, "")),
      );
      results.forEach((r, i) => {
        if (r.status !== "fulfilled") return;
        const conn = connections[i];
        for (const it of r.value.items) {
          if (it.name.startsWith(".")) continue;
          if (it.name.toLowerCase().includes(q)) {
            out.push({ connection: conn, entry: it });
            if (out.length >= 60) break;
          }
        }
      });
      setHits(out);
      setSearching(false);
    }, 220);
    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  }, [query, connections]);

  return (
    <div className="h-full flex flex-col bg-bg-base">
      <div className="drag-region h-[44px] flex items-center px-4 border-b border-border-subtle">
        <span className="text-[13px] font-semibold text-text-primary pl-[68px]">All Sources</span>
        <div className="flex-1 mx-4 max-w-md ml-auto no-drag relative">
          <Search
            size={12}
            className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none"
          />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search across all sources"
            className="w-full bg-black/[0.05] border-0 rounded-md pl-7 pr-2 py-1.5 text-[12px] placeholder:text-text-muted"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-8 py-7">
        {query.trim() ? (
          <SearchResults
            query={query}
            hits={hits}
            loading={searching}
            onOpen={(h) => onOpen(h.connection.id, h.entry.isDir ? h.entry.key : "")}
          />
        ) : connections.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="h-16 w-16 rounded-2xl bg-bg-hover flex items-center justify-center mb-4">
              <Plus size={28} className="text-text-muted" />
            </div>
            <div className="text-[15px] font-medium text-text-primary">No sources yet</div>
            <div className="text-[13px] text-text-secondary mt-1 max-w-sm">
              Add a local folder, an S3 bucket, Google Drive, or any of 30+ supported storage services.
            </div>
            <button
              onClick={onNew}
              className="mt-5 px-4 py-2 rounded-md bg-accent hover:bg-accent-hover text-white text-[13px] font-medium"
            >
              Add your first source
            </button>
          </div>
        ) : (
          <>
            {order.map(({ key, title }) => {
              const items = grouped[key] ?? [];
              if (items.length === 0) return null;
              return (
                <section key={key} className="mb-8 last:mb-0">
                  <h2 className="text-[11px] uppercase tracking-wider text-text-muted font-semibold mb-3 px-1">
                    {title}
                  </h2>
                  <div className="grid grid-cols-[repeat(auto-fill,minmax(170px,1fr))] gap-4">
                    {items.map((c) => (
                      <Tile
                        key={c.id}
                        connection={c}
                        status={statuses[c.id]}
                        onOpen={() => onOpen(c.id)}
                        onEdit={() => onEdit(c)}
                        onDelete={() => onDelete(c)}
                      />
                    ))}
                  </div>
                </section>
              );
            })}
            <section>
              <h2 className="text-[11px] uppercase tracking-wider text-text-muted font-semibold mb-3 px-1">
                Manage
              </h2>
              <div className="grid grid-cols-[repeat(auto-fill,minmax(170px,1fr))] gap-4">
                <button
                  onClick={onNew}
                  className="group p-4 rounded-xl border-2 border-dashed border-border-default hover:border-accent hover:bg-accent/5 text-left transition-colors flex flex-col items-center justify-center gap-2 h-[136px]"
                >
                  <div className="h-14 w-14 rounded-2xl bg-bg-hover group-hover:bg-accent/15 flex items-center justify-center">
                    <Plus size={26} className="text-text-secondary group-hover:text-accent" />
                  </div>
                  <span className="text-[13px] font-medium text-text-secondary group-hover:text-accent">
                    Add Source
                  </span>
                </button>
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  );
}

function Tile({
  connection,
  status,
  onOpen,
  onEdit,
  onDelete,
}: {
  connection: ConnectionConfig;
  status?: Status;
  onOpen: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const meta = adapterMeta(connection.kind);
  return (
    <div
      onDoubleClick={onOpen}
      onClick={onOpen}
      className="group relative p-4 rounded-xl bg-bg-base border border-border-subtle hover:border-accent/40 hover:shadow-md transition-all cursor-default flex flex-col items-center text-center h-[136px]"
    >
      <div className="relative">
        <BrandTile kind={connection.kind} />
        <span className="absolute" style={{ right: -4, bottom: -4 }}>
          <StatusDot status={status} />
        </span>
      </div>
      <div className="mt-3 text-[13px] font-semibold text-text-primary truncate w-full">
        {connection.name || "Untitled"}
      </div>
      <div className="text-[11px] text-text-muted truncate w-full">
        {meta?.label ?? connection.kind}
      </div>

      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 flex items-center gap-0.5 bg-bg-base/90 backdrop-blur rounded-md p-0.5 shadow-sm border border-border-subtle">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onEdit();
          }}
          className="p-1 rounded text-text-secondary hover:text-text-primary hover:bg-bg-hover"
          title="Edit"
        >
          <Pencil size={11} />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="p-1 rounded text-text-secondary hover:text-red-600 hover:bg-red-50"
          title="Remove"
        >
          <Trash size={11} />
        </button>
      </div>
    </div>
  );
}

function SearchResults({
  query,
  hits,
  loading,
  onOpen,
}: {
  query: string;
  hits: CrossSearchHit[];
  loading: boolean;
  onOpen: (h: CrossSearchHit) => void;
}) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wider text-text-muted font-semibold mb-3 px-1">
        {loading
          ? "Searching…"
          : hits.length === 0
            ? `No results for “${query}”`
            : `${hits.length} result${hits.length === 1 ? "" : "s"}`}
      </div>
      <div className="space-y-1">
        {hits.map((h, i) => (
          <button
            key={`${h.connection.id}-${h.entry.key}-${i}`}
            onClick={() => onOpen(h)}
            className="w-full text-left flex items-center gap-3 px-3 py-2 rounded-md hover:bg-bg-hover"
          >
            {h.entry.isDir ? (
              <FolderClosed size={16} className="text-[#3478F6] shrink-0" />
            ) : (
              <FileIcon size={16} className="text-text-secondary shrink-0" />
            )}
            <div className="flex-1 min-w-0">
              <div className="text-[13px] text-text-primary truncate">{h.entry.name}</div>
              <div className="text-[11px] text-text-muted truncate flex items-center gap-1.5">
                <BrandChipInline kind={h.connection.kind} size={12} />
                <span>{h.connection.name}</span>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
