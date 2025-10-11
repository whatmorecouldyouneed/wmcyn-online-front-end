import type { NextConfig } from 'next';

const isGithubActions = process.env.GITHUB_ACTIONS === 'true';

const nextConfig: NextConfig = {
  reactStrictMode: false,
  basePath: '',
  assetPrefix: '',
  images: {
    unoptimized: true,
    loader: 'default',
    domains: [
      'cdn.shopify.com',
      'shopify.com',
    ],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  trailingSlash: false,
  output: 'export', // Enable static export for GitHub Pages deployment
  // dev-only headers for serving 3d model assets with correct mime and cors
  // note: with static export these only apply when running next dev/start
  headers: async () => [
    {
      source: '/:all*.glb',
      headers: [
        { key: 'Content-Type', value: 'model/gltf-binary' },
        { key: 'Access-Control-Allow-Origin', value: '*' },
        { key: 'Cross-Origin-Resource-Policy', value: 'cross-origin' },
      ],
    },
    {
      source: '/:all*.gltf',
      headers: [
        { key: 'Content-Type', value: 'model/gltf+json' },
        { key: 'Access-Control-Allow-Origin', value: '*' },
        { key: 'Cross-Origin-Resource-Policy', value: 'cross-origin' },
      ],
    },
    {
      source: '/models/:path*',
      headers: [
        { key: 'Access-Control-Allow-Origin', value: '*' },
        { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
      ],
    },
  ],
};

export default nextConfig;
