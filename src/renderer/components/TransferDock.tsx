import React from "react";

export interface TransferItem {
  id: string;
  label: string;
  status: "active" | "done" | "error";
  error?: string;
  startedAt: number;
  finishedAt?: number;
}

interface Props {
  items: TransferItem[];
  onClear: () => void;
}

export function TransferDock({ items, onClear }: Props) {
  if (items.length === 0) return null;
  const active = items.filter((i) => i.status === "active").length;
  return (
    <div className="border-t border-border-subtle bg-bg-panel">
      <div className="px-3 py-1.5 flex items-center justify-between">
        <div className="text-[11px] uppercase tracking-wider text-text-muted">
          Transfers{active > 0 ? ` (${active} active)` : ""}
        </div>
        <button
          onClick={onClear}
          className="text-[11px] text-text-secondary hover:text-text-primary"
        >
          Clear completed
        </button>
      </div>
      <div className="max-h-32 overflow-y-auto">
        {items.slice(-30).map((it) => (
          <div
            key={it.id}
            className="px-3 py-1 flex items-center gap-2 text-xs border-t border-border-subtle"
          >
            {it.status === "active" ? (
              <span className="spinner" />
            ) : it.status === "done" ? (
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
            ) : (
              <span className="h-2 w-2 rounded-full bg-red-500" />
            )}
            <span className="flex-1 truncate">{it.label}</span>
            {it.status === "error" ? (
              <span className="text-red-700 truncate max-w-[40%]">{it.error}</span>
            ) : (
              <span className="text-text-muted">{it.status}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
