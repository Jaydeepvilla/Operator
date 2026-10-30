import fs from 'fs';
import path from 'path';
import { globSync } from 'fast-glob';

const srcDir = path.join(process.cwd(), 'src');
const files = globSync('**/*.{tsx,ts}', { cwd: srcDir, absolute: true });

let totalChanges = 0;

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  let originalContent = content;

  // 1. Text sizes
  content = content.replace(/text-\[14px\]/g, 'text-body-sm');
  content = content.replace(/text-\[13px\]/g, 'text-body-sm');
  content = content.replace(/text-\[12px\]/g, 'text-caption');
  content = content.replace(/text-\[11px\]/g, 'text-caption');
  content = content.replace(/text-\[10\.5px\]/g, 'text-caption');
  content = content.replace(/text-\[10px\]/g, 'text-caption');
  content = content.replace(/text-\[9\.5px\]/g, 'text-caption');
  content = content.replace(/text-\[9px\]/g, 'text-caption');
  content = content.replace(/text-\[15px\]/g, 'text-body-md');
  content = content.replace(/text-\[16px\]/g, 'text-body-md');
  content = content.replace(/text-\[18px\]/g, 'text-title-md');

  // 2. Padding/Margin/Gap/Space/Positioning standard -> space tokens
  // Fix the regex to allow responsive prefixes like `md:`, `lg:`, `hover:`
  const spaceProps = [
    'p', 'px', 'py', 'pt', 'pb', 'pl', 'pr',
    'm', 'mx', 'my', 'mt', 'mb', 'ml', 'mr',
    'gap', 'gap-x', 'gap-y',
    'space-x', 'space-y',
    'top', 'bottom', 'left', 'right',
    'inset', 'inset-x', 'inset-y'
  ];
  
  for (const prop of spaceProps) {
    // Regex: Match word boundary or :, then the prop, then -, then number
    // Avoid double matching space-space-4
    // Negative lookahead to ensure we don't match something already space-
    const regex = new RegExp(`(^|[\\s"'\\\`:])(-?${prop})-([0-9]+(?:\\.[0-9]+)?)(?=[\\s"'\\\`]|$)`, 'g');
    content = content.replace(regex, (match, prefix, p1, p2) => {
      // Don't replace if it's somehow "space-" already (though our regex doesn't explicitly prevent it unless we check)
      return `${prefix}${p1}-space-${p2}`;
    });
  }

  // 3. Specific cleanup for shadows
  content = content.replace(/shadow-\[0_2px_12px_rgba\(0,0,0,0\.03\)\]/g, 'shadow-sm');
  content = content.replace(/shadow-\[0_0_10px_rgba\(.*\)\]/g, 'shadow-lg');
  content = content.replace(/shadow-\[0_0_40px_hsl\(.*\)\]/g, 'shadow-xl');
  content = content.replace(/shadow-\[0_8px_30px_rgba\(.*\)\]/g, 'shadow-xl');

  // 4. Remaining arbitrary fixes
  content = content.replace(/style={{ animation: "ie-shimmer 3s ease-in-out infinite" }}/g, 'className="animate-pulse"');
  
  // Specific arbitrary values found in report
  content = content.replace(/translate-x-\[16px\]/g, 'translate-x-space-4');
  content = content.replace(/translate-x-\[18px\]/g, 'translate-x-space-4');
  content = content.replace(/translate-x-\[1px\]/g, 'translate-x-px');
  content = content.replace(/translate-y-\[1px\]/g, 'translate-y-px');
  content = content.replace(/-top-\[15\%\]/g, '-top-[15%]');
  content = content.replace(/-top-\[10\%\]/g, '-top-[10%]');
  content = content.replace(/left-\[20\%\]/g, 'left-[20%]');
  content = content.replace(/left-\[5\%\]/g, 'left-[5%]');
  content = content.replace(/right-\[10\%\]/g, 'right-[10%]');
  content = content.replace(/top-\[20\%\]/g, 'top-[20%]');
  content = content.replace(/left-\[11px\]/g, 'left-space-3');
  content = content.replace(/size-\[18px\]/g, 'size-4');

  if (content !== originalContent) {
    fs.writeFileSync(file, content);
    totalChanges++;
  }
}

console.log(`Updated ${totalChanges} files.`);
