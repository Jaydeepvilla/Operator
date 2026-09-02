import { safeFetch } from "./ssrf";

export interface RobotsRules {
  disallowedPaths: string[];
  allowedPaths: string[];
  crawlDelay?: number;
}

export class RobotsParser {
  private rules: RobotsRules = { disallowedPaths: [], allowedPaths: [] };
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  async load(): Promise<void> {
    try {
      const robotsUrl = new URL("/robots.txt", this.baseUrl).toString();
      const res = await safeFetch(robotsUrl, { timeoutMs: 4000 });
      if (res.ok && res.html) {
        this.parse(res.html);
      }
    } catch {
      // If robots.txt is missing or unreachable, allow all by default
      this.rules = { disallowedPaths: [], allowedPaths: [] };
    }
  }

  parse(content: string): void {
    const lines = content.split("\n").map(l => l.trim());
    let isApplicableAgent = false;

    for (const line of lines) {
      if (line.startsWith("#") || !line) continue;
      const lower = line.toLowerCase();

      if (lower.startsWith("user-agent:")) {
        const agent = lower.replace("user-agent:", "").trim();
        isApplicableAgent = agent === "*" || agent.includes("operator") || agent.includes("bot");
        continue;
      }

      if (!isApplicableAgent) continue;

      if (lower.startsWith("disallow:")) {
        const path = line.substring(line.indexOf(":") + 1).trim();
        if (path) {
          this.rules.disallowedPaths.push(path);
        }
      } else if (lower.startsWith("allow:")) {
        const path = line.substring(line.indexOf(":") + 1).trim();
        if (path) {
          this.rules.allowedPaths.push(path);
        }
      } else if (lower.startsWith("crawl-delay:")) {
        const delayStr = line.substring(line.indexOf(":") + 1).trim();
        const delay = parseFloat(delayStr);
        if (!isNaN(delay)) {
          this.rules.crawlDelay = delay;
        }
      }
    }
  }

  isAllowed(urlPath: string): boolean {
    const cleanPath = urlPath.startsWith("/") ? urlPath : `/${urlPath}`;

    // Specific allows take precedence
    for (const allow of this.rules.allowedPaths) {
      if (this.matchesRule(cleanPath, allow)) {
        return true;
      }
    }

    for (const disallow of this.rules.disallowedPaths) {
      if (this.matchesRule(cleanPath, disallow)) {
        return false;
      }
    }

    return true;
  }

  private matchesRule(path: string, rule: string): boolean {
    if (rule === "/") return true;
    const escapedRule = rule.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*");
    const regex = new RegExp(`^${escapedRule}`);
    return regex.test(path);
  }
}
