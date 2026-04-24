# CLAUDE.md — Maji Safi OS

This file is loaded automatically at the start of every Claude Code session.
It is the single source of truth for project context, architecture, and constraints.
Read it before generating any code. Respect the locks. Ask only when something here is silent.

---

## 1. PROJECT IDENTITY

- **Company**: Safiflow Ventures Group Limited, trading as Maji Safi
- **Registration**: G241004-1234 (October 2024)
- **Location**: Lukuli Road, Buziga, Kampala, Uganda
- **Product**: Purified water — 20L Refill, 20L Single-Use, 20L Reusable Jar, 5L Single-Use
- **Commercial launch**: Post-May 20, 2026. UNBS inspection May 14. Certification May 19–20. Private lab testing April 24–27 in progress.
- **Tagline**: Hydrate. Elevate.
- **Founders**: Samuel Ghedamu (CEO), Amanuel Asmerom Yonas (COO). Both manage Finance.

---

## 2. INVESTORS

- **Mike**: 15% of Samuel's shares. Partial payment received; remainder in flight. Add-on option: 5% at 30% discount within 6 months.
- **Amon**: $25K for 10% of Samuel's shares. 25% net profit/dividends until $25K recouped. Option to increase to 20% at 30% discount within 12 months. Limited to first 3 locations.

**Valuation**:
- Pre-money valuation: UGX 800,000,000 (~$226,500 USD)
- Day 1 pre-sold: 300 jars/day
- Year 1 revenue projection: UGX 447.7M
- Year 1 net profit projection: UGX 255.8M

---

## 3. ARCHITECTURE — LOCKED

These decisions are final for the launch window. Do not propose alternatives.

- **Frontend**: Next.js (App Router) on Vercel
- **Database**: Supabase (20+ tables, schema already migrated via `maji-safi-supabase-FIXED.sql`)
- **Runtime AI chain**: Groq (llama-3.3-70b-versatile) → Gemini 2.5 Flash → Claude Haiku 4.5
- **Build interface**: Claude Code in VS Code extension
- **Repo**: github.com/sammyghe/MAJI-SAFI-OS
- **Franchise readiness**: Every table has a `location_id` column from day one. Current only value: `'buziga'`.

**Required env vars (Vercel)**:
- `GROQ_API_KEY` — primary AI, 14,400 req/day free (console.groq.com)
- `GEMINI_API_KEY` — fallback AI, 1,000 req/day free (aistudio.google.com)
- `ANTHROPIC_API_KEY` — tier-3 fallback AI, Claude Haiku 4.5 (console.anthropic.com)
- `NEXT_PUBLIC_SUPABASE_URL` — Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Supabase anon key
- `SUPABASE_SERVICE_ROLE_KEY` — Supabase service role (for simulation, pin auth)

**NOT in this phase** (do not propose or install):
- n8n, CrewAI, LangGraph, Managed Agents, Gemma local, LangChain, Dify, Mem0
- Odoo, ERPNext, Frappe, Huly as the primary app
- Self-hosted Actual Budget (we steal the UI pattern only)
- Fine-tuned local SLMs (this is Phase 4+, October 2026)

---

## 4. THE 10 DEPARTMENTS — LOCKED

The structure is validated against McKinsey 7-S, EOS, Toyota lean manufacturing, Coca-Cola/AB InBev FMCG distribution, Amazon event-driven operations, and P&G supply chain. Do not collapse or rename.

| Slug              | Purpose                                                    | Daily Target             | Failure Protocol                     | AI Shadow Personality                |
| ----------------- | ---------------------------------------------------------- | ------------------------ | ------------------------------------ | ------------------------------------ |
| `founder-office`  | Strategy, phase decisions, investor relations              | Review all dept signals  | Both-founder lock on major decisions | Strategist. Sees patterns across.    |
| `production`      | Fill jars, log batches, machine uptime                     | 500 jars/day Month 1     | Halt on QC fail                      | Speaks in numbers and batch IDs.     |
| `quality`         | 5 daily UNBS tests, halt authority                         | 100% pass rate           | Block batch from dispatch            | Strict, protocol-driven, zero tol.   |
| `inventory`       | Jars, caps, labels, chemicals — stock levels               | Zero stockouts           | Trigger reorder below threshold      | Tracks every jar and shilling.       |
| `dispatch`        | Deliveries, cash collection, distributor tracking          | Cash = system match      | Flag mismatches                      | Relationships and revenue.           |
| `sales`           | Revenue tracking, distributor deals, pipeline              | 300 jars pre-sold Day 1  | Escalate sleeping distributors       | Pipeline-driven, follow-up obsessed. |
| `marketing`       | Distributor pipeline, brand, content                       | 3 T1 prospects/week      | Sleeping distributor alerts          | Relationship-focused, pipeline-aware |
| `finance`         | Daily P&L, break-even, cash, investor reporting            | Cash reconciled daily    | Block EOD close on mismatch          | Sharp, numbers-first.                |
| `compliance`      | UNBS, HR (Uganda Employment Act), legal, document registry | All deadlines tracked    | Alert 30 days before any expiry      | Deadline-obsessed, thorough.         |
| `technology`      | System health, integrations, morning brief delivery        | 99% uptime               | Auto-failover, notify founders       | Meta-agent. Knows every other dept.  |

**Team members are a separate layer from departments.** The `team_members.departments` column is a `text[]` array — one person can belong to multiple departments.

---

## 5. ROLES

Seven role types. People rotate; roles stay fixed. Each role type gets a different OS experience on login.

| Role               | Access scope                                                                         |
| ------------------ | ------------------------------------------------------------------------------------ |
| `founder`          | Full access to all departments, founder-only approvals queue, all settings pages     |
| `operations_manager` | Plant KPIs, team in their assigned departments; cannot see salaries or cap table   |
| `lead_operator`    | Their own batches, QC records, maintenance on their assigned equipment               |
| `production_assistant` | Today's task list, hygiene checklist, their own batch logs                     |
| `delivery_field`   | Today's route, return logs, cash collection form                                     |
| `marketing`        | Prospect pipeline (kanban), campaigns, content calendar                              |
| `compliance`       | Regulatory calendar (calendar view), inspections, CAPA tracking                     |

**UI rule per role**: operator/delivery = big tap targets (64px min), one primary action visible, no dense tables. Manager/founder = dense data, multiple KPIs, drill-down. Marketing = kanban. Compliance = calendar.

---

## 6. LOCKED PRINCIPLES

1. Roles, not people — seven role types, people rotate
2. Office per role on login — same OS, seven experiences
3. Skills are the token-saving layer (`.claude/skills/*.md`)
4. Department heads edit their own workspace
5. Website fed by OS (same Supabase)
6. Soul files stay as markdown (phone-ready later)
7. Views over pages (list/kanban/map/calendar per role)
8. Simplicity on front, complexity on demand
9. AI is query layer on clean data, not autonomous agent
10. Fix broken before adding new
11. Modular, no hardcoding — entries via UI
12. Config-driven engines — formulas in tables, not code

---

## 7. THE 4-TYPE INFORMATION TAXONOMY

Every Supabase table maps to exactly one of these four types.

1. **DATA** — immutable facts. Append-only. Once logged, never mutated.
   - Examples: `water_tests`, `production_logs`, `transactions`, `sales_ledger`
   - Rule: No UPDATE statements. Corrections are new rows with `correction_of` FK.

2. **EVENTS** — triggers that propagate across departments.
   - Examples: `batch_events`, `qc_alerts`, `reorder_triggers`, `compliance_flags`
   - Rule: Written once, consumed by N listeners. Never mutated.

3. **DECISIONS** — logged choices with context, actor, and timestamp.
   - Examples: `founder_decisions`, `approvals`, `policy_changes`
   - Rule: Every decision has a `context` text field and a `reason` text field.

4. **KNOWLEDGE** — reference material, SOPs, regulations.
   - Examples: `sops`, `unbs_requirements`, `uganda_employment_act`, `company_knowledge`
   - Rule: Versioned. When updated, old version archived with effective-from date.

---

## 8. ANTI-HALLUCINATION RULE — HARD CONSTRAINT

Every Finance and Inventory AI response that contains a number MUST end with a source tag in this exact format:

```
[source: {table_name} row {id}, {YYYY-MM-DD}]
```

Example: `[source: transactions row 234, 2026-04-16]`

If no source row exists for the number being requested, the AI responds verbatim:

> "I don't have data for this — please enter it."

It does not estimate. It does not extrapolate. It does not average. It does not guess.

This rule applies regardless of how the user phrases the question.

---

## 9. FALLBACK RULES — STRUCTURAL CONSTRAINTS, NOT REMINDERS

Code enforces these. They are not tooltips or warnings.

1. **AI down** → SOPs exist as `.md` documents in the `knowledge` table and are rendered as readable pages. The team operates manually from SOPs. AI is the accelerator, not the engine.

2. **Data entry stops** → Evening cron (11:00 PM Kampala time) runs `check_missing_logs()`. Any department that has no production/quality/dispatch log for the day generates a `compliance_flags` event.

3. **QC fail missed** → A `batches` row cannot transition to `status = 'dispatched'` unless a corresponding `water_tests` row exists with `result = 'PASS'` for that `batch_id`. Enforced by Supabase RLS policy + trigger.

4. **Cash doesn't reconcile** → Finance EOD close button is disabled unless `cash_counted = cash_expected`. Only `role = 'founder'` can force-close, writing a mandatory `reason` into `finance_overrides`.

5. **Decision boundary enforcement** → Every action has an `authority_required` level (`department`, `one_founder`, `both_founders`). Button disabled in UI AND API returns 403 if user lacks authority.

6. **One-owner rule** → Every KPI on the BI dashboard has a `owner_department` FK. Alerts read "Production is behind target," never "There is a problem."

---

## 10. AI CHAIN

Three-tier fallback. Never all three will fail simultaneously.

| Tier | Provider      | Model                           | Free limit     | Key env var          |
| ---- | ------------- | ------------------------------- | -------------- | -------------------- |
| 1    | Groq          | llama-3.3-70b-versatile         | 14,400 req/day | GROQ_API_KEY         |
| 2    | Gemini Flash  | gemini-2.5-flash-preview-04-17  | 1,000 req/day  | GEMINI_API_KEY       |
| 3    | Claude Haiku  | claude-haiku-4-5-20251001       | pay-per-use    | ANTHROPIC_API_KEY    |

On all three failing: return offline message. `/api/ask/health` tests all three in parallel and returns latencies.

---

## 11. DRIVE MIRROR — DOCUMENT CATEGORIES

12 categories for the Documents module (mirrors Sammy's Google Drive structure):

1. COMPANY_FOUNDATION
2. STRATEGY AND PLANNING
3. PRODUCTS & SERVICES
4. OPERATIONS
5. SALES AND MARKETING
6. FINANCIAL
7. TEAM
8. LEGAL AND COMPLIANCE
9. DIGITAL PRESENCE
10. PROJECTS
11. MEETINGS & COMMUNICATION
12. ARCHIVE

---

## 12. BRAND TOKENS

- **Primary blue**: `#0077B6`
- **Sky blue accent**: `#7EC8E3`
- **Light blue background**: `#CAF0F8`
- **White**: `#FFFFFF`
- **Dark gray**: `#333333`
- **Sidebar background**: near-black (`#0A0A0A` or `zinc-950`)
- **Headings font**: Montserrat (Bold / SemiBold)
- **Body font**: Open Sans
- **Tagline**: "Hydrate. Elevate."

---

## 13. UI PATTERN — SIDEBAR NAV

Steal the pattern from Actual Budget (github.com/actualbudget/actual). Implementation:

- Package: `re-resizable`
- Width: default 240px, min 200px, max `viewport/3`
- Persist width in `localStorage` under key `maji-safi.sidebarWidth`
- Row height 20px, padding 9px vertical / 19px horizontal
- Icon size 15×15 (use `lucide-react`), 8px gap to label
- Active-state: 4px left border in `#0077B6`, label color shifts to white
- Hover: background `#CAF0F8` at 10% opacity
- Primary section: 10 departments, flat list
- Secondary section: "More" collapsible (chevron-right → chevron-down)
  - Settings / Team / Audit Log (all roles)
  - Simulation / AI Souls / AI Health / Security (founders only)

---

## 14. FINANCE LEDGER PATTERN

Also from Actual Budget — their `BudgetTable.tsx`. Envelope ledger:

- Rows: cost categories (Chemicals, Caps, Labels, Salaries, Transport, UNBS fees, Utilities, Misc)
- Columns: Budgeted / Spent / Remaining / % Used
- Grouped by period (month)
- Totals row at top

---

## 15. FINANCIAL CONSTANTS

Pricing (UGX):

| Product               | T1 (pickup) | T2 (tuk-tuk) | T3 (tuk-tuk) | T4 (bike+tuk) |
| --------------------- | ----------: | -----------: | -----------: | ------------: |
| 20L Refill            |       3,000 |        4,000 |        5,000 |         6,000 |
| 20L Single-Use        |       7,500 |        8,000 |        8,500 |        10,000 |
| 20L Reusable Jar      |      15,000 |       16,000 |       17,000 |        18,000 |
| 5L Single-Use         |       2,800 |        3,000 |        3,200 |         3,500 |

Capacity: 6,000 LPH = ~300 jars/hour, daily cap 2,000 jars.
Break-even: ~220–240 jars/day at launch (jar costs included).
Month 1 target: 500 jars/day T1 wholesale only, no delivery pressure.

Tax (Uganda): VAT 18%, corporate 30%, PAYE per URA bands, NSSF 5%+5%.

---

## 16. COMMIT & WORKFLOW RULES

- Commit prefix per initiative: `session-{N}-{slug}: {what}` or `session-1-foundation: {what}`
- Push after each session
- Every migration file goes in `supabase/migrations/` with timestamp prefix
- Skills library lives in `.claude/skills/<name>/SKILL.md`

---

## 17. WHAT THE AI SHOULD ASK BACK

When in doubt, Claude Code should ask — not assume — about:
- New dependencies (always confirm before `npm install`)
- Schema changes to existing tables
- Moving business-rule constants from DB to code (keep in DB by default)
- Any change that removes a fallback rule in section 9

It should NOT ask about:
- Brand colors, fonts (section 12)
- Department list (section 4)
- Financial constants (section 15)
- AI provider chain (section 10)
