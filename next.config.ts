import type { NextConfig } from 'next';

const isProd = process.env.NODE_ENV === 'production';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  basePath: isProd ? '/whatmorecouldyouneed.github.io' : '',
  assetPrefix: isProd ? '/whatmorecouldyouneed.github.io' : '',
  images: {
    unoptimized: true, // Disable Next.js image optimization for GitHub Pages
  },
  output: 'export', // Set output to export to support static build
};

export default nextConfig;
