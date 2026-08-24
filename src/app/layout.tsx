// src/app/layout.tsx
import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const viewport: Viewport = {
  themeColor: "#059669", // Cor esmeralda do nosso tema
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};


export const metadata: Metadata = {
  title: "Guardião das Plumas",
  description: "Gestão do seu plantel na palma da mão",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Guardião",
  },
  formatDetection: {
    telephone: false,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body 
        suppressHydrationWarning 
        className={`${inter.className} bg-gray-50 text-gray-900 pb-20 md:pb-0`}
      >
        {children}
      </body>
    </html>
  );
}