'use client';

import { useAuth } from '@/components/AuthProvider';

export function useCanEdit(deptSlug: string) {
  const { user } = useAuth();
  if (!user) return { canEdit: false, isReadOnly: true };

  const userDepts: string[] = [
    ...(user.departments ?? []),
    user.department_slug,
  ].filter(Boolean);

  const canEdit =
    user.role === 'founder' ||
    (user.role === 'manager' && userDepts.includes(deptSlug)) ||
    userDepts.includes(deptSlug);

  return { canEdit, isReadOnly: !canEdit };
}
