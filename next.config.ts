import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["pdf-parse"],
  webpack: (config, { isServer }) => {
    config.externals = config.externals || [];
    config.externals.push({
      'canvas': 'commonjs canvas'
    });
    return config;
  },
  // Explicitly configure Turbopack to suppress the error
  turbopack: {},
  experimental: {
    webpackBuildWorker: true,
  },

};

export default nextConfig;
