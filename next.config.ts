import type { NextConfig } from 'next';

// set NEXT_STATIC_EXPORT=true when deploying to github pages (yarn deploy)
// static export cannot use headers() or server-side features
const isStaticExport = process.env.NEXT_STATIC_EXPORT === 'true';

const nextConfig: NextConfig = {
  reactStrictMode: false,
  basePath: '',
  assetPrefix: '',
  // output: 'export' produces the out/ folder needed for github pages
  // omit when running next dev/start so the local server still works
  ...(isStaticExport ? { output: 'export', trailingSlash: true } : {}),
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
  // headers() is incompatible with output: 'export' — only apply for next dev/start
  ...(!isStaticExport ? {
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
      {
        // mind files need explicit content-type so mindar's tf.js loader doesn't reject them
        source: '/patterns/:path*.mind',
        headers: [
          { key: 'Content-Type', value: 'application/octet-stream' },
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Cache-Control', value: 'public, max-age=3600' },
        ],
      },
    ],
  } : {}),
};

export default nextConfig;
