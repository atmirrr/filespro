import React, { useCallback, useEffect, useMemo, useState } from "react";
import type { ConnectionConfig } from "@shared/types";
import { Sidebar } from "./components/Sidebar";
import { FileBrowser } from "./components/FileBrowser";
import { HomeView } from "./components/HomeView";
import { ConnectionEditor } from "./components/ConnectionEditor";
import { ToastsProvider, useToasts } from "./components/Toasts";
import { TransferDock, type TransferItem } from "./components/TransferDock";

function FilesApp() {
  const [connections, setConnections] = useState<ConnectionConfig[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<ConnectionConfig | undefined>(undefined);
  const [transfers, setTransfers] = useState<TransferItem[]>([]);
  const toasts = useToasts();

  const refresh = useCallback(async () => {
    try {
      const list = await window.api.connections.list();
      setConnections(list);

      // Auto-create default local FS connections on first run: Desktop + Documents + Downloads
      if (list.length === 0) {
        const paths = await window.api.app.systemPaths();
        const seeds: ConnectionConfig[] = [
          {
            id: crypto.randomUUID(),
            name: "Desktop",
            kind: "fs",
            createdAt: Date.now(),
            options: { root: paths.desktop },
          },
          {
            id: crypto.randomUUID(),
            name: "Documents",
            kind: "fs",
            createdAt: Date.now() + 1,
            options: { root: paths.documents },
          },
          {
            id: crypto.randomUUID(),
            name: "Downloads",
            kind: "fs",
            createdAt: Date.now() + 2,
            options: { root: paths.downloads },
          },
        ];
        try {
          const out: ConnectionConfig[] = [];
          for (const s of seeds) {
            const saved = await window.api.connections.save(s);
            out.push(saved);
          }
          setConnections(out);
          // Stay on Home view — let user pick a source from the grid
        } catch (e) {
          console.warn("Could not seed default connections", e);
        }
      }
      // Note: do NOT auto-select a source. Home (grid) is always the default landing view.
    } catch (e) {
      toasts.push(friendlyError(e), "error");
    }
  }, [toasts]);

  useEffect(() => {
    void refresh();

  }, []);

  const active = useMemo(
    () => connections.find((c) => c.id === activeId) ?? null,
    [connections, activeId],
  );

  function handleNew() {
    setEditing(undefined);
    setEditorOpen(true);
  }

  function handleEdit(c: ConnectionConfig) {
    setEditing(c);
    setEditorOpen(true);
  }

  async function handleDelete(c: ConnectionConfig) {
    if (!confirm(`Remove "${c.name}" from sources?`)) return;
    try {
      await window.api.connections.delete(c.id);
      if (activeId === c.id) setActiveId(null);
      await refresh();
    } catch (e) {
      toasts.push(friendlyError(e), "error");
    }
  }

  async function handleSaved(saved: ConnectionConfig) {
    await refresh();
    if (!activeId) setActiveId(saved.id);
  }

  const startTransfer = (entry: { id: string; label: string }) => {
    const id = entry.id;
    setTransfers((cur) => [
      ...cur,
      { id, label: entry.label, status: "active", startedAt: Date.now() },
    ]);
    return id;
  };

  const finishTransfer = (id: string, err?: string) => {
    setTransfers((cur) =>
      cur.map((t) =>
        t.id === id
          ? {
              ...t,
              status: err ? "error" : "done",
              error: err,
              finishedAt: Date.now(),
            }
          : t,
      ),
    );
  };

  const clearCompleted = () => {
    setTransfers((cur) => cur.filter((t) => t.status === "active"));
  };

  async function handleDropOnSource(
    target: ConnectionConfig,
    payload: { sourceConnectionId: string; keys: string[] },
    action: "copy" | "move",
  ) {
    const verb = action === "copy" ? "Copy" : "Move";
    for (const srcKey of payload.keys) {
      const name = srcKey.replace(/\/$/, "").split("/").pop() || srcKey;
      const id = crypto.randomUUID();
      startTransfer({ id, label: `${verb} ${name} → ${target.name}` });
      try {
        if (action === "copy") {
          await window.api.fs.copy(payload.sourceConnectionId, srcKey, target.id, name);
        } else {
          await window.api.fs.move(payload.sourceConnectionId, srcKey, target.id, name);
        }
        finishTransfer(id);
      } catch (e) {
        const msg = (e instanceof Error ? e.message : String(e)) || "Failed";
        finishTransfer(id, msg);
        toasts.push(msg, "error");
      }
    }
    toasts.push(`${verb === "Copy" ? "Copied" : "Moved"} ${payload.keys.length} item(s) to ${target.name}`, "success");
  }

  return (
    <div className="h-full w-full flex flex-col">
      <div className="flex-1 flex min-h-0">
        <Sidebar
          connections={connections}
          activeId={activeId}
          onSelect={(id) => setActiveId(id)}
          onNew={handleNew}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onDropOnSource={handleDropOnSource}
        />
        <div className="flex-1 min-w-0 bg-bg-base">
          {activeId === null || active === null ? (
            <HomeView
              connections={connections}
              onOpen={(id) => setActiveId(id)}
              onNew={handleNew}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ) : (
            <FileBrowser
              connection={active}
              allConnections={connections}
              onTransferStart={startTransfer}
              onTransferDone={finishTransfer}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          )}
        </div>
      </div>
      <TransferDock items={transfers} onClear={clearCompleted} />
      <ConnectionEditor
        open={editorOpen}
        initial={editing}
        onClose={() => setEditorOpen(false)}
        onSaved={handleSaved}
      />
    </div>
  );
}

export default function App() {
  return (
    <ToastsProvider>
      <FilesApp />
    </ToastsProvider>
  );
}
