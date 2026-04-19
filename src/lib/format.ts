export function fmtDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function fmtUGX(n: number | null | undefined): string {
  if (n == null) return '—';
  return `UGX ${n.toLocaleString()}`;
}
