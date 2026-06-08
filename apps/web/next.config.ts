import type { NextConfig } from 'next';

// Статическая сборка под GitHub Pages: NEXT_PUBLIC_STATIC=true.
// Тогда — output:'export', basePath репозитория и unoptimized-картинки.
const STATIC = process.env['NEXT_PUBLIC_STATIC'] === 'true';
const BASE = STATIC ? '/betprediction' : '';

const config: NextConfig = {
  transpilePackages: ['@ai-score/shared'],
  images: {
    unoptimized: STATIC,
    remotePatterns: [
      { hostname: 'media.api-sports.io' },
      { hostname: 'crests.football-data.org' },
    ],
  },
  // Прокидываем базовый путь в клиент — чтобы fetch('/data/..') знал префикс Pages.
  env: { NEXT_PUBLIC_BASE_PATH: BASE },
  ...(STATIC ? { output: 'export' as const, basePath: BASE, assetPrefix: BASE } : {}),
  experimental: {},
};

export default config;
