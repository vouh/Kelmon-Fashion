"use client";

import { ThemeProvider } from "./ThemeProvider";
import { SidebarProvider } from "./SidebarProvider";
import { CartProvider } from "./CartProvider";
import { FirebaseProvider } from "./FirebaseProvider";
import { ToastProvider } from "@/components/ui/Toast";

export default function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <FirebaseProvider>
        <SidebarProvider>
          <CartProvider>
            <ToastProvider>{children}</ToastProvider>
          </CartProvider>
        </SidebarProvider>
      </FirebaseProvider>
    </ThemeProvider>
  );
}
