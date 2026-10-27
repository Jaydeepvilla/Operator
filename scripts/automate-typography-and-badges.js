const fs = require('fs');
const path = require('path');

const srcDir = path.resolve(__dirname, '../src');

let modifiedCount = 0;
let totalReplacements = 0;

function walk(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      walk(fullPath);
    } else if (/\.(tsx|ts|jsx|js|css)$/.test(file)) {
      processFile(fullPath);
    }
  }
}

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let original = content;

  // 1. Remove font-black -> replace with font-bold
  content = content.replace(/\bfont-black\b/g, 'font-bold');

  // 2. Remove font-extrabold -> replace with font-bold
  content = content.replace(/\bfont-extrabold\b/g, 'font-bold');

  // 3. Remove CSS font-weight: 800 and 900
  content = content.replace(/font-weight:\s*800/g, 'font-weight: 700');
  content = content.replace(/font-weight:\s*900/g, 'font-weight: 700');
  content = content.replace(/fontWeight:\s*(800|900|"800"|"900"|'800'|'900')/g, 'fontWeight: 700');

  // 4. Update Badge component and badge pills to use font-medium or font-normal instead of font-bold or font-semibold
  // In src/components/shared/badge.tsx:
  if (filePath.endsWith('badge.tsx')) {
    content = content.replace(/\bfont-semibold\b/g, 'font-medium');
    content = content.replace(/\bfont-bold\b/g, 'font-medium');
  }

  // 5. In all marketing badge headers (e.g. <span className="text-caption uppercase tracking-widest font-semibold text-primary">)
  // or <Badge ... font-bold / font-semibold>
  content = content.replace(/(<span\s+className="[^"]*text-caption[^"]*uppercase[^"]*)font-semibold([^"]*")/g, '$1font-medium$2');
  content = content.replace(/(<span\s+className="[^"]*text-caption[^"]*uppercase[^"]*)font-bold([^"]*")/g, '$1font-medium$2');
  content = content.replace(/(<Badge\s+[^>]*className="[^"]*)font-bold([^"]*")/g, '$1font-medium$2');
  content = content.replace(/(<Badge\s+[^>]*className="[^"]*)font-semibold([^"]*")/g, '$1font-medium$2');

  // Also replace any status badge pills like "rounded-full ... font-bold" in badges
  content = content.replace(/(rounded-full[^"]*text-caption[^"]*)font-bold([^"]*)/g, '$1font-medium$2');
  content = content.replace(/(rounded-full[^"]*text-caption[^"]*)font-semibold([^"]*)/g, '$1font-medium$2');

  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf8');
    modifiedCount++;
    console.log(`[UPDATED] ${path.relative(srcDir, filePath)}`);
  }
}

walk(srcDir);
console.log(`\nFinished! Successfully processed and updated ${modifiedCount} files.`);
