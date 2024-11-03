import type { NextConfig } from 'next';

const isGithubActions = process.env.GITHUB_ACTIONS === 'true';
const basePath = isGithubActions ? '/whatmorecouldyouneed.github.io' : '';
const assetPrefix = isGithubActions ? '/whatmorecouldyouneed.github.io/' : '';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  basePath,
  assetPrefix,
  images: {
    unoptimized: isGithubActions, // Disable image optimization for GitHub Pages
  },
  output: 'export', // Enable static export for Next.js
};

export default nextConfig;
