import fs from 'fs';

const files = [
  'src/app/page.tsx',
  'src/app/department/[name]/page.tsx',
  'src/components/AddLogForm.tsx'
];

files.forEach(file => {
  if (!fs.existsSync(file)) return;
  let content = fs.readFileSync(file, 'utf-8');
  
  // Base background and text colors
  content = content.replace(/bg-sky-950/g, 'bg-gradient-to-br from-white to-sky-50');
  content = content.replace(/text-slate-50/g, 'text-slate-800');
  content = content.replace(/text-white/g, 'text-slate-900');
  
  // Cards and Panels Background
  content = content.replace(/bg-slate-900\/40/g, 'bg-white/80');
  content = content.replace(/bg-sky-900\/30/g, 'bg-white/70');
  content = content.replace(/bg-sky-950\/60/g, 'bg-sky-50/80');
  content = content.replace(/bg-sky-950\/40/g, 'bg-white/90');
  content = content.replace(/bg-slate-900\/80/g, 'bg-white');
  content = content.replace(/bg-slate-950\/60/g, 'bg-slate-100');

  // Borders
  content = content.replace(/border-sky-800\/50/g, 'border-sky-100');
  content = content.replace(/border-sky-800\/30/g, 'border-sky-100');
  content = content.replace(/border-sky-800\/60/g, 'border-sky-200');
  content = content.replace(/border-sky-400\/20/g, 'border-sky-200');
  content = content.replace(/border-sky-400\/30/g, 'border-sky-200');
  content = content.replace(/border-[#0EA5E9]\/50/g, 'border-sky-200');
  content = content.replace(/border-[#0EA5E9]\/30/g, 'border-sky-200');
  content = content.replace(/border-[#0EA5E9]\/20/g, 'border-sky-200');
  
  // Text Colors
  content = content.replace(/text-sky-100/g, 'text-slate-800');
  content = content.replace(/text-sky-200/g, 'text-slate-500');
  content = content.replace(/text-sky-300/g, 'text-slate-600');
  content = content.replace(/text-sky-400/g, 'text-[#0EA5E9]');
  
  // Shadows
  content = content.replace(/shadow-2xl/g, 'shadow-md');
  content = content.replace(/shadow-xl/g, 'shadow-sm');

  // Hover states
  content = content.replace(/hover:bg-slate-800\/60/g, 'hover:bg-sky-50');
  content = content.replace(/hover:bg-sky-900\/40/g, 'hover:bg-sky-50');
  content = content.replace(/hover:bg-sky-800\/40/g, 'hover:bg-sky-100');
  
  // Tables
  content = content.replace(/hover:bg-sky-900\/20/g, 'hover:bg-sky-50/50');
  content = content.replace(/hover:bg-\[#0EA5E9\]\/10/g, 'hover:bg-sky-50/50');
  content = content.replace(/divide-sky-900\/30/g, 'divide-sky-100');
  content = content.replace(/divide-sky-800\/20/g, 'divide-sky-100');
  
  // Replace direct inline logo with the imported component
  // We'll just replace the specific <Link> blocks with `<Logo />`
  
  const logoLinkRegex1 = /<Link href="\/".*?>[\s\S]*?<\/Link>/;
  if(file.includes('page.tsx') && !file.includes('department')) {
     const importLogo = `import Logo from '@/components/Logo';\n`;
     if (!content.includes(importLogo)) {
       content = content.replace(/import Link from 'next\/link';/g, `import Link from 'next/link';\n${importLogo}`);
     }
     content = content.replace(logoLinkRegex1, `<Logo />`);
  }

  const logoLinkRegex2 = /<Link href={`\/\?tgId=\${tgId}&dept=\${decodedName}`}.*?>[\s\S]*?<\/Link>/;
  if(file.includes('department')) {
     const importLogo = `import Logo from '@/components/Logo';\n`;
     if (!content.includes(importLogo)) {
       content = content.replace(/import Link from 'next\/link';/g, `import Link from 'next/link';\n${importLogo}`);
     }
     content = content.replace(logoLinkRegex2, `<Logo href={\`/?tgId=\${tgId}&dept=\${decodedName}\`} />`);
  }

  fs.writeFileSync(file, content);
});

console.log('Complete CSS upgrade');
