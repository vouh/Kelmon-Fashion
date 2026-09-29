"use client";

import { ThemeProvider } from "./ThemeProvider";
import { CartProvider } from "./CartProvider";
import { AuthProvider } from "./AuthProvider";
import { ToastProvider } from "@/components/ui/Toast";
import { AuthModalProvider } from "@/components/auth/AuthModal";

export default function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <AuthProvider>
        <CartProvider>
          <ToastProvider>
            <AuthModalProvider>{children}</AuthModalProvider>
          </ToastProvider>
        </CartProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
