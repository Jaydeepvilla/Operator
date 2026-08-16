import fs from "fs";
import path from "path";
import crypto from "crypto";

interface Occurrence {
  file: string;
  line: number;
  column: number;
  rawText: string;
  matchedTerm: string;
  classification:
    | "USER_FACING"
    | "ROUTE"
    | "FILE_NAME"
    | "DIRECTORY_NAME"
    | "INTERNAL_IDENTIFIER"
    | "INTERNAL_IMPORT"
    | "COMMENT"
    | "DOCUMENTATION"
    | "DATABASE_VALUE"
    | "EXTERNAL_CONTRACT"
    | "DOMAIN_REQUIRES_MANUAL_VERIFICATION"
    | "AMBIGUOUS"
    | "UNKNOWN";
  reason: string;
  targetText?: string;
  applied?: boolean;
}

interface MigrationReport {
  timestamp: string;
  isDryRun: boolean;
  totalOccurrences: number;
  changedUserFacing: number;
  changedComments: number;
  changedIdentifiers: number;
  renamedFiles: string[];
  renamedDirectories: string[];
  renamedRoutes: string[];
  protectedDatabase: Occurrence[];
  protectedExternal: Occurrence[];
  ambiguous: Occurrence[];
  domainManualVerification: Occurrence[];
  remainingLegacy: Occurrence[];
  failed: { file: string; error: string }[];
}

const ROOT_DIR = path.resolve(__dirname, "..");
const BACKUP_DIR = path.join(ROOT_DIR, ".migration-backups", "operator-terminology");
const REPORT_FILE = path.join(ROOT_DIR, ".migration", "operator-terminology-report.json");

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

function getFileHash(content: string): string {
  return crypto.createHash("sha256").update(content, "utf8").digest("hex");
}

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

// Phrase-aware transformation rules for User-Facing and Prompt content
const PHRASE_TRANSFORMATIONS: { regex: RegExp; replace: string; classification: Occurrence["classification"]; reason: string }[] = [
  // User-facing Specifics
  { regex: /Operator\s+Receptionist/gi, replace: "Operator AI", classification: "USER_FACING", reason: "Product rebranding to Operator AI" },
  { regex: /AI-powered\s+receptionists?/gi, replace: "Operator AI", classification: "USER_FACING", reason: "Product capability to Operator AI" },
  { regex: /Active\s+Receptionist\s+AI/gi, replace: "Active Operator AI", classification: "USER_FACING", reason: "Tagline to Active Operator AI" },
  { regex: /Receptionist\s+Readiness/gi, replace: "Operator AI Readiness", classification: "USER_FACING", reason: "Setup dashboard label to Operator AI Readiness" },
  { regex: /receptionist's\s+prompt/gi, replace: "Operator AI prompt", classification: "USER_FACING", reason: "AI prompt settings copy" },
  { regex: /How\s+the\s+AIReceptionist\s+Prompt\s+works/gi, replace: "How the Operator AI prompt works", classification: "USER_FACING", reason: "AI prompt heading" },
  { regex: /Manage\s+your\s+business\s+receptionist\s+profile/gi, replace: "Manage your Operator profile", classification: "USER_FACING", reason: "Profile metadata description" },
  { regex: /train\s+the\s+receptionist/gi, replace: "train Operator AI", classification: "USER_FACING", reason: "Knowledge base scraper copy" },
  { regex: /receptionist\s+replies/gi, replace: "Operator AI replies", classification: "USER_FACING", reason: "Business settings copy" },
  { regex: /your\s+receptionist\s+can\s+verify/gi, replace: "Operator AI can verify", classification: "USER_FACING", reason: "Business settings copy" },
  { regex: /Help\s+your\s+receptionist\s+answer/gi, replace: "Help Operator AI answer", classification: "USER_FACING", reason: "Business profile social links copy" },
  { regex: /when\s+the\s+receptionist\s+AI\s+is\s+actively\s+answering/gi, replace: "when Operator AI is actively answering", classification: "USER_FACING", reason: "Settings form notification toggle description" },
  { regex: /Optimize\s+Receptionist\s+Setup/gi, replace: "Optimize Operator AI Setup", classification: "USER_FACING", reason: "Health dashboard next action title" },
  { regex: /returns\s+the\s+receptionist\s+chatbot\s+back\s+to\s+active/gi, replace: "returns Operator AI back to active", classification: "USER_FACING", reason: "Escalations triage instructions" },
  { regex: /Permit\s+receptionist\s+to\s+suggest/gi, replace: "Permit Operator AI to suggest", classification: "USER_FACING", reason: "Business booking settings copy" },
  { regex: /so\s+the\s+receptionist\s+can\s+send\s+links/gi, replace: "so Operator AI can send links", classification: "USER_FACING", reason: "Business review link settings copy" },
  { regex: /Unlimited\s+Voice\s+Receptionists/gi, replace: "Unlimited Voice AI Operators", classification: "USER_FACING", reason: "Billing portal enterprise features" },
  { regex: /receptionist\s+summary/gi, replace: "Operator intelligence summary", classification: "USER_FACING", reason: "Intelligence page description" },
  { regex: /Emma,\s+your\s+receptionist/gi, replace: "Emma, your AI operator", classification: "USER_FACING", reason: "Voice persona greeting text" },
  { regex: />\s*Receptionist\s*<\//gi, replace: ">Operator AI</", classification: "USER_FACING", reason: "Live dashboard preview tab pill" },
  { regex: /Operator\s+receptionist\s+grids/gi, replace: "Operator booking grids", classification: "USER_FACING", reason: "Integrations outlook sync copy" },
  { regex: /without\s+receptionist\s+manual\s+vetting\s+cycles/gi, replace: "without manual vetting cycles", classification: "USER_FACING", reason: "Ecosystem viewer impact text" },
  { regex: /identical\s+to\s+a\s+senior\s+receptionist/gi, replace: "with expert accuracy", classification: "USER_FACING", reason: "Ecosystem viewer impact text" },
  { regex: /Reduces\s+receptionist\s+manual\s+scheduling\s+friction/gi, replace: "Eliminates manual scheduling friction", classification: "USER_FACING", reason: "Ecosystem viewer impact text" },
  
  // Prompts & Comments
  { regex: /Standard\s+receptionist\s+rules\s+&\s+guidelines/gi, replace: "Standard Operator AI rules & guidelines", classification: "COMMENT", reason: "Prompt generation rule comment" },
  { regex: /Analyze\s+the\s+dialogue\s+history\s+of\s+our\s+receptionist\s+chat/gi, replace: "Analyze the dialogue history of our Operator AI chat", classification: "COMMENT", reason: "Conversation memory prompt" },
  { regex: /intended\s+for\s+an\s+AI\s+Receptionist\s+knowledge\s+base/gi, replace: "intended for an Operator AI knowledge base", classification: "COMMENT", reason: "Ingestion service document analyzer prompt" },
  { regex: /Analyze\s+the\s+transcript\s+of\s+an\s+AI\s+Receptionist\s+call/gi, replace: "Analyze the transcript of an Operator AI call", classification: "COMMENT", reason: "Voice post-call analysis assistant prompt" },
  { regex: /\/\/\s*---\s*AI\s+RECEPTIONIST\s+SCHEMAS\s*---/gi, replace: "// --- OPERATOR AI SCHEMAS ---", classification: "COMMENT", reason: "Schema grouping comment" },
  { regex: /unified\s+AI\s+Receptionist\s+core/gi, replace: "unified Operator AI core", classification: "COMMENT", reason: "Adapter docstring" },
  { regex: /\/\/\s*If\s+user\s+speech,\s+trigger\s+central\s+AI\s+Receptionist\s+orchestrator/gi, replace: "// If user speech, trigger central Operator AI orchestrator", classification: "COMMENT", reason: "Voice orchestrator comment" },
  { regex: /\/\/\s*Run\s+AI\s+Receptionist\s+Orchestrator/gi, replace: "// Run Operator AI Orchestrator", classification: "COMMENT", reason: "Router comment" },
];

function classifyLine(
  filePath: string,
  lineNumber: number,
  line: string,
  relPath: string
): Occurrence | null {
  const match = /receptionist/i.exec(line);
  if (!match) return null;

  const rawText = line.trim();
  const matchedTerm = match[0];
  const col = match.index + 1;

  // 1. Protected Database Enums / Columns
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
      classification: "DATABASE_VALUE",
      reason: "Persisted enum value or database configuration ('ai-receptionist')",
    };
  }

  // 2. Protected External Contracts & Fallback Domains
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
      classification: "DOMAIN_REQUIRES_MANUAL_VERIFICATION",
      reason: "Domain hostname or fallback webhook URL requiring manual verification",
    };
  }

  // 3. Ambiguous Real Human/Staff Roles
  if (
    line.includes("They had one receptionist, and she was at lunch") ||
    line.includes("tie up receptionist staff") ||
    line.includes("talk to receptionist")
  ) {
    return {
      file: relPath,
      line: lineNumber,
      column: col,
      rawText,
      matchedTerm,
      classification: "AMBIGUOUS",
      reason: "Refers to a human staff role / real-life human scenario",
    };
  }

  // 4. Check against phrase transformations
  for (const rule of PHRASE_TRANSFORMATIONS) {
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

  // 5. Internal Identifiers / Core Services
  if (
    relPath.includes("services/receptionist") ||
    line.includes("AiReceptionistCore") ||
    line.includes("aiReceptionistCore") ||
    line.includes("ReceptionistResponse") ||
    line.includes("ReceptionistActionSummary")
  ) {
    return {
      file: relPath,
      line: lineNumber,
      column: col,
      rawText,
      matchedTerm,
      classification: "INTERNAL_IDENTIFIER",
      reason: "Internal service architecture identifier (canonical alias applied)",
    };
  }

  // 6. Scripts / Verifications
  if (relPath.startsWith("scripts/")) {
    return {
      file: relPath,
      line: lineNumber,
      column: col,
      rawText,
      matchedTerm,
      classification: "COMMENT",
      reason: "Test script / internal utility description",
    };
  }

  return {
    file: relPath,
    line: lineNumber,
    column: col,
    rawText,
    matchedTerm,
    classification: "UNKNOWN",
    reason: "Unclassified occurrence - protected by default",
  };
}

async function runMigration(isDryRun: boolean) {
  console.log("\n============================================================");
  console.log(`🤖 OPERATOR SMART TERMINOLOGY MIGRATION ${isDryRun ? "(DRY RUN)" : "(EXECUTION)"}`);
  console.log("============================================================\n");

  const files = getAllFiles(ROOT_DIR);
  const occurrences: Occurrence[] = [];

  for (const file of files) {
    const relPath = path.relative(ROOT_DIR, file).replace(/\\/g, "/");
    const content = fs.readFileSync(file, "utf8");
    const lines = content.split("\n");

    lines.forEach((line, idx) => {
      const occ = classifyLine(file, idx + 1, line, relPath);
      if (occ) {
        occurrences.push(occ);
      }
    });
  }

  const userFacing = occurrences.filter((o) => o.classification === "USER_FACING");
  const comments = occurrences.filter((o) => o.classification === "COMMENT");
  const identifiers = occurrences.filter((o) => o.classification === "INTERNAL_IDENTIFIER");
  const dbProtected = occurrences.filter((o) => o.classification === "DATABASE_VALUE");
  const domainManual = occurrences.filter((o) => o.classification === "DOMAIN_REQUIRES_MANUAL_VERIFICATION");
  const ambiguous = occurrences.filter((o) => o.classification === "AMBIGUOUS");
  const unknown = occurrences.filter((o) => o.classification === "UNKNOWN");

  console.log("OCCURRENCE CLASSIFICATION SUMMARY:");
  console.log(`  USER-FACING:            ${userFacing.length} planned`);
  console.log(`  COMMENTS / PROMPTS:     ${comments.length} planned`);
  console.log(`  INTERNAL IDENTIFIERS:   ${identifiers.length} planned`);
  console.log(`  PROTECTED DATABASE:     ${dbProtected.length}`);
  console.log(`  PROTECTED DOMAINS:      ${domainManual.length}`);
  console.log(`  AMBIGUOUS (HUMAN ROLE): ${ambiguous.length}`);
  console.log(`  UNKNOWN:                ${unknown.length}\n`);

  if (!isDryRun) {
    // Ensure directories exist
    if (!fs.existsSync(BACKUP_DIR)) {
      fs.mkdirSync(BACKUP_DIR, { recursive: true });
    }
    const reportDir = path.dirname(REPORT_FILE);
    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }

    // Apply safe phrase transformations
    const filesToModify = new Set<string>();
    for (const occ of [...userFacing, ...comments]) {
      filesToModify.add(path.join(ROOT_DIR, occ.file));
    }

    for (const filePath of filesToModify) {
      const rel = path.relative(ROOT_DIR, filePath).replace(/\\/g, "/");
      const original = fs.readFileSync(filePath, "utf8");
      let modified = original;

      for (const rule of PHRASE_TRANSFORMATIONS) {
        modified = modified.replace(rule.regex, rule.replace);
      }

      if (modified !== original) {
        // Backup original
        const backupFile = path.join(BACKUP_DIR, rel.replace(/\//g, "__"));
        const bDir = path.dirname(backupFile);
        if (!fs.existsSync(bDir)) fs.mkdirSync(bDir, { recursive: true });
        fs.writeFileSync(backupFile, original, "utf8");

        fs.writeFileSync(filePath, modified, "utf8");
        console.log(`  ✓ Updated: ${rel}`);
      }
    }

    // Enhance src/server/services/receptionist canonical aliases
    const typesPath = path.join(ROOT_DIR, "src/server/services/receptionist/types.ts");
    if (fs.existsSync(typesPath)) {
      let typesContent = fs.readFileSync(typesPath, "utf8");
      if (!typesContent.includes("export type OperatorResponse")) {
        typesContent = typesContent
          .replace("export interface ReceptionistResponse", "export interface OperatorResponse")
          .replace("export interface ReceptionistActionSummary", "export interface OperatorActionSummary");
        typesContent += `\n// Canonical Aliases for Backward Compatibility\nexport type ReceptionistResponse = OperatorResponse;\nexport type ReceptionistActionSummary = OperatorActionSummary;\n`;
        fs.writeFileSync(typesPath, typesContent, "utf8");
        console.log(`  ✓ Added canonical Operator types & backward-compatible aliases in services/receptionist/types.ts`);
      }
    }

    const corePath = path.join(ROOT_DIR, "src/server/services/receptionist/core.ts");
    if (fs.existsSync(corePath)) {
      let coreContent = fs.readFileSync(corePath, "utf8");
      if (!coreContent.includes("export const operatorAICore")) {
        coreContent += `\n// Canonical Operator AI Core Aliases\nexport const operatorAICore = aiReceptionistCore;\nexport const OperatorAICore = AiReceptionistCore;\n`;
        fs.writeFileSync(corePath, coreContent, "utf8");
        console.log(`  ✓ Added canonical OperatorAICore aliases in services/receptionist/core.ts`);
      }
    }
  }

  // Scan remaining legacy occurrences
  const remainingOccurrences: Occurrence[] = [];
  for (const file of getAllFiles(ROOT_DIR)) {
    const relPath = path.relative(ROOT_DIR, file).replace(/\\/g, "/");
    const content = fs.readFileSync(file, "utf8");
    const lines = content.split("\n");

    lines.forEach((line, idx) => {
      const occ = classifyLine(file, idx + 1, line, relPath);
      if (occ) {
        remainingOccurrences.push(occ);
      }
    });
  }

  const report: MigrationReport = {
    timestamp: new Date().toISOString(),
    isDryRun,
    totalOccurrences: occurrences.length,
    changedUserFacing: userFacing.length,
    changedComments: comments.length,
    changedIdentifiers: identifiers.length,
    renamedFiles: [],
    renamedDirectories: [],
    renamedRoutes: [],
    protectedDatabase: dbProtected,
    protectedExternal: [],
    ambiguous,
    domainManualVerification: domainManual,
    remainingLegacy: remainingOccurrences,
    failed: [],
  };

  if (!isDryRun) {
    fs.writeFileSync(REPORT_FILE, JSON.stringify(report, null, 2), "utf8");
    console.log(`\n📄 Migration manifest written to ${REPORT_FILE}`);
  }

  console.log("\n============================================================");
  console.log(`🎉 OPERATOR TERMINOLOGY MIGRATION ${isDryRun ? "DRY RUN COMPLETE" : "COMPLETE"}`);
  console.log("============================================================\n");
}

const isDryRun = process.argv.includes("--dry-run");
runMigration(isDryRun).catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
