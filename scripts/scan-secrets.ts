import { execSync } from "child_process";
import fs from "fs";

// High-confidence regex patterns for secrets and sensitive tokens
const SECRET_PATTERNS: { name: string; regex: RegExp }[] = [
  { name: "Private Key Header", regex: /-----BEGIN (RSA|EC|DSA|OPENSSH|PGP|PRIVATE) KEY/ },
  { name: "Anthropic / Claude API Key", regex: /sk-ant-api03-[A-Za-z0-9_-]{80,}/ },
  { name: "OpenAI API Key", regex: /sk-[A-Za-z0-9]{20,T3BlbkFJ[A-Za-z0-9]{20,}/ },
  { name: "Google AI / Gemini API Key", regex: /AIzaSy[A-Za-z0-9\\-_]{33}/ },
  { name: "Twilio Account SID", regex: /AC[a-f0-9]{32}/i },
  { name: "Twilio Auth Token Assignment", regex: /(?:TWILIO_AUTH_TOKEN|twilio_token)\s*=\s*['"][a-f0-9]{32}['"]/i },
  { name: "Stripe Secret / Restricted Key", regex: /(?:sk|rk)_(?:live|test)_[0-9a-zA-Z]{24,}/ },
  { name: "Razorpay Secret Key Assignment", regex: /(?:RAZORPAY_KEY_SECRET|razorpay_secret)\s*=\s*['"][A-Za-z0-9]{20,}['"]/i },
  { name: "Database Connection URI with Password", regex: /(?:postgres|postgresql|mysql):\/\/[^:\s]+:[^@\s]+@[^:\s]+(?::\d+)?\/[^\s]+/i },
  { name: "Hardcoded JSON Web Token", regex: /eyJ[A-Za-z0-9-_]{10,}\.eyJ[A-Za-z0-9-_]{10,}\.[A-Za-z0-9-_]{10,}/ },
  { name: "AWS Access Key ID", regex: /(?:A3T[A-Z0-9]|AKIA|AGPA|AIDA|AROA|AIPA|ANPA|ANVA|ASIA)[A-Z0-9]{16}/ },
  { name: "Generic Password Assignment", regex: /(?:password|client_secret|api_secret)\s*[:=]\s*['"][^\s'"]{8,}['"]/i }
];

// Files / paths that are allowed or mock examples
const IGNORED_PATHS = [
  /^\.env\.example$/,
  /^package-lock\.json$/,
  /^pnpm-lock\.yaml$/,
  /^yarn\.lock$/,
  /\.test\.(ts|js|tsx|jsx)$/,
  /\.spec\.(ts|js|tsx|jsx)$/,
  /^tests\//,
  /^scripts\/scan-secrets\.ts$/
];

function checkWithGitleaks(): boolean {
  try {
    execSync("gitleaks version", { stdio: "ignore" });
    console.log("[Secret-Shield] Detected standalone 'gitleaks' CLI binary. Running gitleaks protect...");
    try {
      execSync("gitleaks protect --staged --verbose --redact", { stdio: "inherit" });
      return true;
    } catch {
      return false;
    }
  } catch {
    return false; // gitleaks binary not found on system PATH
  }
}

function runInternalSecretScan(): boolean {
  console.log("[Secret-Shield] Scanning staged files for sensitive keys, passwords, and tokens...");

  let stagedFiles: string[] = [];
  try {
    const output = execSync("git diff --cached --name-only --diff-filter=ACM", { encoding: "utf8" });
    stagedFiles = output.split("\n").map(f => f.trim()).filter(Boolean);
  } catch {
    return true; // Not in a git repo or no staged files
  }

  let violationsFound = 0;

  for (const filePath of stagedFiles) {
    if (IGNORED_PATHS.some(rx => rx.test(filePath))) {
      continue;
    }

    if (!fs.existsSync(filePath)) {
      continue;
    }

    const stat = fs.statSync(filePath);
    if (stat.size > 2 * 1024 * 1024) {
      // Skip large binary / generated files over 2MB
      continue;
    }

    let content = "";
    try {
      content = fs.readFileSync(filePath, "utf8");
    } catch {
      continue; // Binary file or unreadable
    }

    const lines = content.split("\n");
    for (let lineNum = 0; lineNum < lines.length; lineNum++) {
      const line = lines[lineNum];
      // Skip commented-out demo lines or test fixtures
      if (line.trim().startsWith("//") || line.trim().startsWith("#")) {
        if (/dummy|example|mock|fake|placeholder|YOUR_/i.test(line)) {
          continue;
        }
      }

      for (const pattern of SECRET_PATTERNS) {
        if (pattern.regex.test(line)) {
          // Exclude obvious placeholder values
          if (/dummy|example|mock|fake|placeholder|<.*>|process\.env/i.test(line)) {
            continue;
          }

          console.error(`\x1b[31m[SECURITY ALERT]\x1b[0m Potential secret detected: ${pattern.name}`);
          console.error(`  File: ${filePath}:${lineNum + 1}`);
          console.error(`  Snippet: ${line.trim().slice(0, 70)}...`);
          violationsFound++;
        }
      }
    }
  }

  if (violationsFound > 0) {
    console.error(`\n\x1b[31m[COMMIT BLOCKED]\x1b[0m ${violationsFound} sensitive credential(s) detected in staged files.`);
    console.error("Please remove secrets from source code and store them safely in environment variables.\n");
    return false;
  }

  console.log("\x1b[32m[Secret-Shield]\x1b[0m No secrets or sensitive tokens detected. Staged files are clean.");
  return true;
}

function main() {
  // If native gitleaks is installed on machine, use it. Otherwise, use our resilient multi-pattern engine.
  const hasGitleaks = checkWithGitleaks();
  if (hasGitleaks) {
    process.exit(0);
  }

  const passed = runInternalSecretScan();
  if (!passed) {
    process.exit(1);
  }
}

main();
