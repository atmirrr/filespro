import React from "react";
import type { ConnectionConfig } from "@shared/types";
import { ADAPTERS } from "@shared/types";
import { BrandTile } from "../lib/BrandLogo";
import { Pencil, Trash } from "../lib/icons";

interface Props {
  connection: ConnectionConfig;
  /** Optional details: what's missing / what the underlying error said. */
  detail?: string;
  onEdit: () => void;
  onDelete: () => void;
}

function adapterLabel(kind: string): string {
  return ADAPTERS.find((a) => a.kind === kind)?.label ?? kind;
}

function adapterRequiredFields(kind: string): string[] {
  const adapter = ADAPTERS.find((a) => a.kind === kind);
  if (!adapter) return [];
  return adapter.fields.filter((f) => f.required).map((f) => f.label);
}

export function SetupCard({ connection, detail, onEdit, onDelete }: Props) {
  const label = adapterLabel(connection.kind);
  const required = adapterRequiredFields(connection.kind);
  return (
    <div className="h-full flex items-center justify-center p-8">
      <div className="max-w-md w-full text-center">
        <div className="flex justify-center mb-5">
          <BrandTile kind={connection.kind} size={72} />
        </div>
        <h2 className="text-[18px] font-semibold text-text-primary">
          Connect {connection.name || label}
        </h2>
        <p className="text-[13px] text-text-secondary mt-1.5 leading-relaxed">
          This source isn't fully configured yet. Add your credentials to start browsing files in this {label} bucket.
        </p>

        {required.length > 0 ? (
          <div className="mt-5 inline-flex flex-wrap items-center justify-center gap-1.5">
            {required.map((r) => (
              <span
                key={r}
                className="text-[11px] px-2 py-0.5 rounded-full bg-bg-hover text-text-secondary border border-border-subtle"
              >
                {r}
              </span>
            ))}
          </div>
        ) : null}

        <div className="mt-6 flex items-center justify-center gap-2">
          <button
            onClick={onEdit}
            className="px-4 py-2 rounded-md bg-accent hover:bg-accent-hover text-white text-[13px] font-medium inline-flex items-center gap-2"
          >
            <Pencil size={12} />
            Open Settings
          </button>
          <button
            onClick={onDelete}
            className="px-3 py-2 rounded-md text-[13px] text-text-secondary hover:text-red-600 hover:bg-red-50 inline-flex items-center gap-1.5"
          >
            <Trash size={12} />
            Remove
          </button>
        </div>

        {detail ? (
          <div className="mt-7 text-[11px] text-text-muted">
            <details className="inline-block text-left">
              <summary className="cursor-pointer hover:text-text-secondary select-none">
                Show technical details
              </summary>
              <pre className="mt-2 max-w-md text-[10.5px] font-mono whitespace-pre-wrap break-words text-text-muted bg-bg-hover/60 rounded-md p-3 border border-border-subtle">
                {detail}
              </pre>
            </details>
          </div>
        ) : null}
      </div>
    </div>
  );
}
