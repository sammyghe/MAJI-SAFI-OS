---
name: new-module
description: Add a new data module (suppliers, assets, inventory item type, etc.). Use when user says "add a module" or "create a new module for X".
---
Follow this exact pattern every time. Do not invent new structure:
1. Supabase migration: new table with id uuid pk, location_id text default 'buziga', created_at, updated_at, created_by, is_simulated boolean default false. Add RLS policies scoped to location_id='buziga'.
2. API routes: GET, POST, PATCH, DELETE at /api/<module>/route.ts and /api/<module>/[id]/route.ts. Use service_role for writes that need elevation.
3. List page at /src/app/(main)/<module>/page.tsx with search, filter, sort.
4. Detail page at /src/app/(main)/<module>/[id]/page.tsx with edit mode.
5. Form component at /src/components/<module>/Form.tsx.
6. Add sidebar nav entry in Sidebar.tsx.
Match existing folder structure. Use existing UI primitives. Never hardcode seeds.
