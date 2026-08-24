import type { NextConfig } from "next";
import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development", // Só ativa o cache forte na Vercel (Produção) para não atrapalhar você programando
});

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // ... caso você tenha outras configurações aqui, pode manter
};

export default withPWA(nextConfig);