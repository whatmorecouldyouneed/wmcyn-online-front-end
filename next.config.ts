import type { NextConfig } from 'next';

const isGithubActions = process.env.GITHUB_ACTIONS === 'true';

const nextConfig: NextConfig = {
  reactStrictMode: false,
  basePath: '',
  assetPrefix: '',
  images: {
    unoptimized: true,
    domains: [
      'cdn.shopify.com',
      'shopify.com',
    ],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  trailingSlash: true,
  output: 'export',
};

export default nextConfig;
