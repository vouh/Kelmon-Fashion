"use client";

import { ThemeProvider } from "./ThemeProvider";
import { CartProvider } from "./CartProvider";
import { FirebaseProvider } from "./FirebaseProvider";
import { ToastProvider } from "@/components/ui/Toast";

export default function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <FirebaseProvider>
        <CartProvider>
          <ToastProvider>{children}</ToastProvider>
        </CartProvider>
      </FirebaseProvider>
    </ThemeProvider>
  );
}
