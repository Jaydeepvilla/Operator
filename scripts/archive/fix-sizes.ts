import fs from 'fs';
import path from 'path';
import { globSync } from 'fast-glob';

const srcDir = path.join(process.cwd(), 'src');
const files = globSync('**/*.{tsx,ts}', { cwd: srcDir, absolute: true });

let totalChanges = 0;

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  let originalContent = content;

  // Sizes in rem to tailwind multiplier (1rem = 4)
  // e.g. 32rem -> 128
  const remReplacer = (match: string, prefix: string, numStr: string) => {
    const num = parseFloat(numStr);
    const twClass = num * 4;
    return `${prefix}-${twClass}`;
  };

  // Replace max-h, min-h, h, max-w, min-w, w
  const sizePrefixes = ['max-h', 'min-h', 'h', 'max-w', 'min-w', 'w'];
  
  for (const prefix of sizePrefixes) {
    const regex = new RegExp(`(^|[\\s"'\\\`:])(${prefix})-\\[([0-9]+(?:\\.[0-9]+)?)rem\\](?=[\\s"'\\\`]|$)`, 'g');
    content = content.replace(regex, (match, pre, p1, p2) => {
      const num = parseFloat(p2);
      const twClass = num * 4;
      return `${pre}${p1}-${twClass}`;
    });
    
    // For percentages or vh, move them to style={{ ... }} if possible? 
    // Actually, we can just replace the specific ones the doctor found:
    // max-h-[60vh]
    // max-h-[85vh]
    // max-h-[30rem] -> wait, 30rem * 4 = 120. (handled by regex)
  }

  // Specifically handled specific cases:
  content = content.replace(/max-h-\[60vh\]/g, 'style={{ maxHeight: "60vh" }}');
  content = content.replace(/max-h-\[85vh\]/g, 'style={{ maxHeight: "85vh" }}');

  if (content !== originalContent) {
    fs.writeFileSync(file, content);
    totalChanges++;
  }
}

console.log(`Updated ${totalChanges} files.`);
