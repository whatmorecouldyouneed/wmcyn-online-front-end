import type { NextConfig } from 'next';

const isProd = process.env.NODE_ENV === 'production';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  basePath: isProd ? '/wmcyn-online-front-end' : '',
  assetPrefix: isProd ? '/wmcyn-online-front-end/' : '',
  images: {
    unoptimized: true, // Disable Next.js image optimization for GitHub Pages
  },
  output: 'export', // Use 'output: export' to support static build
};

export default nextConfig;
