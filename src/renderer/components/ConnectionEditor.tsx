import React, { useEffect, useMemo, useState } from "react";
import { ADAPTERS } from "@shared/types";
import type { AdapterField, AdapterKind, ConnectionConfig } from "@shared/types";
import { Modal } from "./Modal";
import { useToasts } from "./Toasts";
import { friendlyError } from "../lib/errors";

interface Props {
  open: boolean;
  initial?: ConnectionConfig;
  onClose: () => void;
  onSaved: (c: ConnectionConfig) => void;
}

function emptyFor(kind: AdapterKind): ConnectionConfig {
  return {
    id: crypto.randomUUID(),
    name: "",
    kind,
    createdAt: Date.now(),
    options: {},
  };
}

function FieldInput({
  field,
  value,
  onChange,
}: {
  field: AdapterField;
  value: unknown;
  onChange: (v: string | number | boolean) => void;
}) {
  const baseInput =
    "w-full bg-bg-base border border-border-subtle rounded px-2.5 py-1.5 text-sm text-text-primary";
  if (field.type === "textarea") {
    return (
      <textarea
        rows={6}
        className={baseInput + " font-mono"}
        placeholder={field.placeholder}
        value={typeof value === "string" ? value : ""}
        onChange={(e) => onChange(e.target.value)}
      />
    );
  }
  if (field.type === "boolean") {
    return (
      <input
        type="checkbox"
        checked={Boolean(value)}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4"
      />
    );
  }
  if (field.type === "number") {
    return (
      <input
        type="number"
        className={baseInput}
        placeholder={field.placeholder}
        value={value === undefined || value === null ? "" : String(value)}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    );
  }
  return (
    <input
      type={field.type === "password" ? "password" : "text"}
      className={baseInput}
      placeholder={field.placeholder}
      autoComplete="off"
      spellCheck={false}
      value={typeof value === "string" ? value : ""}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}

export function ConnectionEditor({ open, initial, onClose, onSaved }: Props) {
  const [config, setConfig] = useState<ConnectionConfig>(() => initial ?? emptyFor("fs"));
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; error?: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const toasts = useToasts();

  useEffect(() => {
    if (open) {
      setConfig(initial ?? emptyFor("fs"));
      setTestResult(null);
    }
  }, [open, initial]);

  const adapter = useMemo(() => ADAPTERS.find((a) => a.kind === config.kind)!, [config.kind]);

  const grouped = useMemo(() => {
    const groups = new Map<string, typeof ADAPTERS>();
    for (const a of ADAPTERS) {
      const list = groups.get(a.category) ?? [];
      list.push(a);
      groups.set(a.category, list);
    }
    return Array.from(groups.entries());
  }, []);

  function update<T extends keyof ConnectionConfig>(field: T, value: ConnectionConfig[T]) {
    setConfig((c) => ({ ...c, [field]: value }));
  }

  function updateOption(name: string, value: string | number | boolean) {
    setConfig((c) => ({ ...c, options: { ...c.options, [name]: value } }));
  }

  function setKind(kind: AdapterKind) {
    setConfig((c) => ({ ...emptyFor(kind), id: c.id, name: c.name }));
    setTestResult(null);
  }

  async function handleTest() {
    setTesting(true);
    setTestResult(null);
    try {
      const r = await window.api.connections.test(config);
      const mapped = r.ok ? r : { ...r, error: friendlyError(r.error ?? "Connection failed") };
      setTestResult(mapped);
      if (mapped.ok) toasts.push("Connection OK", "success");
      else toasts.push(mapped.error ?? "Connection failed", "error");
    } catch (e) {
      const msg = friendlyError(e);
      setTestResult({ ok: false, error: msg });
      toasts.push(msg, "error");
    } finally {
      setTesting(false);
    }
  }

  async function handleSave() {
    if (!config.name.trim()) {
      toasts.push("Please give the connection a name", "error");
      return;
    }
    setSaving(true);
    try {
      const saved = await window.api.connections.save(config);
      onSaved(saved);
      onClose();
    } catch (e) {
      toasts.push(friendlyError(e), "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={initial ? "Edit Connection" : "New Connection"} width="max-w-3xl">
      <div className="grid grid-cols-12 gap-0">
        <div className="col-span-4 border-r border-border-subtle p-3 max-h-[60vh] overflow-y-auto">
          <div className="text-[11px] uppercase tracking-wider text-text-muted mb-2 px-1">
            Source
          </div>
          {grouped.map(([category, list]) => (
            <div key={category} className="mb-3">
              <div className="text-[11px] uppercase tracking-wider text-text-muted px-1 mb-1">
                {category}
              </div>
              {list.map((a) => (
                <button
                  key={a.kind}
                  onClick={() => setKind(a.kind)}
                  className={`w-full text-left px-2 py-1.5 rounded-md text-[13px] ${
                    config.kind === a.kind
                      ? "bg-accent text-white"
                      : "text-text-primary hover:bg-bg-hover"
                  }`}
                >
                  {a.label}
                </button>
              ))}
            </div>
          ))}
        </div>

        <div className="col-span-8 p-4 max-h-[60vh] overflow-y-auto">
          <div className="mb-4">
            <label className="block text-xs text-text-secondary mb-1">Display name</label>
            <input
              type="text"
              className="w-full bg-bg-base border border-border-subtle rounded px-2.5 py-1.5 text-sm"
              placeholder={`My ${adapter.label}`}
              value={config.name}
              onChange={(e) => update("name", e.target.value)}
            />
          </div>

          <div className="mb-4">
            <div className="text-xs uppercase tracking-wider text-text-muted mb-2">
              {adapter.label} settings
            </div>
            {adapter.fields.map((f) => (
              <div key={f.name} className="mb-3">
                <label className="block text-xs text-text-secondary mb-1">
                  {f.label}
                  {f.required ? <span className="text-red-400"> *</span> : null}
                </label>
                <FieldInput
                  field={f}
                  value={config.options[f.name]}
                  onChange={(v) => updateOption(f.name, v)}
                />
                {f.hint ? (
                  <div className="text-[11px] text-text-muted mt-1">{f.hint}</div>
                ) : null}
              </div>
            ))}
          </div>

          {testResult ? (
            <div
              className={`text-sm px-3 py-2 rounded-md border mb-3 ${
                testResult.ok
                  ? "border-emerald-200 text-emerald-800 bg-emerald-50"
                  : "border-red-200 text-red-800 bg-red-50"
              }`}
            >
              {testResult.ok ? "Connection OK" : testResult.error ?? "Connection failed"}
            </div>
          ) : null}
        </div>
      </div>

      <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-border-subtle bg-bg-elevated rounded-b-lg">
        <button
          onClick={handleTest}
          disabled={testing}
          className="text-sm px-3 py-1.5 rounded bg-bg-hover hover:bg-border-subtle disabled:opacity-50"
        >
          {testing ? "Testing." : "Test"}
        </button>
        <button
          onClick={onClose}
          className="text-sm px-3 py-1.5 rounded hover:bg-bg-hover text-text-secondary"
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="text-sm px-3 py-1.5 rounded bg-accent hover:bg-accent-hover text-white disabled:opacity-50"
        >
          {saving ? "Saving." : "Save"}
        </button>
      </div>
    </Modal>
  );
}
