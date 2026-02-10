import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["pdf-parse"],
  webpack: (config) => {
    config.externals = config.externals || [];
    config.externals.push({
      'canvas': 'commonjs canvas'
    });
    return config;
  }
};

export default nextConfig;
