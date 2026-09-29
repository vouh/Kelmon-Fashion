"use client";

import { ThemeProvider } from "./ThemeProvider";
import { CartProvider } from "./CartProvider";
import { AuthProvider } from "./AuthProvider";
import { ToastProvider } from "@/components/ui/Toast";
import { AuthModalProvider } from "@/components/auth/AuthModal";
import { ConfirmProvider } from "@/components/ui/ConfirmDialog";

export default function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <AuthProvider>
        <CartProvider>
          <ToastProvider>
            <ConfirmProvider>
              <AuthModalProvider>{children}</AuthModalProvider>
            </ConfirmProvider>
          </ToastProvider>
        </CartProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
