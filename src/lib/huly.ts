/**
 * Huly REST API client for server-side / Edge use.
 *
 * Required env vars:
 *   HULY_TOKEN        — API token from Huly workspace settings
 *   HULY_WORKSPACE    — workspace URL slug (default: majisafioffice)
 *   HULY_API_URL      — base URL (default: https://api.huly.io)
 */

const HULY_API_URL = process.env.HULY_API_URL ?? 'https://api.huly.io';
const HULY_WORKSPACE = process.env.HULY_WORKSPACE ?? 'majisafioffice';

/**
 * Channel IDs created during workspace setup.
 * If channels are recreated, update these values.
 */
export const HULY_CHANNELS = {
  ALL_ALERTS:  '69d8d4c482af75baf176ecc8',
  DAILY_PULSE: '69d8d4c482af75baf176ecca',
} as const;

function headers(): Record<string, string> {
  const token = process.env.HULY_TOKEN;
  if (!token) throw new Error('HULY_TOKEN env var is not set');
  return {
    Authorization:  `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

export type HulyPriority = 'urgent' | 'high' | 'medium' | 'low' | 'no-priority';

/**
 * Create an issue in a tracker project.
 * Returns the new issue identifier (e.g. "QC-7") or null on failure.
 */
export async function hulyCreateIssue(params: {
  project:      string;
  title:        string;
  description?: string;
  priority?:    HulyPriority;
}): Promise<{ identifier: string } | null> {
  try {
    const res = await fetch(
      `${HULY_API_URL}/api/v1/spaces/${HULY_WORKSPACE}/tracker/${params.project}/issues`,
      {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify({
          title:       params.title,
          description: params.description,
          priority:    params.priority,
        }),
      }
    );
    if (!res.ok) {
      console.error('[Huly] createIssue failed', res.status, await res.text());
      return null;
    }
    return res.json() as Promise<{ identifier: string }>;
  } catch (err) {
    console.error('[Huly] createIssue error', err);
    return null;
  }
}

/**
 * Post a plain-text message to a Huly channel.
 * Returns true on success.
 */
export async function hulyPostMessage(channelId: string, text: string): Promise<boolean> {
  try {
    const res = await fetch(
      `${HULY_API_URL}/api/v1/spaces/${HULY_WORKSPACE}/chunter/channels/${channelId}/messages`,
      {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify({ text }),
      }
    );
    if (!res.ok) {
      console.error('[Huly] postMessage failed', res.status, await res.text());
      return false;
    }
    return true;
  } catch (err) {
    console.error('[Huly] postMessage error', err);
    return false;
  }
}
