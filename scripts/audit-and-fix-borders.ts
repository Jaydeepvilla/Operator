/**
 * @file audit-and-fix-borders.ts
 * @description Project-wide audit and automated normalization script for Operator UI borders.
 * Ensures every visible UI border resolves to 1px solid, preserving colors, design tokens,
 * hover/focus/error states, and accessibility focus indicators.
 *
 * Usage:
 *   npx tsx scripts/audit-and-fix-borders.ts [--fix] [--verbose]
 */

import fs from "fs";
import path from "path";

interface Violation {
  file: string;
  line: number;
  column: number;
  original: string;
  replacement: string;
  reason: string;
  type: "utility" | "css" | "inline";
}

interface ScanReport {
  totalFilesScanned: number;
  totalBorderDeclarations: number;
  compliantCount: number;
  violationCount: number;
  fixedCount: number;
  intentionalExceptionsCount: number;
  violations: Violation[];
  fixedFiles: string[];
}

const ROOT_DIR = path.resolve(__dirname, "..");
const TARGET_DIRS = ["src"];
const IGNORE_DIRS = [
  "node_modules",
  ".next",
  ".git",
  "dist",
  "build",
  "coverage",
  ".system_generated",
  ".agents",
  ".gemini",
];

const TARGET_EXTENSIONS = [".ts", ".tsx", ".js", ".jsx", ".css", ".scss", ".sass", ".module.css"];

// ─── UTILITY NORMALIZATION MAPS ────────────────────────────────────────────────

const UTILITY_REPLACEMENTS: Array<{
  pattern: RegExp;
  replace: (match: string, ...groups: string[]) => string;
  reason: string;
}> = [
  // border-2, border-4, border-8, border-[2px], etc.
  {
    pattern: /\bborder-(?:[2-9]|\d{2,}|\[(?:[2-9]|\d{2,}|0\.\d+|1\.\d+)px\])\b/g,
    replace: () => "border",
    reason: "Non-1px border width normalized to 1px (border)",
  },
  // Directional border-2, border-4, etc.
  {
    pattern: /\bborder-t-(?:[2-9]|\d{2,}|\[(?:[2-9]|\d{2,}|0\.\d+|1\.\d+)px\])\b/g,
    replace: () => "border-t",
    reason: "Top border width normalized to 1px (border-t)",
  },
  {
    pattern: /\bborder-b-(?:[2-9]|\d{2,}|\[(?:[2-9]|\d{2,}|0\.\d+|1\.\d+)px\])\b/g,
    replace: () => "border-b",
    reason: "Bottom border width normalized to 1px (border-b)",
  },
  {
    pattern: /\bborder-l-(?:[2-9]|\d{2,}|\[(?:[2-9]|\d{2,}|0\.\d+|1\.\d+)px\])\b/g,
    replace: () => "border-l",
    reason: "Left border width normalized to 1px (border-l)",
  },
  {
    pattern: /\bborder-r-(?:[2-9]|\d{2,}|\[(?:[2-9]|\d{2,}|0\.\d+|1\.\d+)px\])\b/g,
    replace: () => "border-r",
    reason: "Right border width normalized to 1px (border-r)",
  },
  {
    pattern: /\bborder-x-(?:[2-9]|\d{2,}|\[(?:[2-9]|\d{2,}|0\.\d+|1\.\d+)px\])\b/g,
    replace: () => "border-x",
    reason: "Horizontal border width normalized to 1px (border-x)",
  },
  {
    pattern: /\bborder-y-(?:[2-9]|\d{2,}|\[(?:[2-9]|\d{2,}|0\.\d+|1\.\d+)px\])\b/g,
    replace: () => "border-y",
    reason: "Vertical border width normalized to 1px (border-y)",
  },
  // Custom non-standard spacing utility used as border width
  {
    pattern: /\bborder-l-space-2\b/g,
    replace: () => "border-l",
    reason: "Custom spacing left border normalized to standard 1px (border-l)",
  },
  // Non-solid border styles
  {
    pattern: /\b(?:border-dashed|border-dotted|border-double)\b/g,
    replace: () => "border-solid",
    reason: "Non-solid border style normalized to solid border",
  },
];

// ─── CSS / INLINE STYLE REPLACEMENTS ──────────────────────────────────────────

const CSS_REPLACEMENTS: Array<{
  pattern: RegExp;
  replace: (match: string, ...groups: any[]) => string;
  reason: string;
}> = [
  // border: 3px solid ... -> border: 1px solid ...
  {
    pattern: /border:\s*(?:[2-9]|\d{2,}|0\.\d+|1\.\d+)px\s+(solid|dashed|dotted|double)\s+([^;\}]+)/g,
    replace: (_match, _style, color) => `border: 1px solid ${color ? color.trim() : ""}`,
    reason: "CSS border declaration normalized to 1px solid",
  },
  // border: 1px dashed/dotted ... -> border: 1px solid ...
  {
    pattern: /border:\s*1px\s+(?:dashed|dotted|double)\s+([^;\}]+)/g,
    replace: (_match, color) => `border: 1px solid ${color ? color.trim() : ""}`,
    reason: "CSS non-solid border normalized to 1px solid",
  },
  // border-width: 2px -> border-width: 1px
  {
    pattern: /border-width:\s*(?:[2-9]|\d{2,})px/g,
    replace: () => "border-width: 1px",
    reason: "CSS border-width normalized to 1px",
  },
  // border-style: dashed/dotted -> border-style: solid
  {
    pattern: /border-style:\s*(?:dashed|dotted|double)/g,
    replace: () => "border-style: solid",
    reason: "CSS border-style normalized to solid",
  },
  // React inline style borderWidth: 2 -> borderWidth: 1
  {
    pattern: /borderWidth:\s*(?:[2-9]|\d{2,}|"[2-9]px"|'\d+px')/g,
    replace: () => "borderWidth: 1",
    reason: "Inline borderWidth normalized to 1",
  },
];

function cleanRedundantBorders(str: string): string {
  let res = str;
  // "border border-solid" -> "border"
  res = res.replace(/\bborder\s+border-solid\b/g, "border");
  res = res.replace(/\bborder-solid\s+border\b/g, "border");
  // "border border" -> "border"
  res = res.replace(/\bborder\s+border\b/g, "border");
  // "border-solid" standing alone when a directional border or border already exists
  res = res.replace(/\bborder-solid\b/g, (m, offset, s) => {
    if (/\bborder(?:-[tblrxy])?\b/.test(s)) {
      return "";
    }
    return "border";
  });
  // Clean up extra whitespace inside strings
  res = res.replace(/(?<="[^"]*)[ \t]{2,}(?=[^"]*")/g, " ");
  res = res.replace(/(?<=`[^`]*)[ \t]{2,}(?=[^`]*`)/g, " ");
  res = res.replace(/(?<='[^']*)[ \t]{2,}(?=[^']*')/g, " ");
  return res;
}

function shouldScanFile(filePath: string): boolean {
  const ext = path.extname(filePath).toLowerCase();
  if (!TARGET_EXTENSIONS.includes(ext)) return false;

  const rel = path.relative(ROOT_DIR, filePath).replace(/\\/g, "/");
  for (const ignore of IGNORE_DIRS) {
    if (rel.startsWith(ignore + "/") || rel === ignore || rel.includes("/" + ignore + "/")) {
      return false;
    }
  }

  return true;
}

function getAllFiles(dir: string): string[] {
  let results: string[] = [];
  try {
    const list = fs.readdirSync(dir);
    for (const file of list) {
      const fullPath = path.join(dir, file);
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory()) {
        const baseName = path.basename(fullPath);
        if (!IGNORE_DIRS.includes(baseName)) {
          results = results.concat(getAllFiles(fullPath));
        }
      } else if (shouldScanFile(fullPath)) {
        results.push(fullPath);
      }
    }
  } catch (err) {
    // Ignore read errors
  }
  return results;
}

export function auditAndFix(isFixMode = false, verbose = false): ScanReport {
  const allFiles: string[] = [];
  for (const target of TARGET_DIRS) {
    const dir = path.join(ROOT_DIR, target);
    if (fs.existsSync(dir)) {
      allFiles.push(...getAllFiles(dir));
    }
  }

  const report: ScanReport = {
    totalFilesScanned: allFiles.length,
    totalBorderDeclarations: 0,
    compliantCount: 0,
    violationCount: 0,
    fixedCount: 0,
    intentionalExceptionsCount: 0,
    violations: [],
    fixedFiles: [],
  };

  for (const filePath of allFiles) {
    const content = fs.readFileSync(filePath, "utf-8");
    const lines = content.split(/\r?\n/);
    let modifiedContent = content;
    let fileHasFix = false;

    // Count border declarations
    const borderMatches = content.match(/\bborder(?:-[tblrxy])?\b|\bborder:\s*1px\s+solid\b/g) || [];
    report.totalBorderDeclarations += borderMatches.length;

    // 1. Process utility class replacements
    for (const rule of UTILITY_REPLACEMENTS) {
      let match: RegExpExecArray | null;
      const regex = new RegExp(rule.pattern.source, rule.pattern.flags);

      while ((match = regex.exec(content)) !== null) {
        const lineNum = content.substring(0, match.index).split("\n").length;
        const colNum = match.index - content.substring(0, match.index).lastIndexOf("\n");

        report.violationCount++;
        report.violations.push({
          file: path.relative(ROOT_DIR, filePath).replace(/\\/g, "/"),
          line: lineNum,
          column: colNum,
          original: match[0],
          replacement: rule.replace(match[0], ...(match.slice(1))),
          reason: rule.reason,
          type: "utility",
        });
      }

      if (isFixMode && rule.pattern.test(modifiedContent)) {
        modifiedContent = modifiedContent.replace(rule.pattern, rule.replace as any);
        fileHasFix = true;
      }
    }

    // 2. Process CSS / Inline style replacements
    for (const rule of CSS_REPLACEMENTS) {
      let match: RegExpExecArray | null;
      const regex = new RegExp(rule.pattern.source, rule.pattern.flags);

      while ((match = regex.exec(content)) !== null) {
        const lineNum = content.substring(0, match.index).split("\n").length;
        const colNum = match.index - content.substring(0, match.index).lastIndexOf("\n");

        report.violationCount++;
        report.violations.push({
          file: path.relative(ROOT_DIR, filePath).replace(/\\/g, "/"),
          line: lineNum,
          column: colNum,
          original: match[0],
          replacement: rule.replace(match[0], ...(match.slice(1))),
          reason: rule.reason,
          type: "css",
        });
      }

      if (isFixMode && rule.pattern.test(modifiedContent)) {
        modifiedContent = modifiedContent.replace(rule.pattern, rule.replace as any);
        fileHasFix = true;
      }
    }

    // 3. Post-cleanup redundant border classes
    if (isFixMode && fileHasFix) {
      modifiedContent = cleanRedundantBorders(modifiedContent);

      if (modifiedContent !== content) {
        fs.writeFileSync(filePath, modifiedContent, "utf-8");
        report.fixedFiles.push(path.relative(ROOT_DIR, filePath).replace(/\\/g, "/"));
        report.fixedCount++;
      }
    }
  }

  report.compliantCount = report.totalBorderDeclarations - report.violationCount;
  if (report.compliantCount < 0) report.compliantCount = 0;

  return report;
}

// ─── CLI EXECUTION ─────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const isFix = args.includes("--fix");
const isVerbose = args.includes("--verbose");

console.log("========================================");
console.log(" OPERATOR GLOBAL BORDER STANDARDIZATION");
console.log("========================================");
console.log(`Mode: ${isFix ? "AUDIT & AUTOMATED FIX" : "AUDIT ONLY (DRY RUN)"}\n`);

const report = auditAndFix(isFix, isVerbose);

console.log("----------------------------------------");
console.log(" AUDIT RESULTS");
console.log("----------------------------------------");
console.log(`Total files scanned:         ${report.totalFilesScanned}`);
console.log(`Total border declarations:   ${report.totalBorderDeclarations}`);
console.log(`Compliant borders (1px):     ${report.compliantCount}`);
console.log(`Total violations detected:   ${report.violationCount}`);
if (isFix) {
  console.log(`Files automatically fixed:   ${report.fixedFiles.length}`);
}

if (report.violations.length > 0) {
  console.log("\n----------------------------------------");
  console.log(" DETECTED VIOLATIONS BREAKDOWN");
  console.log("----------------------------------------");
  const byFile: Record<string, Violation[]> = {};
  for (const v of report.violations) {
    byFile[v.file] = byFile[v.file] || [];
    byFile[v.file].push(v);
  }

  for (const [file, list] of Object.entries(byFile)) {
    console.log(`\n📄 ${file} (${list.length} violations):`);
    for (const v of list) {
      console.log(`   L${v.line}:${v.column} -> '${v.original}' → '${v.replacement}' (${v.reason})`);
    }
  }
} else {
  console.log("\n🎉 ZERO non-compliant borders found! Codebase is 100% compliant with 1px solid standard.");
}

console.log("\n========================================");
console.log(`FINAL STATUS: ${report.violationCount === 0 || isFix ? "COMPLETED" : "VIOLATIONS DETECTED"}`);
console.log("========================================\n");
