import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ConnectionConfig, RemoteEntry, SourceCapabilities } from "@shared/types";
import {
  Download,
  FileIcon,
  FolderClosed,
  Link,
  Plus,
  Refresh,
  Search,
  Trash,
  Upload,
  Pencil,
  ArrowLeft,
  ChevronDown,
  GridIcon,
  ListIcon,
  Eye,
} from "../lib/icons";
import { basename, formatBytes, formatDate, joinKey, parentPrefix } from "../lib/format";
import { BrandChipInline } from "../lib/BrandLogo";
import { friendlyError, isSetupError } from "../lib/errors";
import { QuickPreview } from "./QuickPreview";
import { SetupCard } from "./SetupCard";
import { useToasts } from "./Toasts";

type SortKey = "name" | "size" | "date";
type SortDir = "asc" | "desc";

interface ContextMenu {
  x: number;
  y: number;
  entry: RemoteEntry;
}

interface Props {
  connection: ConnectionConfig | null;
  allConnections: ConnectionConfig[];
  onTransferStart?: (entry: { id: string; label: string }) => string;
  onTransferDone?: (id: string, err?: string) => void;
  onEdit?: (c: ConnectionConfig) => void;
  onDelete?: (c: ConnectionConfig) => void;
}

function BrandChip({ kind }: { kind: string }) {
  return <BrandChipInline kind={kind} size={14} />;
}

function SortHeader({
  label,
  sortKey,
  current,
  dir,
  onClick,
  className,
}: {
  label: string;
  sortKey: SortKey;
  current: SortKey;
  dir: SortDir;
  onClick: (k: SortKey) => void;
  className?: string;
}) {
  const active = current === sortKey;
  return (
    <button
      onClick={() => onClick(sortKey)}
      className={`flex items-center gap-1 hover:text-text-primary ${
        active ? "text-text-primary" : ""
      } ${className ?? ""}`}
    >
      {label}
      {active ? (
        <span className="text-[9px]">{dir === "asc" ? "▲" : "▼"}</span>
      ) : null}
    </button>
  );
}

const FILE_KIND_COLORS: Record<string, { bg: string; bg2: string; label: string }> = {
  image: { bg: "#FF9F0A", bg2: "#FF6E00", label: "IMG" },
  video: { bg: "#FF453A", bg2: "#C2261C", label: "VID" },
  audio: { bg: "#BF5AF2", bg2: "#8E37C2", label: "AUD" },
  archive: { bg: "#8E8E93", bg2: "#5C5C61", label: "ZIP" },
  pdf: { bg: "#E53935", bg2: "#B71C1C", label: "PDF" },
  doc: { bg: "#2962FF", bg2: "#0D47A1", label: "DOC" },
  sheet: { bg: "#0F9D58", bg2: "#0B7C3F", label: "XLS" },
  slides: { bg: "#F4B400", bg2: "#C68E00", label: "PPT" },
  code: { bg: "#30B0C7", bg2: "#1A8B9F", label: "</>" },
  text: { bg: "#A0AEC0", bg2: "#6E7A88", label: "TXT" },
  generic: { bg: "#C7CDD5", bg2: "#9CA4AE", label: "FILE" },
};

const EXT_KIND: Record<string, keyof typeof FILE_KIND_COLORS> = {
  jpg: "image", jpeg: "image", png: "image", gif: "image", webp: "image",
  avif: "image", heic: "image", svg: "image", bmp: "image",
  mp4: "video", mov: "video", webm: "video", mkv: "video", avi: "video",
  mp3: "audio", wav: "audio", flac: "audio", m4a: "audio", ogg: "audio",
  zip: "archive", tar: "archive", gz: "archive", "7z": "archive", rar: "archive",
  pdf: "pdf",
  doc: "doc", docx: "doc", odt: "doc", pages: "doc",
  xls: "sheet", xlsx: "sheet", csv: "sheet", numbers: "sheet",
  ppt: "slides", pptx: "slides", keynote: "slides", key: "slides",
  js: "code", ts: "code", tsx: "code", jsx: "code", py: "code", go: "code",
  rs: "code", java: "code", c: "code", cpp: "code", h: "code", rb: "code",
  php: "code", swift: "code", kt: "code", html: "code", css: "code",
  json: "code", yaml: "code", yml: "code", sh: "code", md: "text",
  txt: "text", log: "text",
};

function extKind(name: string): keyof typeof FILE_KIND_COLORS {
  const i = name.lastIndexOf(".");
  if (i < 0) return "generic";
  const ext = name.slice(i + 1).toLowerCase();
  return EXT_KIND[ext] ?? "generic";
}

function FileThumbnail({
  entry,
  connectionId,
  selected,
}: {
  entry: RemoteEntry;
  connectionId: string;
  selected: boolean;
}) {
  const [thumb, setThumb] = useState<string | null>(null);
  const [errored, setErrored] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const k = entry.isDir ? null : extKind(entry.name);
  const isImage = k === "image";

  useEffect(() => {
    if (!isImage || thumb || errored) return;
    if (!wrapRef.current) return;
    const node = wrapRef.current;
    let cancelled = false;
    const io = new IntersectionObserver(
      async (entries) => {
        if (cancelled) return;
        const visible = entries.some((e) => e.isIntersecting);
        if (!visible) return;
        io.disconnect();
        try {
          const url = await window.api.fs.thumbUrl(connectionId, entry.key);
          if (!cancelled) {
            if (url) setThumb(url);
            else setErrored(true);
          }
        } catch {
          if (!cancelled) setErrored(true);
        }
      },
      { root: null, rootMargin: "200px", threshold: 0.1 },
    );
    io.observe(node);
    return () => {
      cancelled = true;
      io.disconnect();
    };
  }, [isImage, thumb, errored, connectionId, entry.key]);

  if (entry.isDir) {
    return (
      <div
        ref={wrapRef}
        className="flex items-center justify-center"
        style={{
          height: 64,
          width: 64,
          borderRadius: 16,
          background: "linear-gradient(135deg, #5BA1FF 0%, #2F7BF0 100%)",
          color: "#fff",
          boxShadow: "0 1px 2px rgba(0,0,0,0.12)",
        }}
      >
        <FolderClosed size={34} className="text-white" />
      </div>
    );
  }

  if (isImage && thumb) {
    return (
      <div
        ref={wrapRef}
        style={{
          height: 64,
          width: 64,
          borderRadius: 8,
          overflow: "hidden",
          boxShadow: "0 1px 2px rgba(0,0,0,0.18)",
          opacity: selected ? 0.9 : 1,
          background: "#F0F0F2",
        }}
      >
        <img
          src={thumb}
          alt=""
          onError={() => setErrored(true)}
          style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
          loading="lazy"
        />
      </div>
    );
  }

  const c = FILE_KIND_COLORS[k!];
  return (
    <div
      ref={wrapRef}
      className="flex items-center justify-center font-semibold tracking-tight"
      style={{
        height: 64,
        width: 64,
        borderRadius: 12,
        background: `linear-gradient(135deg, ${c.bg} 0%, ${c.bg2} 100%)`,
        color: "#fff",
        fontSize: 13,
        boxShadow: "0 1px 2px rgba(0,0,0,0.12)",
        opacity: selected ? 0.92 : 1,
      }}
    >
      {c.label}
    </div>
  );
}

export function FileBrowser({
  connection,
  allConnections,
  onTransferStart,
  onTransferDone,
  onEdit,
  onDelete,
}: Props) {
  const [prefix, setPrefix] = useState("");
  const [items, setItems] = useState<RemoteEntry[]>([]);
  const [cursor, setCursor] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selection, setSelection] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState("");
  const [renaming, setRenaming] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [isDropping, setIsDropping] = useState(false);
  const [copyMenuOpen, setCopyMenuOpen] = useState(false);
  const [history, setHistory] = useState<string[]>([]);
  const [view, setView] = useState<"grid" | "list">(() => {
    if (typeof window === "undefined") return "grid";
    const stored = window.localStorage.getItem("filesViewMode");
    return stored === "list" ? "list" : "grid";
  });
  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem("filesViewMode", view);
    }
  }, [view]);
  const [showHidden, setShowHidden] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem("filesShowHidden") === "true";
  });
  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem("filesShowHidden", String(showHidden));
    }
  }, [showHidden]);
  const [sortKey, setSortKey] = useState<SortKey>(() => {
    if (typeof window === "undefined") return "name";
    const v = window.localStorage.getItem("filesSortKey");
    return v === "size" || v === "date" ? (v as SortKey) : "name";
  });
  const [sortDir, setSortDir] = useState<SortDir>(() => {
    if (typeof window === "undefined") return "asc";
    return window.localStorage.getItem("filesSortDir") === "desc" ? "desc" : "asc";
  });
  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem("filesSortKey", sortKey);
      window.localStorage.setItem("filesSortDir", sortDir);
    }
  }, [sortKey, sortDir]);
  const [previewEntry, setPreviewEntry] = useState<RemoteEntry | null>(null);
  const [contextMenu, setContextMenu] = useState<ContextMenu | null>(null);
  const [caps, setCaps] = useState<SourceCapabilities | null>(null);
  const toasts = useToasts();
  // Show the "shareable URL" affordances unless the source explicitly can't sign one.
  const canShareUrl = caps?.signedUrl !== false;
  const containerRef = useRef<HTMLDivElement>(null);
  const copyMenuRef = useRef<HTMLDivElement>(null);

  const load = useCallback(
    async (newPrefix?: string, pushHistory = false) => {
      if (!connection) return;
      setLoading(true);
      setError(null);
      try {
        const target = newPrefix !== undefined ? newPrefix : prefix;
        const res = await window.api.fs.list(connection.id, target);
        if (pushHistory && target !== prefix) {
          setHistory((h) => [...h, prefix]);
        }
        setItems(res.items);
        setCursor(res.cursor);
        setPrefix(res.prefix);
        setSelection(new Set());
      } catch (e) {
        setError(friendlyError(e));
      } finally {
        setLoading(false);
      }
    },
    [connection, prefix],
  );

  useEffect(() => {
    setCaps(null);
    if (connection) {
      setPrefix("");
      setItems([]);
      setSelection(new Set());
      setHistory([]);
      // Skip listing for demo connections — they always render the SetupCard.
      const opts = connection.options as Record<string, unknown> | undefined;
      if (opts && opts._demo === true) return;
      void load("");
      let cancelled = false;
      window.api.fs
        .capabilities(connection.id)
        .then((c) => {
          if (!cancelled) setCaps(c);
        })
        .catch(() => {
          /* leave caps null — affordances stay visible */
        });
      return () => {
        cancelled = true;
      };
    } else {
      setItems([]);
      setSelection(new Set());
      setPrefix("");
    }

  }, [connection?.id]);

  useEffect(() => {
    if (!contextMenu) return;
    function close(e: MouseEvent) {
      e.preventDefault();
      setContextMenu(null);
    }
    document.addEventListener("mousedown", close);
    document.addEventListener("contextmenu", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("contextmenu", close);
    };
  }, [contextMenu]);

  useEffect(() => {
    if (!copyMenuOpen) return;
    function handler(e: MouseEvent) {
      if (copyMenuRef.current && !copyMenuRef.current.contains(e.target as Node)) {
        setCopyMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [copyMenuOpen]);

  // Keep a stable ref to the latest state/handlers so the global keydown
  // listener can read them without re-subscribing on every list change
  // (and without referencing `visibleItems` before it's declared).
  const shortcutStateRef = useRef({
    visibleItems: [] as RemoteEntry[],
    selection: new Set<string>(),
    previewEntry: null as RemoteEntry | null,
    prefix: "",
    load: () => Promise.resolve(),
    handleDelete: () => Promise.resolve(),
    navigateInto: (_e: RemoteEntry) => Promise.resolve(),
    goBack: () => {},
    setView: (_v: "grid" | "list") => {},
    setSelection: (_s: Set<string>) => {},
    setPreviewEntry: (_e: RemoteEntry | null) => {},
  });

  useEffect(() => {
    if (!connection) return;
    function isTypingTarget(t: EventTarget | null): boolean {
      if (!(t instanceof HTMLElement)) return false;
      const tag = t.tagName;
      return tag === "INPUT" || tag === "TEXTAREA" || t.isContentEditable;
    }
    function onKey(e: KeyboardEvent) {
      const s = shortcutStateRef.current;
      if (s.previewEntry) return;
      if (isTypingTarget(e.target)) return;
      const cmd = e.metaKey || e.ctrlKey;
      if (cmd && e.key === "a") {
        e.preventDefault();
        s.setSelection(new Set(s.visibleItems.map((it) => it.key)));
        return;
      }
      if (cmd && e.key === "r") {
        e.preventDefault();
        void s.load();
        return;
      }
      if (cmd && e.key === "f") {
        e.preventDefault();
        document.querySelector<HTMLInputElement>('input[placeholder="Search"]')?.focus();
        return;
      }
      if (cmd && e.key === "1") {
        e.preventDefault();
        s.setView("grid");
        return;
      }
      if (cmd && e.key === "2") {
        e.preventDefault();
        s.setView("list");
        return;
      }
      if (cmd && (e.key === "Backspace" || e.key === "Delete")) {
        e.preventDefault();
        if (s.selection.size > 0) void s.handleDelete();
        return;
      }
      if (e.key === " " && s.selection.size === 1) {
        e.preventDefault();
        const key = Array.from(s.selection)[0];
        const entry = s.visibleItems.find((it) => it.key === key);
        if (entry && !entry.isDir) s.setPreviewEntry(entry);
        return;
      }
      if (e.key === "Enter" && s.selection.size === 1) {
        e.preventDefault();
        const key = Array.from(s.selection)[0];
        const entry = s.visibleItems.find((it) => it.key === key);
        if (entry) void s.navigateInto(entry);
        return;
      }
      if (e.key === "Backspace" && s.selection.size === 0 && s.prefix) {
        e.preventDefault();
        s.goBack();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);

  }, [connection]);

  function goBack() {
    setHistory((h) => {
      if (h.length === 0) return h;
      const prev = h[h.length - 1];
      void load(prev, false);
      return h.slice(0, -1);
    });
  }

  async function navigateInto(entry: RemoteEntry) {
    if (entry.isDir) {
      await load(entry.key, true);
    } else {
      if (!connection) return;
      try {
        const url = await window.api.fs.url(connection.id, entry.key);
        if (url) {
          await window.api.shell.openExternal(url);
        } else {
          const tmp = `/tmp/${Math.random().toString(36).slice(2)}-${entry.name}`;
          await window.api.fs.download(connection.id, entry.key, tmp);
          await window.api.fs.revealInFinder(tmp);
        }
      } catch (e) {
        toasts.push(friendlyError(e), "error");
      }
    }
  }

  async function handleUpload() {
    if (!connection) return;
    const files = await window.api.dialog.pickFiles();
    if (!files.length) return;
    for (const file of files) {
      const name = file.split("/").pop() || file;
      const destKey = joinKey(prefix, name);
      const id =
        onTransferStart?.({
          id: crypto.randomUUID(),
          label: `Upload ${name} → ${connection.name}`,
        }) ?? "";
      try {
        await window.api.fs.uploadLocalFile(connection.id, destKey, file);
        onTransferDone?.(id);
      } catch (e) {
        onTransferDone?.(id, friendlyError(e));
        toasts.push(friendlyError(e), "error");
      }
    }
    await load();
  }

  async function handleDownload() {
    if (!connection) return;
    const keys = Array.from(selection);
    if (keys.length === 0) return;
    const dest = await window.api.dialog.pickDirectory();
    if (!dest) return;
    for (const key of keys) {
      const name = basename(key);
      const id =
        onTransferStart?.({
          id: crypto.randomUUID(),
          label: `Download ${name}`,
        }) ?? "";
      try {
        await window.api.fs.download(connection.id, key, `${dest}/${name}`);
        onTransferDone?.(id);
      } catch (e) {
        onTransferDone?.(id, friendlyError(e));
        toasts.push(friendlyError(e), "error");
      }
    }
    toasts.push(`Downloaded to ${dest}`, "success");
  }

  async function handleDelete() {
    if (!connection) return;
    const keys = Array.from(selection);
    if (keys.length === 0) return;
    if (!confirm(`Delete ${keys.length} item(s)?`)) return;
    for (const key of keys) {
      const id =
        onTransferStart?.({
          id: crypto.randomUUID(),
          label: `Delete ${basename(key)}`,
        }) ?? "";
      try {
        await window.api.fs.delete(connection.id, key);
        onTransferDone?.(id);
      } catch (e) {
        onTransferDone?.(id, friendlyError(e));
        toasts.push(friendlyError(e), "error");
      }
    }
    await load();
  }

  async function handleDownloadZip(folderKey: string) {
    if (!connection) return;
    const folderName = basename(folderKey) || connection.name;
    const dest = await window.api.dialog.saveAs(`${folderName}.zip`);
    if (!dest) return;
    const id =
      onTransferStart?.({
        id: crypto.randomUUID(),
        label: `Zip ${folderName}`,
      }) ?? "";
    try {
      await window.api.fs.downloadZip(connection.id, folderKey, dest);
      onTransferDone?.(id);
      toasts.push(`Zipped ${folderName} → ${dest}`, "success");
    } catch (e) {
      onTransferDone?.(id, friendlyError(e));
      toasts.push(friendlyError(e), "error");
    }
  }

  async function handleMkdir() {
    if (!connection) return;
    const name = prompt("New folder name");
    if (!name) return;
    const key = joinKey(prefix, name) + "/";
    try {
      await window.api.fs.mkdir(connection.id, key);
      await load();
    } catch (e) {
      toasts.push(friendlyError(e), "error");
    }
  }

  async function handleCopyTo(dest: ConnectionConfig, action: "copy" | "move") {
    if (!connection) return;
    const keys = Array.from(selection);
    if (keys.length === 0) return;
    setCopyMenuOpen(false);
    for (const key of keys) {
      const name = basename(key);
      const id =
        onTransferStart?.({
          id: crypto.randomUUID(),
          label: `${action === "copy" ? "Copy" : "Move"} ${name} → ${dest.name}`,
        }) ?? "";
      try {
        const destKey = joinKey("", name);
        if (action === "copy") {
          await window.api.fs.copy(connection.id, key, dest.id, destKey);
        } else {
          await window.api.fs.move(connection.id, key, dest.id, destKey);
        }
        onTransferDone?.(id);
      } catch (e) {
        onTransferDone?.(id, friendlyError(e));
        toasts.push(friendlyError(e), "error");
      }
    }
    if (action === "move") await load();
    toasts.push(`${action === "copy" ? "Copied" : "Moved"} to ${dest.name}`, "success");
  }

  async function handleGetUrl(key: string) {
    if (!connection) return;
    try {
      const url = await window.api.fs.url(connection.id, key, { expiresIn: 3600 });
      if (!url) {
        toasts.push("This source does not support shareable URLs", "error");
        return;
      }
      await navigator.clipboard.writeText(url);
      toasts.push("URL copied", "success");
    } catch (e) {
      toasts.push(friendlyError(e), "error");
    }
  }

  async function handleRename(oldKey: string, newName: string) {
    if (!connection || !newName.trim()) {
      setRenaming(null);
      return;
    }
    const isDir = oldKey.endsWith("/");
    const parent = parentPrefix(oldKey);
    const newKey = joinKey(parent, newName) + (isDir ? "/" : "");
    if (newKey === oldKey) {
      setRenaming(null);
      return;
    }
    try {
      await window.api.fs.move(connection.id, oldKey, connection.id, newKey);
      await load();
    } catch (e) {
      toasts.push(friendlyError(e), "error");
    } finally {
      setRenaming(null);
    }
  }

  const visibleItems = useMemo(() => {
    let out = items;
    if (!showHidden) {
      out = out.filter((it) => !it.name.startsWith("."));
    }
    if (filter) {
      const q = filter.toLowerCase();
      out = out.filter((it) => it.name.toLowerCase().includes(q));
    }
    // Folders always sort first; within folders/files apply key + direction.
    const dir = sortDir === "asc" ? 1 : -1;
    const cmp = (a: RemoteEntry, b: RemoteEntry) => {
      if (a.isDir !== b.isDir) return a.isDir ? -1 : 1;
      if (sortKey === "size") {
        return ((a.size ?? 0) - (b.size ?? 0)) * dir;
      }
      if (sortKey === "date") {
        const ad = a.lastModified ? Date.parse(a.lastModified) : 0;
        const bd = b.lastModified ? Date.parse(b.lastModified) : 0;
        return (ad - bd) * dir;
      }
      return a.name.localeCompare(b.name, undefined, { sensitivity: "base", numeric: true }) * dir;
    };
    return [...out].sort(cmp);
  }, [items, filter, showHidden, sortKey, sortDir]);

  const hiddenCount = useMemo(
    () => items.filter((it) => it.name.startsWith(".")).length,
    [items],
  );

  // Keep the keyboard-shortcut closure in sync with the latest state/handlers.
  shortcutStateRef.current = {
    visibleItems,
    selection,
    previewEntry,
    prefix,
    load,
    handleDelete,
    navigateInto,
    goBack,
    setView,
    setSelection,
    setPreviewEntry,
  };

  function toggleSelected(key: string, e: React.MouseEvent) {
    setSelection((cur) => {
      const next = new Set(cur);
      if (e.metaKey || e.ctrlKey) {
        if (next.has(key)) next.delete(key);
        else next.add(key);
      } else if (e.shiftKey && next.size > 0) {
        const idx = visibleItems.findIndex((it) => it.key === key);
        const last = visibleItems.findIndex((it) => next.has(it.key));
        const [start, end] = [Math.min(idx, last), Math.max(idx, last)];
        for (let i = start; i <= end; i++) next.add(visibleItems[i].key);
      } else {
        next.clear();
        next.add(key);
      }
      return next;
    });
  }

  async function handleDropFiles(ev: React.DragEvent) {
    ev.preventDefault();
    setIsDropping(false);
    if (!connection) return;
    const files = Array.from(ev.dataTransfer.files);
    for (const f of files) {
      // @ts-expect-error - Electron exposes file.path
      const sourcePath: string | undefined = f.path;
      if (!sourcePath) continue;
      const destKey = joinKey(prefix, f.name);
      const id =
        onTransferStart?.({
          id: crypto.randomUUID(),
          label: `Upload ${f.name} → ${connection.name}`,
        }) ?? "";
      try {
        await window.api.fs.uploadLocalFile(connection.id, destKey, sourcePath);
        onTransferDone?.(id);
      } catch (e) {
        onTransferDone?.(id, friendlyError(e));
        toasts.push(friendlyError(e), "error");
      }
    }
    await load();
  }

  const otherConnections = allConnections.filter((c) => c.id !== connection?.id);
  const pathSegments = prefix
    ? prefix
        .split("/")
        .filter(Boolean)
    : [];

  return (
    <div
      ref={containerRef}
      className={`flex flex-col h-full bg-bg-base ${isDropping ? "drop-target" : ""}`}
      onDragOver={(e) => {
        if (connection) {
          e.preventDefault();
          setIsDropping(true);
        }
      }}
      onDragLeave={() => setIsDropping(false)}
      onDrop={handleDropFiles}
    >
      {/* Top bar — Finder-ish: back/forward, location, search */}
      <div className="drag-region h-[44px] flex items-center px-3 border-b border-border-subtle bg-bg-base/95 backdrop-blur">
        <div className="no-drag flex items-center gap-1.5">
          <button
            onClick={goBack}
            disabled={history.length === 0}
            className="p-1.5 rounded-md hover:bg-bg-hover text-text-secondary hover:text-text-primary disabled:opacity-30 disabled:hover:bg-transparent"
            title="Back"
          >
            <ArrowLeft size={14} />
          </button>
          <button
            onClick={() => load()}
            disabled={!connection || loading}
            className="p-1.5 rounded-md hover:bg-bg-hover text-text-secondary hover:text-text-primary disabled:opacity-30 disabled:hover:bg-transparent"
            title="Refresh"
          >
            <Refresh size={14} />
          </button>
        </div>

        <div className="no-drag flex-1 mx-3 flex items-center gap-1 min-w-0 text-[13px] text-text-primary">
          {connection ? (
            <>
              <button
                onClick={() => load("")}
                className="font-semibold truncate hover:underline"
              >
                {connection.name}
              </button>
              {pathSegments.map((seg, i) => {
                const upto = pathSegments.slice(0, i + 1).join("/") + "/";
                return (
                  <React.Fragment key={i}>
                    <span className="text-text-muted text-[11px]">›</span>
                    <button
                      onClick={() => load(upto)}
                      className="truncate hover:underline text-text-secondary"
                    >
                      {seg}
                    </button>
                  </React.Fragment>
                );
              })}
            </>
          ) : (
            <span className="text-text-muted">Files</span>
          )}
        </div>

        <div className="no-drag flex items-center gap-2">
          <button
            onClick={() => setShowHidden((v) => !v)}
            className={`px-2 py-1.5 rounded-md ${
              showHidden
                ? "bg-accent/10 text-accent"
                : "text-text-secondary hover:text-text-primary hover:bg-bg-hover"
            }`}
            title={
              showHidden
                ? "Hide hidden files (starting with .)"
                : hiddenCount > 0
                  ? `Show ${hiddenCount} hidden item${hiddenCount === 1 ? "" : "s"}`
                  : "Show hidden files"
            }
          >
            <Eye size={13} />
          </button>

          <div className="inline-flex bg-black/[0.05] rounded-md p-0.5">
            <button
              onClick={() => setView("grid")}
              className={`px-2 py-1 rounded text-text-secondary hover:text-text-primary ${
                view === "grid" ? "bg-white shadow-sm text-text-primary" : ""
              }`}
              title="Icon view"
            >
              <GridIcon size={13} />
            </button>
            <button
              onClick={() => setView("list")}
              className={`px-2 py-1 rounded text-text-secondary hover:text-text-primary ${
                view === "list" ? "bg-white shadow-sm text-text-primary" : ""
              }`}
              title="List view"
            >
              <ListIcon size={13} />
            </button>
          </div>

          <div className="relative">
            <Search
              size={12}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none"
            />
            <input
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Search"
              className="bg-black/[0.04] border-0 rounded-md pl-7 pr-2 py-1.5 text-[12px] w-44 placeholder:text-text-muted"
            />
          </div>
        </div>
      </div>

      {/* Action toolbar */}
      <div className="h-11 flex items-center gap-1 px-3 border-b border-border-subtle bg-bg-base">
        <button
          className="text-[12.5px] flex items-center gap-1.5 px-2.5 py-1.5 rounded-md hover:bg-bg-hover text-text-primary disabled:opacity-40"
          onClick={handleMkdir}
          disabled={!connection}
        >
          <Plus size={13} /> New Folder
        </button>
        <button
          className="text-[12.5px] flex items-center gap-1.5 px-2.5 py-1.5 rounded-md hover:bg-bg-hover text-text-primary disabled:opacity-40"
          onClick={handleUpload}
          disabled={!connection}
        >
          <Upload size={13} /> Upload
        </button>
        <button
          className="text-[12.5px] flex items-center gap-1.5 px-2.5 py-1.5 rounded-md hover:bg-bg-hover text-text-primary disabled:opacity-40"
          onClick={handleDownload}
          disabled={!connection || selection.size === 0}
        >
          <Download size={13} /> Download
        </button>

        <div className="relative" ref={copyMenuRef}>
          <button
            className="text-[12.5px] flex items-center gap-1.5 px-2.5 py-1.5 rounded-md hover:bg-bg-hover text-text-primary disabled:opacity-40"
            onClick={() => setCopyMenuOpen((v) => !v)}
            disabled={
              !connection || selection.size === 0 || otherConnections.length === 0
            }
          >
            Copy to <ChevronDown size={11} />
          </button>
          {copyMenuOpen && otherConnections.length > 0 ? (
            <div className="absolute z-20 left-0 top-full mt-1 min-w-[210px] bg-bg-base rounded-lg border border-border-subtle shadow-lg py-1 text-[12.5px]">
              <div className="px-3 py-1 text-[10.5px] uppercase tracking-wider text-text-muted">
                Copy selection to
              </div>
              {otherConnections.map((c) => (
                <button
                  key={c.id}
                  onClick={() => handleCopyTo(c, "copy")}
                  className="w-full text-left px-3 py-1.5 hover:bg-accent hover:text-white flex items-center gap-2"
                >
                  <BrandChip kind={c.kind} />
                  <span className="truncate">{c.name}</span>
                </button>
              ))}
              <div className="border-t border-border-subtle my-1" />
              <div className="px-3 py-1 text-[10.5px] uppercase tracking-wider text-text-muted">
                Move selection to
              </div>
              {otherConnections.map((c) => (
                <button
                  key={`m-${c.id}`}
                  onClick={() => handleCopyTo(c, "move")}
                  className="w-full text-left px-3 py-1.5 hover:bg-accent hover:text-white flex items-center gap-2"
                >
                  <BrandChip kind={c.kind} />
                  <span className="truncate">{c.name}</span>
                </button>
              ))}
            </div>
          ) : null}
        </div>

        <div className="w-px h-5 bg-border-subtle mx-1" />

        <button
          className="text-[12.5px] flex items-center gap-1.5 px-2.5 py-1.5 rounded-md hover:bg-red-50 text-red-600 disabled:opacity-40 disabled:hover:bg-transparent"
          onClick={handleDelete}
          disabled={!connection || selection.size === 0}
        >
          <Trash size={13} /> Delete
        </button>
      </div>

      {/* Column headers only show in list mode */}
      {view === "list" ? (
        <div className="px-3 py-1.5 grid grid-cols-12 gap-2 text-[10.5px] uppercase tracking-wider text-text-muted border-b border-border-subtle bg-bg-base select-none">
          <SortHeader
            label="Name"
            sortKey="name"
            current={sortKey}
            dir={sortDir}
            onClick={(k) => {
              if (sortKey === k) setSortDir(sortDir === "asc" ? "desc" : "asc");
              else {
                setSortKey(k);
                setSortDir("asc");
              }
            }}
            className="col-span-7"
          />
          <SortHeader
            label="Size"
            sortKey="size"
            current={sortKey}
            dir={sortDir}
            onClick={(k) => {
              if (sortKey === k) setSortDir(sortDir === "asc" ? "desc" : "asc");
              else {
                setSortKey(k);
                setSortDir("asc");
              }
            }}
            className="col-span-2 justify-end"
          />
          <SortHeader
            label="Modified"
            sortKey="date"
            current={sortKey}
            dir={sortDir}
            onClick={(k) => {
              if (sortKey === k) setSortDir(sortDir === "asc" ? "desc" : "asc");
              else {
                setSortKey(k);
                setSortDir("desc");
              }
            }}
            className="col-span-2"
          />
          <div className="col-span-1 text-right"></div>
        </div>
      ) : null}

      <div className="flex-1 overflow-y-auto bg-bg-base">
        {!connection ? (
          <div className="h-full flex items-center justify-center text-text-muted text-sm">
            Select a source from the sidebar.
          </div>
        ) : loading && items.length === 0 ? (
          <div className="h-full flex items-center justify-center text-text-muted text-sm gap-2">
            <span className="spinner" /> Loading
          </div>
        ) : error || (connection && (connection.options as Record<string, unknown> | undefined)?._demo === true) ? (
          (connection && (connection.options as Record<string, unknown> | undefined)?._demo === true) || isSetupError(error) ? (
            <SetupCard
              connection={connection!}
              detail={error ?? undefined}
              onEdit={() => onEdit?.(connection!)}
              onDelete={() => onDelete?.(connection!)}
            />
          ) : (
            <div className="p-6 text-sm">
              <div className="font-medium mb-1 text-red-600">Could not load</div>
              <div className="text-text-secondary text-[13px]">{error}</div>
              <div className="mt-3 flex items-center gap-2">
                <button
                  onClick={() => load()}
                  className="text-xs px-3 py-1.5 rounded-md border border-border-subtle hover:bg-bg-hover"
                >
                  Retry
                </button>
                {connection && onEdit ? (
                  <button
                    onClick={() => onEdit(connection)}
                    className="text-xs px-3 py-1.5 rounded-md border border-border-subtle hover:bg-bg-hover"
                  >
                    Open Settings
                  </button>
                ) : null}
              </div>
            </div>
          )
        ) : (
          <>
            {visibleItems.length === 0 && !loading ? (
              <div className="p-12 text-center text-text-muted text-sm">
                This folder is empty.
                <br />
                Drag files in to upload.
              </div>
            ) : null}

            {view === "grid" ? (
              <div className="p-4 grid grid-cols-[repeat(auto-fill,minmax(120px,1fr))] gap-3">
                {visibleItems.map((it) => {
                  const selected = selection.has(it.key);
                  const isRenaming = renaming === it.key;
                  return (
                    <div
                      key={it.key}
                      onClick={(e) => toggleSelected(it.key, e)}
                      onDoubleClick={() => navigateInto(it)}
                      onContextMenu={(e) => {
                        e.preventDefault();
                        if (!selection.has(it.key)) {
                          setSelection(new Set([it.key]));
                        }
                        setContextMenu({ x: e.clientX, y: e.clientY, entry: it });
                      }}
                      draggable
                      onDragStart={(e) => {
                        if (!connection) return;
                        const payload = {
                          sourceConnectionId: connection.id,
                          keys:
                            selection.has(it.key) && selection.size > 1
                              ? Array.from(selection)
                              : [it.key],
                        };
                        e.dataTransfer.setData(
                          "application/x-files-manager",
                          JSON.stringify(payload),
                        );
                        e.dataTransfer.effectAllowed = "copyMove";
                      }}
                      className={`group relative flex flex-col items-center text-center p-2 rounded-lg cursor-default ${
                        selected ? "bg-accent text-white" : "hover:bg-bg-hover"
                      }`}
                    >
                      <FileThumbnail
                        entry={it}
                        connectionId={connection!.id}
                        selected={selected}
                      />
                      {isRenaming ? (
                        <input
                          autoFocus
                          value={renameValue}
                          onChange={(e) => setRenameValue(e.target.value)}
                          onBlur={() => handleRename(it.key, renameValue)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleRename(it.key, renameValue);
                            if (e.key === "Escape") setRenaming(null);
                          }}
                          onClick={(e) => e.stopPropagation()}
                          className="mt-2 bg-white border border-accent rounded px-1 py-0 text-[12px] text-text-primary w-full"
                        />
                      ) : (
                        <div
                          className={`mt-2 text-[12px] leading-tight line-clamp-2 break-words ${
                            selected ? "text-white font-medium" : "text-text-primary"
                          }`}
                          style={{ wordBreak: "break-word" }}
                        >
                          {it.name}
                        </div>
                      )}
                      <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 flex items-center gap-0.5">
                        {!it.isDir && canShareUrl ? (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              void handleGetUrl(it.key);
                            }}
                            className={`p-1 rounded ${
                              selected ? "bg-white/15 hover:bg-white/25" : "bg-white/80 hover:bg-white shadow-sm"
                            }`}
                            title="Copy shareable URL"
                          >
                            <Link size={11} />
                          </button>
                        ) : null}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setRenaming(it.key);
                            setRenameValue(it.name);
                          }}
                          className={`p-1 rounded ${
                            selected ? "bg-white/15 hover:bg-white/25" : "bg-white/80 hover:bg-white shadow-sm"
                          }`}
                          title="Rename"
                        >
                          <Pencil size={11} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              visibleItems.map((it) => {
                const selected = selection.has(it.key);
                const isRenaming = renaming === it.key;
                return (
                  <div
                    key={it.key}
                    className={`grid grid-cols-12 gap-2 px-3 py-1.5 text-[13px] cursor-default ${
                      selected ? "row-selected" : "row-hover"
                    }`}
                    onClick={(e) => toggleSelected(it.key, e)}
                    onDoubleClick={() => navigateInto(it)}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      if (!selection.has(it.key)) setSelection(new Set([it.key]));
                      setContextMenu({ x: e.clientX, y: e.clientY, entry: it });
                    }}
                    draggable
                    onDragStart={(e) => {
                      if (!connection) return;
                      const payload = {
                        sourceConnectionId: connection.id,
                        keys:
                          selection.has(it.key) && selection.size > 1
                            ? Array.from(selection)
                            : [it.key],
                      };
                      e.dataTransfer.setData("application/x-files-manager", JSON.stringify(payload));
                      e.dataTransfer.effectAllowed = "copyMove";
                    }}
                  >
                    <div className="col-span-7 flex items-center gap-2 min-w-0">
                      {it.isDir ? (
                        <FolderClosed
                          size={15}
                          className={selected ? "text-white shrink-0" : "text-[#3478F6] shrink-0"}
                        />
                      ) : (
                        <FileIcon
                          size={15}
                          className={selected ? "text-white shrink-0" : "text-text-secondary shrink-0"}
                        />
                      )}
                      {isRenaming ? (
                        <input
                          autoFocus
                          value={renameValue}
                          onChange={(e) => setRenameValue(e.target.value)}
                          onBlur={() => handleRename(it.key, renameValue)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleRename(it.key, renameValue);
                            if (e.key === "Escape") setRenaming(null);
                          }}
                          onClick={(e) => e.stopPropagation()}
                          className="bg-white border border-accent rounded px-1 py-0 text-[13px] flex-1 text-text-primary"
                        />
                      ) : (
                        <span className="truncate">{it.name}</span>
                      )}
                    </div>
                    <div
                      className={`col-span-2 text-right tabular-nums ${
                        selected ? "" : "text-text-secondary"
                      }`}
                    >
                      {it.isDir ? "--" : formatBytes(it.size)}
                    </div>
                    <div
                      className={`col-span-2 truncate ${selected ? "" : "text-text-secondary"}`}
                    >
                      {formatDate(it.lastModified)}
                    </div>
                    <div className="col-span-1 flex items-center justify-end gap-0.5">
                      {!it.isDir && canShareUrl ? (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            void handleGetUrl(it.key);
                          }}
                          className={`p-1 rounded ${
                            selected ? "hover:bg-white/20" : "hover:bg-black/5 text-text-secondary"
                          }`}
                          title="Copy shareable URL"
                        >
                          <Link size={12} />
                        </button>
                      ) : null}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setRenaming(it.key);
                          setRenameValue(it.name);
                        }}
                        className={`p-1 rounded ${
                          selected ? "hover:bg-white/20" : "hover:bg-black/5 text-text-secondary"
                        }`}
                        title="Rename"
                      >
                        <Pencil size={12} />
                      </button>
                    </div>
                  </div>
                );
              })
            )}

            {cursor ? (
              <div className="p-3 flex justify-center">
                <button
                  className="text-xs px-3 py-1.5 rounded-md border border-border-subtle hover:bg-bg-hover text-text-secondary"
                  onClick={async () => {
                    if (!connection) return;
                    setLoading(true);
                    try {
                      const res = await window.api.fs.list(connection.id, prefix, cursor);
                      setItems((cur) => [...cur, ...res.items]);
                      setCursor(res.cursor);
                    } finally {
                      setLoading(false);
                    }
                  }}
                >
                  Load more
                </button>
              </div>
            ) : null}
          </>
        )}
      </div>

      <div className="h-6 px-3 flex items-center justify-between text-[11px] text-text-muted border-t border-border-subtle bg-bg-base">
        <span>{connection ? `${visibleItems.length} item${visibleItems.length === 1 ? "" : "s"}` : ""}</span>
        <span>{selection.size > 0 ? `${selection.size} selected` : ""}</span>
      </div>

      <QuickPreview
        open={previewEntry !== null}
        connectionId={connection?.id ?? null}
        entry={previewEntry}
        onClose={() => setPreviewEntry(null)}
        onCopyUrl={previewEntry ? () => handleGetUrl(previewEntry.key) : undefined}
      />

      {contextMenu ? (
        <div
          className="fixed z-40 min-w-[200px] bg-white rounded-md shadow-lg border border-border-subtle py-1 text-[13px]"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onContextMenu={(e) => e.preventDefault()}
          onMouseDown={(e) => e.stopPropagation()}
        >
          {!contextMenu.entry.isDir ? (
            <MenuItem
              onClick={() => {
                setPreviewEntry(contextMenu.entry);
                setContextMenu(null);
              }}
              label="Quick Look"
              shortcut="Space"
            />
          ) : null}
          <MenuItem
            onClick={() => {
              void navigateInto(contextMenu.entry);
              setContextMenu(null);
            }}
            label={contextMenu.entry.isDir ? "Open Folder" : "Open"}
            shortcut="↵"
          />
          {!contextMenu.entry.isDir && canShareUrl ? (
            <MenuItem
              onClick={() => {
                void handleGetUrl(contextMenu.entry.key);
                setContextMenu(null);
              }}
              label="Copy Shareable URL"
            />
          ) : null}
          {contextMenu.entry.isDir ? (
            <MenuItem
              onClick={() => {
                void handleDownloadZip(contextMenu.entry.key);
                setContextMenu(null);
              }}
              label="Download as ZIP"
            />
          ) : null}
          <MenuItem
            onClick={() => {
              setRenaming(contextMenu.entry.key);
              setRenameValue(contextMenu.entry.name);
              setContextMenu(null);
            }}
            label="Rename"
          />
          <div className="border-t border-border-subtle my-1" />
          <MenuItem
            onClick={() => {
              void handleDownload();
              setContextMenu(null);
            }}
            label="Download…"
          />
          {otherConnections.length > 0 ? (
            <CopyToSubmenu
              dests={otherConnections}
              onCopy={(c) => {
                void handleCopyTo(c, "copy");
                setContextMenu(null);
              }}
              onMove={(c) => {
                void handleCopyTo(c, "move");
                setContextMenu(null);
              }}
            />
          ) : null}
          <div className="border-t border-border-subtle my-1" />
          <MenuItem
            destructive
            onClick={() => {
              void handleDelete();
              setContextMenu(null);
            }}
            label="Delete"
            shortcut="⌘⌫"
          />
        </div>
      ) : null}
    </div>
  );
}

function MenuItem({
  label,
  onClick,
  shortcut,
  destructive,
}: {
  label: string;
  onClick: () => void;
  shortcut?: string;
  destructive?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-3 py-1.5 flex items-center gap-3 ${
        destructive
          ? "text-red-600 hover:bg-red-50"
          : "text-text-primary hover:bg-accent hover:text-white"
      }`}
    >
      <span className="flex-1">{label}</span>
      {shortcut ? (
        <span className="text-[10.5px] opacity-60">{shortcut}</span>
      ) : null}
    </button>
  );
}

function CopyToSubmenu({
  dests,
  onCopy,
  onMove,
}: {
  dests: ConnectionConfig[];
  onCopy: (c: ConnectionConfig) => void;
  onMove: (c: ConnectionConfig) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div
      className="relative"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button className="w-full text-left px-3 py-1.5 hover:bg-accent hover:text-white flex items-center justify-between">
        Copy / Move to <span className="text-[10px] opacity-60">›</span>
      </button>
      {open ? (
        <div className="absolute z-50 left-full top-0 ml-1 min-w-[200px] bg-white rounded-md shadow-lg border border-border-subtle py-1">
          <div className="px-3 py-1 text-[10.5px] uppercase tracking-wider text-text-muted">
            Copy to
          </div>
          {dests.map((c) => (
            <button
              key={c.id}
              onClick={() => onCopy(c)}
              className="w-full text-left px-3 py-1.5 hover:bg-accent hover:text-white flex items-center gap-2"
            >
              <BrandChipInline kind={c.kind} size={13} />
              <span className="truncate">{c.name}</span>
            </button>
          ))}
          <div className="border-t border-border-subtle my-1" />
          <div className="px-3 py-1 text-[10.5px] uppercase tracking-wider text-text-muted">
            Move to
          </div>
          {dests.map((c) => (
            <button
              key={`m-${c.id}`}
              onClick={() => onMove(c)}
              className="w-full text-left px-3 py-1.5 hover:bg-accent hover:text-white flex items-center gap-2"
            >
              <BrandChipInline kind={c.kind} size={13} />
              <span className="truncate">{c.name}</span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
