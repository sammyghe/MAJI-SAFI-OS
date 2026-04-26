import type { User } from '@/components/AuthProvider';

export function canViewDept(user: User | null, dept_slug: string): boolean {
  if (!user) return false;
  if (user.role === 'founder' || user.permissions?.all) return true;
  const depts: string[] = user.permissions?.departments ?? [];
  return Array.isArray(depts) && depts.includes(dept_slug);
}

export function canEditInDept(user: User | null, dept_slug: string): boolean {
  if (!user) return false;
  if (user.role === 'founder' || user.permissions?.all) return true;
  const depts: string[] = user.permissions?.departments ?? [];
  if (!Array.isArray(depts) || !depts.includes(dept_slug)) return false;
  // scope restrictions
  if (user.permissions?.scope === 'own_shift' || user.permissions?.scope === 'own_tasks') return true;
  return true;
}

export function canViewPayroll(user: User | null): boolean {
  if (!user) return false;
  return user.role === 'founder' || user.permissions?.all === true;
}

export function canViewCapTable(user: User | null): boolean {
  if (!user) return false;
  return user.role === 'founder' || user.permissions?.all === true;
}

export function canApproveExpenses(user: User | null): boolean {
  if (!user) return false;
  return user.role === 'founder' || user.permissions?.all === true || user.permissions?.approve_expenses === true;
}

// ─── Session 5A: permission-aware data access ─────────────────────────────────

// Tables where row-level detail is restricted to owner department + founders
const DETAIL_RESTRICTED: Record<string, string[]> = {
  transactions:       ['finance', 'founder-office'],
  sales_ledger:       ['sales', 'dispatch', 'finance', 'founder-office'],
  production_logs:    ['production', 'quality', 'founder-office'],
  water_tests:        ['quality', 'compliance', 'founder-office'],
  inventory_items:    ['inventory', 'production', 'founder-office'],
  distributors:       ['sales', 'marketing', 'dispatch', 'founder-office'],
  team_members:       ['founder-office'],
  bank_accounts:      ['finance', 'founder-office'],
  payroll_entries:    ['finance', 'founder-office'],
  supplier_invoices:  ['finance', 'founder-office'],
  compliance_records: ['compliance', 'founder-office'],
};

export function canViewDetail(user: User | null, entityTable: string): boolean {
  if (!user) return false;
  if (user.role === 'founder' || user.permissions?.all) return true;
  if (user.permissions?.can_view_financials &&
    ['transactions', 'bank_accounts', 'payroll_entries'].includes(entityTable)) return true;
  const allowedDepts = DETAIL_RESTRICTED[entityTable];
  if (!allowedDepts) return true;
  const userDepts: string[] = user.permissions?.departments ?? [];
  return allowedDepts.some(dept => userDepts.includes(dept));
}

// Returns a safe column list for the entity table given the user's access level
export function safeColumns(user: User | null, entityTable: string): string {
  if (canViewDetail(user, entityTable)) return '*';
  const SAFE: Record<string, string> = {
    transactions:       'id, transaction_date, category, transaction_type, location_id',
    sales_ledger:       'id, sale_date, product_type, jars_sold, location_id',
    production_logs:    'id, production_date, jar_count, product_type, status, location_id',
    water_tests:        'id, tested_at, test_type, result, location_id',
    inventory_items:    'id, item_name, category, quantity, unit, reorder_threshold, location_id',
    distributors:       'id, name, zone, status, tier, location_id',
    team_members:       'id, name, role, departments',
    bank_accounts:      'id, name, currency',
    compliance_records: 'id, document_name, category, expiry_date, status, location_id',
  };
  return SAFE[entityTable] ?? 'id, created_at';
}
