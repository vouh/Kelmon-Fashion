"use client";

import { createContext, useContext, useEffect, useState } from "react";

interface SidebarContextValue {
  isOpen: boolean;
  toggle: () => void;
  close: () => void;
}

const SidebarContext = createContext<SidebarContextValue | null>(null);

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const isDesktop = window.matchMedia("(min-width: 768px)").matches;
    const stored = localStorage.getItem("kelmon-sidebar");
    setIsOpen(stored === "closed" ? false : isDesktop || stored === "open");
  }, []);

  const persist = (open: boolean) => {
    localStorage.setItem("kelmon-sidebar", open ? "open" : "closed");
  };

  const toggle = () => {
    setIsOpen((prev) => {
      const next = !prev;
      persist(next);
      return next;
    });
  };

  const close = () => {
    setIsOpen(false);
    persist(false);
  };

  return (
    <SidebarContext.Provider value={{ isOpen, toggle, close }}>
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebar() {
  const ctx = useContext(SidebarContext);
  if (!ctx) throw new Error("useSidebar must be used within SidebarProvider");
  return ctx;
}

export const SIDEBAR_WIDTH = 260;
