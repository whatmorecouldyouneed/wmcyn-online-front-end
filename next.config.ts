import type { NextConfig } from 'next';

const isGithubActions = process.env.GITHUB_ACTIONS === 'true';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  basePath: isGithubActions ? '/whatmorecouldyouneed.github.io' : '',
  assetPrefix: isGithubActions ? '/whatmorecouldyouneed.github.io/' : '',
  images: {
    unoptimized: true,
  },
  output: 'export',
};

export default nextConfig;
