import { supabase } from './supabase';

let cachedRate: { rate: number; fetched_at: number } | null = null;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export async function getCurrentFxRate(
  from: string,
  to: string
): Promise<number> {
  if (
    from === 'UGX' && to === 'USD' &&
    cachedRate && Date.now() - cachedRate.fetched_at < CACHE_TTL
  ) {
    return cachedRate.rate;
  }

  const today = new Date().toISOString().slice(0, 10);
  const { data } = await supabase
    .from('fx_rates')
    .select('rate')
    .eq('from_currency', from)
    .eq('to_currency', to)
    .lte('effective_from', today)
    .or('effective_to.is.null,effective_to.gte.' + today)
    .order('effective_from', { ascending: false })
    .limit(1)
    .single();

  const rate = data?.rate ?? 0.000271; // fallback to ~3700 UGX/USD
  if (from === 'UGX' && to === 'USD') {
    cachedRate = { rate, fetched_at: Date.now() };
  }
  return rate;
}

export interface FormatMoneyOptions {
  showUSD?: boolean;
  compact?: boolean;
  fxRate?: number;
}

export function formatMoney(
  amountUGX: number,
  options: FormatMoneyOptions = {}
): string {
  const { showUSD = false, compact = false, fxRate = 0.000271 } = options;

  const ugx = compact
    ? amountUGX >= 1_000_000
      ? `UGX ${(amountUGX / 1_000_000).toFixed(1)}M`
      : amountUGX >= 1_000
      ? `UGX ${(amountUGX / 1_000).toFixed(0)}K`
      : `UGX ${amountUGX.toLocaleString()}`
    : `UGX ${amountUGX.toLocaleString()}`;

  if (!showUSD) return ugx;

  const usd = (amountUGX * fxRate).toFixed(2);
  return `${ugx} ($${usd})`;
}

export function convertCurrency(
  amount: number,
  from: string,
  to: string,
  rate: number
): number {
  if (from === to) return amount;
  if (from === 'UGX' && to === 'USD') return amount * rate;
  if (from === 'USD' && to === 'UGX') return amount / rate;
  return amount;
}
