import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

export async function GET(request: Request) {
  try {
    // Fetch company info
    const { data: settings } = await supabase
      .from('company_settings')
      .select('*')
      .eq('location_id', 'buziga')
      .limit(20);

    // Fetch recent QC results
    const today = new Date().toISOString().split('T')[0];
    const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];
    const { data: qcResults } = await supabase
      .from('water_tests')
      .select('*')
      .eq('location_id', 'buziga')
      .gte('tested_at', weekAgo)
      .order('tested_at', { ascending: false });

    // Fetch compliance records
    const { data: complianceRecords } = await supabase
      .from('compliance_records')
      .select('*')
      .eq('location_id', 'buziga')
      .order('expiry_date', { ascending: true });

    // Fetch open gaps
    const { data: gaps } = await supabase
      .from('compliance_gaps')
      .select('*')
      .eq('location_id', 'buziga')
      .neq('status', 'resolved');

    const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Maji Safi - UNBS Inspector Pack</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background: white; }
        .header { text-align: center; margin-bottom: 30px; border-bottom: 3px solid #0077B6; padding-bottom: 20px; }
        .header h1 { color: #0077B6; margin: 0; font-size: 28px; }
        .header p { color: #666; margin: 5px 0; }
        .section { margin-bottom: 25px; page-break-inside: avoid; }
        .section h2 { color: #0077B6; font-size: 16px; border-bottom: 2px solid #0077B6; padding-bottom: 8px; margin: 0 0 15px 0; }
        .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 15px; }
        .info-item { background: #f5f5f5; padding: 12px; }
        .info-item label { font-weight: bold; color: #0077B6; font-size: 12px; }
        .info-item value { display: block; margin-top: 5px; font-size: 14px; }
        table { width: 100%; border-collapse: collapse; margin-top: 10px; }
        th, td { border: 1px solid #ddd; padding: 10px; text-align: left; }
        th { background: #0077B6; color: white; font-weight: bold; }
        tr:nth-child(even) { background: #f9f9f9; }
        .pass { color: green; font-weight: bold; }
        .fail { color: red; font-weight: bold; }
        .critical { background: #ffe6e6; }
        .major { background: #fff9e6; }
        .minor { background: #e6f9ff; }
        .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd; text-align: center; color: #666; font-size: 12px; }
        @media print { body { padding: 0; } }
    </style>
</head>
<body>
    <div class="header">
        <h1>🌊 Maji Safi</h1>
        <p><strong>Hydrate. Elevate.</strong></p>
        <p>Inspector Pack | Generated ${new Date().toLocaleDateString('en-GB')}</p>
    </div>

    <div class="section">
        <h2>Company Information</h2>
        <div class="info-grid">
            <div class="info-item">
                <label>Company Name</label>
                <value>Safiflow Ventures Group Limited (Maji Safi)</value>
            </div>
            <div class="info-item">
                <label>Registration</label>
                <value>G241004-1234 (October 2024)</value>
            </div>
            <div class="info-item">
                <label>Location</label>
                <value>Lukuli Road, Buziga, Kampala, Uganda</value>
            </div>
            <div class="info-item">
                <label>Inspection Date</label>
                <value>May 14, 2026</value>
            </div>
        </div>
    </div>

    <div class="section">
        <h2>Recent Quality Control Results</h2>
        ${qcResults && qcResults.length > 0 ? `
        <table>
            <tr>
                <th>Date</th>
                <th>Test Type</th>
                <th>Parameter</th>
                <th>Result</th>
                <th>Status</th>
            </tr>
            ${(qcResults as any[]).slice(0, 10).map(test => `
            <tr>
                <td>${new Date(test.tested_at).toLocaleDateString('en-GB')}</td>
                <td>${test.test_type || '—'}</td>
                <td>${test.parameter || '—'}</td>
                <td>${test.value || '—'}</td>
                <td class="${test.result === 'PASS' ? 'pass' : 'fail'}">${test.result || '—'}</td>
            </tr>
            `).join('')}
        </table>
        ` : '<p>No QC results available.</p>'}
    </div>

    <div class="section">
        <h2>Certifications & Compliance Records</h2>
        ${complianceRecords && complianceRecords.length > 0 ? `
        <table>
            <tr>
                <th>Certificate</th>
                <th>Issue Date</th>
                <th>Expiry Date</th>
                <th>Status</th>
            </tr>
            ${(complianceRecords as any[]).map(cert => `
            <tr>
                <td>${cert.certificate_name || '—'}</td>
                <td>${cert.issue_date ? new Date(cert.issue_date).toLocaleDateString('en-GB') : '—'}</td>
                <td>${cert.expiry_date ? new Date(cert.expiry_date).toLocaleDateString('en-GB') : '—'}</td>
                <td>${new Date(cert.expiry_date) > new Date() ? '✓ Active' : '⚠ Expired'}</td>
            </tr>
            `).join('')}
        </table>
        ` : '<p>No compliance records available.</p>'}
    </div>

    <div class="section">
        <h2>Open Compliance Gaps</h2>
        ${gaps && gaps.length > 0 ? `
        <table>
            <tr>
                <th>Gap Description</th>
                <th>Severity</th>
                <th>Due Date</th>
                <th>Status</th>
            </tr>
            ${(gaps as any[]).map(gap => `
            <tr class="${gap.severity}">
                <td>${gap.gap_description}</td>
                <td>${gap.severity.toUpperCase()}</td>
                <td>${gap.due_date ? new Date(gap.due_date).toLocaleDateString('en-GB') : '—'}</td>
                <td>${gap.status}</td>
            </tr>
            `).join('')}
        </table>
        ` : '<p>No open compliance gaps. ✓</p>'}
    </div>

    <div class="footer">
        <p>Maji Safi Operating System — UNBS Inspector Pack</p>
        <p>Generated on ${new Date().toLocaleString('en-GB')}</p>
        <p>Location: Buziga, Kampala | Commercial Launch: Post-May 20, 2026</p>
    </div>

    <script>
        window.onload = () => { window.print(); };
    </script>
</body>
</html>
    `;

    return new Response(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Content-Disposition': 'attachment; filename="Maji_Safi_Inspector_Pack.pdf"',
      },
    });
  } catch (error: any) {
    console.error('Inspector pack error:', error);
    return Response.json(
      { error: error.message || 'Failed to generate inspector pack' },
      { status: 500 }
    );
  }
}
