---
name: debug
description: Something is broken. Use when user reports bugs, errors, "not working", "connection error", or asks to fix something. Diagnose before changing code.
---
Before writing any fix:
1. Read the exact error message from the user. If vague, ask them to check browser DevTools Network tab and paste the response body of the failing request.
2. Check Vercel deployment logs for the most recent deploy.
3. Check Supabase logs if database-related.
4. Form a hypothesis. State it clearly to the user.
5. Only then propose a fix. Do not make speculative code changes.
Never jump to fixing before diagnosing. Never touch env vars in code — only Vercel dashboard.
