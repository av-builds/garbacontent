import type { NextConfig } from "next";

// Static export for GitHub Pages: served at https://<owner>.github.io/garbacontent/
const nextConfig: NextConfig = {
  output: "export",
  basePath: "/garbacontent",
  trailingSlash: true,
  images: { unoptimized: true },
};

export default nextConfig;
