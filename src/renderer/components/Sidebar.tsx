import React, { useEffect, useMemo, useState } from "react";
import { ADAPTERS, ConnectionConfig } from "@shared/types";
import { Plus, Pencil, Trash, Home } from "../lib/icons";
import { BrandChipInline } from "../lib/BrandLogo";

interface Props {
  connections: ConnectionConfig[];
  activeId: string | null;
  onSelect: (id: string | null) => void;
  onNew: () => void;
  onEdit: (c: ConnectionConfig) => void;
  onDelete: (c: ConnectionConfig) => void;
  onDropOnSource: (
    target: ConnectionConfig,
    payload: { sourceConnectionId: string; keys: string[] },
    action: "copy" | "move",
  ) => void;
}

function adapterMeta(kind: string) {
  return ADAPTERS.find((a) => a.kind === kind);
}

function categoryLabel(cat: string): string {
  switch (cat) {
    case "Local":
      return "Favorites";
    case "Object":
      return "Object Storage";
    case "Cloud":
      return "Cloud";
    case "Edge":
      return "Edge";
    default:
      return cat;
  }
}

function SourceIcon({ kind }: { kind: string; active: boolean }) {
  return <BrandChipInline kind={kind} size={16} />;
}

export function Sidebar({
  connections,
  activeId,
  onSelect,
  onNew,
  onEdit,
  onDelete,
  onDropOnSource,
}: Props) {
  const [dropTarget, setDropTarget] = React.useState<string | null>(null);
  const [version, setVersion] = useState<string>("");
  useEffect(() => {
    window.api.app
      .version()
      .then(setVersion)
      .catch(() => setVersion(""));
  }, []);
  const grouped = useMemo(() => {
    const groups: Record<string, ConnectionConfig[]> = {};
    for (const c of connections) {
      const cat = adapterMeta(c.kind)?.category ?? "Local";
      (groups[cat] ??= []).push(c);
    }
    return groups;
  }, [connections]);

  const order = ["Local", "Cloud", "Object", "Edge"];

  return (
    <aside className="w-[230px] sidebar-vibrancy flex flex-col select-none">
      {/* drag area, leaves space for traffic lights */}
      <div className="drag-region h-[44px] flex items-end pb-1 px-3">
        <span className="text-[11px] uppercase tracking-[0.08em] text-text-muted no-drag font-medium pl-[68px]">
          FilesPro
        </span>
      </div>

      <div className="flex-1 overflow-y-auto px-2 pt-1 pb-3 space-y-3">
        <div className="space-y-0.5">
          <div
            onClick={() => onSelect(null)}
            className={`group flex items-center gap-2 px-2 py-1 rounded-md cursor-default ${
              activeId === null
                ? "sidebar-item-active"
                : "hover:bg-bg-hover text-text-primary"
            }`}
          >
            <Home size={15} className={activeId === null ? "text-white" : "text-text-secondary"} />
            <span className="flex-1 truncate text-[13px] font-medium leading-tight">All Sources</span>
          </div>
        </div>

        {connections.length === 0 ? (
          <div className="px-3 py-6 text-xs text-text-muted">
            No sources yet. Click + below to add a source.
          </div>
        ) : null}

        {order.map((cat) => {
          const items = grouped[cat] ?? [];
          if (items.length === 0) return null;
          return (
            <div key={cat}>
              <div className="px-2 py-1 text-[11px] uppercase tracking-wider text-text-muted font-semibold">
                {categoryLabel(cat)}
              </div>
              <div className="space-y-0.5">
                {items.map((c) => {
                  const active = activeId === c.id;
                  return (
                    <div
                      key={c.id}
                      onClick={() => onSelect(c.id)}
                      onDragOver={(e) => {
                        const types = Array.from(e.dataTransfer.types);
                        if (!types.includes("application/x-files-manager")) return;
                        e.preventDefault();
                        e.dataTransfer.dropEffect = e.altKey ? "move" : "copy";
                        setDropTarget(c.id);
                      }}
                      onDragLeave={() => {
                        setDropTarget((t) => (t === c.id ? null : t));
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        setDropTarget(null);
                        const raw = e.dataTransfer.getData("application/x-files-manager");
                        if (!raw) return;
                        try {
                          const payload = JSON.parse(raw) as {
                            sourceConnectionId: string;
                            keys: string[];
                          };
                          if (payload.sourceConnectionId === c.id) return;
                          onDropOnSource(c, payload, e.altKey ? "move" : "copy");
                        } catch {
                          /* ignore malformed payload */
                        }
                      }}
                      className={`group flex items-center gap-2 px-2 py-1 rounded-md cursor-default ${
                        dropTarget === c.id
                          ? "ring-2 ring-accent bg-accent/10 text-text-primary"
                          : active
                            ? "sidebar-item-active"
                            : "hover:bg-bg-hover text-text-primary"
                      }`}
                    >
                      <SourceIcon kind={c.kind} active={active} />
                      <span className="flex-1 truncate text-[13px] font-medium leading-tight">
                        {c.name || "Untitled"}
                      </span>
                      <div className="opacity-0 group-hover:opacity-100 flex items-center gap-0.5">
                        <button
                          className={`p-1 rounded ${
                            active ? "hover:bg-white/20 text-white" : "hover:bg-black/5 text-text-secondary"
                          }`}
                          title="Edit"
                          onClick={(e) => {
                            e.stopPropagation();
                            onEdit(c);
                          }}
                        >
                          <Pencil size={11} />
                        </button>
                        <button
                          className={`p-1 rounded ${
                            active ? "hover:bg-white/20 text-white" : "hover:bg-black/5 text-text-secondary hover:text-red-500"
                          }`}
                          title="Remove"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDelete(c);
                          }}
                        >
                          <Trash size={11} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <div className="px-2 py-2 border-t border-black/5 flex items-center gap-1">
        <button
          onClick={onNew}
          className="flex items-center justify-center gap-1.5 text-[12px] text-text-secondary hover:text-text-primary hover:bg-bg-hover rounded-md px-2 py-1"
          title="New source"
        >
          <Plus size={13} /> New source
        </button>
        <div className="flex-1" />
        <span className="text-[10px] text-text-muted pr-1">{version ? `v${version}` : ""}</span>
      </div>
    </aside>
  );
}
