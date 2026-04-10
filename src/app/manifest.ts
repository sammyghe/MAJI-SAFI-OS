import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Maji Safi OS',
    short_name: 'MajiOS',
    description: 'Operational intelligence for Maji Safi water factory — Hydrate. Elevate.',
    start_url: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#021024',
    theme_color: '#021024',
    categories: ['business', 'productivity'],
    icons: [
      {
        src: '/maji safi logo (3).png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/maji safi logo (3).png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/favicon.ico',
        sizes: 'any',
        type: 'image/x-icon',
      },
    ],
    screenshots: [],
  };
}
