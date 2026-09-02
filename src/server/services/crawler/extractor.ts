import * as cheerio from "cheerio";
import crypto from "crypto";

export interface ExtractedPageData {
  url: string;
  canonicalUrl?: string;
  title: string;
  description?: string;
  content: string;
  wordCount: number;
  estimatedChunks: number;
  suggestedCategory: string;
  tags: string[];
  contentHash: string;
  links: string[];
}

export class ContentExtractor {
  /**
   * Extracts clean structured Markdown content, metadata, and internal links from raw HTML.
   */
  static extract(html: string, pageUrl: string): ExtractedPageData {
    const $ = cheerio.load(html);

    // Extract all links before stripping elements
    const links: string[] = [];
    $("a[href]").each((_, el) => {
      const href = $(el).attr("href");
      if (href) {
        const cleanHref = href.trim();
        // Ignore mailto, tel, javascript, anchors
        if (
          !cleanHref.startsWith("mailto:") &&
          !cleanHref.startsWith("tel:") &&
          !cleanHref.startsWith("javascript:") &&
          !cleanHref.startsWith("#")
        ) {
          try {
            const resolved = new URL(cleanHref, pageUrl).toString();
            links.push(resolved);
          } catch {
            // Invalid relative URL, skip
          }
        }
      }
    });

    // 1. Extract Metadata
    const pageTitle =
      $('meta[property="og:title"]').attr("content") ||
      $("title").text().trim() ||
      $("h1").first().text().trim() ||
      "Untitled Page";

    const description =
      $('meta[name="description"]').attr("content") ||
      $('meta[property="og:description"]').attr("content") ||
      "";

    const canonicalUrl =
      $('link[rel="canonical"]').attr("href") || pageUrl;

    // 2. Remove boilerplate and noise tags
    $(
      "script, style, noscript, iframe, svg, canvas, nav, header, footer, aside, form, " +
      ".nav, .navbar, .menu, .footer, .header, .sidebar, .cookie-banner, #cookie-consent, " +
      ".ad, .advertisement, .modal, .popup, [aria-hidden='true']"
    ).remove();

    // 3. Structured Content Conversion to Markdown
    const markdownLines: string[] = [];

    // Title & Description
    if (pageTitle && pageTitle !== "Untitled Page") {
      markdownLines.push(`# ${pageTitle}\n`);
    }
    if (description) {
      markdownLines.push(`> ${description}\n`);
    }

    // Process main content containers (or body if no main)
    const container = $("main").length > 0 ? $("main") : $("body");

    container.find("h1, h2, h3, h4, h5, h6, p, ul, ol, table, blockquote").each((_, el) => {
      const tagName = el.tagName.toLowerCase();
      const element = $(el);

      // Skip elements that are nested inside another already processed block (e.g. p inside blockquote)
      if (element.parents("blockquote, table").length > 0 && tagName !== "blockquote") {
        return;
      }

      switch (tagName) {
        case "h1": {
          const text = element.text().trim();
          if (text && text !== pageTitle) markdownLines.push(`\n# ${text}\n`);
          break;
        }
        case "h2": {
          const text = element.text().trim();
          if (text) markdownLines.push(`\n## ${text}\n`);
          break;
        }
        case "h3": {
          const text = element.text().trim();
          if (text) markdownLines.push(`\n### ${text}\n`);
          break;
        }
        case "h4":
        case "h5":
        case "h6": {
          const text = element.text().trim();
          if (text) markdownLines.push(`\n#### ${text}\n`);
          break;
        }
        case "p": {
          const text = element.text().trim().replace(/\s+/g, " ");
          if (text.length > 5) markdownLines.push(`${text}\n`);
          break;
        }
        case "ul":
        case "ol": {
          element.find("> li").each((_, li) => {
            const liText = $(li).text().trim().replace(/\s+/g, " ");
            if (liText) markdownLines.push(`- ${liText}`);
          });
          markdownLines.push("");
          break;
        }
        case "table": {
          const rows: string[][] = [];
          element.find("tr").each((_, tr) => {
            const cols: string[] = [];
            $(tr).find("th, td").each((_, td) => {
              cols.push($(td).text().trim().replace(/\s+/g, " "));
            });
            if (cols.length > 0) rows.push(cols);
          });
          if (rows.length > 0) {
            rows.forEach((r, idx) => {
              markdownLines.push(`| ${r.join(" | ")} |`);
              if (idx === 0) {
                markdownLines.push(`| ${r.map(() => "---").join(" | ")} |`);
              }
            });
            markdownLines.push("");
          }
          break;
        }
        case "blockquote": {
          const text = element.text().trim().replace(/\s+/g, " ");
          if (text) markdownLines.push(`> ${text}\n`);
          break;
        }
      }
    });

    // Fallback if main blocks yielded very little text
    let cleanText = markdownLines.join("\n").replace(/\n{3,}/g, "\n\n").trim();
    if (cleanText.length < 50) {
      cleanText = container.text().replace(/\s+/g, " ").trim();
      if (pageTitle && pageTitle !== "Untitled Page") {
        cleanText = `# ${pageTitle}\n\n${cleanText}`;
      }
    }

    // 4. Word and Token Metrics
    const words = cleanText ? cleanText.split(/\s+/).filter(Boolean).length : 0;
    const estimatedChunks = Math.max(1, Math.ceil(words / 150));
    const contentHash = crypto.createHash("sha256").update(cleanText).digest("hex");

    // 5. Intelligent Category & Tag Suggestion
    const { category, tags } = this.categorizeContent(pageTitle, cleanText, pageUrl);

    return {
      url: pageUrl,
      canonicalUrl,
      title: pageTitle,
      description,
      content: cleanText,
      wordCount: words,
      estimatedChunks,
      suggestedCategory: category,
      tags,
      contentHash,
      links: Array.from(new Set(links)),
    };
  }

  /**
   * Identifies the best business category and tags based on semantic content cues.
   */
  private static categorizeContent(
    title: string,
    content: string,
    url: string
  ): { category: string; tags: string[] } {
    const combined = `${title} ${url} ${content}`.toLowerCase();
    const tags: string[] = ["website", "ingested"];

    if (
      combined.includes("service") ||
      combined.includes("pricing") ||
      combined.includes("menu") ||
      combined.includes("treatment") ||
      combined.includes("haircut") ||
      combined.includes("coloring")
    ) {
      tags.push("services", "pricing");
      return { category: "Services & Pricing", tags };
    }

    if (
      combined.includes("policy") ||
      combined.includes("cancellation") ||
      combined.includes("refund") ||
      combined.includes("reschedule") ||
      combined.includes("terms") ||
      combined.includes("deposit")
    ) {
      tags.push("policies", "cancellation");
      return { category: "Booking Policies", tags };
    }

    if (
      combined.includes("team") ||
      combined.includes("staff") ||
      combined.includes("stylist") ||
      combined.includes("doctor") ||
      combined.includes("bio") ||
      combined.includes("about-us") ||
      combined.includes("about")
    ) {
      tags.push("team", "staff");
      return { category: "Staff & Team", tags };
    }

    if (
      combined.includes("contact") ||
      combined.includes("hour") ||
      combined.includes("location") ||
      combined.includes("direction") ||
      combined.includes("parking") ||
      combined.includes("address")
    ) {
      tags.push("hours", "contact");
      return { category: "Business Information & Hours", tags };
    }

    if (
      combined.includes("faq") ||
      combined.includes("question") ||
      combined.includes("help") ||
      combined.includes("frequently asked")
    ) {
      tags.push("faq", "help");
      return { category: "FAQs", tags };
    }

    if (
      combined.includes("product") ||
      combined.includes("shop") ||
      combined.includes("retail") ||
      combined.includes("store")
    ) {
      tags.push("products", "retail");
      return { category: "Products & Retail", tags };
    }

    return { category: "General Information", tags };
  }
}
