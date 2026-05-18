import React, { createContext, useCallback, useContext, useEffect, useState } from "react";

interface Toast {
  id: string;
  message: string;
  level: "info" | "error" | "success";
}

interface ToastContextValue {
  push: (message: string, level?: Toast["level"]) => void;
}

const Ctx = createContext<ToastContextValue | null>(null);

export function ToastsProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<Toast[]>([]);

  const push = useCallback((message: string, level: Toast["level"] = "info") => {
    const id = Math.random().toString(36).slice(2);
    setItems((cur) => [...cur, { id, message, level }]);
    setTimeout(() => setItems((cur) => cur.filter((t) => t.id !== id)), 4500);
  }, []);

  return (
    <Ctx.Provider value={{ push }}>
      {children}
      <div className="fixed bottom-3 right-3 z-50 flex flex-col gap-2 max-w-md">
        {items.map((t) => (
          <div
            key={t.id}
            className={`px-3 py-2 rounded-md text-sm border shadow-lg ${
              t.level === "error"
                ? "bg-red-950/90 border-red-700 text-red-100"
                : t.level === "success"
                  ? "bg-emerald-950/90 border-emerald-700 text-emerald-100"
                  : "bg-bg-elevated border-border-default text-text-primary"
            }`}
          >
            {t.message}
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}

export function useToasts() {
  const v = useContext(Ctx);
  if (!v) throw new Error("ToastsProvider missing");
  return v;
}
