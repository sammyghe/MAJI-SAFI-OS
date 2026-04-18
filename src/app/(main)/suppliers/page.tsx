import { redirect } from 'next/navigation';

// Supplier management is part of Inventory procurement per CLAUDE.md section 3.
// Stock reorder alerts, supplier contacts, and procurement are tracked via inventory_items + events.
export default function SuppliersPage() {
  redirect('/inventory');
}
