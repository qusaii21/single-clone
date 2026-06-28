"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { CheckCircle, XCircle, Info, AlertTriangle, X } from "lucide-react";

export type ToastType = "success" | "error" | "info" | "warning";

interface Toast {
  id: string;
  type: ToastType;
  message: string;
}

// Simple in-memory event bus for toasts
type ToastListener = (toast: Toast) => void;
const listeners = new Set<ToastListener>();

export function toast(message: string, type: ToastType = "info") {
  const t: Toast = { id: Math.random().toString(36).slice(2), type, message };
  listeners.forEach((l) => l(t));
}

export function ToastContainer() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    const listener = (t: Toast) => {
      setToasts((prev) => [...prev, t]);
      setTimeout(() => setToasts((prev) => prev.filter((x) => x.id !== t.id)), 4000);
    };
    listeners.add(listener);
    return () => { listeners.delete(listener); };
  }, []);

  const icons = {
    success: <CheckCircle size={16} className="text-green-400" />,
    error: <XCircle size={16} className="text-red-400" />,
    info: <Info size={16} className="text-blue-400" />,
    warning: <AlertTriangle size={16} className="text-yellow-400" />,
  };

  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={cn(
            "flex items-center gap-3 px-4 py-3 rounded-xl shadow-xl",
            "bg-[#222325] border border-[#3a3b40] text-[#e9edef] text-sm max-w-sm",
            "animate-in slide-in-from-right-4 duration-200"
          )}
        >
          {icons[t.type]}
          <span className="flex-1">{t.message}</span>
          <button
            onClick={() => setToasts((prev) => prev.filter((x) => x.id !== t.id))}
            className="text-[#8696a0] hover:text-[#e9edef]"
          >
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}
