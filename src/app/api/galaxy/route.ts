import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
let cache: { data: unknown; ts: number } | null = null;

const DEPTS = ['founder-office','production','quality','inventory','dispatch','sales','marketing','finance','compliance','technology'];
const ROLES = ['founder','operations_manager','lead_operator','production_assistant','delivery_field','marketing','compliance'];
const RC: Record<string,string> = { founder:'#FFD700', operations_manager:'#0077B6', lead_operator:'#22c55e', production_assistant:'#8b5cf6', delivery_field:'#f97316', marketing:'#ec4899', compliance:'#64748b' };
const SC: Record<string,string> = { on_track:'#22c55e', at_risk:'#f59e0b', off_track:'#ef4444', active:'#22c55e', completed:'#0077B6', pending:'#f59e0b', open:'#ef4444', in_progress:'#f59e0b', resolved:'#22c55e' };
const SVC: Record<string,string> = { critical:'#ef4444', high:'#f97316', medium:'#f59e0b', low:'#22c55e' };
const STC: Record<string,string> = { push:'#0077B6', pull:'#7EC8E3', realtime:'#FFD700', scheduled:'#22c55e', event:'#f59e0b' };

interface N { id:string; label:string; type:string; color:string; size:number; icon:string; meta?:Record<string,unknown>; }
interface E { source:string; target:string; type:string; color:string; label?:string; why_shared?:string; }

async function build() {
  const nodes: N[] = []; const edges: E[] = [];
  const fiveMin = new Date(Date.now()-5*60*1000).toISOString();

  // The Maji Safi Logo as the central anchor (Level 0)
  nodes.push({ id: 'brand:logo', label: 'Maji Safi', type: 'brand', color: '#0077B6', size: 30, icon: 'logo', meta: { fx: 0, fy: 0, level: 0 } });

  DEPTS.forEach(d => {
    // Founder office is level 1, others are level 2
    const level = d === 'founder-office' ? 1 : 2;
    nodes.push({ id:`dept:${d}`, label:d.replace(/-/g,' ').replace(/\b\w/g,c=>c.toUpperCase()), type:'department', color:'#0077B6', size:18, icon:'department', meta: { level } });
    edges.push({ source: 'brand:logo', target: `dept:${d}`, type: 'core', color: 'rgba(0,119,182,0.1)' });
  });

  ROLES.forEach(r => {
    // Roles are level 3
    nodes.push({ id:`role:${r}`, label:r.replace(/_/g,' ').replace(/\b\w/g,c=>c.toUpperCase()), type:'role', color:'#FFD700', size:12, icon:'role', meta: { level: 3 } });
    // Connect roles to their respective departments if possible, otherwise to logo
    let parent = 'brand:logo';
    if (r === 'founder') parent = 'dept:founder-office';
    else if (r.includes('operator') || r.includes('production')) parent = 'dept:production';
    else if (r.includes('delivery')) parent = 'dept:dispatch';
    else if (r.includes('marketing')) parent = 'dept:marketing';
    else if (r.includes('compliance')) parent = 'dept:compliance';
    
    edges.push({ source: parent, target: `role:${r}`, type: 'org', color: 'rgba(255,215,0,0.1)' });
  });

  const [tm,cu,su,pr,pj,rk,is,dc,as,ir] = await Promise.all([
    sb.from('team_members').select('id,name,role,department_slug,departments,last_seen_at').eq('contract_status','active'),
    sb.from('customers').select('id,name,customer_type').limit(100),
    sb.from('suppliers').select('id,name').limit(50),
    sb.from('products').select('id,name').limit(20),
    sb.from('projects').select('id,name,status').limit(50),
    sb.from('rocks').select('id,title,status,owner_id,department_slug').limit(50),
    sb.from('issues').select('id,title,severity,status,owner_id,department_slug').limit(50),
    sb.from('documents').select('id,title,category,linked_entity_type,linked_entity_id').limit(80),
    sb.from('assets').select('id,name,status,supplier_id').limit(50),
    sb.from('information_relationships').select('id,source_department,target_department,share_type,why_shared,data_name').limit(200),
  ]);

  for (const m of tm.data??[]) {
    const act = m.last_seen_at && m.last_seen_at > fiveMin;
    // People are level 4
    nodes.push({ id:`person:${m.id}`, label:m.name||'?', type:'team_member', color:RC[m.role]||'#7EC8E3', size:act?10:7, icon:'person', meta:{role:m.role,active:act, level: 4} });
    if (m.role && ROLES.includes(m.role)) edges.push({ source:`role:${m.role}`, target:`person:${m.id}`, type:'membership', color:'#FFD700' });
    const ds = m.departments?.length ? m.departments : m.department_slug ? [m.department_slug] : [];
    ds.filter((d:string)=>DEPTS.includes(d)).forEach((d:string) => edges.push({ source:`dept:${d}`, target:`person:${m.id}`, type:'works_in', color:'#0077B6' }));
  }
  // Leaf nodes are level 5
  for (const c of cu.data??[]) { nodes.push({ id:`customer:${c.id}`, label:c.name||'Customer', type:'customer', color:c.customer_type==='distributor'?'#06b6d4':'#7EC8E3', size:6, icon:'building', meta: { level: 5 } }); edges.push({ source:'dept:sales', target:`customer:${c.id}`, type:'sale', color:'#7EC8E3' }); }
  for (const s of su.data??[]) { nodes.push({ id:`supplier:${s.id}`, label:s.name||'Supplier', type:'supplier', color:'#22c55e', size:7, icon:'truck', meta: { level: 5 } }); }
  for (const p of pr.data??[]) { nodes.push({ id:`product:${p.id}`, label:p.name||'Product', type:'product', color:'#0077B6', size:8, icon:'droplet', meta: { level: 5 } }); edges.push({ source:'dept:production', target:`product:${p.id}`, type:'produces', color:'#0077B6' }); }
  for (const p of pj.data??[]) { nodes.push({ id:`project:${p.id}`, label:p.name||'Project', type:'project', color:SC[p.status]||'#7EC8E3', size:8, icon:'target', meta: { level: 5 } }); }
  for (const r of rk.data??[]) {
    nodes.push({ id:`rock:${r.id}`, label:r.title||'Rock', type:'rock', color:SC[r.status]||'#f59e0b', size:7, icon:'mountain', meta: { level: 5 } });
    if (r.department_slug && DEPTS.includes(r.department_slug)) edges.push({ source:`dept:${r.department_slug}`, target:`rock:${r.id}`, type:'rock_dept', color:'#f59e0b' });
    if (r.owner_id) edges.push({ source:`person:${r.owner_id}`, target:`rock:${r.id}`, type:'rock_owner', color:'#f59e0b' });
  }
  for (const i of is.data??[]) {
    nodes.push({ id:`issue:${i.id}`, label:i.title||'Issue', type:'issue', color:SVC[i.severity]||'#f59e0b', size:6, icon:'alert', meta: { level: 5 } });
    if (i.department_slug && DEPTS.includes(i.department_slug)) edges.push({ source:`dept:${i.department_slug}`, target:`issue:${i.id}`, type:'issue_dept', color:SVC[i.severity]||'#ef4444' });
    if (i.owner_id) edges.push({ source:`person:${i.owner_id}`, target:`issue:${i.id}`, type:'issue_owner', color:'#ef4444' });
  }
  for (const d of dc.data??[]) {
    nodes.push({ id:`document:${d.id}`, label:d.title||'Doc', type:'document', color:'#64748b', size:5, icon:'file', meta: { level: 5 } });
    if (d.linked_entity_type && d.linked_entity_id) edges.push({ source:`${d.linked_entity_type}:${d.linked_entity_id}`, target:`document:${d.id}`, type:'doc_link', color:'#64748b' });
  }
  for (const a of as.data??[]) {
    nodes.push({ id:`asset:${a.id}`, label:a.name||'Asset', type:'asset', color:SC[a.status]||'#7EC8E3', size:6, icon:'machine', meta: { level: 5 } });
    if (a.supplier_id) edges.push({ source:`supplier:${a.supplier_id}`, target:`asset:${a.id}`, type:'supplied', color:'#22c55e' });
    edges.push({ source:'dept:production', target:`asset:${a.id}`, type:'asset_dept', color:'#7EC8E3' });
  }
  for (const r of ir.data??[]) {
    if (r.source_department && r.target_department) edges.push({ source:`dept:${r.source_department}`, target:`dept:${r.target_department}`, type:'info_flow', color:STC[r.share_type]||'#0077B6', label:r.data_name||r.share_type, why_shared:r.why_shared });
  }

  const nids = new Set(nodes.map(n=>n.id));
  const es = new Set<string>();
  const ve = edges.filter(e => { const k=`${e.source}→${e.target}:${e.type}`; if(es.has(k)||!nids.has(e.source)||!nids.has(e.target)) return false; es.add(k); return true; });
  return { nodes, edges: ve };
}

export async function GET() {
  if (cache && Date.now()-cache.ts < 30000) return NextResponse.json(cache.data, { headers:{'Cache-Control':'public, max-age=30'} });
  try { const d = await build(); cache = { data:d, ts:Date.now() }; return NextResponse.json(d); }
  catch(e) { console.error('Galaxy:',e); return NextResponse.json({ nodes:[], edges:[] }); }
}
