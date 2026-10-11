import { DoctorContext, DoctorRule, RuleResult, Violation } from "../types";
import path from "path";
import fs from "fs";

/**
 * Documented Allowlist for legitimate test sandboxes, design tokens, and simulation playgrounds.
 * Each entry MUST document the exact path pattern, reason, and responsible owner.
 */
export interface AllowlistEntry {
  pathPattern: RegExp;
  reason: string;
  owner: string;
}

export const ZERO_FAKE_DATA_ALLOWLIST: AllowlistEntry[] = [
  {
    pathPattern: /src[\\/]lib[\\/]constants[\\/]/,
    reason: "Legitimate system design tokens, enums, route constants, and UI schemas.",
    owner: "Design Systems & Architecture",
  },
  {
    pathPattern: /src[\\/]components[\\/]marketing[\\/]visualizations[\\/]product-simulation\.tsx/,
    reason: "Public marketing page interactive animation component demonstrating receptionist capabilities.",
    owner: "Marketing & Product Design",
  },
  {
    pathPattern: /src[\\/]components[\\/]confidence-bridge[\\/]/,
    reason: "Intentional AI Confidence Bridge testing sandbox allowing tenant admins to test-fire assistant prompts.",
    owner: "AI Systems Engineering",
  },
  {
    pathPattern: /src[\\/]server[\\/]services[\\/]orchestrator\.ts/,
    reason: "AI receptionist simulation harness (isSimulated flag) for admin playground testing without mutating live DB records.",
    owner: "AI Systems Engineering",
  },
  {
    pathPattern: /src[\\/]server[\\/]services[\\/]verification[\\/]/,
    reason: "Automated verification test scenarios and prompt evaluation harness.",
    owner: "QA & Verification Architecture",
  },
  {
    pathPattern: /src[\\/]app[\\/]api[\\/]dashboard[\\/]simulate[\\/]route\.ts/,
    reason: "Decommissioned endpoint explicitly returning disabled: true and deprecation notice.",
    owner: "Backend Engineering",
  },
  {
    pathPattern: /(?:__tests__|tests?|\.test\.|\.spec\.|scripts[\\/])/,
    reason: "Test fixtures, integration test runners, evaluation scripts, and migration utilities.",
    owner: "QA & Test Engineering",
  },
];

/**
 * Inspection patterns to detect production fake data, mock returns, and fabricated metrics.
 */
interface SuspiciousPattern {
  id: string;
  regex: RegExp;
  message: string;
  category: "mock-import" | "fabricated-metrics" | "fake-success" | "simulated-operational-data";
}

const SUSPICIOUS_PATTERNS: SuspiciousPattern[] = [
  {
    id: "mock-import",
    regex: /import\s+.*from\s+['"][^'"]*(?:__mocks__|mock-data|test-fixtures|fixtures)[^'"]*['"]/i,
    message: "Production code importing from test fixtures or mock directories.",
    category: "mock-import",
  },
  {
    id: "sin-cos-metric-simulation",
    regex: /Math\.(?:sin|cos)\s*\([^)]*\)\s*\*\s*0\.\d+/i,
    message: "Fabricated metrics calculation using trigonometric wave simulation (Math.sin/cos).",
    category: "fabricated-metrics",
  },
  {
    id: "random-metric-simulation",
    regex: /(?:mrr|arr|revenue|conversionRate|csat)\s*[:=]\s*.*Math\.random\(\)/i,
    message: "Operational business metric computed using Math.random() rather than authoritative database records.",
    category: "fabricated-metrics",
  },
  {
    id: "fake-provider-success",
    regex: /externalId:\s*['"](?:email-sim-|sinch-sim-|vonage-sim-|mock-sim-|sim-resend|sim-vonage|sim-sinch)/i,
    message: "Service pretending external provider dispatch succeeded with fake simulation ID.",
    category: "fake-success",
  },
  {
    id: "synthetic-session-id",
    regex: /externalSessionId:\s*['"](?:out_\d+|sim-)/i,
    message: "Synthetic outbound call session ID generated without carrier dispatch verification.",
    category: "fake-success",
  },
  {
    id: "simulated-success-comment",
    regex: /\/\/\s*(?:Here we simulate success|Simulate campaign dial trigger|Simulate saving settings)/i,
    message: "Production action executing fake simulation rather than real persistence or service dispatch.",
    category: "fake-success",
  },
  {
    id: "unpersisted-form-timeout",
    regex: /setTimeout\s*\(\s*\(\)\s*=>\s*\{\s*setIs(?:Saving|Updating|Submitting)\s*\(\s*false\s*\)/i,
    message: "Simulated form persistence using setTimeout without invoking server action.",
    category: "fake-success",
  },
  {
    id: "simulated-phone-numbers",
    regex: /SIMULATED_AVAILABLE_NUMBERS\s*=/i,
    message: "Hardcoded fake phone numbers array presented as available lines in production.",
    category: "simulated-operational-data",
  },
];

export function isAllowlisted(filePath: string): boolean {
  const normalizedPath = filePath.replace(/\\/g, "/");
  return ZERO_FAKE_DATA_ALLOWLIST.some((entry) => entry.pathPattern.test(normalizedPath));
}

export function scanSourceForFakeData(sourceText: string, relativePath: string): Violation[] {
  const violations: Violation[] = [];
  const lines = sourceText.split("\n");

  for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
    const line = lines[lineIndex];
    const lineNumber = lineIndex + 1;

    for (const pattern of SUSPICIOUS_PATTERNS) {
      if (pattern.regex.test(line)) {
        violations.push({
          rule: "no-fake-data",
          category: "Production Integrity",
          file: relativePath,
          line: lineNumber,
          message: `[${pattern.category}] ${pattern.message} (Line ${lineNumber})`,
          severity: "Error",
          suggestion: "Replace simulated or mock data with authoritative database records or return honest unconfigured status.",
          confidence: "High",
        });
      }
    }
  }

  return violations;
}

export const verifyNoFakeData: DoctorRule = {
  id: "no-fake-data",
  name: "Zero Fake Data Enforcement",
  description: "Scans production paths for fabricated metrics, mock imports, simulated successes, and hardcoded operational data.",
  severity: "Error",
  category: "Production Integrity",
  async execute(context: DoctorContext): Promise<RuleResult> {
    const violations: Violation[] = [];
    const cwd = context.cwd || process.cwd();
    const srcDir = path.join(cwd, "src");

    function walkDir(currentDir: string) {
      if (!fs.existsSync(currentDir)) return;
      const entries = fs.readdirSync(currentDir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(currentDir, entry.name);
        const relativePath = path.relative(cwd, fullPath).replace(/\\/g, "/");

        if (entry.isDirectory()) {
          if (
            entry.name === "node_modules" ||
            entry.name === ".next" ||
            entry.name === "dist" ||
            entry.name === "build" ||
            entry.name === "__tests__"
          ) {
            continue;
          }
          walkDir(fullPath);
        } else if (entry.isFile() && /\.(ts|tsx|js|jsx)$/.test(entry.name)) {
          if (isAllowlisted(relativePath)) {
            continue;
          }

          const fileContent = fs.readFileSync(fullPath, "utf-8");
          const fileViolations = scanSourceForFakeData(fileContent, relativePath);
          violations.push(...fileViolations);
        }
      }
    }

    walkDir(srcDir);

    const passed = violations.length === 0;
    const score = passed ? 100 : Math.max(0, 100 - violations.length * 20);

    return {
      id: "no-fake-data",
      name: "Zero Fake Data Enforcement",
      category: "Production Integrity",
      passed,
      score,
      violations,
      executionTimeMs: 0,
      metadata: {
        totalViolations: violations.length,
        allowlistCount: ZERO_FAKE_DATA_ALLOWLIST.length,
      },
    };
  },
};
