# Session 3 Specification: HR Module + Sidebar Management

## Overview
- **HR Module**: Manage team members, add/remove, assign departments
- **Sidebar Management**: Founders add/remove departments, reorder, toggle visibility
- **Permission Model**: 
  - Only **founders** can edit departments/sidebar
  - Only **HR role** (or founder) can add/edit team members
  - Only **founder** can assign departments to team members

---

## Feature 1: HR Module (`/hr`)

### Current State
- Route exists: `/src/app/(main)/hr/page.tsx`
- Skeleton page with placeholder

### Target State

#### Page Layout
```
┌─────────────────────────────────────┐
│ HR Management                        │
│ Manage team members and access       │
└─────────────────────────────────────┘

┌─ Add Member ─────────────────────────┐
│ [+ Add New Team Member]               │
└──────────────────────────────────────┘

┌─ Team Directory ──────────────────────┐
│ Name         │ Role   │ Depts  │ Status │ Actions
├──────────────┼────────┼────────┼────────┼─────────
│ Samuel       │ Founder│ 9 depts│ Active │ Edit Del
│ Amanuel      │ Founder│ 9 depts│ Active │ Edit Del
│ Amos         │ Operator│ 2 depts│ Active │ Edit Del
│ Rosette      │ Manager│ 2 depts│ Active │ Edit Del
└──────────────┴────────┴────────┴────────┴─────────┘
```

#### "Add New Member" Modal
```
┌─ Add Team Member ────────────────────┐
│                                       │
│ Name:           [____________]        │
│ Email:          [____________]        │
│ Phone:          [____________]        │
│ Role:           [Founder ▼]           │
│                 • Founder             │
│                 • Operator            │
│                 • Manager             │
│                                       │
│ Departments (select multiple):        │
│ ☑ founder-office   ☐ production       │
│ ☑ finance          ☐ quality          │
│ ☐ inventory        ☐ dispatch         │
│ ☐ marketing        ☐ compliance       │
│ ☐ technology                          │
│                                       │
│ [Cancel] [Generate PIN & Create]      │
│                                       │
│ Note: PIN will be auto-generated      │
└──────────────────────────────────────┘
```

#### "Edit Member" Modal
```
Same as Add, but pre-filled with existing data
+ Show current PIN (masked or show only to founder)
+ Option to regenerate PIN
+ Deactivate button
```

#### Database Operations
```typescript
// Create new team member
INSERT INTO team_members (
  name, email, phone, role, departments, 
  pin, status, location_id
) VALUES (
  'Name', 'email@test.com', '+256...', 'operator',
  ARRAY['production', 'dispatch'],
  '5678', 'active', 'buziga'
);

// Update departments for member
UPDATE team_members 
SET departments = ARRAY['production', 'quality', 'dispatch']
WHERE id = 'user-id';

// Deactivate member
UPDATE team_members 
SET status = 'inactive' 
WHERE id = 'user-id';

// List all team members
SELECT id, name, email, role, departments, status, created_at
FROM team_members
WHERE location_id = 'buziga'
ORDER BY created_at DESC;
```

---

## Feature 2: Sidebar Management (Founder Only)

### Current State
- Sidebar shows fixed 9 departments
- All founders see all departments always
- No settings/customization

### Target State

#### Founder Settings Button
```
Sidebar → "More" menu → click "Settings"
↓
┌─ Manage Sidebar ──────────────────────┐
│ Your Departments                       │
│ (Drag to reorder)                      │
│                                       │
│ ☑ ⋮⋮ founder-office                  │
│ ☑ ⋮⋮ production                       │
│ ☑ ⋮⋮ quality                          │
│ ☑ ⋮⋮ inventory                        │
│ ☑ ⋮⋮ dispatch                         │
│ ☑ ⋮⋮ marketing                        │
│ ☑ ⋮⋮ finance                          │
│ ☑ ⋮⋮ compliance                       │
│ ☑ ⋮⋮ technology                       │
│                                       │
│ Toggle all | ← → Reorder via drag     │
│                                       │
│ [Close] [Save]                        │
└──────────────────────────────────────┘
```

#### Behavior
- **Checkboxes**: Control visibility (unchecked dept disappears from sidebar)
- **Drag handles** (⋮⋮): Reorder departments
- **Save**: Persists to:
  - `localStorage` (instant UI update)
  - `team_members.departments` (DB sync)
- **Toggle all**: Quick check/uncheck all

#### Storage
```typescript
// localStorage
localStorage.setItem('maji-safi.sidebarDepartments', JSON.stringify([
  'founder-office',
  'production',
  'quality',
  // ... order matters
]));

// Supabase (when Save clicked)
UPDATE team_members 
SET departments = ARRAY['founder-office', 'production', ...]
WHERE id = 'founder-id' AND role = 'founder';
```

#### UI Updates Needed
1. **Sidebar.tsx**: Read from `team_members.departments` instead of fixed array
2. **SettingsPage.tsx**: New page at `/settings` with drag-reorder
3. **useAuth hook**: Return current user's departments array

---

## Feature 3: Sidebar Updates for All Users

### Current State
- Both founders and operators see same 9 departments

### Target State
- **Founders**: See all 9 (customizable)
- **Operators**: See only assigned departments (from `team_members.departments`)
- **HR**: See HR's assigned departments
- **Managers**: See manager's assigned departments

#### Implementation
```typescript
// In Sidebar.tsx
const { user } = useAuth();

// Get departments from user context
const visibleDepts = user?.role === 'founder' 
  ? user.departments 
  : (user?.departments || []);

// Build sidebar from visibleDepts
const departments = visibleDepts.map(slug => deptConfig[slug]);
```

#### Examples
```
Samuel (Founder):
→ founder-office, production, quality, inventory, dispatch, 
  marketing, finance, compliance, technology

Amos (Operator, production + dispatch):
→ production, dispatch

Rosette (Manager, quality + compliance):
→ quality, compliance

New operator assigned only production:
→ production
```

---

## Data Model (Summary)

### team_members table (already created)
```sql
CREATE TABLE team_members (
  id UUID PRIMARY KEY,
  name TEXT,
  email TEXT,
  phone TEXT,
  role TEXT,           -- 'founder', 'operator', 'manager'
  departments TEXT[],  -- Array of dept slugs user has access to
  pin TEXT,            -- 4-digit PIN for login
  status TEXT,         -- 'active', 'inactive', 'suspended'
  location_id TEXT,    -- Always 'buziga' for now
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);
```

### When to update `departments`:
1. **HR adds new member** → Set their departments via form checkboxes
2. **Founder edits sidebar** → Update their own departments array
3. **HR reassigns departments to member** → Update their departments array
4. **Founder removes member** → Set status='inactive' (don't delete)

---

## Session 3 Acceptance Criteria

✅ HR page shows all team members in table  
✅ "Add Member" button opens modal with form  
✅ Form includes role selector (Founder/Operator/Manager)  
✅ Form includes department checkboxes (select multiple)  
✅ "Generate PIN & Create" inserts to `team_members`  
✅ Edit button pre-fills and updates existing member  
✅ Deactivate button sets status='inactive'  
✅ Founder sees "Settings" in sidebar More menu  
✅ Settings modal shows 9 departments with checkboxes + drag  
✅ Save persists to localStorage + `team_members`  
✅ Sidebar reflects updated department list for each user  
✅ New team member logs in with their PIN → sees only assigned depts  
✅ Founder logs in → sees all departments + can edit via Settings  

---

## Example Workflow

1. **Samuel (Founder) logs in**
   - Auto-login as founder
   - Sidebar shows all 9 departments
   - Samuel clicks More → Settings
   - Unchecks "marketing"
   - Clicks Save
   - localStorage updates, DB updates
   - Sidebar refreshes, marketing gone

2. **Samuel goes to HR page**
   - Clicks "+ Add New Team Member"
   - Fills: Name: "Bosco", Email: "bosco@test.com", Role: "Operator"
   - Checks: production, dispatch
   - Clicks "Generate PIN & Create"
   - System generates PIN: "1111"
   - New row appears in table: "Bosco | Operator | prod,dispatch | Active"

3. **Samuel shares PIN 1111 with Bosco**
   - Bosco opens app
   - Auto-login as Bosco (TODO: re-enable PIN login in session 3)
   - Sidebar shows: production, dispatch (only 2)
   - Bosco can log batches in production
   - Bosco can log sales in dispatch
   - Bosco cannot see finance, quality, etc.

4. **Samuel promotes Rosette from Manager to Founder**
   - Go to HR page
   - Click Edit on Rosette
   - Change Role from "Manager" to "Founder"
   - Check all 9 departments
   - Save
   - Rosette now co-founder with access to all 9 depts

---

## Files to Modify/Create

```
src/app/(main)/hr/page.tsx              ← Build team CRUD UI
src/app/(main)/settings/page.tsx        ← Create sidebar settings modal
src/components/Sidebar.tsx              ← Read from user.departments array
src/components/AuthProvider.tsx         ← Ensure departments passed to context
src/lib/deptConfig.ts                   ← May need updates for dept lookup
```

---

## Notes for Opus

- **Pin Generation**: Use random 4-digit generator (no special logic, just 0000-9999, avoid duplicates)
- **Audit Trail**: Every add/edit/deactivate should have a `created_at`, `updated_at`, `updated_by`
- **Permission Check**: Only founders can modify sidebar settings (check role in component)
- **Fallback**: If user has no departments assigned, show "No departments assigned" and link to HR
- **Broadcast**: When departments change, may need realtime subscription to update sidebar in real-time
