# Deployment Automation

This repository is configured for guarded GitHub to Vercel delivery.

## What Happens On Push

1. `CI` runs on every pushed branch and on pull requests to `master` or `main`.
2. CI installs dependencies with `npm ci`, runs the Node test suite, and builds Next.js.
3. `Vercel Deploy` starts only after CI succeeds for a push.
4. Non-production branches deploy to a Vercel preview.
5. `master` or `main` deploys a production candidate with `--skip-domain`.
6. The candidate is health-checked before it is promoted to the production domain.
7. If any step fails, GitHub marks the workflow failed, writes a failure summary, optionally posts to Slack, and creates or updates a GitHub issue.

## Required GitHub Secrets

Set these in GitHub repository settings:

- `VERCEL_TOKEN`
- `VERCEL_ORG_ID`
- `VERCEL_PROJECT_ID`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `GROQ_API_KEY`
- `GEMINI_API_KEY`
- `ANTHROPIC_API_KEY`

Optional notification and monitor settings:

- `SLACK_WEBHOOK_URL`
- `PRODUCTION_URL` as either a repository secret or variable
- `VERCEL_PRODUCTION_URL` as an alternative to `PRODUCTION_URL`

## Reliability Notes

- Keep Vercel's Git integration connected. It can still create native preview deployments for pull requests.
- Treat GitHub Actions as the promotion gate for production.
- Keep `PRODUCTION_URL` pointed at the public production domain so the scheduled monitor checks the same URL users open.
- Dependabot opens weekly PRs for npm packages and GitHub Actions. CI must pass before those updates merge.
- When a production candidate fails health checks, it is not promoted.
- Full ESLint gating should be enabled after the current application lint debt is cleaned up. The repo still exposes `npm run lint` for that audit.
- CI and Vercel CLI builds set `NODE_OPTIONS=--max-old-space-size=4096` so TypeScript checking has enough heap for the current app size.
