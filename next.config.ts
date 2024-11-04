import type { NextConfig } from 'next';

const isGithubActions = process.env.GITHUB_ACTIONS === 'true';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // For GitHub Pages, basePath and assetPrefix are needed to ensure assets load correctly
  basePath: isGithubActions ? '/wmcyn-online-front-end' : '',
  assetPrefix: isGithubActions ? '/wmcyn-online-front-end/' : '',
  images: {
    unoptimized: true, // Disable Next.js image optimization for GitHub Pages compatibility
  },
  trailingSlash: true, // Ensures consistent routing for static site export
  output: 'export', // Export the site as static HTML files
};

export default nextConfig;
