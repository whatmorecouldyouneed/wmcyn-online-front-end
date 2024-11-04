import type { NextConfig } from 'next';

const isProd = process.env.NODE_ENV === 'production';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    unoptimized: true, // Disable Next.js image optimization to support static build export
  },
  trailingSlash: true, // Ensure URLs end with a trailing slash for consistent paths
  output: 'export', // Use static HTML export for deployment
};

export default nextConfig;
