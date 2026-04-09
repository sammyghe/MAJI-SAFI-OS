import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing env variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log('Inserting into maji_daily_logs...');
  const { error: insertError } = await supabase.from('maji_daily_logs').insert([
    { date: '2026-04-02', jars_produced: 480, cash_collected_ugx: 14400000, quality_status: 'PASS', logged_by: 'Ema' },
    { date: '2026-04-03', jars_produced: 510, cash_collected_ugx: 15300000, quality_status: 'PASS', logged_by: 'Ema' },
    { date: '2026-04-04', jars_produced: 495, cash_collected_ugx: 14850000, quality_status: 'PASS', logged_by: 'Ema' },
    { date: '2026-04-05', jars_produced: 470, cash_collected_ugx: 14100000, quality_status: 'PASS', logged_by: 'Ema' },
    { date: '2026-04-06', jars_produced: 520, cash_collected_ugx: 15600000, quality_status: 'PASS', logged_by: 'Ema' },
    { date: '2026-04-07', jars_produced: 505, cash_collected_ugx: 15150000, quality_status: 'PASS', logged_by: 'Ema' },
    { date: '2026-04-08', jars_produced: 490, cash_collected_ugx: 14700000, quality_status: 'PASS', logged_by: 'Ema' }
  ]);
  if (insertError) console.error('Insert error:', insertError);
  else console.log('Insert success');

  console.log('Updating maji_phase...');
  const { error: updatePhase } = await supabase.from('maji_phase').update({ consecutive_days: 7 }).eq('phase_number', 1);
  if (updatePhase) console.error('Phase update error:', updatePhase);

  console.log('Updating maji_projects deadlines...');
  await supabase.from('maji_projects').update({ deadline: '2026-05-01' }).eq('name', 'UNBS Certification');
  await supabase.from('maji_projects').update({ deadline: '2026-04-15' }).eq('name', 'Mike Investor Deal');
  await supabase.from('maji_projects').update({ deadline: '2026-04-30' }).eq('name', 'T1 Wholesale Siege');
  await supabase.from('maji_projects').update({ deadline: '2026-04-20' }).eq('name', 'UF Membrane Spare Stock');

  console.log('Done');
}

run();
