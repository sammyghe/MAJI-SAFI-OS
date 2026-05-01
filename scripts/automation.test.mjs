import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const readText = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');
const readJson = async (path) => JSON.parse(await readText(path));

test('package exposes automation scripts', async () => {
  const pkg = await readJson('package.json');

  assert.equal(pkg.scripts.build, 'next build');
  assert.equal(pkg.scripts.start, 'next start');
  assert.ok(pkg.scripts.lint, 'lint script is required');
  assert.ok(pkg.scripts.test, 'test script is required');
  assert.ok(pkg.scripts.healthcheck, 'healthcheck script is required');
  assert.ok(pkg.scripts['notify:deployment-failure'], 'failure notification script is required');
});

test('Vercel uses deterministic Next.js build settings', async () => {
  const vercel = await readJson('vercel.json');

  assert.equal(vercel.framework, 'nextjs');
  assert.equal(vercel.buildCommand, 'next build');
  assert.equal(vercel.installCommand, 'npm ci');
  assert.ok(Array.isArray(vercel.crons), 'Vercel cron jobs should stay configured');
});

test('CI validates before Vercel deployment promotes production', async () => {
  const ci = await readText('.github/workflows/ci.yml');
  const deploy = await readText('.github/workflows/deploy.yml');

  for (const command of ['npm ci', 'npm test', 'npm run build']) {
    assert.ok(ci.includes(command), `CI should run ${command}`);
  }

  assert.ok(deploy.includes('workflows:'), 'deploy workflow should be gated by CI workflow_run');
  assert.ok(deploy.includes('vercel deploy --prebuilt --prod --skip-domain'), 'production deploy should stage before promotion');
  assert.ok(deploy.includes('npm run healthcheck'), 'deployment candidate should be health-checked');
  assert.ok(deploy.includes('vercel promote'), 'healthy production candidate should be promoted');
});

test('production monitor and dependency automation are present', async () => {
  const monitor = await readText('.github/workflows/deployment-monitor.yml');
  const dependabot = await readText('.github/dependabot.yml');

  assert.ok(monitor.includes('cron: "*/30 * * * *"'), 'production monitor should run every 30 minutes');
  assert.ok(monitor.includes('npm run healthcheck'), 'production monitor should run the health check script');
  assert.ok(dependabot.includes('package-ecosystem: npm'), 'Dependabot should monitor npm dependencies');
  assert.ok(dependabot.includes('package-ecosystem: github-actions'), 'Dependabot should monitor GitHub Actions');
});
