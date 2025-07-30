/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Exclude problematic dependencies from server-side bundling
      config.externals.push({
        '@hpke/chacha20poly1305': 'commonjs @hpke/chacha20poly1305',
        '@hpke/common': 'commonjs @hpke/common',
        '@hpke/core': 'commonjs @hpke/core',
      });
    }
    
    // Handle Node.js modules
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
      crypto: false,
    };
    
    return config;
  },
};

module.exports = nextConfig;
