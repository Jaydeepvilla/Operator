const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..', 'src');

const results = {
  summary: {
    totalFilesScanned: 0,
    totalStringsFound: 0,
    antiPatternsCount: 0,
    terminologyIssuesCount: 0,
    missingAccessibilityLabels: 0,
  },
  antiPatterns: [],
  terminology: [],
  buttons: [],
  errors: [],
  emptyStates: [],
  loadingStates: [],
  confirmations: [],
  billing: [],
  forms: [],
  accessibility: [],
};

const ANTI_PATTERN_RULES = [
  { name: 'Generic Error', regex: /(something went wrong|an error (has )?occurred|unexpected error|oops|uh-oh|failed to load)/i, severity: 'P0' },
  { name: 'Vague CTA: Submit', regex: />\s*(Submit|SUBMIT)\s*</, severity: 'P1' },
  { name: 'Vague CTA: Continue', regex: />\s*(Continue)\s*</, severity: 'P2' },
  { name: 'Vague CTA: Click Here', regex: />\s*(Click here|click here)\s*</i, severity: 'P1' },
  { name: 'Vague CTA: Learn More', regex: />\s*(Learn More|Learn more)\s*</, severity: 'P2' },
  { name: 'Polite / Filler Word: Please', regex: /\b(Please|please)\s+(enter|provide|select|choose|fill|click|make sure|note that)\b/, severity: 'P2' },
  { name: 'Polite / Filler Word: Kindly', regex: /\b(Kindly|kindly)\b/i, severity: 'P2' },
  { name: 'Overly Enthusiastic Exclamation', regex: /(Success!|Congratulations!|Done!|Awesome!|Great!|Welcome!)/, severity: 'P2' },
  { name: 'Robotic Blame: Invalid Input', regex: /\b(Invalid input|Invalid value|Invalid field|Bad request)\b/i, severity: 'P0' },
  { name: 'Technical / DB Jargon in UI', regex: /\b(foreign key|unique constraint|internal server error|SQL|database error|null pointer|undefined)\b/i, severity: 'P0' },
  { name: 'Chatbot terminology (forbidden)', regex: /\b(chatbot|bot|virtual agent|chatter)\b/i, severity: 'P1' },
];

const TERMINOLOGY_RULES = [
  { concept: 'Business Entity', forbidden: /\b(workspace|organization|company)\b/i, canonical: 'Business', contextRegex: /(in your workspace|create workspace|workspace settings|select workspace|your company|organization)/i },
  { concept: 'AI Receptionist', forbidden: /\b(chatbot|bot|virtual assistant|AI agent)\b/i, canonical: 'Operator AI / AI Receptionist', contextRegex: /(the bot|configure bot|bot settings|virtual assistant)/i },
  { concept: 'Appointment', forbidden: /\b(reservation|session|booking slot)\b/i, canonical: 'Appointment', contextRegex: /(your reservation|cancel reservation|book a reservation)/i },
  { concept: 'Knowledge Base', forbidden: /\b(knowledge documents|wiki|data repository)\b/i, canonical: 'Knowledge Base', contextRegex: /(in your wiki|data repository)/i },
];

function scanFile(filePath) {
  const ext = path.extname(filePath);
  const normalized = filePath.replace(/\\/g, '/');
  if (!['.tsx', '.ts'].includes(ext)) return;
  if (normalized.includes('.test.') || normalized.includes('.spec.')) return;
  if (normalized.includes('server/db/schema') || normalized.includes('server/db/migrations')) return;

  results.summary.totalFilesScanned++;
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  const relPath = path.relative(path.resolve(__dirname, '..'), filePath).replace(/\\/g, '/');

  // 1. Check Anti-patterns
  lines.forEach((line, index) => {
    const lineNum = index + 1;
    const trimmed = line.trim();
    // Skip import statements, type annotations, and comments
    if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*') || trimmed.startsWith('import ') || trimmed.startsWith('export type ') || trimmed.startsWith('export interface ') || trimmed.startsWith('type ') || trimmed.startsWith('interface ')) {
      return;
    }

    ANTI_PATTERN_RULES.forEach((rule) => {
      // For technical jargon, make sure it's in a string or JSX, not code syntax
      if (rule.name === 'Technical / DB Jargon in UI') {
        const strMatch = line.match(/(['"`])([^'"`]*(?:foreign key|unique constraint|internal server error|database error)[^'"`]*)\1/i) ||
                         line.match(/>([^<]*(?:foreign key|unique constraint|internal server error|database error)[^<]*)</i);
        if (strMatch) {
          results.antiPatterns.push({
            file: relPath,
            line: lineNum,
            rule: rule.name,
            severity: rule.severity,
            matched: strMatch[0],
            snippet: trimmed,
          });
          results.summary.antiPatternsCount++;
        }
        return;
      }

      const match = line.match(rule.regex);
      if (match) {
        results.antiPatterns.push({
          file: relPath,
          line: lineNum,
          rule: rule.name,
          severity: rule.severity,
          matched: match[0],
          snippet: trimmed,
        });
        results.summary.antiPatternsCount++;
      }
    });

    // 2. Check Terminology consistency in user-facing UI
    TERMINOLOGY_RULES.forEach((term) => {
      // Must be inside JSX or string literal
      const isUserFacing = line.match(/>([^<]+)</) || line.match(/(['"`])([^'"`]+)\1/);
      if (isUserFacing) {
        const match = line.match(term.contextRegex);
        if (match && !line.includes('checkUserOrganization') && !line.includes('organizationId') && !line.includes('workspaceId')) {
          results.terminology.push({
            file: relPath,
            line: lineNum,
            concept: term.concept,
            canonical: term.canonical,
            matched: match[0],
            snippet: trimmed,
          });
          results.summary.terminologyIssuesCount++;
        }
      }
    });

    // 3. Scan Button labels
    const buttonMatch = line.match(/<(Button|button|NativeButton)[^>]*>([^<]+)<\/(Button|button|NativeButton)>/);
    if (buttonMatch) {
      const label = buttonMatch[2].trim();
      if (label && !label.includes('{')) {
        results.buttons.push({
          file: relPath,
          line: lineNum,
          label,
          snippet: line.trim(),
        });
      }
    }

    // 4. Scan Toast & Error messages
    const toastMatch = line.match(/toast\.(error|success|info|warning)\((['"`])([^'"`]+)\2/);
    if (toastMatch) {
      const type = toastMatch[1];
      const message = toastMatch[3];
      results.errors.push({
        file: relPath,
        line: lineNum,
        type,
        message,
        snippet: line.trim(),
      });
    }

    // 5. Scan Empty states
    if (line.includes('No ') && (line.includes(' found') || line.includes(' yet') || line.includes(' available') || line.includes(' records'))) {
      if (!line.trim().startsWith('//')) {
        results.emptyStates.push({
          file: relPath,
          line: lineNum,
          snippet: line.trim(),
        });
      }
    }

    // 6. Scan Loading states
    if (line.includes('Loading') || line.includes('Saving...') || line.includes('Processing...')) {
      if (!line.trim().startsWith('//')) {
        results.loadingStates.push({
          file: relPath,
          line: lineNum,
          snippet: line.trim(),
        });
      }
    }

    // 7. Check Icon buttons without aria-label
    if (
      (line.includes('<button') || line.includes('<Button')) &&
      (line.includes('size="icon"') || line.includes('p-1') || line.includes('p-2')) &&
      !line.includes('aria-label') &&
      !line.includes('title=')
    ) {
      results.accessibility.push({
        file: relPath,
        line: lineNum,
        issue: 'Icon button potentially missing aria-label',
        snippet: line.trim(),
      });
      results.summary.missingAccessibilityLabels++;
    }
  });
}

function walkDir(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!['node_modules', '.next', '.git'].includes(entry.name)) {
        walkDir(fullPath);
      }
    } else {
      scanFile(fullPath);
    }
  }
}

walkDir(ROOT_DIR);

const outPath = path.resolve(__dirname, '..', 'scratch', 'content-audit-results.json');
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, JSON.stringify(results, null, 2));

console.log('=== CONTENT AUDIT COMPLETE ===');
console.log(`Files scanned: ${results.summary.totalFilesScanned}`);
console.log(`Anti-pattern violations: ${results.summary.antiPatternsCount}`);
console.log(`Terminology issues: ${results.summary.terminologyIssuesCount}`);
console.log(`Button labels captured: ${results.buttons.length}`);
console.log(`Toast/Error messages captured: ${results.errors.length}`);
console.log(`Empty states found: ${results.emptyStates.length}`);
console.log(`Loading states found: ${results.loadingStates.length}`);
console.log(`Accessibility gaps found: ${results.accessibility.length}`);
console.log(`Full report saved to: ${outPath}`);
