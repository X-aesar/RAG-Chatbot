import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["pdf-parse"],
  webpack: (config, { isServer }) => {
    config.externals = config.externals || [];
    config.externals.push({
      'canvas': 'commonjs canvas'
    });
    
    // Add polyfills for DOM APIs that pdf-parse needs
    if (isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        canvas: false,
        encoding: false,
      };
      
      // Define DOMMatrix polyfill
      config.resolve.alias = {
        ...config.resolve.alias,
        'canvas': false,
      };
    }
    
    return config;
  },
  // Explicitly configure Turbopack to suppress the error
  turbopack: {},
  experimental: {
    webpackBuildWorker: true,
    serverActions: {
      bodySizeLimit: '10mb'
    }
  },

};

export default nextConfig;
