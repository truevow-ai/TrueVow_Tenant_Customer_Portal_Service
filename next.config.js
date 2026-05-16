/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  
  // Environment variables exposed to browser
  env: {
    NEXT_PUBLIC_APP_NAME: 'TrueVow Customer Portal',
    NEXT_PUBLIC_APP_VERSION: '1.0.0',
  },
  
  // Image optimization
  images: {
    domains: ['truevow.ai', 'api.truevow.ai'],
  },
  
  // Security headers
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;

