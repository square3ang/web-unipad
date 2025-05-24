import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  /* other config options */
  experimental: {
    urlImports: ["https://cdn.jsdelivr.net/", "https://fonts.googleapis.com/", "https://fonts.gstatic.com/"]
  }
};

export default nextConfig;
