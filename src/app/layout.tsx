import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "FUTPUL",
  description: "Haz tus predicciones del Mundial 2026 con tu grupo. Gratis en futpul.com",
  metadataBase: new URL("https://futpul.com"),
  openGraph: {
    title: "FUTPUL",
    description: "Haz tus predicciones del Mundial 2026 con tu grupo. Gratis en futpul.com",
    images: ["/images/futpul-logo.svg"],
  },
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
      <head>
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="icon" href="/favicon.ico" sizes="any" />
      </head>
      <body className="min-h-screen bg-bg text-white font-sans antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
