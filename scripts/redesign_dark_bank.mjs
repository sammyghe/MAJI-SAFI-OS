import fs from 'fs';

const files = [
  'src/app/page.tsx',
  'src/app/department/[name]/page.tsx',
  'src/components/AddLogForm.tsx',
  'src/components/Logo.tsx'
];

files.forEach(file => {
  if (!fs.existsSync(file)) return;
  let content = fs.readFileSync(file, 'utf-8');
  
  // 1. Remove ThreeBackground import and tag from individual pages since it's now in Layout
  content = content.replace(/import ThreeBackground from '@\/components\/ThreeBackground';\n/g, '');
  content = content.replace(/<ThreeBackground \/>\s*/g, '');

  // 2. Base containers mapping
  content = content.replace(/min-h-screen bg-gradient-to-br from-white to-sky-50 text-slate-800 font-sans selection:bg-\[#0EA5E9\]\/30 overflow-hidden relative/g, 'w-full h-full font-sans selection:bg-cyan-500/30 relative');
  
  // 3. Cards -> Semi-transparent dark glass
  content = content.replace(/bg-white\/80/g, 'bg-white/10 backdrop-blur-md border border-white/20');
  content = content.replace(/bg-white\/70/g, 'bg-white/10 backdrop-blur-md border border-white/20');
  content = content.replace(/bg-white\/90/g, 'bg-white/10');
  content = content.replace(/bg-white/g, 'bg-slate-900'); // for default solid panels like AddLogForm
  content = content.replace(/bg-gradient-to-br from-white to-sky-50\/40 border border-\[#0EA5E9\]\/30 hover:border-\[#0EA5E9\]\/60/g, 'bg-white/5 border border-white/10 hover:border-cyan-400/50');
  content = content.replace(/bg-gradient-to-br from-white to-sky-[0-9]+\/[0-9]+/g, 'bg-white/5');
  content = content.replace(/bg-gradient-to-br from-white to-sky-[0-9]+/g, 'bg-white/5');
  
  // 4. Texts
  content = content.replace(/text-slate-800/g, 'text-gray-100');
  content = content.replace(/text-slate-900/g, 'text-white');
  content = content.replace(/text-slate-500/g, 'text-gray-400');
  content = content.replace(/text-slate-600/g, 'text-gray-300');
  content = content.replace(/text-\[#0EA5E9\]/g, 'text-cyan-400');
  
  // 5. Borders mapping
  content = content.replace(/border-sky-[0-9]+\/[0-9]+/g, 'border-white/10');
  content = content.replace(/border-sky-[0-9]+/g, 'border-white/10');
  content = content.replace(/border-\[#0EA5E9\]\/[0-9]+/g, 'border-cyan-500/30');

  // 6. Buttons
  content = content.replace(/bg-\[#0EA5E9\]\/20 hover:bg-\[#0EA5E9\]\/40/g, 'bg-cyan-500 hover:bg-cyan-400 rounded-full text-white');
  content = content.replace(/bg-gradient-to-r from-\[#0EA5E9\] to-\[#0284C7\]/g, 'bg-cyan-500 hover:bg-cyan-400');
  content = content.replace(/bg-\[#0EA5E9\]\/20/g, 'bg-cyan-500/20');

  // 7. Icon colors (general #0EA5E9 references)
  content = content.replace(/\[#0EA5E9\]/g, 'cyan-400');
  // Gradient replacements for logo and accents
  content = content.replace(/from-cyan-400 to-\[#0284C7\]/g, 'from-cyan-400 to-cyan-600');
  
  // Shadows
  content = content.replace(/shadow-md/g, 'shadow-2xl');

  // Specific table borders
  content = content.replace(/divide-sky-[0-9]+/g, 'divide-white/10');
  content = content.replace(/hover:bg-sky-50\/50/g, 'hover:bg-cyan-500/10');

  fs.writeFileSync(file, content);
});

console.log('Complete banking style upgrade');
