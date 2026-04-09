import { 
  Settings, 
  ShieldCheck, 
  BadgeDollarSign, 
  Package, 
  Wallet, 
  ClipboardCheck,
  Zap,
  Beaker,
  Truck,
  Box,
  Scale,
  Users
} from 'lucide-react';

export const DEPARTMENTS_CONFIG = {
  operations: {
    slug: 'operations',
    title: "Operations Hub",
    description: "Daily production monitoring, machine maintenance, and output telemetry.",
    icon: Settings,
    color: "brand-sky",
    head: { name: "Sammy Kitale", role: "Ops Director", img: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=256&h=256&auto=format&fit=crop" },
    sops: ["Daily Operational Checklist", "Machine Startup/Shutdown", "Emergency Stop Protocol"],
    table: "maji_daily_logs",
    formFields: [
      { name: 'jars_produced', label: 'Jars Produced', type: 'number', placeholder: 'e.g. 520' },
      { name: 'cash_collected_ugx', label: 'Cash Collected (UGX)', type: 'number', placeholder: 'e.g. 850000' },
      { name: 'quality_status', label: 'Quality Status', type: 'select', options: ['pass', 'flag', 'fail'] }
    ]
  },
  quality: {
    slug: 'quality',
    title: "Quality Control Hub",
    description: "Precision water testing, batch certification, and UNBS compliance tracking.",
    icon: Beaker,
    color: "emerald-400",
    head: { name: "Dr. Sarah Namuli", role: "Chief Microbiologist", img: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?q=80&w=256&h=256&auto=format&fit=crop" },
    sops: ["UNBS Testing Standards", "E.coli Zero Tolerance Protocol", "Batch Traceability"],
    table: "maji_quality_logs",
    formFields: [
      { name: 'batch_number', label: 'Batch ID', type: 'text', placeholder: 'e.g. B2304' },
      { name: 'tds_reading', label: 'TDS (mg/L)', type: 'number', placeholder: 'e.g. 15' },
      { name: 'ph_reading', label: 'pH Level', type: 'number', placeholder: 'e.g. 7.2' },
      { name: 'status', label: 'Certification', type: 'select', options: ['pass', 'flag'] }
    ]
  },
  sales: {
    slug: 'sales',
    title: "Sales & Distribution Hub",
    description: "T1 Distributor networks, revenue streams, and market expansion.",
    icon: Truck,
    color: "brand-steel",
    head: { name: "Mark Okello", role: "Head of Growth", img: "https://images.unsplash.com/photo-1600486913747-55e5470d6f40?q=80&w=256&h=256&auto=format&fit=crop" },
    sops: ["T1 Distributor Onboarding", "Cash Collection Procedure", "Sleeping Distributor Follow-up"],
    table: "maji_clients",
    formFields: [
      { name: 'name', label: 'Client/Distributor Name', type: 'text', placeholder: 'e.g. Kampala Central Water' },
      { name: 'contact', label: 'Phone/Contact', type: 'text', placeholder: '07xx...' },
      { name: 'zone', label: 'Distribution Zone', type: 'text', placeholder: 'e.g. Nakasero' },
      { name: 'tier', label: 'Distributor Tier', type: 'select', options: ['T1', 'T2', 'Retail'] }
    ]
  },
  inventory: {
    slug: 'inventory',
    title: "Inventory & Warehouse Hub",
    description: "Raw material tracking, stock health, and reorder point management.",
    icon: Box,
    color: "orange-400",
    head: { name: "Jane Atiang", role: "Inventory Controller", img: "https://images.unsplash.com/photo-1580489944761-15a19d654956?q=80&w=256&h=256&auto=format&fit=crop" },
    sops: ["Morning Stock Count", "Reorder Alert Protocol", "FIFO Rotation"],
    table: "maji_inventory",
    products: [
      { name: '20L Single Use', unit: 'Jars', size: 20 },
      { name: '20L Reusable', unit: 'Jars', size: 20 },
      { name: '5L Jar Single Use', unit: 'Jars', size: 5 },
      { name: 'Refill', unit: 'Liters', size: 1 }
    ],
    formFields: [
      { 
        name: 'product_type', 
        label: 'Product Sector', 
        type: 'select', 
        options: ['20L Single Use', '20L Reusable', '5L Jar Single Use', 'Refill'] 
      },
      { name: 'quantity', label: 'Units (Jars/Liters)', type: 'number', placeholder: 'e.g. 50' },
      { name: 'min_threshold', label: 'Safety Stock Limit', type: 'number', placeholder: 'e.g. 100' }
    ]
  },
  finance: {
    slug: 'finance',
    title: "Finance Hub",
    description: "Cash reconciliation, burn-rate analysis, and investor transparency.",
    icon: Wallet,
    color: "indigo-400",
    head: { name: "Peter Mukasa", role: "Financial Controller", img: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?q=80&w=256&h=256&auto=format&fit=crop" },
    sops: ["Daily Cash Reconciliation", "Expense Approval", "Investor Reporting"],
    table: "maji_daily_logs",
    formFields: [
      { name: 'description', label: 'Transaction Detail', type: 'text', placeholder: 'e.g. Fuel for delivery truck' },
      { name: 'amount_ugx', label: 'Amount (UGX)', type: 'number', placeholder: 'e.g. 50000' }
    ]
  },
  compliance: {
    slug: 'compliance',
    title: "Compliance & Legal Hub",
    description: "Regulatory documentation, UNBS certificates, and health safety standards.",
    icon: Scale,
    color: "purple-400",
    head: { name: "Agnes Nabirye", role: "Legal Associate", img: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=256&h=256&auto=format&fit=crop" },
    sops: ["UNBS Renewal Process", "Document Retention", "Employee Certification Tracking"],
    table: "maji_compliance_records",
    formFields: [
      { name: 'title', label: 'Record Title', type: 'text', placeholder: 'e.g. UNBS Annual License' },
      { name: 'expiry_date', label: 'Expiration Date', type: 'date', placeholder: '' },
      { name: 'status', label: 'Status', type: 'select', options: ['valid', 'expiring', 'expired'] }
    ]
  }
};
