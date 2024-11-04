import type { NextConfig } from 'next';

const isGithubActions = process.env.GITHUB_ACTIONS === 'true';
const repo = 'whatmorecouldyouneed'; // Your repository name without .github.io

const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: 'export',
  basePath: isGithubActions ? `/${repo}` : '',
  assetPrefix: isGithubActions ? `/${repo}/` : '',
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
};

export default nextConfig;