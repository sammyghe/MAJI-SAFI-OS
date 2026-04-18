import { redirect } from 'next/navigation';

// HR is managed under the Compliance department per CLAUDE.md section 3.
// Team management is at /compliance/team.
export default function HRPage() {
  redirect('/compliance/team');
}
