import { NextRequest, NextResponse } from 'next/server';

// Google Drive file IDs for Maji Safi logos
const LOGO_IDS = {
  main: '14m6IwsHrJyN2lBZ3118b1KriQCXbk4SA',
  white: '1XNHo0nX2Xee3gTe4pLZY3zVQT05sZKxa',
};

// Simple in-memory cache (24h TTL)
const cache: Record<string, { data: ArrayBuffer; contentType: string; ts: number }> = {};
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

async function fetchDriveImage(fileId: string): Promise<{ data: ArrayBuffer; contentType: string }> {
  const now = Date.now();
  if (cache[fileId] && now - cache[fileId].ts < CACHE_TTL) {
    return cache[fileId];
  }

  const url = `https://drive.google.com/uc?export=download&id=${fileId}`;
  const res = await fetch(url, { redirect: 'follow' });
  if (!res.ok) throw new Error(`Failed to fetch logo from Drive: ${res.status}`);

  const data = await res.arrayBuffer();
  const contentType = res.headers.get('content-type') || 'image/png';

  cache[fileId] = { data, contentType, ts: now };
  return { data, contentType };
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const variant = searchParams.get('variant') || 'main';

  const fileId = variant === 'white' ? LOGO_IDS.white : LOGO_IDS.main;

  try {
    const { data, contentType } = await fetchDriveImage(fileId);

    return new NextResponse(data, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400, s-maxage=86400',
      },
    });
  } catch (err: unknown) {
    // Fallback: serve local logo
    const localLogoUrl = new URL('/maji safi logo (3).png', request.url);
    try {
      const fallback = await fetch(localLogoUrl);
      const fallbackData = await fallback.arrayBuffer();
      return new NextResponse(fallbackData, {
        status: 200,
        headers: {
          'Content-Type': 'image/png',
          'Cache-Control': 'public, max-age=3600',
        },
      });
    } catch {
      return NextResponse.json(
        { error: 'Failed to fetch logo', detail: String(err) },
        { status: 500 }
      );
    }
  }
}
