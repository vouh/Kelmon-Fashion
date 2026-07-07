import type { Metadata } from "next";
import { Inter, Playfair_Display, Cormorant_Garamond } from "next/font/google";
import AppProviders from "@/components/providers/AppProviders";
import "@/styles/design.css";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
});

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["600"],
  variable: "--font-cormorant",
});

export const metadata: Metadata = {
  title: "Kelmon — Beauty • Fashion • Glamour",
  description: "Premium fashion & beauty marketplace for campus students in Kenya",
};

const themeScript = `
(function() {
  try {
    var t = localStorage.getItem('kelmon-theme');
    var d = t || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    document.documentElement.classList.add(d);
  } catch (e) {
    document.documentElement.classList.add('dark');
  }
})();
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className={`${inter.variable} ${playfair.variable} ${cormorant.variable} kelmon-theme antialiased min-h-screen flex flex-col font-body-md text-body-md`}>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
