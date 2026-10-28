import * as cheerio from "cheerio";
import crypto from "crypto";

export interface ExtractedPageData {
  url: string;
  canonicalUrl?: string;
  title: string;
  siteName?: string;
  description?: string;
  content: string;
  wordCount: number;
  estimatedChunks: number;
  suggestedCategory: string;
  tags: string[];
  contentHash: string;
  links: string[];
  linksWithText?: { url: string; text: string }[];
  jsonLd?: any[];
  contactInfo?: {
    email?: string;
    phone?: string;
    address?: string;
    hours?: string;
    emails?: string[];
    phones?: string[];
    addresses?: string[];
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

    // 2. Comprehensive Contact Information & Meta Extraction
    const pageEmails = new Set<string>();
    const pagePhones = new Set<string>();
    const pageAddresses = new Set<string>();

    // 2a. Decode Cloudflare email protection data-cfemail
    $('[data-cfemail]').each((_, el) => {
      const enc = $(el).attr("data-cfemail");
      if (enc) {
        try {
          const k = parseInt(enc.slice(0, 2), 16);
          let email = "";
          for (let n = 2; n < enc.length; n += 2) {
            email += String.fromCharCode(parseInt(enc.slice(n, n + 2), 16) ^ k);
          }
          if (email && email.includes("@") && !email.includes("example.com")) {
            pageEmails.add(email.trim().toLowerCase());
          }
        } catch {}
      }
    });

    // 2b. Extract telephone links across entire DOM (e.g. <a href="tel:...">)
    $('a[href^="tel:"]').each((_, el) => {
      const href = $(el).attr("href");
      if (href) {
        const cleanPhone = href.replace(/^tel:\s*/i, "").trim();
        const digits = cleanPhone.replace(/\D/g, "");
        if (digits.length >= 7 && digits.length <= 15) {
          pagePhones.add(cleanPhone);
        }
      }
    });

    // 2c. Extract mailto links across entire DOM (e.g. <a href="mailto:...">)
    $('a[href^="mailto:"]').each((_, el) => {
      const href = $(el).attr("href");
      if (href) {
        const cleanEmail = href.replace(/^mailto:\s*/i, "").split("?")[0].trim();
        if (cleanEmail && cleanEmail.includes("@") && !cleanEmail.endsWith(".png") && !cleanEmail.endsWith(".jpg") && !cleanEmail.endsWith(".svg") && !cleanEmail.includes("example.com") && !cleanEmail.includes("wix.com")) {
          pageEmails.add(cleanEmail);
        }
      }
    });

    // 2d. Schema/Microdata attributes
    $('[itemprop="telephone"]').each((_, el) => {
      const p = $(el).text().trim();
      const digits = p.replace(/\D/g, "");
      if (digits.length >= 7 && digits.length <= 15) pagePhones.add(p);
    });

    $('[itemprop="email"]').each((_, el) => {
      const e = $(el).text().trim();
      if (e && e.includes("@") && !e.includes("example.com")) pageEmails.add(e);
    });

    $('[itemprop="address"], address, .address, #address, [class*="address"], [class*="location"], [id*="location"], .footer-address, .contact-address').each((_, el) => {
      const a = $(el).text().replace(/\s+/g, " ").trim();
      if (a && a.length > 5 && a.length < 250 && /\d/.test(a)) pageAddresses.add(a);
    });

    // 2e. Hours Extraction
    let itemHours = $('[itemprop="openingHours"]').first().text().replace(/\s+/g, " ").trim();
    if (!itemHours) {
      const hoursEl = $('.hours, #hours, [class*="hours"], [id*="hours"], .opening-hours, .business-hours').first().text().replace(/\s+/g, " ").trim();
      if (hoursEl && hoursEl.length < 150) {
        itemHours = hoursEl;
      }
    }
    if (!itemHours) {
      const bodyText = $("body").text();
      const hoursMatch = bodyText.match(/(?:Office|Business|Opening|Clinical|Operating)?\s*Hours[:\s]*([A-Za-z0-9–—\-:., ]+(?:AM|PM|am|pm|\d{1,2}:\d{2})[^\n\r]*)/i);
      if (hoursMatch) {
        itemHours = hoursMatch[1].replace(/\s+/g, " ").trim();
      }
    }

    // 2f. Capture header, footer, and contact container text BEFORE removal
    const headerFooterText = $("header, footer, nav, .header, .footer, #footer, #header, address, [class*='contact'], [id*='contact'], [class*='topbar'], [id*='topbar']")
      .text()
      .replace(/\s+/g, " ")
      .trim();

    // 2f. Regex scanning over header/footer and full page text
    const emailRegex = /([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+)/gi;
    const phoneRegex = /(?:\+?\d{1,3}[-.\s]?)?\(?\d{2,4}\)?[-.\s]?\d{3,4}[-.\s]?\d{3,5}/g;

    const textToScan = `${headerFooterText} ${$("body").text()}`;
    const foundEmails = textToScan.match(emailRegex) || [];
    const foundPhones = textToScan.match(phoneRegex) || [];

    // Scan explicitly labeled phones (e.g. Phone: +1 555-0199)
    const labeledPhoneRegex = /(?:phone|tel|telephone|call|mobile|cell|contact|toll[- ]?free|office|support|helpline)[:\s]*([+0-9()\s.-]{7,25})/gi;
    let pMatch: RegExpExecArray | null;
    while ((pMatch = labeledPhoneRegex.exec(textToScan)) !== null) {
      const p = pMatch[1].trim();
      const digits = p.replace(/\D/g, "");
      if (digits.length >= 7 && digits.length <= 15 && !/^\d{4}-\d{2}-\d{2}$/.test(p)) {
        pagePhones.add(p);
      }
    }

    for (const e of foundEmails) {
      const clean = e.trim().toLowerCase();
      if (
        !clean.endsWith(".png") &&
        !clean.endsWith(".jpg") &&
        !clean.endsWith(".svg") &&
        !clean.endsWith(".webp") &&
        !clean.includes("example.com") &&
        !clean.includes("wix.com") &&
        !clean.includes("wordpress.com") &&
        !clean.includes("sentry.io")
      ) {
        pageEmails.add(e.trim());
      }
    }

    for (const p of foundPhones) {
      const clean = p.trim();
      const digits = clean.replace(/\D/g, "");
      // Valid phone numbers have between 7 and 15 digits, and are not standard dates (e.g. 2026-10-28)
      if (digits.length >= 7 && digits.length <= 15 && !/^\d{4}-\d{2}-\d{2}$/.test(clean)) {
        pagePhones.add(clean);
      }
    }

    const addressRegex = /\b\d{1,5}\s+[\w\s.,#-]+(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Drive|Dr|Way|Lane|Ln|Suite|Ste|Floor|Fl)\b[^\n\r<]{0,60},\s*[A-Z]{2}\s+\d{5}(?:-\d{4})?/gi;
    const foundAddresses = textToScan.match(addressRegex) || [];
    for (const a of foundAddresses) {
      const clean = a.trim();
      if (clean.length > 10 && clean.length < 200) {
        pageAddresses.add(clean);
      }
    }

    // 2g. Extract Internal Links and Anchor Text
    const links: string[] = [];
    const linksWithText: { url: string; text: string }[] = [];
    $("a[href]").each((_, el) => {
      const href = $(el).attr("href");
      const linkText = $(el).text().replace(/\s+/g, " ").trim();
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
            if (linkText) {
              linksWithText.push({ url: resolved, text: linkText });
            }
          } catch {
            // Invalid relative URL, skip
          }
        }
      }
    });

    // 3. Extract Metadata & OpenGraph Site Name
    const siteName =
      $('meta[property="og:site_name"]').attr("content")?.trim() ||
      $('meta[name="application-name"]').attr("content")?.trim() ||
      undefined;

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

    // 4. Remove boilerplate and noise tags
    $(
      "script, style, noscript, iframe, svg, canvas, nav, header, footer, aside, form, " +
      ".nav, .navbar, .menu, .footer, .header, .sidebar, .cookie-banner, #cookie-consent, " +
      ".ad, .advertisement, .modal, .popup, [aria-hidden='true']"
    ).remove();

    const extractedEmail = Array.from(pageEmails)[0] || "";
    const extractedPhone = Array.from(pagePhones)[0] || "";
    const extractedAddress = Array.from(pageAddresses)[0] || "";

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

    // 3b. Append explicit contact details section to markdown content if available
    const contactLines: string[] = [];
    if (pageEmails.size > 0) contactLines.push(`Email: ${Array.from(pageEmails).join(", ")}`);
    if (pagePhones.size > 0) contactLines.push(`Phone: ${Array.from(pagePhones).join(", ")}`);
    if (pageAddresses.size > 0) contactLines.push(`Address: ${Array.from(pageAddresses).join(" | ")}`);
    if (itemHours) contactLines.push(`Hours: ${itemHours}`);

    if (contactLines.length > 0 && !cleanText.includes("Contact & Operating Information")) {
      cleanText += `\n\n## Contact & Operating Information\n${contactLines.join("\n")}\n`;
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
      siteName,
      description,
      content: cleanText,
      wordCount: words,
      estimatedChunks,
      suggestedCategory: category,
      tags,
      contentHash,
      links: Array.from(new Set(links)),
      linksWithText,
      jsonLd,
      contactInfo: {
        email: extractedEmail || undefined,
        phone: extractedPhone || undefined,
        address: extractedAddress || undefined,
        hours: itemHours || undefined,
        emails: Array.from(pageEmails),
        phones: Array.from(pagePhones),
        addresses: Array.from(pageAddresses),
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
