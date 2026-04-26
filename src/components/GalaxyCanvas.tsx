'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import { Search, X, Maximize2, Minimize2, Filter, ChevronLeft } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';

interface GNode {
  id: string; label: string; type: string; color: string;
  size: number; icon: string; meta?: Record<string, unknown>;
  x?: number; y?: number; fx?: number; fy?: number;
}
interface GEdge {
  source: string | GNode; target: string | GNode;
  type: string; color: string; label?: string; why_shared?: string;
}
interface GraphData { nodes: GNode[]; edges: GEdge[]; }

const TYPE_ICONS: Record<string, string> = {
  department: '🏢', role: '⭐', team_member: '👤', customer: '🏬',
  supplier: '🚛', product: '💧', project: '🎯', rock: '🗻',
  issue: '⚠️', document: '📄', asset: '⚙️',
};

const ENTITY_TYPES = ['department','role','team_member','customer','supplier','product','project','rock','issue','document','asset'];

type Layer = 'all' | 'people' | 'data' | 'ops' | 'customer';

export default function GalaxyCanvas() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fgRef = useRef<any>(null);
  const [graphData, setGraphData] = useState<{ nodes: GNode[]; links: GEdge[] }>({ nodes: [], links: [] });
  const [allData, setAllData] = useState<GraphData>({ nodes: [], edges: [] });
  const [loading, setLoading] = useState(true);
  const [selectedNode, setSelectedNode] = useState<GNode | null>(null);
  const [hoveredNode, setHoveredNode] = useState<GNode | null>(null);
  const [hoveredEdge, setHoveredEdge] = useState<GEdge | null>(null);
  const [highlightNodes, setHighlightNodes] = useState<Set<string>>(new Set());
  const [highlightLinks, setHighlightLinks] = useState<Set<string>>(new Set());
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const [search, setSearch] = useState('');
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [fullscreen, setFullscreen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTypes, setActiveTypes] = useState<Set<string>>(new Set(ENTITY_TYPES));
  const [activeLayer, setActiveLayer] = useState<Layer>('all');
  const [layoutMode, setLayoutMode] = useState<'force' | 'dag'>('dag');
  const [dimensions, setDimensions] = useState({ w: 800, h: 600 });
  const [zoomedIn, setZoomedIn] = useState(false);
  const [logoImg, setLogoImg] = useState<HTMLImageElement | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Load logo & searches
  useEffect(() => {
    const img = new Image();
    img.src = '/maji-safi-logo-white.png';
    img.onload = () => setLogoImg(img);
    const saved = localStorage.getItem('galaxy_recent_searches');
    if (saved) setRecentSearches(JSON.parse(saved));
  }, []);

  // Measure container
  useEffect(() => {
    const update = () => {
      if (containerRef.current) {
        setDimensions({ w: containerRef.current.offsetWidth, h: containerRef.current.offsetHeight });
      }
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, [fullscreen]);

  // Fetch data
  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/galaxy');
      const json: GraphData = await res.json();
      setAllData(json);
    } catch (e) {
      console.error('Galaxy fetch error:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Supabase realtime
  useEffect(() => {
    const ch = supabase.channel('galaxy-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'team_members' }, fetchData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'projects' }, fetchData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rocks' }, fetchData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'issues' }, fetchData)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [fetchData]);

  // Filter graph by active types + search + layer
  useEffect(() => {
    let nodes = allData.nodes;
    let links = allData.edges;

    // 1. Layer Filtering
    if (activeLayer === 'people') {
      const allowed = new Set(['brand', 'department', 'role', 'team_member']);
      nodes = nodes.filter(n => allowed.has(n.type));
      links = links.filter(l => l.type === 'membership' || l.type === 'works_in' || l.type === 'core' || l.type === 'org');
    } else if (activeLayer === 'data') {
      nodes = nodes.filter(n => n.type === 'department' || n.type === 'brand');
      links = links.filter(l => l.type === 'info_flow' || l.type === 'core');
    } else if (activeLayer === 'ops') {
      const depts = new Set(['dept:production', 'dept:quality', 'dept:inventory', 'dept:dispatch']);
      nodes = nodes.filter(n => n.type === 'brand' || depts.has(n.id) || (n.type === 'asset' || n.type === 'product'));
      links = links.filter(l => l.type === 'produces' || l.type === 'asset_dept' || l.type === 'core');
    } else if (activeLayer === 'customer') {
      const depts = new Set(['dept:sales', 'dept:marketing']);
      nodes = nodes.filter(n => n.type === 'brand' || depts.has(n.id) || n.type === 'customer');
      links = links.filter(l => l.type === 'sale' || l.type === 'core');
    }

    // 2. Type filtering
    nodes = nodes.filter(n => activeTypes.has(n.type) || n.type === 'brand');

    // 3. Search filtering (if active, we might want to show connections too, but for now just filter)
    if (search.trim()) {
      const q = search.toLowerCase();
      // Keep nodes that match or are connected to matches? Let's just keep matches for the list
      // nodes = nodes.filter(n => n.label.toLowerCase().includes(q));
    }

    const nodeIds = new Set(nodes.map(n => n.id));
    links = links.filter(e => {
      const s = typeof e.source === 'string' ? e.source : e.source.id;
      const t = typeof e.target === 'string' ? e.target : e.target.id;
      return nodeIds.has(s) && nodeIds.has(t);
    });

    setGraphData({ nodes, links });
  }, [allData, activeTypes, search, activeLayer]);

  // Initial zoom-in animation
  useEffect(() => {
    if (!loading && fgRef.current && !zoomedIn) {
      setTimeout(() => {
        fgRef.current?.zoomToFit(2000, 80);
        setZoomedIn(true);
      }, 500);
    }
  }, [loading, zoomedIn]);

  // Search → zoom to node
  const handleSearch = (term: string) => {
    setSearch(term);
    if (!term.trim() || !fgRef.current) return;
    const found = graphData.nodes.find(n => n.label.toLowerCase().includes(term.toLowerCase()));
    if (found && found.x !== undefined && found.y !== undefined) {
      fgRef.current.centerAt(found.x, found.y, 800);
      fgRef.current.zoom(4, 800);
      setRecentSearches(prev => {
        const next = [term, ...prev.filter(s => s !== term)].slice(0, 5);
        localStorage.setItem('galaxy_recent_searches', JSON.stringify(next));
        return next;
      });
    }
  };

  const handleHighlight = (node: GNode | null) => {
    if (!node) {
      setHighlightNodes(new Set());
      setHighlightLinks(new Set());
      return;
    }
    const nodes = new Set<string>([node.id]);
    const links = new Set<string>();
    graphData.links.forEach(l => {
      const s = typeof l.source === 'string' ? l.source : l.source.id;
      const t = typeof l.target === 'string' ? l.target : l.target.id;
      if (s === node.id || t === node.id) {
        nodes.add(s);
        nodes.add(t);
        links.add(`${s}-${t}`);
      }
    });
    setHighlightNodes(nodes);
    setHighlightLinks(links);
  };

  const resetView = () => {
    if (fgRef.current) {
      fgRef.current.zoomToFit(800, 80);
      handleHighlight(null);
      setSelectedNode(null);
    }
  };

  const drawHulls = (ctx: CanvasRenderingContext2D) => {
    // Group nodes by department
    const groups: Record<string, GNode[]> = {};
    graphData.nodes.forEach(n => {
      if (n.type === 'team_member' || n.type === 'role' || n.type === 'department') {
        const dept = n.meta?.department_slug as string || n.id.split(':')[1];
        if (dept && dept !== 'logo') {
          if (!groups[dept]) groups[dept] = [];
          groups[dept].push(n);
        }
      }
    });

    ctx.save();
    Object.entries(groups).forEach(([dept, nodes]) => {
      if (nodes.length < 3) return; // Need at least 3 points for a hull
      
      // Simple bounding box or convex hull
      // For now, let's do a soft blurred glow area around the group
      const centerX = nodes.reduce((s, n) => s + n.x!, 0) / nodes.length;
      const centerY = nodes.reduce((s, n) => s + n.y!, 0) / nodes.length;
      
      let maxDist = 0;
      nodes.forEach(n => {
        const d = Math.sqrt((n.x! - centerX) ** 2 + (n.y! - centerY) ** 2);
        if (d > maxDist) maxDist = d;
      });

      const r = maxDist + 30;
      const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, r);
      const color = nodes[0].color;
      gradient.addColorStop(0, color + '15');
      gradient.addColorStop(1, 'transparent');
      
      ctx.beginPath();
      ctx.arc(centerX, centerY, r, 0, Math.PI * 2);
      ctx.fillStyle = gradient;
      ctx.fill();
    });
    ctx.restore();
  };

  const drawNode = useCallback((node: GNode, ctx: CanvasRenderingContext2D, globalScale: number) => {
    // Only draw hulls once per frame
    if (node.id === graphData.nodes[0]?.id) {
      drawHulls(ctx);
    }

    const isHighlighted = highlightNodes.size === 0 || highlightNodes.has(node.id);
    const isHovered = hoveredNode?.id === node.id;
    const alpha = isHighlighted ? 1 : 0.15;

    const r = (node.size || 6) / globalScale * (isHovered ? 1.5 : 1.2);
    const label = node.label;
    const now = Date.now();
    const pulse = node.meta?.active ? 0.8 + 0.2 * Math.sin(now / 600) : 1;

    ctx.save();
    ctx.globalAlpha = alpha;

    if (node.id === 'brand:logo') {
      const logoSize = (node.size * 3) / globalScale;
      const logoPulse = 0.95 + 0.05 * Math.sin(now / 1000);
      const s = logoSize * logoPulse;
      if (logoImg) {
        ctx.shadowColor = 'rgba(0, 119, 182, 0.6)';
        ctx.shadowBlur = 40 / globalScale;
        ctx.drawImage(logoImg, node.x! - s / 2, node.y! - s / 2, s, s);
        ctx.shadowBlur = 0;
      } else {
        ctx.beginPath();
        ctx.arc(node.x!, node.y!, s / 2, 0, 2 * Math.PI);
        ctx.fillStyle = '#0077B6';
        ctx.fill();
      }
      ctx.restore();
      return;
    }

    // Glow for high-level nodes
    if (node.type === 'department' || node.type === 'role') {
      ctx.shadowColor = node.color;
      ctx.shadowBlur = 15 / globalScale;
    }

    ctx.beginPath();
    ctx.arc(node.x!, node.y!, r * pulse, 0, 2 * Math.PI);
    ctx.fillStyle = node.color + 'dd';
    ctx.fill();
    ctx.strokeStyle = '#ffffff33';
    ctx.lineWidth = 1 / globalScale;
    ctx.stroke();

    // Icon in the center
    const icon = TYPE_ICONS[node.type] || '●';
    ctx.font = `${Math.max(4, r * 1.2)}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(icon, node.x!, node.y!);

    // Always-visible Label
    const fontSize = Math.max(3, (node.type === 'department' ? 12 : 10) / globalScale);
    ctx.font = `${node.type === 'department' ? 700 : 400} ${fontSize}px Montserrat, sans-serif`;
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = 'rgba(0,0,0,0.8)';
    ctx.shadowBlur = 4 / globalScale;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(label, node.x!, node.y! + r + 4 / globalScale);

    ctx.restore();
  }, [logoImg, highlightNodes, hoveredNode]);

  const toggleType = (t: string) => {
    setActiveTypes(prev => {
      const next = new Set(prev);
      if (next.has(t)) {
        next.delete(t);
      } else {
        next.add(t);
      }
      return next;
    });
  };

  return (
    <div
      ref={containerRef}
      style={{
        position: fullscreen ? 'fixed' : 'relative',
        inset: fullscreen ? 0 : undefined,
        width: '100%', height: fullscreen ? '100vh' : 'calc(100vh - 64px)',
        background: 'radial-gradient(ellipse at 50% 50%, #1a2238 0%, #0a0a14 100%)',
        overflow: 'hidden', zIndex: fullscreen ? 100 : undefined,
      }}
    >
      {/* Ambient particles */}
      <Particles />

      {/* Top search bar */}
      {/* Top search bar & Mode toggle */}
      <div style={{ position:'absolute', top:16, left:'50%', transform:'translateX(-50%)', zIndex:20, display:'flex', gap:12, alignItems:'center' }}>
        <div style={{ position:'relative' }}>
          <Search size={14} style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', color:'#7EC8E3', pointerEvents:'none' }} />
          <input
            value={search}
            onChange={e => handleSearch(e.target.value)}
            placeholder="Search Galaxy…"
            style={{ paddingLeft:32, paddingRight:12, paddingTop:10, paddingBottom:10, borderRadius:16, background:'rgba(10,10,20,0.85)', border:'1px solid rgba(0,119,182,0.4)', color:'#fff', fontSize:13, fontFamily:'Montserrat, sans-serif', width:300, outline:'none', backdropFilter:'blur(12px)', boxShadow:'0 4px 20px rgba(0,0,0,0.4)' }}
          />
          {search && <button onClick={() => setSearch('')} style={{ position:'absolute', right:8, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', color:'#64748b', cursor:'pointer' }}><X size={12}/></button>}
        </div>

        {/* View Toggles */}
        <div style={{ display:'flex', background:'rgba(10,10,20,0.85)', padding:4, borderRadius:16, border:'1px solid rgba(255,255,255,0.1)', backdropFilter:'blur(12px)' }}>
          {(['all', 'people', 'data', 'ops', 'customer'] as Layer[]).map(l => (
            <button
              key={l}
              onClick={() => setActiveLayer(l)}
              style={{ padding:'6px 12px', borderRadius:12, border:'none', fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:1, background: activeLayer === l ? '#0077B6' : 'transparent', color: activeLayer === l ? '#fff' : '#64748b', cursor:'pointer', transition:'all 0.2s' }}
            >
              {l}
            </button>
          ))}
        </div>

        <button 
          onClick={() => setLayoutMode(m => m === 'force' ? 'dag' : 'force')} 
          style={{ padding:'8px 12px', borderRadius:12, background:'rgba(10,10,20,0.85)', border:'1px solid rgba(0,119,182,0.3)', color:'#7EC8E3', fontSize:10, fontWeight:700, cursor:'pointer', backdropFilter:'blur(12px)' }}
        >
          {layoutMode === 'dag' ? 'HIERARCHY ON' : 'FORCED'}
        </button>

        <button onClick={() => setSidebarOpen(o => !o)} title="Filters" style={{ width:40, height:40, borderRadius:12, background:'rgba(10,10,20,0.85)', border:'1px solid rgba(0,119,182,0.3)', color:'#7EC8E3', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', backdropFilter:'blur(12px)' }}>
          <Filter size={16} />
        </button>
      </div>

      {/* Filter sidebar */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div 
            initial={{ x: -220 }}
            animate={{ x: 0 }}
            exit={{ x: -220 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            style={{ position:'absolute', left:0, top:0, bottom:0, width:220, background:'rgba(10,10,20,0.92)', borderRight:'1px solid rgba(0,119,182,0.2)', zIndex:20, padding:'72px 16px 16px', backdropFilter:'blur(16px)', overflowY:'auto' }}
          >
            <p style={{ fontSize:10, fontWeight:700, color:'#64748b', textTransform:'uppercase', letterSpacing:2, marginBottom:12 }}>Entity Types</p>
            {ENTITY_TYPES.map(t => (
              <label key={t} style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8, cursor:'pointer', fontSize:12, color: activeTypes.has(t) ? '#fff' : '#64748b' }}>
                <input type="checkbox" checked={activeTypes.has(t)} onChange={() => toggleType(t)} style={{ accentColor:'#0077B6' }} />
                <span>{TYPE_ICONS[t]} {t.replace(/_/g,' ')}</span>
              </label>
            ))}
            <button onClick={() => setActiveTypes(new Set(ENTITY_TYPES))} style={{ marginTop:12, width:'100%', padding:'6px 0', borderRadius:8, background:'rgba(0,119,182,0.15)', border:'1px solid rgba(0,119,182,0.3)', color:'#7EC8E3', fontSize:11, cursor:'pointer' }}>Show All</button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Stats bar */}
      <div style={{ position:'absolute', bottom:16, left:'50%', transform:'translateX(-50%)', zIndex:20, display:'flex', gap:16, alignItems:'center', background:'rgba(10,10,20,0.7)', borderRadius:24, padding:'6px 20px', border:'1px solid rgba(0,119,182,0.2)', backdropFilter:'blur(12px)' }}>
        <span style={{ fontSize:11, color:'#7EC8E3', fontFamily:'Montserrat' }}>{graphData.nodes.length} nodes</span>
        <span style={{ width:1, height:12, background:'rgba(255,255,255,0.1)' }}/>
        <span style={{ fontSize:11, color:'#7EC8E3', fontFamily:'Montserrat' }}>{graphData.links.length} edges</span>
        <span style={{ width:1, height:12, background:'rgba(255,255,255,0.1)' }}/>
        <span style={{ fontSize:10, color:'#334155', fontFamily:'Montserrat', letterSpacing:2, textTransform:'uppercase' }}>Hydrate. Elevate.</span>
      </div>

      {/* Edge tooltip */}
      {hoveredEdge && hoveredEdge.why_shared && (
        <div style={{ position:'absolute', left:tooltipPos.x+12, top:tooltipPos.y-8, zIndex:30, background:'rgba(10,10,20,0.95)', border:'1px solid rgba(0,119,182,0.4)', borderRadius:10, padding:'8px 12px', maxWidth:220, fontSize:12, color:'#cbd5e1', backdropFilter:'blur(12px)', pointerEvents:'none' }}>
          <span style={{ color:'#7EC8E3', fontWeight:700, fontSize:11, textTransform:'uppercase' }}>{hoveredEdge.label}</span>
          <p style={{ margin:'4px 0 0', lineHeight:1.5, color:'#94a3b8' }}>{hoveredEdge.why_shared}</p>
        </div>
      )}

      {/* Detail panel */}
      <AnimatePresence>
        {selectedNode && (
          <NodeDetailPanel 
            node={selectedNode} 
            onClose={() => { setSelectedNode(null); handleHighlight(null); }} 
            onHighlight={() => handleHighlight(selectedNode)}
          />
        )}
      </AnimatePresence>

      {loading && (
        <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', zIndex:10 }}>
          <div style={{ textAlign:'center' }}>
            <div style={{ width:40, height:40, border:'2px solid rgba(0,119,182,0.3)', borderTopColor:'#0077B6', borderRadius:'50%', animation:'spin 1s linear infinite', margin:'0 auto 12px' }}/>
            <p style={{ color:'#7EC8E3', fontFamily:'Montserrat', fontSize:12 }}>Building galaxy…</p>
          </div>
        </div>
      )}

      {!loading && graphData.nodes.length === 0 && (
        <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', zIndex:10, pointerEvents:'none' }}>
          <div style={{ textAlign:'center', padding:'32px', background:'rgba(10,10,20,0.85)', borderRadius:20, border:'1px solid rgba(0,119,182,0.2)', backdropFilter:'blur(12px)' }}>
            <p style={{ color:'#7EC8E3', fontFamily:'Montserrat', fontSize:14, fontWeight:700, marginBottom:8 }}>No data yet</p>
            <p style={{ color:'#475569', fontSize:12 }}>Add team members, projects, or customers<br/>to populate the galaxy.</p>
          </div>
        </div>
      )}

      <ForceGraph2D
        ref={fgRef}
        graphData={graphData}
        width={dimensions.w}
        height={dimensions.h}
        backgroundColor="transparent"
        nodeId="id"
        linkSource="source"
        linkTarget="target"
        nodeCanvasObject={drawNode}
        nodePointerAreaPaint={(node: GNode, color, ctx) => {
          const r = (node.size || 6) * 1.5;
          ctx.beginPath(); ctx.arc(node.x!, node.y!, r, 0, 2 * Math.PI);
          ctx.fillStyle = color; ctx.fill();
        }}
        linkColor={(link: GEdge) => {
          const s = typeof link.source === 'string' ? link.source : link.source.id;
          const t = typeof link.target === 'string' ? link.target : link.target.id;
          const isHighlighted = highlightLinks.size === 0 || highlightLinks.has(`${s}-${t}`);
          return isHighlighted ? (link.color || '#0077B6') : 'rgba(255,255,255,0.02)';
        }}
        linkWidth={(link: GEdge) => {
          const s = typeof link.source === 'string' ? link.source : link.source.id;
          const t = typeof link.target === 'string' ? link.target : link.target.id;
          const isHighlighted = highlightLinks.size === 0 || highlightLinks.has(`${s}-${t}`);
          return (link.type === 'info_flow' ? 2 : 0.8) * (isHighlighted ? 1 : 0.2);
        }}
        linkDirectionalParticles={(link: GEdge) => link.type === 'info_flow' ? 3 : 0}
        linkDirectionalParticleColor={(link: GEdge) => link.color}
        linkDirectionalParticleSpeed={0.004}
        linkDirectionalParticleWidth={2}
        onNodeClick={(node: GNode) => {
          if (node.id === 'brand:logo') {
            resetView();
          } else {
            setSelectedNode(node);
          }
        }}
        onNodeHover={(node: GNode | null) => setHoveredNode(node)}
        onLinkHover={(link: GEdge | null, _prev, event?: MouseEvent) => {
          setHoveredEdge(link);
          if (event) setTooltipPos({ x: event.clientX, y: event.clientY });
        }}
        dagMode={layoutMode === 'dag' ? 'td' : undefined}
        dagLevelDistance={80}
        cooldownTicks={100}
        d3AlphaDecay={0.02}
        d3VelocityDecay={0.4}
      />

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

function Particles() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext('2d'); if (!ctx) return;
    canvas.width = window.innerWidth; canvas.height = window.innerHeight;
    const pts = Array.from({ length: 60 }, () => ({ x: Math.random()*canvas.width, y: Math.random()*canvas.height, vy: 0.1+Math.random()*0.2, r: 1+Math.random()*2, o: 0.05+Math.random()*0.1 }));
    let raf: number;
    const draw = () => {
      ctx.clearRect(0,0,canvas.width,canvas.height);
      pts.forEach(p => {
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI*2);
        ctx.fillStyle = `rgba(126,200,227,${p.o})`; ctx.fill();
        p.y -= p.vy;
        if (p.y < -5) { p.y = canvas.height+5; p.x = Math.random()*canvas.width; }
      });
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(raf);
  }, []);
  return <canvas ref={canvasRef} style={{ position:'absolute', inset:0, pointerEvents:'none', zIndex:1 }}/>;
}

function NodeDetailPanel({ node, onClose, onHighlight }: { node: GNode; onClose: () => void; onHighlight: () => void }) {
  const [activity, setActivity] = useState<{ text: string; time: string }[]>([]);
  useEffect(() => {
    // Fetch recent activity for this entity
    const [type, id] = node.id.split(':');
    if (!id) return;
    (async () => {
      const { data } = await supabase.from('entity_comments').select('content, created_at').eq('entity_type', type).eq('entity_id', id).order('created_at', { ascending: false }).limit(5);
      setActivity((data ?? []).map((r: { content: string; created_at: string }) => ({ text: r.content, time: new Date(r.created_at).toLocaleDateString() })));
    })();
  }, [node.id]);

  const [type] = node.id.split(':');
  const path = type === 'department' ? `/${(node.meta?.slug as string) || node.id.replace('dept:','')}` : type === 'customer' ? '/sales' : type === 'team_member' ? '/team' : null;

  return (
    <motion.div 
      initial={{ x: 320 }}
      animate={{ x: 0 }}
      exit={{ x: 320 }}
      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      style={{ position:'absolute', right:0, top:0, bottom:0, width:320, background:'rgba(10,10,20,0.95)', borderLeft:'1px solid rgba(0,119,182,0.25)', zIndex:30, display:'flex', flexDirection:'column', backdropFilter:'blur(20px)' }}
    >
      <div style={{ padding:'16px 16px 12px', borderBottom:'1px solid rgba(255,255,255,0.06)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <span style={{ fontSize:22 }}>{TYPE_ICONS[node.type] || '●'}</span>
          <div>
            <p style={{ fontSize:13, fontWeight:700, color:'#fff', fontFamily:'Montserrat', margin:0 }}>{node.label}</p>
            <p style={{ fontSize:10, color:'#64748b', textTransform:'uppercase', letterSpacing:2, margin:0 }}>{node.type.replace(/_/g,' ')}</p>
          </div>
        </div>
        <button onClick={onClose} style={{ background:'none', border:'none', color:'#64748b', cursor:'pointer', padding:4 }}><X size={16}/></button>
      </div>
      <div style={{ flex:1, overflowY:'auto', padding:16 }}>
        <button 
          onClick={onHighlight}
          style={{ width:'100%', padding:'10px', borderRadius:10, background:'rgba(126, 200, 227, 0.1)', border:'1px solid rgba(126, 200, 227, 0.3)', color:'#7EC8E3', fontSize:11, fontWeight:700, marginBottom:20, cursor:'pointer' }}
        >
          Highlight Connections
        </button>

        {node.meta && Object.keys(node.meta).length > 0 && (
          <div style={{ marginBottom:16 }}>
            {Object.entries(node.meta).map(([k,v]) => {
              if (k === 'level' || k === 'fx' || k === 'fy') return null;
              return (
                <div key={k} style={{ display:'flex', justifyContent:'space-between', padding:'5px 0', borderBottom:'1px solid rgba(255,255,255,0.04)', fontSize:12 }}>
                  <span style={{ color:'#64748b', textTransform:'capitalize' }}>{k}</span>
                  <span style={{ color:'#cbd5e1', fontWeight:600 }}>{String(v)}</span>
                </div>
              );
            })}
          </div>
        )}
        {activity.length > 0 && (
          <div>
            <p style={{ fontSize:10, color:'#64748b', textTransform:'uppercase', letterSpacing:2, marginBottom:8 }}>Recent Activity</p>
            {activity.map((a,i) => (
              <div key={i} style={{ padding:'6px 0', borderBottom:'1px solid rgba(255,255,255,0.04)' }}>
                <p style={{ fontSize:12, color:'#94a3b8', margin:0, lineHeight:1.5 }}>{a.text}</p>
                <p style={{ fontSize:10, color:'#475569', margin:'2px 0 0' }}>{a.time}</p>
              </div>
            ))}
          </div>
        )}
        {activity.length === 0 && <p style={{ fontSize:12, color:'#334155', textAlign:'center', marginTop:24 }}>No recent activity</p>}
      </div>
      {path && (
        <div style={{ padding:16, borderTop:'1px solid rgba(255,255,255,0.06)' }}>
          <a href={path} style={{ display:'block', textAlign:'center', padding:'10px 0', borderRadius:10, background:'rgba(0,119,182,0.15)', border:'1px solid rgba(0,119,182,0.4)', color:'#7EC8E3', fontSize:12, fontWeight:700, fontFamily:'Montserrat', textDecoration:'none' }}>
            Open Full Page →
          </a>
        </div>
      )}
    </motion.div>
  );
}
