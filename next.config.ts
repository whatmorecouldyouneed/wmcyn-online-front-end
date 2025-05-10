import type { NextConfig } from 'next';

const isGithubActions = process.env.GITHUB_ACTIONS === 'true';

const nextConfig: NextConfig = {
  reactStrictMode: false,
  basePath: '',
  assetPrefix: '',
  // disable image optimization for GitHub Pages/static export because it breaks the asset paths
  images: {
    unoptimized: true,
  },
  trailingSlash: true,
  output: 'export',
};

export default nextConfig;
