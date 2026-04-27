'use client';

import dynamic from 'next/dynamic';

const GalaxyCanvas = dynamic(() => import('@/components/GalaxyCanvas'), { ssr: false });

export default function GalaxyPage() {
  return <div className="dark"><GalaxyCanvas /></div>;
}
