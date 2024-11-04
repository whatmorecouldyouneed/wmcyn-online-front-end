import type { NextConfig } from 'next';

const isGithubActions = process.env.GITHUB_ACTIONS === 'true';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Set basePath and assetPrefix to empty so it works for custom domains without breaking asset paths.
  basePath: '',
  assetPrefix: '',
  images: {
    unoptimized: true, // Disable image optimization for GitHub Pages/static export
  },
  trailingSlash: true, // Ensures that all routes have trailing slashes for proper directory resolution.
  output: 'export', // Supports a static HTML build for GitHub Pages.
};

export default nextConfig;
