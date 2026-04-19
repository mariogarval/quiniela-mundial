import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Quiniela Mundial 2026",
  description: "La quiniela del Mundial 2026 para ti y tu crew.",
};

export const viewport: Viewport = {
  themeColor: "#0D0F14",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className="bg-bg">
      <body className="min-h-screen bg-bg text-white font-sans antialiased">{children}</body>
    </html>
  );
}
