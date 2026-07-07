"use client";

import { createContext, useContext, useEffect, useState } from "react";

interface SidebarContextValue {
  isOpen: boolean;
  isCollapsed: boolean;
  toggleOpen: () => void;
  toggleCollapsed: () => void;
  close: () => void;
}

const SidebarContext = createContext<SidebarContextValue | null>(null);

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    const isDesktop = window.matchMedia("(min-width: 768px)").matches;
    const stored = localStorage.getItem("kelmon-sidebar");
    if (stored === "closed") {
      setIsOpen(false);
    } else if (stored === "collapsed") {
      setIsOpen(true);
      setIsCollapsed(true);
    } else {
      setIsOpen(isDesktop);
    }
  }, []);

  const persist = (open: boolean, collapsed: boolean) => {
    if (!open) localStorage.setItem("kelmon-sidebar", "closed");
    else if (collapsed) localStorage.setItem("kelmon-sidebar", "collapsed");
    else localStorage.setItem("kelmon-sidebar", "open");
  };

  const toggleOpen = () => {
    setIsOpen((prev) => {
      const next = !prev;
      persist(next, isCollapsed);
      return next;
    });
  };

  const toggleCollapsed = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      if (!isOpen) setIsOpen(true);
      persist(true, next);
      return next;
    });
  };

  const close = () => {
    setIsOpen(false);
    persist(false, isCollapsed);
  };

  return (
    <SidebarContext.Provider value={{ isOpen, isCollapsed, toggleOpen, toggleCollapsed, close }}>
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebar() {
  const ctx = useContext(SidebarContext);
  if (!ctx) throw new Error("useSidebar must be used within SidebarProvider");
  return ctx;
}

export const SIDEBAR_WIDTH_EXPANDED = 260;
export const SIDEBAR_WIDTH_COLLAPSED = 72;
