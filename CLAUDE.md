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
- **Commercial launch target**: May 3, 2026
- **Tagline**: Hydrate. Elevate.
- **Founders**: Samuel Ghedamu (CEO), Amanuel Asmerom Yonas (COO). Both manage Finance.
- **Partner**: Mike (15 equity shares from Samuel's allocation)

---

## 2. ARCHITECTURE — LOCKED

These decisions are final for the May 3 launch window. Do not propose alternatives.

- **Frontend**: Next.js (App Router) on Vercel
- **Database**: Supabase (20+ tables, schema already migrated via `maji-safi-supabase-FIXED.sql`)
- **Runtime AI**: Google Gemini 2.5 Flash (free tier, 1,000 req/day, no credit card required)
- **Build interface**: Claude Code in VS Code extension
- **Repo**: github.com/sammyghe/MAJI-SAFI-OS
- **Franchise readiness**: Every table has a `location_id` column from day one. Current only value: `'buziga'`.

**NOT in this phase** (do not propose or install):
- n8n, CrewAI, LangGraph, Managed Agents, Gemma local, LangChain, Dify, Mem0
- Odoo, ERPNext, Frappe, Huly as the primary app
- Self-hosted Actual Budget (we steal the UI pattern only)
- Fine-tuned local SLMs (this is Phase 4+, October 2026)

---

## 3. THE 9 DEPARTMENTS — LOCKED

The structure is validated against McKinsey 7-S, EOS, Toyota lean manufacturing, Coca-Cola/AB InBev FMCG distribution, Amazon event-driven operations, and P&G supply chain. Do not collapse to 6 or 8. Do not rename.

| Slug              | Purpose                                                    | Daily Target             | Failure Protocol                     | AI Shadow Personality                |
| ----------------- | ---------------------------------------------------------- | ------------------------ | ------------------------------------ | ------------------------------------ |
| `founder-office`  | Strategy, phase decisions, investor relations              | Review all dept signals  | Both-founder lock on major decisions | Strategist. Sees patterns across.    |
| `production`      | Fill jars, log batches, machine uptime                     | 500 jars/day Month 1     | Halt on QC fail                      | Speaks in numbers and batch IDs.     |
| `quality`         | 5 daily UNBS tests, halt authority                         | 100% pass rate           | Block batch from dispatch            | Strict, protocol-driven, zero tol.   |
| `inventory`       | Jars, caps, labels, chemicals — stock levels               | Zero stockouts           | Trigger reorder below threshold      | Tracks every jar and shilling.       |
| `dispatch`        | Sales logging, cash collection, distributor tracking       | Cash = system match      | Flag mismatches                      | Relationships and revenue.           |
| `marketing`       | Distributor pipeline, brand, content                       | 3 T1 prospects/week      | Sleeping distributor alerts          | Relationship-focused, pipeline-aware |
| `finance`         | Daily P&L, break-even, cash, investor reporting            | Cash reconciled daily    | Block EOD close on mismatch          | Sharp, numbers-first.                |
| `compliance`      | UNBS, HR (Uganda Employment Act), legal, document registry | All deadlines tracked    | Alert 30 days before any expiry      | Deadline-obsessed, thorough.         |
| `technology`      | System health, integrations, morning brief delivery        | 99% uptime               | Auto-failover, notify founders       | Meta-agent. Knows every other dept.  |

**Team members are a separate layer from departments.** The `team_members.departments` column is a `text[]` array — one person can belong to multiple departments (e.g. Bosco: `['production', 'dispatch']`; Samuel + Ema: `['founder-office', 'finance']`). Departments exist as rooms whether a human is in them or not.

---

## 4. THE 4-TYPE INFORMATION TAXONOMY

Every Supabase table maps to exactly one of these four types. Tag it in the table comment.

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

## 5. ANTI-HALLUCINATION RULE — HARD CONSTRAINT

Every Finance and Inventory AI response that contains a number MUST end with a source tag in this exact format:

```
[source: {table_name} row {id}, {YYYY-MM-DD}]
```

Example: `[source: transactions row 234, 2026-04-16]`

If no source row exists for the number being requested, the AI responds verbatim:

> "I don't have data for this — please enter it."

It does not estimate. It does not extrapolate. It does not average. It does not guess.

This rule applies regardless of how the user phrases the question. If someone asks "roughly how much" or "approximately," the AI still requires a source or refuses.

This rule is baked into the system prompt for `finance_ai` and `inventory_ai` in the `departments` table `system_prompt` column.

---

## 6. FALLBACK RULES — STRUCTURAL CONSTRAINTS, NOT REMINDERS

Code enforces these. They are not tooltips or warnings.

1. **AI down** → SOPs exist as `.md` documents in the `knowledge` table and are rendered as readable pages. The team operates manually from SOPs. AI is the accelerator, not the engine.

2. **Data entry stops** → Evening cron (11:00 PM Kampala time) runs `check_missing_logs()`. Any department that has no production/quality/dispatch log for the day generates a `compliance_flags` event. System never guesses or fills missing numbers. It flags the gap explicitly: "No production log from Operations today. Yesterday's dashboard numbers are stale."

3. **QC fail missed** → A `batches` row cannot transition to `status = 'dispatched'` unless a corresponding `water_tests` row exists with `result = 'PASS'` for that `batch_id`. Enforced by Supabase RLS policy + trigger. Not a UI check — a database constraint.

4. **Cash doesn't reconcile** → Finance EOD close button is disabled unless `cash_counted = cash_expected`. Only users with `role = 'founder'` can force-close, and the force-close writes a mandatory `reason` text field into `finance_overrides` that is permanently visible in the audit log.

5. **Decision boundary enforcement** → Every action in the system has an `authority_required` level (`department`, `one_founder`, `both_founders`). The action button is disabled in the UI AND the API endpoint returns 403 if the calling user lacks authority. Never trust the UI alone.

6. **One-owner rule** → Every KPI on the BI dashboard has a `owner_department` FK. Alerts read "Production is behind target," never "There is a problem." Accountability is structural.

---

## 7. SESSION 2 ACCEPTANCE TEST

Quality Control is the vertical slice that proves the wiring. Session 2 is complete ONLY when this scenario runs end-to-end without any manual intervention:

**Scenario: 6:30 AM Batch 001 fails TDS test**

1. Amos opens Production department → logs Batch 001 (60 jars, single-use)
   - System writes: `production_logs` row + fires `batch_created` event
2. Amos opens Quality department → runs TDS test → records reading 165 ppm
   - System writes: `water_tests` row with `result = 'FAIL'` (threshold is 150 ppm)
   - Fires `qc_fail` event
3. Within 2 seconds of the `qc_fail` event:
   - Production dashboard shows "HALT — batch 001 failed QC" (status update)
   - Inventory automatically moves 60 jars from `filled_stock` to `zone_2_quarantine`
   - Founder Office receives a critical alert (red banner + audit log entry)
   - Compliance writes a `capa_required` row for UNBS audit trail
   - BI quality-pass-rate tile recalculates and drops
4. No manual phone calls. No Slack messages. No one had to notify anyone.

If any of these five propagations fails, Session 2 is not complete. Fix the wiring before moving to Session 3.

---

## 8. BRAND TOKENS

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

## 9. UI PATTERN — SIDEBAR NAV (Session 3)

Steal the pattern from Actual Budget (github.com/actualbudget/actual). Implementation:

- Package: `re-resizable`
- Width: default 240px, min 200px, max `viewport/3`
- Persist width in `localStorage` under key `maji-safi.sidebarWidth`
- Row height 20px, padding 9px vertical / 19px horizontal
- Icon size 15×15 (use `lucide-react`), 8px gap to label
- Active-state: 4px left border in `#0077B6`, label color shifts to white, padding-left reduces by 4px to keep alignment
- Hover: background `#CAF0F8` at 10% opacity
- Primary section: 9 departments, flat list
- Secondary section: "More" collapsible (chevron-right → chevron-down), contains Settings / Team / Audit Log
- Background: `zinc-950` for dark premium aesthetic

See `/Sidebar.tsx` reference component in project root.

---

## 10. FINANCE LEDGER PATTERN (Session 4)

Also from Actual Budget — their `BudgetTable.tsx`. Envelope ledger:

- Rows: cost categories (Chemicals, Caps, Labels, Salaries, Transport, UNBS fees, Utilities, Misc)
- Columns: Budgeted / Spent / Remaining / % Used
- Grouped by period (month)
- Totals row at top

This is the default Finance department view. The Finance AI answers questions by reading directly from this ledger — never by estimating.

---

## 11. FINANCIAL CONSTANTS

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

## 12. BUILD SEQUENCE — 10 SESSIONS

| # | Session                    | Target time | Definition of done                                            |
| - | -------------------------- | ----------: | ------------------------------------------------------------- |
| 1 | PIN auth                   |      20 min | `/login` with 4-digit PIN lands on dashboard as correct user |
| 2 | Quality Control slice      |      45 min | Section 7 acceptance test passes end-to-end                   |
| 3 | Sidebar nav (9 depts)      |      30 min | Resizable sidebar, all 9 routes render, active state works    |
| 4 | Finance ledger             |      45 min | Envelope table reads real `transactions` rows + source tags   |
| 5 | Inventory + reorder loop   |      40 min | Stock below threshold fires `reorder_triggers` event          |
| 6 | Dispatch + cash recon      |      40 min | EOD close button enforces fallback rule 4                     |
| 7 | Production + batch events  |      35 min | Batches propagate to QC, Inventory, Founder                   |
| 8 | Compliance + UNBS registry |      30 min | 15 audit docs tracked with expiry alerts                      |
| 9 | BI dashboard               |      40 min | One-owner rule applied to every KPI tile                      |
| 10| "Add Anything" router      |      45 min | Natural language → AI routes to correct dept card             |

Total estimate: ~370 min of Claude Code time. Plan for 2x that (buffer).

---

## 13. COMMIT & WORKFLOW RULES

- Branch per session: `session-{N}-{slug}` (e.g. `session-2-qc-slice`)
- Commit after each accepted diff: `session-{N}: {what}`
- Push after each session and tag: `v0.{N}`
- Every migration file goes in `supabase/migrations/` with timestamp prefix
- Never merge a session to `main` unless its acceptance test passes

---

## 14. WHAT THE AI SHOULD ASK BACK

When in doubt, Claude Code should ask — not assume — about:
- New dependencies (always confirm before `npm install`)
- Schema changes to existing tables
- Moving business-rule constants from DB to code (keep in DB by default)
- Any change that removes a fallback rule in section 6

It should NOT ask about:
- Brand colors, fonts (section 8)
- Department list (section 3)
- Financial constants (section 11)
- Acceptance test scenarios (section 7)
