import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@padelking/domain', '@padelking/supabase', '@padelking/ui'],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
      },
    ],
  },
  experimental: {
    optimizePackageImports: ['lucide-react'],
  },
  async redirects() {
    return [
      { source: '/rankings', destination: '/app', permanent: true },
      { source: '/rankings/:path*', destination: '/app', permanent: true },
    ];
  },
};

export default nextConfig;
