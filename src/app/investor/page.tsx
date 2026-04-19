"use client";

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

interface KPI {
  label: string;
  value: string;
  sub: string;
  color: string;
}

export default function InvestorPage() {
  const [kpis, setKpis] = useState<KPI[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState('');

  useEffect(() => {
    loadKpis();
  }, []);

  const loadKpis = async () => {
    try {
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
      const today = now.toISOString().split('T')[0];

      const [
        { data: prodData },
        { data: qcData },
        { data: salesData },
        { data: teamData },
        { data: distData },
        { data: cashData },
      ] = await Promise.all([
        supabase
          .from('production_logs')
          .select('jar_count')
          .eq('location_id', 'buziga')
          .gte('production_date', monthStart),
        supabase
          .from('water_tests')
          .select('result')
          .eq('location_id', 'buziga')
          .gte('tested_at', monthStart),
        supabase
          .from('sales_ledger')
          .select('amount_ugx')
          .eq('location_id', 'buziga')
          .gte('sale_date', monthStart),
        supabase
          .from('team_members')
          .select('id')
          .eq('location_id', 'buziga')
          .in('contract_status', ['active', 'probation']),
        supabase
          .from('distributors')
          .select('id, status')
          .eq('location_id', 'buziga')
          .eq('status', 'active'),
        supabase
          .from('daily_cash')
          .select('physical_cash_count_ugx')
          .eq('location_id', 'buziga')
          .eq('date', today)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);

      const totalJars = prodData?.reduce((s, r) => s + (r.jar_count || 0), 0) ?? 0;
      const totalRevenue = salesData?.reduce((s, r) => s + (r.amount_ugx || 0), 0) ?? 0;
      const passRate =
        qcData && qcData.length > 0
          ? Math.round((qcData.filter((q) => q.result === 'PASS').length / qcData.length) * 100)
          : null;
      const teamSize = teamData?.length ?? 0;
      const activeDistributors = distData?.length ?? 0;
      const cashPosition = cashData?.physical_cash_count_ugx ?? null;

      const monthLabel = now.toLocaleString('en-GB', { month: 'long', year: 'numeric' });

      setKpis([
        {
          label: 'Jars Produced',
          value: totalJars > 0 ? totalJars.toLocaleString() : 'No data yet',
          sub: `Month to date — ${monthLabel}`,
          color: totalJars > 0 ? '#0077B6' : '#888',
        },
        {
          label: 'Revenue (UGX)',
          value: totalRevenue > 0 ? `UGX ${totalRevenue.toLocaleString()}` : 'No data yet',
          sub: `Sales ledger — ${monthLabel}`,
          color: totalRevenue > 0 ? '#0077B6' : '#888',
        },
        {
          label: 'QC Pass Rate',
          value: passRate !== null ? `${passRate}%` : 'No data yet',
          sub: qcData && qcData.length > 0 ? `${qcData.length} tests this month` : 'No tests recorded',
          color: passRate === 100 ? '#22c55e' : passRate !== null ? '#f59e0b' : '#888',
        },
        {
          label: 'Active Distributors',
          value: activeDistributors > 0 ? activeDistributors.toString() : '0',
          sub: 'T1 wholesale partners — buziga',
          color: activeDistributors > 0 ? '#0077B6' : '#888',
        },
        {
          label: 'Team Size',
          value: teamSize > 0 ? teamSize.toString() : '0',
          sub: 'Active + probation contracts',
          color: '#0077B6',
        },
        {
          label: 'Cash Position',
          value: cashPosition !== null ? `UGX ${cashPosition.toLocaleString()}` : 'No count today',
          sub: `Daily cash count — ${today}`,
          color: cashPosition !== null ? '#0077B6' : '#888',
        },
      ]);

      setLastUpdated(now.toLocaleTimeString('en-GB'));
    } catch (err) {
      if (process.env.NODE_ENV === 'development') console.error('Investor KPI load error:', err);
    } finally {
      setLoading(false);
    }
  };

  const cardStyle: React.CSSProperties = {
    background: '#fff',
    borderRadius: 16,
    padding: '28px 32px',
    boxShadow: '0 2px 12px rgba(0,0,0,0.07)',
    border: '1px solid #e5e7eb',
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', fontFamily: 'Open Sans, sans-serif' }}>
      {/* Header */}
      <div style={{ background: '#10141a', color: '#fff', padding: '40px 48px 36px' }}>
        <div style={{ maxWidth: 960, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/maji safi logo (3).png"
              alt="Maji Safi"
              style={{ width: 48, height: 48, borderRadius: 8, objectFit: 'cover' }}
            />
            <div>
              <div style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 800, fontSize: 22, color: '#7EC8E3', letterSpacing: -0.5 }}>
                Maji Safi
              </div>
              <div style={{ fontSize: 11, color: '#94a3b8', letterSpacing: 2, textTransform: 'uppercase' }}>
                Hydrate. Elevate.
              </div>
            </div>
          </div>
          <h1 style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 800, fontSize: 32, marginBottom: 8 }}>
            Investor Snapshot
          </h1>
          <p style={{ color: '#94a3b8', fontSize: 14 }}>
            Safiflow Ventures Group Limited · Reg G241004-1234 · Lukuli Road, Buziga, Kampala
          </p>
        </div>
      </div>

      {/* Main content */}
      <div style={{ maxWidth: 960, margin: '0 auto', padding: '48px 24px' }}>

        {/* Mission */}
        <div style={{ ...cardStyle, marginBottom: 40, borderLeft: '4px solid #0077B6' }}>
          <p style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 700, fontSize: 13, color: '#0077B6', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 10 }}>
            Mission
          </p>
          <p style={{ fontSize: 16, color: '#1e293b', lineHeight: 1.7 }}>
            Provide affordable, UNBS-certified purified water to Kampala households through a lean, technology-driven operations platform — launching commercially May 3, 2026.
          </p>
        </div>

        {/* KPI grid */}
        <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 700, fontSize: 18, color: '#1e293b' }}>
            Key Metrics
          </h2>
          {lastUpdated && (
            <span style={{ fontSize: 11, color: '#94a3b8' }}>
              Last updated: {lastUpdated}
            </span>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 20, marginBottom: 48 }}>
          {loading
            ? Array.from({ length: 6 }).map((_, i) => (
                <div key={i} style={{ ...cardStyle, opacity: 0.5 }}>
                  <div style={{ height: 14, background: '#e5e7eb', borderRadius: 4, marginBottom: 16, width: '60%' }} />
                  <div style={{ height: 32, background: '#e5e7eb', borderRadius: 4, marginBottom: 12, width: '80%' }} />
                  <div style={{ height: 11, background: '#f1f5f9', borderRadius: 4, width: '70%' }} />
                </div>
              ))
            : kpis.map((kpi) => (
                <div key={kpi.label} style={cardStyle}>
                  <p style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 10 }}>
                    {kpi.label}
                  </p>
                  <p style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 800, fontSize: 28, color: kpi.color, marginBottom: 6, lineHeight: 1.1 }}>
                    {kpi.value}
                  </p>
                  <p style={{ fontSize: 12, color: '#94a3b8' }}>{kpi.sub}</p>
                </div>
              ))}
        </div>

        {/* Growth chart placeholder */}
        <div style={{ ...cardStyle, marginBottom: 40, textAlign: 'center', padding: '48px 32px' }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>📈</div>
          <p style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 700, fontSize: 15, color: '#334155', marginBottom: 8 }}>
            Growth Chart
          </p>
          <p style={{ fontSize: 13, color: '#94a3b8' }}>
            Data collection in progress — chart will populate after 30 days of operations.
          </p>
        </div>

        {/* Company details */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 20, marginBottom: 48 }}>
          {[
            { label: 'Product Line', value: '20L Refill · 20L Single-Use · 20L Reusable Jar · 5L Single-Use' },
            { label: 'Capacity', value: '6,000 LPH — ~2,000 jars/day maximum' },
            { label: 'Break-even', value: '~220–240 jars/day at launch pricing' },
            { label: 'Month 1 Target', value: '500 jars/day, T1 wholesale only' },
            { label: 'Founders', value: 'Samuel Ghedamu (CEO) · Amanuel Asmerom Yonas (COO)' },
            { label: 'Launch Date', value: 'May 3, 2026 — commercial operations' },
          ].map((item) => (
            <div key={item.label} style={{ ...cardStyle, padding: '20px 24px' }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 6 }}>
                {item.label}
              </p>
              <p style={{ fontSize: 13, color: '#334155', lineHeight: 1.5 }}>{item.value}</p>
            </div>
          ))}
        </div>

        {/* Values */}
        <div style={{ ...cardStyle, marginBottom: 40 }}>
          <p style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 700, fontSize: 13, color: '#0077B6', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 16 }}>
            Core Values
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12 }}>
            {[
              { icon: '💧', value: 'Quality First', desc: '100% UNBS compliance, zero compromise' },
              { icon: '📊', value: 'Data-Driven', desc: 'Every decision sourced from the system' },
              { icon: '⚡', value: 'Lean Operations', desc: 'No waste, tight feedback loops' },
              { icon: '🤝', value: 'Community', desc: 'Affordable water for every household' },
            ].map((v) => (
              <div key={v.value} style={{ padding: '16px', background: '#f8fafc', borderRadius: 10 }}>
                <div style={{ fontSize: 22, marginBottom: 8 }}>{v.icon}</div>
                <div style={{ fontWeight: 700, fontSize: 13, color: '#334155', marginBottom: 4 }}>{v.value}</div>
                <div style={{ fontSize: 11, color: '#94a3b8', lineHeight: 1.5 }}>{v.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div style={{ background: '#10141a', color: '#64748b', padding: '32px 48px', textAlign: 'center' }}>
        <p style={{ fontSize: 13, marginBottom: 4 }}>Powered by Maji Safi OS · Safiflow Ventures Group Limited</p>
        <p style={{ fontSize: 12 }}>Reg G241004-1234 · Lukuli Road, Buziga, Kampala, Uganda · sammygedamua@gmail.com</p>
      </div>
    </div>
  );
}
