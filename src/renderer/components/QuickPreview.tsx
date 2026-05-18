import React, { useEffect, useMemo, useState } from "react";
import type { RemoteEntry } from "@shared/types";
import { Cross, Download, Link } from "../lib/icons";
import { formatBytes, formatDate } from "../lib/format";
import { friendlyError } from "../lib/errors";

interface Props {
  open: boolean;
  connectionId: string | null;
  entry: RemoteEntry | null;
  onClose: () => void;
  onDownload?: () => void;
  onCopyUrl?: () => void;
}

function kindFromName(name: string): "image" | "video" | "audio" | "pdf" | "text" | "other" {
  const i = name.lastIndexOf(".");
  if (i < 0) return "text";
  const ext = name.slice(i + 1).toLowerCase();
  if (/^(jpe?g|png|gif|webp|avif|heic|svg|bmp)$/.test(ext)) return "image";
  if (/^(mp4|mov|webm|mkv|avi)$/.test(ext)) return "video";
  if (/^(mp3|wav|flac|m4a|ogg)$/.test(ext)) return "audio";
  if (ext === "pdf") return "pdf";
  if (
    /^(txt|md|json|yaml|yml|csv|tsv|log|js|jsx|ts|tsx|py|rb|go|rs|java|c|cpp|h|html|css|sh|toml|ini|env)$/.test(
      ext,
    )
  )
    return "text";
  return "other";
}

export function QuickPreview({ open, connectionId, entry, onClose, onDownload, onCopyUrl }: Props) {
  const [url, setUrl] = useState<string | null>(null);
  const [text, setText] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const kind = useMemo(() => (entry ? kindFromName(entry.name) : "other"), [entry]);

  useEffect(() => {
    if (!open || !entry || !connectionId) {
      setUrl(null);
      setText(null);
      setError(null);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      setUrl(null);
      setText(null);
      try {
        if (kind === "text") {
          const t = await window.api.fs.readTextPreview(connectionId, entry.key, 64 * 1024);
          if (!cancelled) setText(t);
        } else if (kind !== "other") {
          const u = await window.api.fs.thumbUrl(connectionId, entry.key);
          if (!cancelled) {
            if (u) setUrl(u);
            else setError("This source can't generate a preview URL.");
          }
        }
      } catch (e) {
        if (!cancelled) setError(friendlyError(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, entry, connectionId, kind]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" || e.key === " ") {
        e.preventDefault();
        onClose();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open || !entry) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 backdrop-blur-md flex items-center justify-center p-10"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-[80vw] max-h-[85vh] w-[820px] flex flex-col overflow-hidden border border-black/10"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="h-12 px-4 flex items-center justify-between border-b border-border-subtle bg-white">
          <div className="flex items-center gap-2 min-w-0">
            <div className="text-[13px] font-semibold text-text-primary truncate">{entry.name}</div>
            <div className="text-[11px] text-text-muted shrink-0">
              {entry.size !== undefined ? formatBytes(entry.size) : ""}
              {entry.lastModified ? " · " + formatDate(entry.lastModified) : ""}
            </div>
          </div>
          <div className="flex items-center gap-1">
            {onCopyUrl ? (
              <button
                onClick={onCopyUrl}
                className="p-1.5 rounded-md text-text-secondary hover:text-text-primary hover:bg-bg-hover"
                title="Copy URL"
              >
                <Link size={14} />
              </button>
            ) : null}
            {onDownload ? (
              <button
                onClick={onDownload}
                className="p-1.5 rounded-md text-text-secondary hover:text-text-primary hover:bg-bg-hover"
                title="Download"
              >
                <Download size={14} />
              </button>
            ) : null}
            <button
              onClick={onClose}
              className="p-1.5 rounded-md text-text-secondary hover:text-text-primary hover:bg-bg-hover"
              title="Close"
            >
              <Cross size={14} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-auto bg-[#F6F6F6] flex items-center justify-center min-h-[300px]">
          {loading ? (
            <div className="flex items-center gap-2 text-text-secondary text-sm">
              <span className="spinner" /> Loading preview…
            </div>
          ) : error ? (
            <div className="p-6 text-sm text-text-secondary max-w-md text-center">{error}</div>
          ) : kind === "image" && url ? (
            <img src={url} alt="" className="max-w-full max-h-[70vh] object-contain" />
          ) : kind === "video" && url ? (
            <video src={url} controls className="max-w-full max-h-[70vh]" />
          ) : kind === "audio" && url ? (
            <audio src={url} controls className="w-full max-w-md" />
          ) : kind === "pdf" && url ? (
            <iframe
              src={url}
              title={entry.name}
              className="w-full h-[70vh]"
              style={{ border: 0 }}
            />
          ) : kind === "text" && text !== null ? (
            <pre className="w-full h-full p-4 text-[12px] font-mono text-text-primary whitespace-pre-wrap overflow-auto bg-white">
              {text}
            </pre>
          ) : (
            <div className="p-6 text-sm text-text-secondary max-w-md text-center">
              No inline preview for this file type. Use Download or Open URL to view it.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
