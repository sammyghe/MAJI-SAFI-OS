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
