import fs from 'fs';
import path from 'path';
import { globSync } from 'fast-glob';

const srcDir = path.join(process.cwd(), 'src/lib/gap-analysis-engine/calculators');
const files = globSync('**/*.ts', { cwd: srcDir, absolute: true });

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(/id: "gap-/g, 'id: "missing-');
  fs.writeFileSync(file, content);
}
console.log('Fixed gap IDs.');
