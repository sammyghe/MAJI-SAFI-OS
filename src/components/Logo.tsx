"use client";

import { useState } from 'react';
import Link from 'next/link';
import { Droplets } from 'lucide-react';

interface LogoProps {
  href?: string;
}

export default function Logo({ href = "/" }: LogoProps) {
  const [imageFailed, setImageFailed] = useState(false);

  return (
    <Link href={href} className="flex items-center gap-4 group">
      {!imageFailed ? (
        <img 
          src="/maji-logo.png" 
          alt="Maji Safi Logo" 
          className="h-16 w-auto object-contain drop-shadow-2xl group-hover:scale-105 transition-transform" 
          onError={() => setImageFailed(true)}
        />
      ) : (
        <>
          <div className="p-3 bg-gradient-to-br from-brand-steel to-brand-navy rounded-2xl shadow-lg group-hover:shadow-brand-sky/20 transition-all duration-500">
            <Droplets className="w-8 h-8 text-white animate-pulse" />
          </div>
          <div className="flex flex-col">
            <h1 className="text-3xl font-black tracking-tighter text-white uppercase italic">
              MajiSafi<span className="text-brand-sky">OS</span>
            </h1>
            <p className="text-[10px] font-bold text-brand-steel tracking-widest uppercase italic">Pure Productivity</p>
          </div>
        </>
      )}
    </Link>
  );
}

