import { safeFetch, validateSafeUrl } from "./ssrf";
import { RobotsParser } from "./robots";
import { ContentExtractor, ExtractedPageData } from "./extractor";

export interface CrawlConfig {
  maxDepth?: number | string;
  maxPages?: number;
  includeSubdomains?: boolean;
  followExternalLinks?: boolean;
  ignoreQueryParams?: boolean;
  includePaths?: string[];
  excludePaths?: string[];
  requestTimeoutMs?: number;
  maxResponseSizeBytes?: number;
  concurrency?: number;
}

export interface DiscoveredPageItem {
  title: string;
  url: string;
  path: string;
  wordCount: number;
  estimatedChunks: number;
  suggestedCategory: string;
  tags: string[];
  status: "pending" | "excluded" | "failed" | "crawled";
  error?: string;
  content?: string;
  contentHash?: string;
}

export interface CrawlResult {
  sourceUrl: string;
  baseUrl: string;
  pagesDiscovered: number;
  pagesCrawled: number;
  pagesSucceeded: number;
  pagesFailed: number;
  durationMs: number;
  pages: DiscoveredPageItem[];
  errors: { url: string; error: string }[];
}

export class WebsiteCrawler {
  /**
   * Normalizes a URL for deduplication and crawling safety.
   */
  static normalizeUrl(rawUrl: string, ignoreQueryParams = false): string {
    try {
      const u = new URL(rawUrl);
      u.hash = ""; // Remove fragment (#section)

      if (ignoreQueryParams) {
        u.search = "";
      } else {
        // Strip tracking parameters
        const trackingParams = ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "fbclid", "gclid", "ref"];
        trackingParams.forEach(p => u.searchParams.delete(p));
      }

      // Normalize trailing slash on path (except root /)
      if (u.pathname.length > 1 && u.pathname.endsWith("/")) {
        u.pathname = u.pathname.slice(0, -1);
      }

      return u.toString();
    } catch {
      return rawUrl;
    }
  }

  /**
   * Discovers and crawls pages from a target URL according to safety & depth limits.
   */
  static async crawl(rootUrl: string, rawConfig: CrawlConfig = {}): Promise<CrawlResult> {
    const startTime = Date.now();

    // 1. SSRF and Protocol Validation
    const validation = await validateSafeUrl(rootUrl);
    if (!validation.valid || !validation.parsedUrl) {
      throw new Error(`Target URL rejected: ${validation.error}`);
    }

    const parsedRoot = validation.parsedUrl;
    const baseOrigin = parsedRoot.origin;
    const rootHostname = parsedRoot.hostname.toLowerCase();

    // Parse options with safe caps
    let maxDepth = 2;
    if (rawConfig.maxDepth === "homepage" || rawConfig.maxDepth === "0" || rawConfig.maxDepth === 0) {
      maxDepth = 0;
    } else if (rawConfig.maxDepth === "linked" || rawConfig.maxDepth === "1" || rawConfig.maxDepth === 1) {
      maxDepth = 1;
    } else if (rawConfig.maxDepth === "entire" || rawConfig.maxDepth === "3" || rawConfig.maxDepth === 3) {
      maxDepth = 3;
    } else if (typeof rawConfig.maxDepth === "number") {
      maxDepth = Math.max(0, Math.min(rawConfig.maxDepth, 4));
    } else if (typeof rawConfig.maxDepth === "string") {
      maxDepth = Math.max(0, Math.min(parseInt(rawConfig.maxDepth, 10) || 2, 4));
    }
    const maxPages = Math.min(Math.max(1, rawConfig.maxPages ?? 15), 50); // Safe production cap [1, 50]
    const includeSubdomains = !!rawConfig.includeSubdomains;
    const ignoreQueryParams = !!rawConfig.ignoreQueryParams;
    const includePaths = (rawConfig.includePaths || []).filter(Boolean);
    const excludePaths = (rawConfig.excludePaths || []).filter(Boolean);
    const timeoutMs = rawConfig.requestTimeoutMs ?? 10000;
    const maxResponseSizeBytes = rawConfig.maxResponseSizeBytes ?? 4 * 1024 * 1024; // 4MB

    // 2. Load Robots.txt
    const robots = new RobotsParser(baseOrigin);
    await robots.load();

    // Queues and Trackers
    const queue: { url: string; depth: number }[] = [{ url: this.normalizeUrl(parsedRoot.toString(), ignoreQueryParams), depth: 0 }];
    const seenUrls = new Set<string>([queue[0].url]);
    const discoveredPages: DiscoveredPageItem[] = [];
    const crawlErrors: { url: string; error: string }[] = [];

    let pagesCrawled = 0;
    let pagesSucceeded = 0;
    let pagesFailed = 0;

    // Helper to test if a URL is within allowed domain boundary
    const isAllowedDomain = (targetUrlStr: string): boolean => {
      try {
        const u = new URL(targetUrlStr);
        const host = u.hostname.toLowerCase();

        if (host === rootHostname) return true;
        if (includeSubdomains && host.endsWith(`.${rootHostname}`)) return true;
        return false;
      } catch {
        return false;
      }
    };

    // Helper to test include / exclude path filters
    const matchesPathFilters = (pathname: string): { allowed: boolean; reason?: string } => {
      for (const ex of excludePaths) {
        if (pathname === ex || pathname.startsWith(ex.endsWith("/") ? ex : `${ex}/`)) {
          return { allowed: false, reason: `Matches exclude path '${ex}'` };
        }
      }

      if (includePaths.length > 0) {
        const matched = includePaths.some(inc => pathname === inc || pathname.startsWith(inc.endsWith("/") ? inc : `${inc}/`));
        if (!matched) {
          return { allowed: false, reason: "Does not match include path filters" };
        }
      }

      return { allowed: true };
    };

    // BFS Crawl Loop
    while (queue.length > 0 && discoveredPages.filter(p => p.status !== "failed").length < maxPages) {
      const current = queue.shift();
      if (!current) break;

      const { url: currentUrl, depth } = current;
      const parsedCurrent = new URL(currentUrl);
      const pathname = parsedCurrent.pathname || "/";

      // Robots check
      if (!robots.isAllowed(pathname)) {
        discoveredPages.push({
          title: `Blocked (${pathname})`,
          url: currentUrl,
          path: pathname,
          wordCount: 0,
          estimatedChunks: 0,
          suggestedCategory: "General Information",
          tags: ["website"],
          status: "excluded",
          error: "Blocked by robots.txt",
        });
        continue;
      }

      // Path filters check
      const filterCheck = matchesPathFilters(pathname);
      if (!filterCheck.allowed) {
        discoveredPages.push({
          title: pathname,
          url: currentUrl,
          path: pathname,
          wordCount: 0,
          estimatedChunks: 0,
          suggestedCategory: "General Information",
          tags: ["website"],
          status: "excluded",
          error: filterCheck.reason,
        });
        continue;
      }

      // Fetch page
      pagesCrawled++;
      let pageData: ExtractedPageData | null = null;

      try {
        const fetchRes = await safeFetch(currentUrl, {
          timeoutMs,
          maxSizeBytes: maxResponseSizeBytes,
        });

        if (!fetchRes.ok) {
          throw new Error(`HTTP ${fetchRes.status} on ${currentUrl}`);
        }

        // Validate content-type is HTML
        if (!fetchRes.contentType.toLowerCase().includes("text/html") && !fetchRes.contentType.toLowerCase().includes("application/xhtml")) {
          throw new Error(`Non-HTML content type (${fetchRes.contentType})`);
        }

        pageData = ContentExtractor.extract(fetchRes.html, currentUrl);
        pagesSucceeded++;

        discoveredPages.push({
          title: pageData.title,
          url: currentUrl,
          path: pathname,
          wordCount: pageData.wordCount,
          estimatedChunks: pageData.estimatedChunks,
          suggestedCategory: pageData.suggestedCategory,
          tags: pageData.tags,
          status: "pending",
          content: pageData.content,
          contentHash: pageData.contentHash,
        });

        // If depth limit not reached, discover child links
        if (depth < maxDepth) {
          for (const link of pageData.links) {
            const normalizedLink = this.normalizeUrl(link, ignoreQueryParams);
            if (!seenUrls.has(normalizedLink) && isAllowedDomain(normalizedLink)) {
              seenUrls.add(normalizedLink);
              queue.push({ url: normalizedLink, depth: depth + 1 });
            }
          }
        }
      } catch (err: any) {
        pagesFailed++;
        const errorMsg = err?.message || "Failed to fetch page";
        crawlErrors.push({ url: currentUrl, error: errorMsg });

        discoveredPages.push({
          title: `Error (${pathname})`,
          url: currentUrl,
          path: pathname,
          wordCount: 0,
          estimatedChunks: 0,
          suggestedCategory: "General Information",
          tags: ["website"],
          status: "failed",
          error: errorMsg,
        });
      }

      // Polite throttling delay between requests (100ms)
      if (queue.length > 0) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    const durationMs = Date.now() - startTime;

    return {
      sourceUrl: rootUrl,
      baseUrl: baseOrigin,
      pagesDiscovered: seenUrls.size,
      pagesCrawled,
      pagesSucceeded,
      pagesFailed,
      durationMs,
      pages: discoveredPages,
      errors: crawlErrors,
    };
  }
}
