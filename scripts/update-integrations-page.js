const fs = require('fs');

let file = fs.readFileSync('src/app/integrations/page.tsx', 'utf8');

// 1. Remove meta from INTEGRATIONS and create FUTURE_INTEGRATIONS
const metaSearch = `  {
    id: "meta",
    name: "Meta Messenger & IG",
    category: "Communication",
    status: "coming-soon",
    logo: LOGOS.meta,
    desc: "Answer customer inquiries and schedule consultations natively inside Instagram DMs and Facebook Pages.",
    features: ["Instagram DM triage", "Facebook Page responses", "Lead qualification", "Ad conversion sync"],
    difficulty: "Setup Required",
    popularity: "Popular",
    capabilities: "Qualifies social media inquiries using the same rules and calendar availability as phone callers."
  }`;

// Remove meta entry from INTEGRATIONS
const metaIndex = file.indexOf('id: "meta"');
if (metaIndex !== -1) {
  const itemStart = file.lastIndexOf('{', metaIndex);
  const itemEnd = file.indexOf('}', metaIndex) + 1;
  // Also remove preceding comma if any
  const commaBefore = file.lastIndexOf(',', itemStart);
  if (commaBefore !== -1 && file.slice(commaBefore, itemStart).trim() === '') {
    file = file.slice(0, commaBefore) + file.slice(itemEnd);
  } else {
    file = file.slice(0, itemStart) + file.slice(itemEnd);
  }
  console.log('Removed meta from active INTEGRATIONS array');
}

// Add FUTURE_INTEGRATIONS array right after INTEGRATIONS
const endOfIntegrations = file.indexOf('// Developer Code Snippets');
if (endOfIntegrations !== -1) {
  const futureCode = `
// ─── SCOPED FUTURE INTEGRATIONS (ROADMAP) ───────────────────────────
const FUTURE_INTEGRATIONS = [
  {
    id: "meta-future",
    name: "Meta Messenger & Instagram Direct",
    category: "Communication",
    status: "scoped",
    quarter: "Q3 2026",
    logo: LOGOS.meta,
    desc: "Answer prospective patient questions and book consultation slots natively within Instagram DMs and Facebook Messenger.",
    scope: "Omnichannel social intake with unified voice context."
  },
  {
    id: "hubspot-future",
    name: "HubSpot CRM",
    category: "CRM & Marketing",
    status: "scoped",
    quarter: "Q3 2026",
    logo: (
      <div className="w-full h-full flex items-center justify-center font-bold text-[#FF7A59]">
        <span className="text-body-sm font-mono font-medium">HS</span>
      </div>
    ),
    desc: "Bi-directional contact record updates, deal stage progression, and automated customer lifecycle tagging.",
    scope: "Instant contact enrichment from phone triage notes."
  },
  {
    id: "ehr-future",
    name: "Dentrix & Epic Systems EHR",
    category: "Healthcare",
    status: "scoped",
    quarter: "Q4 2026",
    logo: (
      <div className="w-full h-full flex items-center justify-center font-bold text-emerald-500">
        <span className="text-body-sm font-mono font-medium">EHR</span>
      </div>
    ),
    desc: "Direct integration into dental practice management and clinical hospital EHR schedules with HIPAA verification.",
    scope: "Chair availability locks and clinical record creation."
  },
  {
    id: "salesforce-future",
    name: "Salesforce Service Cloud",
    category: "Enterprise CRM",
    status: "scoped",
    quarter: "Q4 2026",
    logo: (
      <div className="w-full h-full flex items-center justify-center font-bold text-[#00A1E0]">
        <span className="text-body-sm font-mono font-medium">SF</span>
      </div>
    ),
    desc: "Enterprise incident ticketing, high-volume case routing, and automated Omni-Channel skill matching.",
    scope: "Enterprise tier bi-directional case routing."
  }
];\n\n`;
  file = file.slice(0, endOfIntegrations) + futureCode + file.slice(endOfIntegrations);
  console.log('Added FUTURE_INTEGRATIONS array');
}

fs.writeFileSync('src/app/integrations/page.tsx', file, 'utf8');
console.log('Integrations list updated.');
