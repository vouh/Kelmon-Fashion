"use client";

import { createContext, useCallback, useContext, useState } from "react";

interface ToastContextValue {
  toast: (message: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [message, setMessage] = useState<string | null>(null);

  const toast = useCallback((msg: string) => {
    setMessage(msg);
    window.setTimeout(() => setMessage(null), 2400);
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      {message && (
        <div
          role="status"
          className="fixed bottom-24 md:bottom-8 left-1/2 -translate-x-1/2 z-[100] px-5 py-3 rounded-full bg-surface-container-highest border border-secondary/40 text-on-surface font-body-md text-body-md shadow-nav"
        >
          {message}
        </div>
      )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}
