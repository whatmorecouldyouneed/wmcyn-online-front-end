import type { NextConfig } from 'next';

const isGithubActions = process.env.GITHUB_ACTIONS === 'true';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: 'export',
  basePath: isGithubActions ? '/whatmorecouldyouneed.github.io' : '',
  assetPrefix: isGithubActions ? '/whatmorecouldyouneed.github.io/' : '',
  images: {
    unoptimized: true, 
  },
};

export default nextConfig;
