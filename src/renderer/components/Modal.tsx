import React from "react";
import { Cross } from "../lib/icons";

interface Props {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  width?: string;
}

export function Modal({ open, onClose, title, children, width = "max-w-2xl" }: Props) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm flex items-start justify-center p-10 overflow-y-auto">
      <div
        className={`bg-bg-base border border-border-subtle rounded-xl shadow-2xl w-full ${width}`}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-border-subtle">
          <h2 className="text-sm font-semibold tracking-wide">{title}</h2>
          <button
            onClick={onClose}
            className="text-text-secondary hover:text-text-primary p-1 rounded hover:bg-bg-hover"
          >
            <Cross size={14} />
          </button>
        </div>
        <div>{children}</div>
      </div>
    </div>
  );
}
