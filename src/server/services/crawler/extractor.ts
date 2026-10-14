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
  jsonLd?: any[];
  contactInfo?: {
    email?: string;
    phone?: string;
    address?: string;
    hours?: string;
  };
}

export class ContentExtractor {
  /**
   * Extracts clean structured Markdown content, metadata, JSON-LD, and internal links from raw HTML.
   */
  static extract(html: string, pageUrl: string): ExtractedPageData {
    const $ = cheerio.load(html);

    // 1. Extract JSON-LD structured data BEFORE stripping <script>
    const jsonLd: any[] = [];
    $('script[type="application/ld+json"]').each((_, el) => {
      try {
        const raw = $(el).html();
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            jsonLd.push(...parsed);
          } else if (parsed && typeof parsed === "object") {
            if (Array.isArray(parsed["@graph"])) {
              jsonLd.push(...parsed["@graph"]);
            } else {
              jsonLd.push(parsed);
            }
          }
        }
      } catch {
        // Ignore malformed JSON-LD blocks
      }
    });

    // 2. Extract telephone, email, and address from explicit markup & attributes
    let extractedPhone = "";
    const telLink = $('a[href^="tel:"]').first().attr("href");
    if (telLink) {
      extractedPhone = telLink.replace(/^tel:\s*/i, "").trim();
    } else {
      const itemPhone = $('[itemprop="telephone"]').first().text().trim();
      if (itemPhone) extractedPhone = itemPhone;
    }

    let extractedEmail = "";
    const mailtoLink = $('a[href^="mailto:"]').first().attr("href");
    if (mailtoLink) {
      extractedEmail = mailtoLink.replace(/^mailto:\s*/i, "").split("?")[0].trim();
    } else {
      const itemEmail = $('[itemprop="email"]').first().text().trim();
      if (itemEmail) extractedEmail = itemEmail;
    }

    let extractedAddress = "";
    const itemAddress = $('[itemprop="address"]').first().text().replace(/\s+/g, " ").trim();
    if (itemAddress) {
      extractedAddress = itemAddress;
    } else {
      const addressTag = $("address").first().text().replace(/\s+/g, " ").trim();
      if (addressTag) extractedAddress = addressTag;
    }

    let itemHours = $('[itemprop="openingHours"]').first().text().replace(/\s+/g, " ").trim();
    if (!itemHours) {
      const hoursEl = $('.hours, #hours, [class*="hours"], [id*="hours"]').first().text().replace(/\s+/g, " ").trim();
      if (hoursEl && hoursEl.length < 150) {
        itemHours = hoursEl;
      }
    }
    if (!itemHours) {
      // Check for textual patterns like "Clinical Hours: Mon-Fri 08:00-17:00 CST" or "Office Hours: Mon-Fri 9:00 AM - 6:00 PM EST"
      const bodyText = $("body").text();
      const hoursMatch = bodyText.match(/(?:Office|Business|Opening|Clinical|Operating)?\s*Hours:\s*([A-Za-z0-9–—\-:., ]+(?:AM|PM|am|pm|\d{2}:\d{2})[^\n\r]*)/i);
      if (hoursMatch) {
        itemHours = hoursMatch[1].replace(/\s+/g, " ").trim();
      }
    }
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

    // 3. Extract Metadata
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

    // 4. Capture header/footer text before removal for contact/hours context
    const headerFooterText = $("header, footer, nav, .header, .footer, #footer, #header")
      .text()
      .replace(/\s+/g, " ")
      .trim();

    // 5. Remove boilerplate and noise tags
    $(
      "script, style, noscript, iframe, svg, canvas, nav, header, footer, aside, form, " +
      ".nav, .navbar, .menu, .footer, .header, .sidebar, .cookie-banner, #cookie-consent, " +
      ".ad, .advertisement, .modal, .popup, [aria-hidden='true']"
    ).remove();

    // 6. Structured Content Conversion to Markdown
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

    container.find("h1, h2, h3, h4, h5, h6, p, ul, ol, table, blockquote, span, div").each((_, el) => {
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
        case "span":
        case "div": {
          if (element.parents("p, li, blockquote, table, h1, h2, h3, h4, h5, h6").length === 0) {
            const text = element.text().trim().replace(/\s+/g, " ");
            if (text && (/\$\d+/.test(text) || /\b\d+\s*(?:min|mins|minutes|hour|hr)\b/i.test(text))) {
              markdownLines.push(`${text}\n`);
            }
          }
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
      jsonLd,
      contactInfo: {
        email: extractedEmail || undefined,
        phone: extractedPhone || undefined,
        address: extractedAddress || undefined,
        hours: itemHours || undefined,
      },
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
