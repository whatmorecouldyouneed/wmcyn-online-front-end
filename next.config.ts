import type { NextConfig } from 'next';

const isGithubActions = process.env.GITHUB_ACTIONS === 'true';
const isProd = process.env.NODE_ENV === 'production';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  basePath: isGithubActions ? '/wmcyn-online-front-end' : '',
  assetPrefix: isGithubActions ? '/wmcyn-online-front-end/' : '',
  images: {
    unoptimized: true, // Disable Next.js image optimization for static builds
  },
  trailingSlash: true, // Ensures that all routes have trailing slashes, needed for GitHub Pages
  output: 'export', // Export as static HTML files for GitHub Pages
  env: {
    CUSTOM_DOMAIN: isProd && !isGithubActions ? 'https://wmcyn.online' : `https://whatmorecouldyouneed.github.io/wmcyn-online-front-end`,
  },
};

export default nextConfig;
