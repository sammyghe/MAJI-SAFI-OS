'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { ExternalLink, FileText, Shield, FolderOpen } from 'lucide-react';

interface QmsDoc {
  id: string;
  doc_slug: string;
  title: string;
  description: string | null;
  drive_url: string;
  category: string | null;
  owner_role: string | null;
  unbs_required: boolean;
  related_os_page: string | null;
  related_db_table: string | null;
  last_reviewed_at: string | null;
}

const CATEGORY_ORDER = ['production', 'quality', 'inventory', 'compliance'];
const CATEGORY_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  production:  { label: 'Production',  color: '#10B981', bg: '#10B98115' },
  quality:     { label: 'Quality',     color: '#F59E0B', bg: '#F59E0B15' },
  inventory:   { label: 'Inventory',   color: '#8B5CF6', bg: '#8B5CF615' },
  compliance:  { label: 'Compliance',  color: '#EF4444', bg: '#EF444415' },
};

const ROLE_LABELS: Record<string, string> = {
  production_assistant: 'Operator',
  lead_operator: 'Lead Operator',
  quality: 'Quality Manager',
  inventory: 'Inventory Officer',
  compliance: 'Compliance Officer',
  founder: 'Founder',
};

export default function QmsPage() {
  const [docs, setDocs] = useState<QmsDoc[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from('qms_documents').select('*').order('category').order('title')
      .then(({ data }) => { setDocs(data ?? []); setLoading(false); });
  }, []);

  const grouped = CATEGORY_ORDER.map(cat => ({
    cat,
    cfg: CATEGORY_LABELS[cat] ?? { label: cat, color: '#0077B6', bg: '#0077B615' },
    items: docs.filter(d => d.category === cat),
  })).filter(g => g.items.length > 0);

  const total = docs.length;
  const unbsCount = docs.filter(d => d.unbs_required).length;

  return (
    <div className="px-4 md:px-8 py-8 max-w-5xl mx-auto space-y-8">

      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: '#0077B620' }}>
              <FolderOpen className="w-6 h-6 text-[#0077B6]" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-900" style={{ fontFamily: 'Montserrat, sans-serif' }}>Quality Management System</h1>
              <p className="text-slate-500 text-sm mt-0.5">Richard's UNBS-approved forms — linked to the OS</p>
            </div>
          </div>
          <a
            href="https://drive.google.com/drive/folders/15X6NHxGDPSd404oaUSGsfbPKWqcVMXNI"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-[#0077B6] border-2 border-[#0077B6]/20 hover:bg-[#0077B6]/5 transition-all"
          >
            <FolderOpen className="w-4 h-4" />
            Open Drive Folder
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Total Documents', value: total, color: '#0077B6' },
            { label: 'UNBS Required', value: unbsCount, color: '#F59E0B' },
            { label: 'Inspection', value: 'May 14', color: '#EF4444' },
          ].map(s => (
            <div key={s.label} className="glass-card-strong p-4 text-center">
              <p className="text-2xl font-black" style={{ color: s.color }}>{s.value}</p>
              <p className="text-xs text-slate-500 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      </motion.div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => <div key={i} className="glass-card h-40 animate-pulse" />)}
        </div>
      ) : (
        <div className="space-y-8">
          {grouped.map(({ cat, cfg, items }, gi) => (
            <motion.div key={cat} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: gi * 0.06 }}>
              {/* Category header */}
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: cfg.bg }}>
                  <FileText className="w-4 h-4" style={{ color: cfg.color }} />
                </div>
                <p className="text-sm font-bold text-slate-700">{cfg.label}</p>
                <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">{items.length} docs</span>
              </div>

              {/* Docs grid */}
              <div className="grid md:grid-cols-2 gap-3">
                {items.map(doc => (
                  <div key={doc.id} className="bg-white rounded-2xl border-2 border-slate-100 p-5 hover:border-[#0077B6]/20 hover:shadow-md transition-all group">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-slate-900 leading-snug">{doc.title}</p>
                        <div className="flex flex-wrap items-center gap-2 mt-2">
                          {doc.owner_role && (
                            <span className="text-[10px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                              {ROLE_LABELS[doc.owner_role] ?? doc.owner_role}
                            </span>
                          )}
                          {doc.unbs_required && (
                            <span className="flex items-center gap-0.5 text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                              <Shield className="w-2.5 h-2.5" /> UNBS Required
                            </span>
                          )}
                          {doc.related_os_page && (
                            <span className="text-[10px] text-[#0077B6] bg-blue-50 px-2 py-0.5 rounded-full">
                              Linked → {doc.related_os_page}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <a
                      href={doc.drive_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-4 flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-sm font-semibold text-[#0077B6] border-2 border-[#0077B6]/15 hover:bg-[#0077B6] hover:text-white transition-all"
                    >
                      Open Form in Drive
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                ))}
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
