import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@shared/core'],
  experimental: {
    viewTransition: true,
  },
};

export default nextConfig;
