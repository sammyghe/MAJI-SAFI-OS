---
name: ship
description: Deploy to production. Use when user says ship, deploy, push live, or finishing work. Runs build, commits, pushes, redeploys Vercel without build cache, verifies green.
---
Sequence, no shortcuts:
1. Run `npm run build`. If errors, fix them first, don't skip.
2. `git add -A`
3. `git commit -m "<descriptive message summarizing what changed>"`
4. `git push origin master`
5. `npx vercel --prod --yes`
6. After deploy URL returns, tell user the URL and the commit hash. Report any warnings.
Never skip the build step. Never commit with generic messages like "updates".
