/**
 * Production Knowledge Base Crawler & Ingestion Test Suite
 */

import { validateSafeUrl } from "../src/server/services/crawler/ssrf";
import { RobotsParser } from "../src/server/services/crawler/robots";
import { ContentExtractor } from "../src/server/services/crawler/extractor";
import { WebsiteCrawler } from "../src/server/services/crawler/crawler";
import { WebsiteIngestionPipeline } from "../src/server/services/crawler/ingestion";
import { db } from "../src/server/db";
import { organizations, knowledgeDocuments, knowledgeChunks, websiteImports, knowledgeSources } from "../src/server/db/schema";
import { eq, and } from "drizzle-orm";

async function runCrawlerTests() {
  console.log("\n=======================================================");
  console.log("🕷️  OPERATOR PRODUCTION CRAWLER & INGESTION TEST SUITE");
  console.log("=======================================================\n");

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`  ✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${testName} ${detail ? `(${detail})` : ""}`);
      failed++;
    }
  }

  // -------------------------------------------------------------
  // Test Group 1: SSRF & URL Validation
  // -------------------------------------------------------------
  console.log("--- Group 1: SSRF & Dangerous Protocol Protections ---");

  const ssrfRejections = [
    { url: "http://localhost:3000", desc: "Localhost" },
    { url: "http://127.0.0.1:8080", desc: "IPv4 Loopback" },
    { url: "http://169.254.169.254/latest/meta-data", desc: "AWS/Cloud Metadata" },
    { url: "http://10.0.1.5", desc: "Private Class A Subnet" },
    { url: "http://192.168.1.100", desc: "Private Class C Subnet" },
    { url: "javascript:alert(1)", desc: "Javascript scheme" },
    { url: "file:///etc/passwd", desc: "File protocol" },
    { url: "data:text/html,<h1>test</h1>", desc: "Data URI" },
  ];

  for (const item of ssrfRejections) {
    const res = await validateSafeUrl(item.url);
    assert(!res.valid, `Rejects ${item.desc} (${item.url})`);
  }

  const validUrl = await validateSafeUrl("https://example.com");
  assert(validUrl.valid, "Accepts valid public HTTPS URL (https://example.com)");

  // -------------------------------------------------------------
  // Test Group 2: Robots.txt Parsing & Rule Enforcement
  // -------------------------------------------------------------
  console.log("\n--- Group 2: Robots.txt Rules Engine ---");

  const robots = new RobotsParser("https://example.com");
  robots.parse(`
User-agent: *
Disallow: /admin
Disallow: /private/
Disallow: /api/*
Allow: /api/public
  `);

  assert(!robots.isAllowed("/admin"), "Disallows /admin path");
  assert(!robots.isAllowed("/private/secret.html"), "Disallows /private/ child path");
  assert(!robots.isAllowed("/api/internal"), "Disallows /api/ wildcard path");
  assert(robots.isAllowed("/api/public"), "Allows /api/public explicitly override");
  assert(robots.isAllowed("/services"), "Allows /services unlisted path");

  // -------------------------------------------------------------
  // Test Group 3: Real Content Extraction & Markdown Conversion
  // -------------------------------------------------------------
  console.log("\n--- Group 3: HTML Content Extraction & Noise Stripping ---");

  const sampleHtml = `
<!DOCTYPE html>
<html>
<head>
  <title>Elena Hair Salon & Spa | Premium Services</title>
  <meta name="description" content="Luxury salon offering master haircuts, balayage, and organic treatments in Manhattan.">
</head>
<body>
  <header class="header">
    <nav class="navbar"><a href="/">Home</a><a href="/services">Services</a></nav>
  </header>
  <div class="cookie-banner">Please accept cookies to proceed.</div>
  
  <main>
    <h1>Welcome to Elena Hair Salon</h1>
    <p>We provide award-winning haircutting and coloring services since 2012.</p>
    
    <h2>Our Service Menu & Pricing</h2>
    <table>
      <tr><th>Service</th><th>Duration</th><th>Price</th></tr>
      <tr><td>Master Haircut</td><td>60 min</td><td>$120</td></tr>
      <tr><td>Balayage Highlights</td><td>150 min</td><td>$300</td></tr>
    </table>

    <h3>Booking & Cancellation Policy</h3>
    <p>Please cancel appointments at least 24 hours in advance to avoid a 50% cancellation fee.</p>

    <ul>
      <li>Complimentary tea and espresso</li>
      <li>Free garage parking validation</li>
    </ul>

    <a href="/services/haircut">View Haircut Details</a>
    <a href="/about-us">About Our Stylists</a>
    <a href="https://instagram.com/elenasalon">External Instagram</a>
  </main>

  <footer>
    <p>&copy; 2026 Elena Salon. All rights reserved.</p>
    <script src="tracking.js"></script>
  </footer>
</body>
</html>
  `;

  const extracted = ContentExtractor.extract(sampleHtml, "https://elenasalon.com");

  assert(extracted.title === "Elena Hair Salon & Spa | Premium Services", "Extracts correct page title");
  assert(!!extracted.description && extracted.description.includes("Luxury salon offering master haircuts"), "Extracts meta description");
  assert(extracted.content.includes("# Welcome to Elena Hair Salon"), "Structures H1 heading in markdown");
  assert(extracted.content.includes("## Our Service Menu & Pricing"), "Structures H2 heading in markdown");
  assert(extracted.content.includes("| Master Haircut | 60 min | $120 |"), "Extracts HTML table as Markdown table");
  assert(extracted.content.includes("- Complimentary tea and espresso"), "Extracts list items as Markdown list");
  assert(!extracted.content.includes("Please accept cookies"), "Strips cookie-banner noise element");
  assert(!extracted.content.includes("All rights reserved"), "Strips footer boilerplate");
  assert(extracted.wordCount > 40, `Calculates real word count (${extracted.wordCount} words)`);
  assert(extracted.suggestedCategory === "Services & Pricing", `Suggests category 'Services & Pricing' (got: ${extracted.suggestedCategory})`);
  assert(extracted.links.includes("https://elenasalon.com/services/haircut"), "Extracts and resolves relative internal links");
  assert(extracted.links.includes("https://elenasalon.com/about-us"), "Extracts internal about-us link");

  // -------------------------------------------------------------
  // Test Group 4: URL Normalization & Deduplication
  // -------------------------------------------------------------
  console.log("\n--- Group 4: URL Normalization & Deduplication ---");

  const rawUrl1 = "https://example.com/services/?utm_source=google&utm_medium=cpc#pricing";
  const rawUrl2 = "https://example.com/services";

  const norm1 = WebsiteCrawler.normalizeUrl(rawUrl1);
  const norm2 = WebsiteCrawler.normalizeUrl(rawUrl2);

  assert(norm1 === "https://example.com/services", `Normalizes URL 1 (got: ${norm1})`);
  assert(norm1 === norm2, "Deduplicates URLs with trailing slashes, fragments, and tracking query params");

  // -------------------------------------------------------------
  // Test Group 5: Real End-to-End Crawling of example.com
  // -------------------------------------------------------------
  console.log("\n--- Group 5: Real Crawler Execution ---");

  try {
    const realCrawlResult = await WebsiteCrawler.crawl("https://example.com", {
      maxDepth: 1,
      maxPages: 3,
      requestTimeoutMs: 8000,
    });

    assert(realCrawlResult.pagesCrawled >= 1, `Real crawl fetched pages (count: ${realCrawlResult.pagesCrawled})`);
    assert(realCrawlResult.pagesSucceeded >= 1, `Real crawl succeeded (success: ${realCrawlResult.pagesSucceeded})`);
    assert(realCrawlResult.pages.length >= 1, `Real page items generated (count: ${realCrawlResult.pages.length})`);
    const homePage = realCrawlResult.pages[0];
    assert(homePage.title.length > 0, `Discovered real page title: "${homePage.title}"`);
    assert(homePage.wordCount > 0, `Extracted real body word count: ${homePage.wordCount}`);
  } catch (err: any) {
    console.error("Group 5 network error (if offline):", err.message);
  }

  // -------------------------------------------------------------
  // Test Group 6: Real Ingestion & Database Persistence with Tenant Isolation
  // -------------------------------------------------------------
  console.log("\n--- Group 6: Ingestion Pipeline & DB Persistence ---");

  try {
    // 1. Get or create test organization
    let [testOrg] = await db.select().from(organizations).limit(1);
    if (!testOrg) {
      [testOrg] = await db.insert(organizations).values({ name: "Crawler Test Organization", slug: "crawler-test-org", industry: "salon", timezone: "America/New_York" }).returning();
    }

    // 2. Create source and website import record
    let [testSource] = await db
      .select()
      .from(knowledgeSources)
      .where(and(eq(knowledgeSources.organizationId, testOrg.id), eq(knowledgeSources.type, "website")))
      .limit(1);

    if (!testSource) {
      [testSource] = await db.insert(knowledgeSources).values({
        organizationId: testOrg.id,
        name: "Website Crawls",
        type: "website",
        isActive: true,
      }).returning();
    }

    const [testImport] = await db.insert(websiteImports).values({
      organizationId: testOrg.id,
      sourceId: testSource.id,
      url: "https://test-business-example.com",
      status: "discovery",
      pagesFound: 2,
      pagesScraped: 0,
      metadata: { stage: "Created" },
    }).returning();

    // 3. Run Ingestion Pipeline with real structured test pages
    const testPagesToIngest = [
      {
        title: "Test Business Services",
        url: "https://test-business-example.com/services",
        path: "/services",
        suggestedCategory: "Services & Pricing",
        content: "# Test Services\n\nWe offer Standard Haircut for $50 and Deluxe Styling for $90. Appointments take 45-60 minutes.",
      },
      {
        title: "Test Business Policies",
        url: "https://test-business-example.com/policies",
        path: "/policies",
        suggestedCategory: "Booking Policies",
        content: "# Booking Policies\n\nCancellations must be made 24 hours prior to appointment time. Late cancellations incur a 50% fee.",
      }
    ];

    await WebsiteIngestionPipeline.runIngestion(
      testOrg.id,
      testImport.id,
      testPagesToIngest,
      "replace"
    );

    // 4. Verify DB Records
    const [updatedImport] = await db
      .select()
      .from(websiteImports)
      .where(eq(websiteImports.id, testImport.id));

    assert(updatedImport?.status === "completed", `Website import record finalized as 'completed' (got: ${updatedImport?.status})`);
    assert(updatedImport?.pagesScraped === 2, `Recorded 2 scraped pages (got: ${updatedImport?.pagesScraped})`);
    
    const meta = updatedImport?.metadata as any;
    assert(meta?.stats?.imported === 2, `Metadata stats recorded 2 imported docs (got: ${meta?.stats?.imported})`);
    assert(meta?.stats?.totalChunksCreated >= 2, `Metadata stats recorded real chunks created (count: ${meta?.stats?.totalChunksCreated})`);

    // Verify Documents created
    const createdDocs = await db
      .select()
      .from(knowledgeDocuments)
      .where(and(eq(knowledgeDocuments.organizationId, testOrg.id), eq(knowledgeDocuments.sourceId, testSource.id)));

    assert(createdDocs.length >= 2, `Created real knowledge documents in database (found: ${createdDocs.length})`);

    const sampleDoc = createdDocs.find(d => (d.metadata as any)?.url === "https://test-business-example.com/services");
    assert(!!sampleDoc, "Verified document exists with source URL in metadata");

    if (sampleDoc) {
      const docChunks = await db
        .select()
        .from(knowledgeChunks)
        .where(and(eq(knowledgeChunks.organizationId, testOrg.id), eq(knowledgeChunks.documentId, sampleDoc.id)));

      assert(docChunks.length >= 1, `Verified real chunks persisted for document (found: ${docChunks.length})`);
      assert(docChunks[0].content.includes("Test Services"), "Chunk content matches actual extracted markdown");
    }

    // Cleanup test records
    if (sampleDoc) {
      await db.delete(knowledgeChunks).where(eq(knowledgeChunks.documentId, sampleDoc.id));
      await db.delete(knowledgeDocuments).where(eq(knowledgeDocuments.id, sampleDoc.id));
    }
    await db.delete(websiteImports).where(eq(websiteImports.id, testImport.id));
  } catch (err: any) {
    console.error("Group 6 DB error:", err);
    assert(false, "Group 6 DB persistence failed", err.message);
  }

  // -------------------------------------------------------------
  // Summary
  // -------------------------------------------------------------
  console.log("\n=======================================================");
  console.log(`🏁 Test Suite Summary: ${passed} Passed, ${failed} Failed`);
  console.log("=======================================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runCrawlerTests().catch(err => {
  console.error("Fatal error running test suite:", err);
  process.exit(1);
});
