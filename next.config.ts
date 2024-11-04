import type { NextConfig } from 'next';

const isProd = process.env.NODE_ENV === 'production';
const repoName = 'whatmorecouldyouneed.github.io';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: 'export',  // Add this line
  basePath: isProd ? `/${repoName}` : '',
  assetPrefix: isProd ? `/${repoName}` : '',
  images: {
    unoptimized: true,
  },
};

export default nextConfig;