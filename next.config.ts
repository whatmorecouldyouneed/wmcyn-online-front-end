import type { NextConfig } from 'next';

const isProd = process.env.NODE_ENV === 'production';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  basePath: isProd ? '/<your-github-repo-name>' : '',
  assetPrefix: isProd ? '/<your-github-repo-name>/' : '',
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
