import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: [
    '@grip-health/ui',
    '@grip-health/config',
    '@grip-health/auth',
    '@grip-health/contracts',
    '@grip-health/utils',
  ],
};

export default nextConfig;
