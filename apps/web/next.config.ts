import type { NextConfig } from 'next';

const config: NextConfig = {
  transpilePackages: ['@ai-score/shared'],
  images: {
    remotePatterns: [
      { hostname: 'media.api-sports.io' },
      { hostname: 'crests.football-data.org' },
    ],
  },
  experimental: {},
};

export default config;
