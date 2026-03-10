import type { NextConfig } from "next";

// basePath используется только для GitHub Pages (при сборке)
const isProd = process.env.NODE_ENV === 'production';
const basePath = isProd ? '/check' : '';

const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  basePath: basePath || undefined,
  assetPrefix: basePath ? `${basePath}/` : undefined,
  images: {
    unoptimized: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
};

export default nextConfig;
