'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

// In-memory cache so repeated useFeature() calls don't each hit Supabase
const cache: Record<string, boolean> = {};
const listeners: Set<() => void> = new Set();

function notify() { listeners.forEach(fn => fn()); }

async function fetchAll() {
  const { data } = await supabase.from('feature_toggles').select('feature_slug, enabled');
  if (data) {
    data.forEach(row => { cache[row.feature_slug] = row.enabled; });
    notify();
  }
}

// Kick off initial fetch once
let fetched = false;
function ensureFetched() {
  if (!fetched) { fetched = true; fetchAll(); }
}

/**
 * Returns whether a feature is enabled.
 * Default: true (optimistic — UI shows until proven otherwise).
 * Usage: const showChemicals = useFeature('inventory.chemicals');
 */
export function useFeature(slug: string): boolean {
  const [enabled, setEnabled] = useState<boolean>(cache[slug] ?? true);

  const sync = useCallback(() => {
    if (slug in cache) setEnabled(cache[slug]);
  }, [slug]);

  useEffect(() => {
    ensureFetched();
    listeners.add(sync);
    sync();
    return () => { listeners.delete(sync); };
  }, [sync]);

  return enabled;
}

/**
 * Returns a setter to toggle a feature from the admin page.
 */
export async function setFeature(slug: string, enabled: boolean, updatedBy: string): Promise<void> {
  await supabase.from('feature_toggles').update({ enabled, updated_by: updatedBy, updated_at: new Date().toISOString() }).eq('feature_slug', slug);
  cache[slug] = enabled;
  notify();
}

/**
 * Returns all feature toggles (for the admin page).
 */
export async function getAllFeatures() {
  const { data } = await supabase.from('feature_toggles').select('*').order('category').order('feature_name');
  return data ?? [];
}
