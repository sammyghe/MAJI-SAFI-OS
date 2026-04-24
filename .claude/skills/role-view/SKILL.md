---
name: role-view
description: Add a role-specific view or filter data by user role. Use when building anything that should differ per role (founder/manager/operator/delivery/marketing/compliance).
---
Role filtering pattern:
1. Read current user via getCurrentUser() from /lib/auth.
2. Check user.role_slug against required roles.
3. If operator or delivery role: use big buttons (min 64px tap target), one primary action visible at a time, no dense tables.
4. If manager or founder: dense data tables OK, multiple KPIs, drill-down.
5. If marketing: kanban layout preferred.
6. If compliance: calendar layout preferred.
Scope data queries by location_id='buziga' always. For operator views, filter data to "their shift / their station" where applicable.
