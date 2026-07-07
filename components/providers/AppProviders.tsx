"use client";

import { ThemeProvider } from "./ThemeProvider";
import { SidebarProvider } from "./SidebarProvider";

export default function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <SidebarProvider>{children}</SidebarProvider>
    </ThemeProvider>
  );
}
