'use client';

import dynamic from 'next/dynamic';

const GalaxyCanvas = dynamic(() => import('@/components/GalaxyCanvas'), { ssr: false });

export default function GalaxyPage() {
  return <GalaxyCanvas />;
}
