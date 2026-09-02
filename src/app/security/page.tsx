import { ScrollReveal } from "@/components/motion/scroll-reveal";
import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/shared/button";
import { SessionAwareCta } from "@/components/marketing/session-aware-cta";
import { MarketingNav } from "@/components/marketing/nav";
import { MarketingFooter } from "@/components/marketing/footer";
import { ArrowRight, Shield, Lock, Database, Eye, Server, FileText, Check, Mail, Clock, Key, Globe, Activity } from "lucide-react";
import { NativeA } from "@/components/shared/native";

export const metadata: Metadata = {
  title: "Security | Operator — Enterprise Data Protection",
  description: "Operator is built on enterprise-grade security architecture. SOC2-ready, end-to-end encryption, multi-tenant isolation, and GDPR compliance.",
};

const SECURITY_SECTIONS = [
  {
    id: "encryption",
    title: "Encryption",
    subtitle: "Data protected at rest and in transit",
    items: [
      { label: "Data at Rest", value: "AES-256-GCM encryption for all stored data including conversations, lead profiles, and documents" },
      { label: "Data in Transit", value: "TLS 1.3 for all API communications. HSTS enforced on all public endpoints" },
      { label: "Database Encryption", value: "Encrypted database volumes with key management through dedicated KMS" },
      { label: "Backup Encryption", value: "All database backups are encrypted using the same AES-256 standard" },
      { label: "Key Management", value: "Encryption keys are rotated quarterly. Master keys stored in hardware security modules" },
    ],
  },
  {
    id: "isolation",
    title: "Tenant Isolation",
    subtitle: "Your data never touches another business",
    items: [
      { label: "Row-level Security", value: "Every database record includes an org_id constraint. Cross-tenant queries are structurally impossible" },
      { label: "Schema Isolation", value: "Enterprise customers can request dedicated schemas for complete logical separation" },
      { label: "API Isolation", value: "All API routes validate org_id from authenticated session tokens before any data access" },
      { label: "AI Isolation", value: "Knowledge base, conversation history, and lead data are scoped per organization. No cross-contamination" },
      { label: "Storage Isolation", value: "File uploads are stored in organization-scoped storage buckets with separate access policies" },
    ],
  },
  {
    id: "authentication",
    title: "Authentication & Authorization",
    subtitle: "Identity verified at every layer",
    items: [
      { label: "Authentication Provider", value: "In-House Auth — Argon2id password hashing and database-backed session isolation" },
      { label: "Session Management", value: "Short-lived JWT tokens (15 minutes). Refresh tokens rotate on every use" },
      { label: "Multi-Factor Authentication", value: "MFA available for all users. Enforced for Admin and Agency roles" },
      { label: "Role-Based Access Control", value: "Owner, Admin, Member, and Viewer roles with granular permission scopes" },
      { label: "SSO Support", value: "SAML 2.0 SSO available on Enterprise plans. Supports Okta, Azure AD, Google Workspace" },
    ],
  },
  {
    id: "infrastructure",
    title: "Infrastructure Security",
    subtitle: "Built on hardened cloud infrastructure",
    items: [
      { label: "Cloud Provider", value: "AWS / Vercel infrastructure with SOC2 and ISO 27001 certification" },
      { label: "DDoS Protection", value: "Cloudflare DDoS mitigation and WAF on all public endpoints" },
      { label: "Network Segmentation", value: "Database servers are in private VPCs. No public database endpoints" },
      { label: "Container Security", value: "Docker containers run as non-root users. Read-only file systems where possible" },
      { label: "Vulnerability Scanning", value: "Automated dependency scanning on every code push. Critical CVEs patched within 24 hours" },
      { label: "Penetration Testing", value: "Annual third-party penetration testing. Results shared with Enterprise customers on request" },
    ],
  },
  {
    id: "backups",
    title: "Backups & Recovery",
    subtitle: "Your data is always recoverable",
    items: [
      { label: "Backup Frequency", value: "Automated database backups every 6 hours. Transaction logs backed up every 15 minutes" },
      { label: "Retention Period", value: "30-day backup retention for all plans. 1-year retention for Enterprise" },
      { label: "Geographic Replication", value: "Backups stored in geographically separate regions from production" },
      { label: "Recovery Testing", value: "Recovery procedures tested monthly. Target RTO: 4 hours, RPO: 15 minutes" },
      { label: "Point-in-time Recovery", value: "Enterprise customers can request point-in-time recovery to any moment in the past 30 days" },
    ],
  },
  {
    id: "audit",
    title: "Audit Logs",
    subtitle: "Complete visibility into every action",
    items: [
      { label: "Admin Actions", value: "Every administrative action logged with timestamp, user ID, IP address, and action details" },
      { label: "Data Access Logs", value: "All sensitive data access (conversations, lead data, billing) is logged and searchable" },
      { label: "Auth Events", value: "Login attempts, MFA events, password changes, and session creation are all logged" },
      { label: "Retention", value: "Audit logs retained for 12 months minimum. Extended retention available on Enterprise" },
      { label: "Export", value: "Audit logs exportable as CSV/JSON. API access available for SIEM integration" },
    ],
  },
  {
    id: "compliance",
    title: "Compliance Architecture",
    subtitle: "Designed for regulated industries",
    items: [
      { label: "SOC2 Type II", value: "In preparation. Architecture built to SOC2 Trust Service Criteria. Expected certification Q4 2025" },
      { label: "GDPR", value: "Full GDPR compliance. Data processing agreements (DPAs) available on request. Right to erasure supported" },
      { label: "HIPAA Considerations", value: "BAA available for medical practices on Business/Enterprise plans. End-to-end encryption and audit logs support HIPAA workflows" },
      { label: "Data Residency", value: "Enterprise customers can request data residency in specific regions (US, EU, India)" },
      { label: "Privacy by Design", value: "Minimal data collection principle. No conversation data used for AI model training without explicit consent" },
    ],
  },
];

export default function SecurityPage() {
  return (
    <div className="relative flex flex-col min-h-screen bg-background text-foreground overflow-x-hidden">
      <MarketingNav />

      <main className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden">
<ScrollReveal stagger>

          <div className="absolute inset-space-0 dot-grid grid-fade-b pointer-events-none" />
          <div className="absolute top-space-0 left-1/2 -translate-x-1/2 w-[var(--bg-blob)] h-[var(--bg-blob-h)] bg-[radial-gradient(ellipse_at_center,hsl(var(--primary)/0.08),transparent_70%)] pointer-events-none" />

          <div className="relative mx-auto max-w-5xl px-space-6 pt-32 pb-space-16 text-center">
            <p className="text-body-sm text-primary  mb-space-4">Security Trust Center</p>
            <h1 className="text-display-xl  tracking-tight-xs leading-display text-foreground mb-space-5">
              Enterprise security.
              <br />
              <span className="text-primary">Zero compromises.</span>
            </h1>
            <p className="mx-auto max-w-2xl text-title-lg text-muted-foreground leading-relaxed mb-space-10">
              Your customers share sensitive information with Operator AI — medical needs, legal matters, financial questions. We protect that data with enterprise-grade security at every layer.
            </p>

            {/* Quick trust badges */}
            <div className="flex flex-wrap justify-center gap-space-3 mb-space-10">
              {[
                { label: "AES-256 Encryption" },
                { label: "Tenant Isolation" },
                { label: "99.9% Uptime" },
                { label: "SOC2 Ready" },
                { label: "GDPR Compliant" },
              ].map((b) => (
                <div key={b.label} className="flex items-center gap-space-2 radius-full border border-[hsl(var(--foreground)/0.08)] bg-[hsl(var(--foreground)/0.03)] px-space-4 py-space-2">
                  <Shield className="h-3.5 w-3.5 text-primary" />
                  <span className="text-caption  text-foreground">{b.label}</span>
                </div>
              ))}
            </div>

            {/* Section quick nav */}
            <div className="flex flex-wrap justify-center gap-space-2">
              {SECURITY_SECTIONS.map((s) => (
                <NativeA key={s.id} href={`#${s.id}`} className="text-caption  text-muted-foreground hover:text-foreground border border-[hsl(var(--foreground)/0.06)] radius-full px-space-3 py-space-1 hover:border-[hsl(var(--foreground)/0.15)] transition-colors">
                  {s.title}
                </NativeA>
              ))}
            </div>
          </div>
        
</ScrollReveal>
</section>

        {/* Security sections */}
        <div className="mx-auto max-w-5xl px-space-6 pb-space-20 space-y-space-6">
          {SECURITY_SECTIONS.map((section) => (
            <section key={section.id} id={section.id} className="scroll-mt-space-20 radius-xl border border-[hsl(var(--foreground)/0.06)] overflow-hidden">
<ScrollReveal stagger>

              <div className="flex items-center gap-space-4 p-space-6 border-b border-[hsl(var(--foreground)/0.06)] bg-[hsl(var(--foreground)/0.02)]">
                <div className="h-10 w-10 radius-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <Shield className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h2 className=" text-foreground">{section.title}</h2>
                  <p className="text-body-sm text-muted-foreground">{section.subtitle}</p>
                </div>
              </div>
              <div className="divide-y divide-[hsl(var(--foreground)/0.04)]">
                {section.items.map((item) => (
                  <div key={item.label} className="flex flex-col sm:flex-row gap-space-2 p-space-5 hover:bg-[hsl(var(--foreground)/0.02)] transition-colors">
                    <div className="flex items-center gap-space-2 sm:w-52 shrink-0">
                      <Check className="h-3.5 w-3.5 text-primary shrink-0" />
                      <span className="text-caption  text-foreground uppercase tracking-wide">{item.label}</span>
                    </div>
                    <p className="text-body-sm text-muted-foreground leading-relaxed sm:flex-1">{item.value}</p>
                  </div>
                ))}
              </div>
            
</ScrollReveal>
</section>
          ))}
        </div>

        {/* Responsible Disclosure */}
        <section className="border-y border-[hsl(var(--foreground)/0.06)] py-space-20">
<ScrollReveal stagger>

          <div className="mx-auto max-w-5xl px-space-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-space-10 items-start">
              <div>
                <p className="text-body-sm text-primary  mb-space-3">Responsible Disclosure</p>
                <h2 className="text-heading-lg  tracking-tight-md text-foreground mb-space-4">Found a security vulnerability?</h2>
                <p className="text-muted-foreground leading-relaxed mb-space-5">
                  We welcome responsible security researchers. If you've discovered a potential vulnerability in Operator, please report it to us privately before any public disclosure.
                </p>
                <div className="space-y-space-2 text-body-sm text-muted-foreground">
                  {[
                    "We will acknowledge your report within 24 hours",
                    "We will investigate and provide status updates",
                    "We will credit researchers in our security acknowledgements",
                    "We will not take legal action against good-faith researchers",
                  ].map((t) => (
                    <div key={t} className="flex items-center gap-space-2">
                      <Check className="h-3.5 w-3.5 text-primary shrink-0" />
                      <span>{t}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="radius-xl border border-[hsl(var(--foreground)/0.06)] bg-[hsl(var(--foreground)/0.02)] p-space-6">
                <h3 className=" text-body-sm text-foreground mb-space-4">Security Contact</h3>
                <div className="space-y-space-4">
                  <div className="flex items-center gap-space-3">
                    <Mail className="h-5 w-5 text-primary shrink-0" />
                    <div>
                      <p className="text-caption text-muted-foreground">Email</p>
                      <NativeA href="mailto:security@operator.ai" className="text-body-sm  text-foreground hover:text-primary transition-colors">security@operator.ai</NativeA>
                    </div>
                  </div>
                  <div className="flex items-start gap-space-3">
                    <Clock className="h-5 w-5 text-primary shrink-0 mt-space-1" />
                    <div>
                      <p className="text-caption text-muted-foreground">Response Time</p>
                      <p className="text-body-sm  text-foreground">Within 24 hours, 7 days a week</p>
                    </div>
                  </div>
                  <div className="pt-space-3 border-t border-[hsl(var(--foreground)/0.06)]">
                    <p className="text-caption text-muted-foreground leading-relaxed">Please encrypt sensitive reports using our PGP key, available on request. Include a clear description of the vulnerability, steps to reproduce, and potential impact.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        
</ScrollReveal>
</section>

        {/* Certifications */}
        <section className="py-space-20">
<ScrollReveal stagger>

          <div className="mx-auto max-w-5xl px-space-6">
            <div className="mb-space-12">
              <p className="text-body-sm text-primary  mb-space-3">Certifications</p>
              <h2 className="text-heading-lg  tracking-tight-md text-foreground">Planned certifications</h2>
              <p className="text-muted-foreground text-body-sm mt-space-2">We are actively pursuing formal certifications in 2025.</p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-space-4">
              {[
                { label: "SOC2 Type II", timeline: "Q4 2025", progress: 70 },
                { label: "ISO 27001", timeline: "Q1 2026", progress: 30 },
                { label: "HIPAA BAA", timeline: "Available Now", progress: 100 },
                { label: "GDPR DPA", timeline: "Available Now", progress: 100 },
              ].map((cert) => (
                <div key={cert.label} className="radius-lg border border-[hsl(var(--foreground)/0.06)] bg-[hsl(var(--foreground)/0.02)] p-space-4 text-center">
                  <p className=" text-body-sm text-foreground mb-space-1">{cert.label}</p>
                  <p className="text-caption text-muted-foreground mb-space-3">{cert.timeline}</p>
                  <div className="h-1 radius-full bg-[hsl(var(--foreground)/0.06)]">
                    <div className="h-full radius-full bg-primary" style={{ width: `${cert.progress}%` }} />
                  </div>
                  <p className="text-caption text-muted-foreground mt-space-1">{cert.progress}% complete</p>
                </div>
              ))}
            </div>
          </div>
        
</ScrollReveal>
</section>

        {/* CTA */}
        <section className="relative py-space-28 md:py-space-36 overflow-hidden border-t border-[hsl(var(--foreground)/0.06)]">
<ScrollReveal stagger>

          <div className="absolute inset-space-0 dot-grid grid-fade-y pointer-events-none" />
          <div className="relative mx-auto max-w-2xl px-space-6 text-center">
            <h2 className="text-heading-lg sm:text-heading-lg  tracking-tight-sm text-foreground mb-space-4">Security questions before you buy?</h2>
            <p className="text-muted-foreground mb-space-8">Our team is happy to walk through our security architecture, answer compliance questions, or provide documentation for your procurement process.</p>
            <div className="flex flex-col sm:flex-row gap-space-4 justify-center">
              <Button asChild size="lg" className="w-full sm:w-auto">
                <Link href="/contact">Talk to Security Team <ArrowRight className="h-4 w-4" /></Link>
              </Button>
              <SessionAwareCta
                signedInText="Go to Dashboard"
                signedOutText="Start Free Trial"
                signedOutHref="/sign-in"
                variant="outline"
                size="lg"
              />
            </div>
          </div>
        
</ScrollReveal>
</section>
      </main>

      <MarketingFooter />
    </div>
  );
}
