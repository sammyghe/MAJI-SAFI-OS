# MAJI SAFI OS — WORKSTATION
## The single source of truth for Sammy ↔ Claude collaboration

**Last updated:** April 23, 2026
**Launch target:** May 3, 2026 (10 days out)
**Live at:** https://maji-safi-os.vercel.app

---

## PART 1 — WHERE WE ACTUALLY ARE (HONEST AUDIT)

### What's built and deployed
- 22 routes on Vercel, auto-deploying from GitHub master branch
- 10 departments (9 original + Sales added April 19): Founder Office, Production, Quality, Inventory, Dispatch, Sales, Marketing, Finance, Compliance, Technology
- PIN auth, logout, access control (founder / manager / operator)
- QC fail chain wired: water_tests FAIL → production halt → events → founder alert
- Finance envelope ledger + EOD cash close with force-close audit
- Distributor CRM foundation (add, view, sleeping/churned flags)
- Team CRUD with PIN visibility toggle for founders
- Department health grid on Founder Office
- CAPA tracking from QC fails
- Mobile responsive with hamburger menu + PWA manifest
- Add Anything button with 6 quick actions
- Dept-level read-only banners + edit gates
- Toast notifications, loading skeletons, date/money formatting
- askSAFI chat bubble (component exists, API route exists, NOT VERIFIED WORKING)
- /api/sync-sheets (Google Sheets mirror — code exists, never tested)
- /api/morning-brief (Telegram — code exists, never tested)
- Investor view (public, no login)

### What's built but NOT verified working
- **askSAFI AI chat** — Sammy says it doesn't work. Needs debug.
- **Google Sheets sync** — requires Service Account, never tested end-to-end
- **Telegram morning brief** — needs bot token + chat ID, never fired
- **GitHub Actions auto-deploy** — workflow file exists, secrets never set

### What's structurally missing (gaps identified by consulting-firm lens)
1. **SOPs not in the system** — team knowledge is in people's heads, not the OS
2. **No approval workflows** — anyone can log anything, no maker-checker on large transactions
3. **No P&L report** — raw data exists but no structured financial statement
4. **Simultaneous updates only on founder-office** — other pages need refresh
5. **CRM is surface-level** — no activity log, no pipeline stages, no follow-up reminders
6. **No audit trail visible to users** — system logs who did what, but there's no screen showing it
7. **No customer feedback loop** — end consumers can't rate water
8. **No SOP-on-device AI** — team can't ask "how do I do this" and get SOP-based answer offline
9. **Departments are pages, not offices** — each dept page is a form+table, not a "workspace" with its own feel
10. **Data entered is raw, not narrated** — no summary paragraph explaining what today looked like

### The truth about the velocity
We built 10 sessions worth of features in 6 weeks. But zero real data has flowed through the system. It's a sophisticated empty shell ready for May 3 when real operations start.

---

## PART 2 — THE WORKSTATION RULES

Going forward, every Sammy ↔ Claude interaction follows these rules:

### Rule 1: Design mode vs Build mode are explicit
- **Design mode** = we talk in chat (me with you), no Claude Code used
- **Build mode** = you paste a single focused prompt into Claude Code
- We never leave design mode until the next Claude Code prompt is fully written out

### Rule 2: Anchored to the locked architecture
- **Stack:** Next.js (App Router) + Supabase + Vercel + Groq (primary AI) + Gemini Flash (fallback)
- **Data source of truth:** Supabase. Everything else reads from it.
- **10 departments:** locked. Don't add or remove without explicit reason.
- **Brand:** #0077B6 primary, Montserrat headings, Open Sans body, near-black sidebar
- **Growth layers:** Layer 1 = water company, Layer 2 = this OS, Layer 3 = package as "Water Company OS for East African SMEs"

### Rule 3: No Claude Code token spent on unverified features
Before any new session, the previous features must be tested end-to-end by real humans or simulation mode. No more stacking features on top of unverified features.

### Rule 4: Every session ends with a verification test
Claude Code must include a test checklist at the end of each session. If tests fail, they get fixed before committing.

### Rule 5: Hypothetical/simulation mode is required for all testing
Real data won't flow until May 3. Until then, Simulation Mode fills the system with realistic data so we can see what breaks.

---

## PART 3 — THE NEW BIG IDEAS TO FOLD IN

Sammy raised these in the last message. Each is real and fits the plan:

### Idea A: Departments as "offices," not "pages"
Each department gets a workspace feel:
- Its own primary color accent (tied to dept function)
- A "room" layout: sidebar for the dept, main area for work, right sidebar for that dept's AI
- Dept head can customize the workspace (which cards are pinned, which reports are featured)
- Feels like entering a physical office, not just a URL

### Idea B: On-device AI with Gemma 4 E2B (open source, offline)
Gemma 4 E2B (April 2026, Apache 2.0 license) runs on phones. 2GB memory footprint. Works offline.
- Each department gets a small Gemma fine-tune that knows its SOPs
- Runs on the team member's phone via Google AI Edge Gallery
- Works without internet (critical for Uganda's connectivity gaps)
- No API costs
- Phase 3 work (May post-launch), not pre-launch

### Idea C: Shadow AI "Soul" per department
Each department has a personality/soul:
- Production = methodical, numbers-first, calm
- Quality = strict, zero-tolerance, halts don't negotiate
- Finance = sharp, source-tag obsessed, won't estimate
- Marketing = opportunistic, pattern-seeking
- Compliance = deadline-haunted, early-warning biased
Each soul's system prompt lives in a table `department_souls`. The askSAFI router picks the right soul based on the current page. Gets updated as we learn.

### Idea D: Agent management for Claude Code workflow
Sammy uses Claude Code heavily. A "Claude Code Ops" dashboard in the OS:
- Log of what each Claude Code session built
- Outstanding bugs from previous sessions
- Next session prompt drafts
- Usage tracking
This becomes the shared workstation — Sammy sees what's pending, what was built, what to paste next.

### Idea E: Simultaneous updates (Supabase Realtime on all pages)
Today, founder-office has realtime. Extend to all 10 pages so when Bosco logs a batch on his phone, Sammy sees it instantly on his laptop.

### Idea F: Audit trail visible
Every row in Supabase has `created_by` / `updated_by` / `updated_at`. Build a "Recent Activity" panel on each department showing last 20 changes with who/what/when.

### Idea G: Auto-approval workflows
Finance rule: transactions > 500k UGX need founder approval. OS auto-creates approval request. Founder gets Telegram notification. Approves/rejects from phone. Transaction unlocks.

### Idea H: Modular plug-and-play principle
Every feature we add must be callable from outside. Supabase REST API is already public. The OS itself should have:
- Webhooks (fire event when QC fails, batch completes, EOD closes)
- Export endpoints (CSV of any department data)
- Simple API key for external tools (Airtable, Zapier, Make.com, WhatsApp bots)
This turns the OS into a platform, not just an app.

### Idea I: CRM depth (not just distributor list)
Sammy has been asking for this repeatedly. The full CRM:
- Contacts (individuals, not just company names)
- Activities (calls, visits, WhatsApp messages)
- Deal pipeline stages: Lead → Contacted → Negotiating → Closed → Active → Sleeping → Churned
- Follow-up reminders (show "call X, last contacted 5 days ago")
- Territory mapping (distributors by zone)
- Revenue forecasting per distributor

### Idea J: Dept-level "Add/Edit/Hold" by dept heads
Department heads should be able to:
- Add new fields to their dept's forms (without code changes — config-driven)
- Hold items for review (flag something as pending)
- Request support/approval inline
- See who changed what in their dept

### Idea K: Simulation Mode (Sammy's ask)
Toggle in Settings → fills OS with 30 days of realistic data. Shows what the system looks like in motion. Clears back to zero when done. Real data vs simulated data kept separate via `is_simulated` flag on every table.

### Idea L: "Newer info soul" — auto-updating knowledge
Each department's AI soul should periodically look at recent news/data relevant to its role:
- Production soul checks D&S Uganda for new equipment prices monthly
- Compliance soul checks UNBS website for regulation changes weekly
- Finance soul checks URA for tax updates
- Marketing soul checks competitor prices
This is Phase 3 work but should be designed into the soul architecture now.

---

## PART 4 — THE NEW UNIFIED PLAN (10 DAYS TO LAUNCH + 8 WEEKS AFTER)

### Track 1: Fix what's broken (this week, days 1-3)
**Goal:** Everything that exists actually works.

1. Debug askSAFI (today, zero Claude Code needed — debug in chat first)
2. Verify env vars: GEMINI_API_KEY, GROQ_API_KEY, SUPABASE_SERVICE_ROLE_KEY
3. Force redeploy with fresh cache
4. Test the SAFI bubble with a real question
5. Test the founder-office Telegram brief button (will need TELEGRAM_BOT_TOKEN + TELEGRAM_CHAT_ID)
6. One small Claude Code session if needed

### Track 2: Simulation Mode + Realtime + AI Fallback (days 4-6)
**Goal:** See the system in motion with realistic data. One Claude Code session.

Single prompt covers:
- Groq primary + Gemini fallback chain in /api/ask
- Simulation Mode toggle with populate/clear demo data buttons
- Realtime subscriptions on all 10 department pages
- Audit trail panel on each department (last 20 changes)

### Track 3: CRM depth + P&L + SOPs + Approvals (days 7-10)
**Goal:** Fill the remaining Big Four consulting gaps. One Claude Code session.

Single prompt covers:
- Full CRM: contacts, activities, pipeline stages, reminders
- Monthly P&L auto-report with CSV export
- SOP document system (each dept has viewable SOPs, founders can edit)
- Approval workflows (transactions > 500k UGX trigger founder approval)

### Track 4: Launch (May 3)
- Real team logs in with real PINs
- Real batches logged
- Real QC tests run
- Real sales recorded
- Morning brief fires at 6AM
- Google Sheets sync runs at 6AM

### Track 5: Post-launch intelligence layer (May 3 → June 30)
**Goal:** Turn the OS from a system of record into a system of intelligence.

- Week 1: Daily summary cards written by AI (SAFI narrates each day)
- Week 2: Department souls deployed (strict system prompts per dept)
- Week 3: Claude Code Ops dashboard in Technology page
- Week 4: Webhooks + external API keys (plug-and-play)
- Month 2: Gemma 4 E2B on-device AI for offline team use
- Month 2: Full accounting (tax calculations, invoice generation)
- Month 2: Franchise template for Nairobi expansion

### Track 6: Phase 4 (July+, growth layer)
- Shadow AI per department with auto-updating knowledge
- WhatsApp automation via Green API
- Physical + AI moat: fine-tune Llama 3 8B on 3 months of operational data
- Package as Layer 3 "Water Company OS for East African SMEs"

---

## PART 5 — THE WORKSTATION ARTIFACTS

These live in Sammy's project folder as markdown files, updated as we go:

1. **CLAUDE.md** (already exists) — the system constitution, locked decisions, anti-hallucination rules
2. **WORKSTATION.md** (this file) — the shared source of truth, updated every session
3. **NEXT-SESSION.md** — the draft of the next Claude Code prompt, written in chat before pasting
4. **BUGS.md** — running list of known broken things (new)
5. **SIMULATION.md** — what realistic data looks like for each table (new)
6. **SOULS.md** — system prompts for each department's AI soul (new)

---

## PART 6 — WHAT TO DO RIGHT NOW

**Step 1 — Debug askSAFI in chat (5 minutes, zero Claude Code)**

Sammy: open maji-safi-os.vercel.app, click the SAFI chat bubble, send "hello". Tell Claude exactly:
- Does the bubble open?
- Does the input field show?
- When you hit send, what happens? (error / blank / spinner forever)
- Open browser DevTools (F12) → Console tab → any red text?
- DevTools → Network tab → does /api/ask get called? What status? (200/400/500)

Claude diagnoses and fixes here if possible (env var issue vs code issue).

**Step 2 — Confirm env vars in Vercel (2 minutes)**

In Vercel → Settings → Environment Variables, confirm:
- GROQ_API_KEY is set with a real value (not empty)
- GEMINI_API_KEY is set with a real value
- SUPABASE_SERVICE_ROLE_KEY is set with a real value
- ALL THREE scopes checked for each (Production, Preview, Development)

**Step 3 — Force fresh deploy (1 minute)**

Vercel → Deployments → latest → ⋯ → Redeploy → UNCHECK "Use existing Build Cache" → Deploy.

**Step 4 — After askSAFI works, paste ONE Claude Code prompt (see NEXT-SESSION.md draft below)**

---

## PART 7 — NEXT-SESSION.md DRAFT (don't paste yet)

```
Read CLAUDE.md and WORKSTATION.md. This session covers: AI fallback chain, Simulation Mode, realtime on all pages, audit trail, department souls foundation.

PART 1 — AI FALLBACK CHAIN
Update /api/ask/route.ts:
1. Install groq-sdk: npm install groq-sdk
2. Try Groq first (model: llama-3.3-70b-versatile) — fastest, free, 14,400 req/day
3. If Groq fails, try Gemini 2.5 Flash (not 2.0 which deprecates June 1)
4. If both fail, return graceful error: "SAFI is offline — your input is still saved, try again in a moment"
5. Keep source-tag anti-hallucination rules from CLAUDE.md
6. Use GROQ_API_KEY and GEMINI_API_KEY env vars

PART 2 — SIMULATION MODE
Create simulation_settings table: { location_id, is_active, activated_by, activated_at }
Add "Simulation Mode" card to /settings (founder only):
1. Toggle on/off
2. "Populate 30 Days of Demo Data" button:
   - production_logs: 30 days of ~450-520 jars/day (with weekend dips)
   - water_tests: 30 days of 5 tests per day, 95% PASS with realistic FAIL distribution
   - sales_ledger: 30 days of sales spread across 15 simulated distributors
   - daily_cash: 30 days of cash counts with realistic variance
   - distributors: 15 realistic distributors (mix of active/sleeping/churned)
   - events: the QC fail events that would have fired
   - capa_records: the CAPAs from those QC fails
   - All rows tagged is_simulated=true
3. "Clear All Demo Data" button: deletes all rows where is_simulated=true
4. Add is_simulated BOOLEAN DEFAULT false column to all main tables via migration
5. When simulation is active, show amber banner on all pages: "Simulation mode active — N simulated records"
6. Real data (is_simulated=false) is never touched

PART 3 — REALTIME ON ALL PAGES
Copy the founder-office realtime pattern to:
- production (listen to production_logs INSERT/UPDATE)
- quality (listen to water_tests)
- inventory (listen to inventory_items)
- dispatch (listen to sales_ledger)
- sales (listen to sales_ledger filtered by logged_by)
- marketing (listen to prospects)
- finance (listen to transactions and daily_cash)
- compliance (listen to compliance_records and capa_records)
- technology (listen to events)
When any row changes, re-fetch and update UI without page refresh.

PART 4 — AUDIT TRAIL PANEL
Add recent_activity view in Supabase (or compute in query):
- Last 20 changes across all tables for a given department
- Show: who (from team_members.name), what (insert/update/delete), which row, when
- Add collapsible "Recent Activity" panel on each department page
- Founders see all departments. Managers see their departments. Others see their own.

PART 5 — DEPARTMENT SOULS FOUNDATION
Create department_souls table:
{ department_slug, soul_name, personality, system_prompt, primary_ai_provider, fallback_provider, updated_at }
Seed initial souls:
- production: "methodical, numbers-first, calm. Every number has a batch_id source."
- quality: "strict, zero-tolerance. Halt authority. UNBS standards are absolute."
- finance: "sharp, source-tag obsessed. Never estimates. Refuses to answer without data."
- inventory: "buffer-minded. Early reorder bias. Zero stockouts is the goal."
- dispatch: "revenue-focused, relationship-aware. Cash must match system."
- sales: "pipeline-driven, follow-up obsessed. Sleeping distributors get priority."
- marketing: "opportunistic, pattern-seeking. 3 T1 prospects per week target."
- compliance: "deadline-haunted. 30-day early warning on all expiries."
- technology: "meta-observer. Sees across all departments. Data completeness is uptime."
- founder-office: "strategic, layered. Sees patterns across all 9 below. Synthesizer."
Update /api/ask to pull the soul's system prompt based on the current page's department.

DEPLOY:
npm run build && git add -A && git commit -m "unified: AI fallback + simulation + realtime + audit + souls foundation" && git push && npx vercel --prod --yes

VERIFICATION CHECKLIST (run after deploy):
1. Open askSAFI, ask "how many jars today?" — should respond with source tag or "no data"
2. Enable Simulation Mode, populate demo data — check production page shows batches
3. Log a new batch in another tab — production page should update without refresh
4. Check Recent Activity panel shows the new batch
5. Disable Simulation Mode, clear demo data — all simulated rows gone, real data intact
```

---

## PART 8 — THE LONG VIEW (DON'T LOSE SIGHT)

Maji Safi OS isn't just a water company tool. It's Sammy's Layer 2 — the template that becomes Layer 3 (packaged OS for East African SMEs). The decisions we make now about:
- Modular architecture (plug-and-play webhooks, external APIs)
- Department souls (swappable personalities)
- Simulation mode (lets new franchises onboard without risk)
- On-device AI (Gemma 4 E2B for offline operations)

…all matter for the franchise play 12-18 months out. Every feature should pass the question: "Does this work when Maji Safi Nairobi, Maji Safi Mombasa, and Maji Safi Kigali all run the same codebase with different location_ids?"

That's why location_id on every table matters. That's why souls in a table (not hardcoded) matters. That's why simulation mode matters (new franchises can test before launch).

Stay the course. Execute the 10-day plan. Launch May 3 with working software that has been tested end-to-end via simulation. Then scale intelligence on top.
