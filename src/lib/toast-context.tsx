"use client";

import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from "react";
import { CheckCircle2, Info, X, AlertTriangle } from "lucide-react";

type ToastKind = "success" | "info" | "warning";
interface Toast {
  id: number;
  kind: ToastKind;
  message: string;
}

const ToastCtx = createContext<{ toast: (message: string, kind?: ToastKind) => void }>({
  toast: () => {},
});

export function useToast() {
  return useContext(ToastCtx);
}

let nextId = 1;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Toast[]>([]);

  const dismiss = useCallback((id: number) => {
    setItems((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    (message: string, kind: ToastKind = "success") => {
      const id = nextId++;
      setItems((prev) => [...prev.slice(-3), { id, kind, message }]);
      setTimeout(() => dismiss(id), 3500);
    },
    [dismiss]
  );

  return (
    <ToastCtx.Provider value={{ toast }}>
      {children}
      <div className="pointer-events-none fixed bottom-5 right-5 z-[100] flex w-80 flex-col gap-2">
        {items.map((t) => (
          <div
            key={t.id}
            className="animate-toast-in pointer-events-auto flex items-start gap-2.5 rounded-lg border border-stone-200 bg-white px-4 py-3 shadow-lg"
          >
            {t.kind === "success" ? (
              <CheckCircle2 className="mt-0.5 h-4.5 w-4.5 shrink-0 text-emerald-500" />
            ) : t.kind === "warning" ? (
              <AlertTriangle className="mt-0.5 h-4.5 w-4.5 shrink-0 text-amber-500" />
            ) : (
              <Info className="mt-0.5 h-4.5 w-4.5 shrink-0 text-sky-500" />
            )}
            <p className="flex-1 text-xs leading-relaxed text-stone-700">
              {t.message}
            </p>
            <button
              onClick={() => dismiss(t.id)}
              className="shrink-0 rounded p-0.5 text-stone-400 hover:bg-stone-100"
              aria-label="Đóng thông báo"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}
