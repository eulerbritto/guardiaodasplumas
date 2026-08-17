// src/app/layout.tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Guardião das Plumas",
  description: "Gerenciamento individual de aves",
  manifest: "/manifest.json",
  themeColor: "#059669", // emerald-600
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