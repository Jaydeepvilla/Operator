const fs = require('fs');

let file = fs.readFileSync('src/app/features/page.tsx', 'utf8');

// 1. Remove Section 4: WORKFLOW ARCHITECT
const s4Pos = file.indexOf('SECTION 4: WORKFLOW ARCHITECT');
const s5Pos = file.indexOf('SECTION 5: INDUSTRY VERTICALS');

if (s4Pos !== -1 && s5Pos !== -1) {
  const cutStart = file.lastIndexOf('{/*', s4Pos);
  const cutEnd = file.lastIndexOf('{/*', s5Pos);
  file = file.slice(0, cutStart) + file.slice(cutEnd);
  console.log('Removed Section 4: Workflow Architect');
}

// 2. Remove Section 6: LATENCY PIPELINE TIMELINE
const s6Pos = file.indexOf('SECTION 6: LATENCY PIPELINE TIMELINE');
const s7Pos = file.indexOf('SECTION 7: DEVELOPER PLATFORM');
if (s6Pos !== -1 && s7Pos !== -1) {
  const cutStart = file.lastIndexOf('{/*', s6Pos);
  const cutEnd = file.lastIndexOf('{/*', s7Pos);
  file = file.slice(0, cutStart) + file.slice(cutEnd);
  console.log('Removed Section 6: Latency Pipeline Timeline');
}

// 3. Renumber remaining sections
file = file.replace('SECTION 5: INDUSTRY VERTICALS (Cross-Fade Animated Tabs)', 'SECTION 4: INDUSTRY VERTICALS (Cross-Fade Animated Tabs)');
file = file.replace('SECTION 7: DEVELOPER PLATFORM (Polyglot Code Sandbox)', 'SECTION 5: DEVELOPER PLATFORM (Polyglot Code Sandbox)');
file = file.replace('SECTION 8: PROVEN METRICS (Animated Counters)', 'SECTION 6: PROVEN METRICS (Animated Counters)');
file = file.replace('SECTION 9: FINAL CTA', 'SECTION 7: FINAL CTA');

// 4. Remove activeWorkflowNode state
file = file.replace(/const \[activeWorkflowNode, setActiveWorkflowNode\] = useState<string>\("trigger"\);[\r\n]+/, '');

fs.writeFileSync('src/app/features/page.tsx', file, 'utf8');
console.log('Features page successfully cleaned up!');
