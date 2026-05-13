import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    optimizePackageImports: ['lucide-react'],
  },
  images: {
    loader: 'custom',
    loaderFile: './lib/dmm/image-loader.ts',
    remotePatterns: [
      { protocol: "https", hostname: "pics.dmm.co.jp" },
      { protocol: "https", hostname: "pics.dmm.com" },
      { protocol: "https", hostname: "awsimgsrc.dmm.co.jp" },
    ],
  },
};

export default nextConfig;
