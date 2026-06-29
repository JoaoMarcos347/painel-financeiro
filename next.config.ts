import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Gera .next/standalone (server.js mínimo) para imagem Docker enxuta.
  output: "standalone",
};

export default nextConfig;
