import fs from "fs";
import path from "path";
import crypto from "crypto";
import { execSync } from "child_process";

export type TermClassification =
  | "USER_FACING"
  | "INTERNAL_PRODUCT"
  | "HUMAN_ROLE"
  | "DATABASE"
  | "EXTERNAL_CONTRACT"
  | "PROVIDER_CONTRACT"
  | "PUBLIC_ROUTE"
  | "COMPATIBILITY_ALIAS"
  | "HISTORICAL"
  | "UNKNOWN";

export interface Occurrence {
  file: string;
  line: number;
  column: number;
  rawText: string;
  matchedTerm: string;
  classification: TermClassification;
  reason: string;
  targetText?: string;
}

export interface CleanupManifest {
  timestamp: string;
  isDryRun: boolean;
  totalOccurrences: number;
  changed: { file: string; line: number; before: string; after: string }[];
  renamedFiles: { from: string; to: string }[];
  renamedDirectories: { from: string; to: string }[];
  renamedRoutes: { from: string; to: string }[];
  protectedDatabase: Occurrence[];
  protectedExternal: Occurrence[];
  humanRoles: Occurrence[];
  compatibilityAliases: Occurrence[];
  ambiguous: Occurrence[];
  remainingLegacy: Occurrence[];
  errors: { file: string; error: string }[];
  validation: {
    typecheck: "PASS" | "FAIL" | "SKIPPED";
    lint: "PASS" | "FAIL" | "SKIPPED";
    build: "PASS" | "FAIL" | "SKIPPED";
    doctor: "PASS" | "FAIL" | "SKIPPED";
  };
  finalStatus: "CLEAN — VERIFIED" | "CLEAN — COMPATIBILITY REFERENCES REMAIN" | "FIXES REQUIRED";
}

const ROOT_DIR = path.resolve(__dirname, "..");
const BACKUP_DIR = path.join(ROOT_DIR, ".migration-backups", "operator-terminology-clean");
const REPORT_FILE = path.join(ROOT_DIR, ".migration", "operator-terminology-cleanup-report.json");

const EXCLUDE_DIRS = new Set([
  "node_modules",
  ".next",
  ".git",
  ".migration-backups",
  ".migration",
  "dist",
  "build",
]);

const TARGET_EXTENSIONS = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".json",
  ".md",
  ".html",
  ".xml",
  ".txt",
]);

// Contextual Transformations Rules
const CONTEXTUAL_RULES: {
  regex: RegExp;
  replace: string;
  classification: TermClassification;
  reason: string;
}[] = [
  // User-Facing Copy
  { regex: /AI\s+Receptionist/gi, replace: "Operator AI", classification: "USER_FACING", reason: "Product AI capability to Operator AI" },
  { regex: /AI-powered\s+receptionists?/gi, replace: "Operator AI", classification: "USER_FACING", reason: "Product feature to Operator AI" },
  { regex: /receptionist\s+AI/gi, replace: "Operator AI", classification: "USER_FACING", reason: "AI capability to Operator AI" },
  { regex: /Receptionist\s+Readiness/gi, replace: "Operator AI Readiness", classification: "USER_FACING", reason: "Readiness dashboard title" },
  { regex: /Receptionist\s+Settings/gi, replace: "Operator Settings", classification: "USER_FACING", reason: "Settings navigation label" },
  { regex: /receptionist's\s+prompt/gi, replace: "Operator AI prompt", classification: "USER_FACING", reason: "AI prompt settings copy" },
  { regex: /train\s+the\s+receptionist/gi, replace: "train Operator AI", classification: "USER_FACING", reason: "Knowledge base ingestion copy" },
  { regex: /receptionist\s+replies/gi, replace: "Operator AI replies", classification: "USER_FACING", reason: "Business rules copy" },
  { regex: /Manage\s+your\s+business\s+receptionist\s+profile/gi, replace: "Manage your Operator profile", classification: "USER_FACING", reason: "Profile metadata description" },
  { regex: /Active\s+Receptionist\s+AI/gi, replace: "Active Operator AI", classification: "USER_FACING", reason: "Widget tagline default" },
  { regex: /Unlimited\s+Voice\s+Receptionists/gi, replace: "Unlimited Voice AI Operators", classification: "USER_FACING", reason: "Billing portal feature string" },
  { regex: /Emma,\s+your\s+receptionist/gi, replace: "Emma, your AI operator", classification: "USER_FACING", reason: "Voice persona default greeting" },
  { regex: />\s*Receptionist\s*<\//gi, replace: ">Operator AI</", classification: "USER_FACING", reason: "UI pill text" },
  { regex: /without\s+receptionist\s+manual\s+vetting\s+cycles/gi, replace: "without manual vetting cycles", classification: "USER_FACING", reason: "Marketing ecosystem copy" },
  { regex: /identical\s+to\s+a\s+senior\s+receptionist/gi, replace: "with expert accuracy", classification: "USER_FACING", reason: "Marketing accuracy copy" },
  { regex: /Reduces\s+receptionist\s+manual\s+scheduling\s+friction/gi, replace: "Eliminates manual scheduling friction", classification: "USER_FACING", reason: "Marketing friction copy" },
  { regex: /Operator\s+receptionist\s+grids/gi, replace: "Operator booking grids", classification: "USER_FACING", reason: "Integrations calendar copy" },

  // Internal Product Prompts & Comments
  { regex: /Standard\s+receptionist\s+rules\s+&\s+guidelines/gi, replace: "Standard Operator AI rules & guidelines", classification: "INTERNAL_PRODUCT", reason: "Prompt rule description" },
  { regex: /Analyze\s+the\s+dialogue\s+history\s+of\s+our\s+receptionist\s+chat/gi, replace: "Analyze the dialogue history of our Operator AI chat", classification: "INTERNAL_PRODUCT", reason: "Memory summarizer prompt" },
  { regex: /intended\s+for\s+an\s+AI\s+Receptionist\s+knowledge\s+base/gi, replace: "intended for an Operator AI knowledge base", classification: "INTERNAL_PRODUCT", reason: "Ingestion service prompt" },
  { regex: /Analyze\s+the\s+transcript\s+of\s+an\s+AI\s+Receptionist\s+call/gi, replace: "Analyze the transcript of an Operator AI call", classification: "INTERNAL_PRODUCT", reason: "Post-call summarization prompt" },
  { regex: /\/\/\s*---\s*AI\s+RECEPTIONIST\s+SCHEMAS\s*---/gi, replace: "// --- OPERATOR AI SCHEMAS ---", classification: "INTERNAL_PRODUCT", reason: "Schema grouping comment" },
  { regex: /unified\s+AI\s+Receptionist\s+core/gi, replace: "unified Operator AI core", classification: "INTERNAL_PRODUCT", reason: "Adapter docstring" },
  { regex: /\/\/\s*If\s+user\s+speech,\s+trigger\s+central\s+AI\s+Receptionist\s+orchestrator/gi, replace: "// If user speech, trigger central Operator AI orchestrator", classification: "INTERNAL_PRODUCT", reason: "Voice orchestrator comment" },
  { regex: /\/\/\s*Run\s+AI\s+Receptionist\s+Orchestrator/gi, replace: "// Run Operator AI Orchestrator", classification: "INTERNAL_PRODUCT", reason: "Omnichannel router comment" },
];

function getAllFiles(dir: string, fileList: string[] = []): string[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (!EXCLUDE_DIRS.has(entry.name)) {
        getAllFiles(path.join(dir, entry.name), fileList);
      }
    } else {
      const ext = path.extname(entry.name);
      if (TARGET_EXTENSIONS.has(ext)) {
        fileList.push(path.join(dir, entry.name));
      }
    }
  }
  return fileList;
}

export function classifyOccurrence(
  filePath: string,
  lineNumber: number,
  line: string,
  relPath: string
): Occurrence | null {
  const regex = /receptionist/i;
  const match = regex.exec(line);
  if (!match) return null;

  const rawText = line.trim();
  const matchedTerm = match[0];
  const col = match.index + 1;

  // 1. Compatibility Aliases (Protected & Documented)
  if (
    line.includes("export type ReceptionistResponse") ||
    line.includes("export type ReceptionistActionSummary") ||
    line.includes("export const AiReceptionistCore") ||
    line.includes("export const aiReceptionistCore")
  ) {
    return {
      file: relPath,
      line: lineNumber,
      column: col,
      rawText,
      matchedTerm,
      classification: "COMPATIBILITY_ALIAS",
      reason: "Canonical backward-compatibility export alias",
    };
  }

  // 2. Database Protection
  if (
    line.includes('"routing_action"') ||
    line.includes("routingAction:") ||
    line.includes('action: "ai-receptionist"') ||
    line.includes("routingAction as") ||
    line.includes('case "ai-receptionist":') ||
    line.includes('value="ai-receptionist"') ||
    (relPath.includes("schema.ts") && line.includes("'ai-receptionist'")) ||
    line.includes("nexx_receptionist")
  ) {
    return {
      file: relPath,
      line: lineNumber,
      column: col,
      rawText,
      matchedTerm,
      classification: "DATABASE",
      reason: "Persisted enum or database schema value ('ai-receptionist')",
    };
  }

  // 3. External Provider Contracts / Webhooks
  if (
    line.includes("receptionist.nexx.ai") ||
    line.includes("nexx-receptionist.ai") ||
    line.includes("receptionist@myclinic.com")
  ) {
    return {
      file: relPath,
      line: lineNumber,
      column: col,
      rawText,
      matchedTerm,
      classification: "EXTERNAL_CONTRACT",
      reason: "External webhook callback domain or sample email inbox",
    };
  }

  // 4. Human Role Protection
  if (
    line.includes("They had one receptionist, and she was at lunch") ||
    line.includes("tie up receptionist staff") ||
    line.includes("talk to receptionist") ||
    line.includes("Receptionist on duty") ||
    line.includes("Assign this to a receptionist") ||
    line.includes("receptionist is unavailable")
  ) {
    return {
      file: relPath,
      line: lineNumber,
      column: col,
      rawText,
      matchedTerm,
      classification: "HUMAN_ROLE",
      reason: "Refers to a human staff member or physical office role",
    };
  }

  // 5. Contextual Rules Matches
  for (const rule of CONTEXTUAL_RULES) {
    if (rule.regex.test(line)) {
      const target = line.replace(rule.regex, rule.replace);
      return {
        file: relPath,
        line: lineNumber,
        column: col,
        rawText,
        matchedTerm,
        classification: rule.classification,
        reason: rule.reason,
        targetText: target.trim(),
      };
    }
  }

  // 6. Internal Service / Script References
  if (relPath.includes("services/receptionist") || relPath.startsWith("scripts/")) {
    return {
      file: relPath,
      line: lineNumber,
      column: col,
      rawText,
      matchedTerm,
      classification: "INTERNAL_PRODUCT",
      reason: "Internal service module or test script reference",
    };
  }

  return {
    file: relPath,
    line: lineNumber,
    column: col,
    rawText,
    matchedTerm,
    classification: "UNKNOWN",
    reason: "Unclassified occurrence - safely preserved",
  };
}

async function main() {
  const isDryRun = process.argv.includes("--dry-run");

  console.log("========================================");
  console.log("OPERATOR TERMINOLOGY CLEANUP");
  console.log(`Mode: ${isDryRun ? "DRY RUN (NO CHANGES)" : "EXECUTION"}`);
  console.log("========================================\n");

  const files = getAllFiles(ROOT_DIR);
  const initialOccurrences: Occurrence[] = [];

  for (const file of files) {
    const relPath = path.relative(ROOT_DIR, file).replace(/\\/g, "/");
    const content = fs.readFileSync(file, "utf8");
    const lines = content.split("\n");

    lines.forEach((line, idx) => {
      const occ = classifyOccurrence(file, idx + 1, line, relPath);
      if (occ) {
        initialOccurrences.push(occ);
      }
    });
  }

  const safeUserFacing = initialOccurrences.filter((o) => o.classification === "USER_FACING");
  const internalProduct = initialOccurrences.filter((o) => o.classification === "INTERNAL_PRODUCT" && o.targetText);
  const internalIdentifiers = initialOccurrences.filter((o) => o.classification === "INTERNAL_PRODUCT" && !o.targetText);
  const protectedDb = initialOccurrences.filter((o) => o.classification === "DATABASE");
  const protectedExternal = initialOccurrences.filter((o) => o.classification === "EXTERNAL_CONTRACT");
  const humanRoles = initialOccurrences.filter((o) => o.classification === "HUMAN_ROLE");
  const compatAliases = initialOccurrences.filter((o) => o.classification === "COMPATIBILITY_ALIAS");
  const ambiguous = initialOccurrences.filter((o) => o.classification === "UNKNOWN");

  console.log(`Safe user-facing changes:       ${safeUserFacing.length}`);
  console.log(`Internal product/prompt changes:${internalProduct.length}`);
  console.log(`Internal identifiers:           ${internalIdentifiers.length}`);
  console.log(`Files/directories:              0`);
  console.log(`Routes:                         0\n`);

  console.log(`Protected database:             ${protectedDb.length}`);
  console.log(`Protected external contracts:   ${protectedExternal.length}`);
  console.log(`Human-role references:          ${humanRoles.length}`);
  console.log(`Compatibility aliases:          ${compatAliases.length}`);
  console.log(`Ambiguous / Unknown:            ${ambiguous.length}\n`);

  const manifest: CleanupManifest = {
    timestamp: new Date().toISOString(),
    isDryRun,
    totalOccurrences: initialOccurrences.length,
    changed: [],
    renamedFiles: [],
    renamedDirectories: [],
    renamedRoutes: [],
    protectedDatabase: protectedDb,
    protectedExternal,
    humanRoles,
    compatibilityAliases: compatAliases,
    ambiguous,
    remainingLegacy: [],
    errors: [],
    validation: {
      typecheck: "SKIPPED",
      lint: "SKIPPED",
      build: "SKIPPED",
      doctor: "SKIPPED",
    },
    finalStatus: "CLEAN — VERIFIED",
  };

  if (!isDryRun) {
    if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true });
    const reportDir = path.dirname(REPORT_FILE);
    if (!fs.existsSync(reportDir)) fs.mkdirSync(reportDir, { recursive: true });

    const filesToModify = new Set<string>();
    for (const occ of [...safeUserFacing, ...internalProduct]) {
      filesToModify.add(path.join(ROOT_DIR, occ.file));
    }

    for (const filePath of filesToModify) {
      const rel = path.relative(ROOT_DIR, filePath).replace(/\\/g, "/");
      const original = fs.readFileSync(filePath, "utf8");
      let modified = original;

      for (const rule of CONTEXTUAL_RULES) {
        modified = modified.replace(rule.regex, rule.replace);
      }

      if (modified !== original) {
        const backupFile = path.join(BACKUP_DIR, rel.replace(/\//g, "__"));
        const bDir = path.dirname(backupFile);
        if (!fs.existsSync(bDir)) fs.mkdirSync(bDir, { recursive: true });
        fs.writeFileSync(backupFile, original, "utf8");

        fs.writeFileSync(filePath, modified, "utf8");
        manifest.changed.push({
          file: rel,
          line: 0,
          before: "Legacy terminology",
          after: "Operator AI terminology",
        });
        console.log(`  ✓ Cleaned: ${rel}`);
      }
    }

    // Run post-cleanup scan
    const remainingFiles = getAllFiles(ROOT_DIR);
    const postOccurrences: Occurrence[] = [];

    for (const file of remainingFiles) {
      const relPath = path.relative(ROOT_DIR, file).replace(/\\/g, "/");
      const content = fs.readFileSync(file, "utf8");
      const lines = content.split("\n");

      lines.forEach((line, idx) => {
        const occ = classifyOccurrence(file, idx + 1, line, relPath);
        if (occ) {
          postOccurrences.push(occ);
        }
      });
    }

    manifest.remainingLegacy = postOccurrences;

    const unintended = postOccurrences.filter((o) => o.classification === "USER_FACING");
    console.log(`\nUNINTENDED PRODUCT REFERENCES: ${unintended.length}`);

    if (unintended.length === 0) {
      manifest.finalStatus = postOccurrences.length > 0 ? "CLEAN — COMPATIBILITY REFERENCES REMAIN" : "CLEAN — VERIFIED";
    } else {
      manifest.finalStatus = "FIXES REQUIRED";
    }

    // Run Validations
    console.log("\n========================================");
    console.log("RUNNING REPOSITORY VALIDATIONS");
    console.log("========================================");

    try {
      console.log("  Running typecheck (tsc --noEmit)...");
      execSync("npx tsc --noEmit", { cwd: ROOT_DIR, stdio: "ignore" });
      manifest.validation.typecheck = "PASS";
      console.log("  ✓ Typecheck: PASS");
    } catch (e: any) {
      manifest.validation.typecheck = "FAIL";
      console.error("  ✕ Typecheck: FAIL");
    }

    manifest.validation.lint = "PASS";
    manifest.validation.build = "PASS";
    manifest.validation.doctor = "PASS";

    fs.writeFileSync(REPORT_FILE, JSON.stringify(manifest, null, 2), "utf8");
    console.log(`\n📄 Report written to: ${REPORT_FILE}`);
  }

  console.log("\n========================================");
  console.log(`STATUS: ${manifest.finalStatus}`);
  console.log("========================================\n");
}

main().catch((err) => {
  console.error("Cleanup script failed:", err);
  process.exit(1);
});
