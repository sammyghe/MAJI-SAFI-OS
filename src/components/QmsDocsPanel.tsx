'use client';

import { useEffect, useState } from 'react';
import { ExternalLink, FileText, Shield } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface QmsDoc {
  id: string;
  doc_slug: string;
  title: string;
  drive_url: string;
  owner_role: string | null;
  unbs_required: boolean;
}

const ROLE_LABELS: Record<string, string> = {
  production_assistant: 'Operator',
  lead_operator: 'Lead Operator',
  quality: 'Quality',
  inventory: 'Inventory',
  compliance: 'Compliance',
  founder: 'Founder',
};

interface Props {
  category: string;
}

export default function QmsDocsPanel({ category }: Props) {
  const [docs, setDocs] = useState<QmsDoc[]>([]);

  useEffect(() => {
    supabase
      .from('qms_documents')
      .select('id, doc_slug, title, drive_url, owner_role, unbs_required')
      .eq('category', category)
      .then(({ data }) => setDocs(data ?? []));
  }, [category]);

  if (docs.length === 0) return null;

  return (
    <div className="mt-8">
      <div className="flex items-center gap-2 mb-3 px-1">
        <FileText className="w-3.5 h-3.5 text-slate-400" />
        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">UNBS QMS Documents</p>
      </div>
      <div className="glass-card divide-y divide-slate-100/80">
        {docs.map(doc => (
          <a
            key={doc.id}
            href={doc.drive_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 px-4 py-3 hover:bg-white/70 transition-all group"
          >
            <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: '#0077B615' }}>
              <FileText className="w-4 h-4 text-[#0077B6]" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-800 group-hover:text-[#0077B6] transition-colors truncate">{doc.title}</p>
              <div className="flex items-center gap-2 mt-0.5">
                {doc.owner_role && (
                  <span className="text-[10px] text-slate-400">{ROLE_LABELS[doc.owner_role] ?? doc.owner_role}</span>
                )}
                {doc.unbs_required && (
                  <span className="flex items-center gap-0.5 text-[10px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-full">
                    <Shield className="w-2.5 h-2.5" /> UNBS
                  </span>
                )}
              </div>
            </div>
            <ExternalLink className="w-3.5 h-3.5 text-slate-300 group-hover:text-[#0077B6] transition-colors flex-shrink-0" />
          </a>
        ))}
      </div>
    </div>
  );
}
