const DEFAULT_PATHS = ['/login', '/manifest.webmanifest'];
const timeoutMs = Number(process.env.HEALTHCHECK_TIMEOUT_MS ?? 15000);

function normalizeBaseUrl(value) {
  if (!value) return '';
  const trimmed = value.trim().replace(/\/+$/, '');
  if (!/^https?:\/\//i.test(trimmed)) return `https://${trimmed}`;
  return trimmed;
}

function healthcheckPaths() {
  const configured = process.env.HEALTHCHECK_PATHS;
  if (!configured) return DEFAULT_PATHS;
  return configured
    .split(',')
    .map((path) => path.trim())
    .filter(Boolean)
    .map((path) => (path.startsWith('/') ? path : `/${path}`));
}

async function fetchWithTimeout(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'maji-safi-deployment-healthcheck/1.0',
      },
    });
  } finally {
    clearTimeout(timer);
  }
}

async function checkPath(baseUrl, path) {
  const url = `${baseUrl}${path}`;
  const started = Date.now();
  const response = await fetchWithTimeout(url);
  const elapsedMs = Date.now() - started;
  const body = await response.text();

  const looksBroken =
    body.includes('Application error') ||
    body.includes('500: Internal Server Error');

  if (response.status < 200 || response.status >= 400 || looksBroken) {
    throw new Error(`${path} failed: HTTP ${response.status}, ${elapsedMs}ms`);
  }

  if (path.includes('manifest')) {
    JSON.parse(body);
  }

  return {
    path,
    status: response.status,
    elapsedMs,
  };
}

const appUrl = normalizeBaseUrl(process.env.APP_URL || process.env.PRODUCTION_URL || process.env.VERCEL_URL);

if (!appUrl) {
  throw new Error('Set APP_URL, PRODUCTION_URL, or VERCEL_URL before running the deployment health check.');
}

const results = [];

for (const path of healthcheckPaths()) {
  results.push(await checkPath(appUrl, path));
}

console.log(JSON.stringify({
  ok: true,
  appUrl,
  checkedAt: new Date().toISOString(),
  results,
}, null, 2));
