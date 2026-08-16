import type { Metadata } from "next";
import Link from "next/link";
import { MarketingNav } from "@/components/marketing/nav";
import { MarketingFooter } from "@/components/marketing/footer";
import { Shield } from "lucide-react";
import { NativeA } from "@/components/shared/native";

export const metadata: Metadata = {
  title: "Privacy Policy | Operator",
  description: "Operator's Privacy Policy — how we collect, use, protect, and share your information.",
};

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-space-20 mb-space-10 pb-space-10 border-b border-[hsl(var(--foreground)/0.06)] last:border-0">
      <h2 className="text-title-lg  text-foreground mb-space-4">{title}</h2>
      <div className="space-y-space-3 text-body-sm text-muted-foreground leading-relaxed">{children}</div>
    </section>
  );
}

export default function PrivacyPage() {
  return (
    <div className="relative flex flex-col min-h-screen bg-background text-foreground overflow-x-hidden">
      <MarketingNav />

      <main className="flex-1">
        {/* Header */}
        <div className="border-b border-[hsl(var(--foreground)/0.06)] py-space-14">
          <div className="mx-auto max-w-4xl px-space-6">
            <div className="flex items-center gap-space-2 text-caption text-muted-foreground mb-space-4">
              <Link href="/" className="hover:text-foreground transition-colors">Home</Link>
              <span>›</span>
              <span>Privacy Policy</span>
            </div>
            <h1 className="text-heading-lg  tracking-tight-md text-foreground mb-space-3">Privacy Policy</h1>
            <p className="text-muted-foreground text-body-sm">Last updated: June 21, 2025 · Effective: June 21, 2025</p>
            <div className="mt-space-5 flex items-center gap-space-3 radius-lg border border-primary/20 bg-primary/[0.03] p-space-4 max-w-lg">
              <Shield className="h-5 w-5 text-primary shrink-0" />
              <p className="text-body-sm text-foreground/80">We are committed to protecting your privacy. This policy is written in plain language so you can understand exactly how we handle your data.</p>
            </div>
          </div>
        </div>

        {/* TOC + Content */}
        <div className="mx-auto max-w-6xl px-space-6 py-space-12">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-space-10">
            {/* Table of Contents */}
            <aside className="lg:col-span-1">
              <div className="sticky top-space-20 radius-lg border border-[hsl(var(--foreground)/0.06)] bg-[hsl(var(--foreground)/0.02)] p-space-5">
                <p className="text-caption  uppercase tracking-wider text-muted-foreground mb-space-3">Contents</p>
                <nav className="space-y-space-1">
                  {[
                    ["overview", "Overview"],
                    ["information", "Information We Collect"],
                    ["use", "How We Use Information"],
                    ["sharing", "Information Sharing"],
                    ["storage", "Data Storage & Security"],
                    ["retention", "Data Retention"],
                    ["rights", "Your Rights"],
                    ["cookies", "Cookies"],
                    ["children", "Children's Privacy"],
                    ["transfers", "International Transfers"],
                    ["contact", "Contact Us"],
                  ].map(([id, label]) => (
                    <NativeA key={id} href={`#${id}`} className="block text-caption text-muted-foreground hover:text-foreground transition-colors py-space-1">
                      {label}
                    </NativeA>
                  ))}
                </nav>
              </div>
            </aside>

            {/* Content */}
            <div className="lg:col-span-3">
              <Section id="overview" title="Overview">
                <p>Operator Technologies (&quot;Operator&quot;, &quot;we&quot;, &quot;us&quot;, or &quot;our&quot;) operates the Operatorplatform at nexx.ai. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our service.</p>
                <p>By using our service, you agree to the collection and use of information in accordance with this policy. If you are using our service on behalf of a business or organization, you represent that you are authorized to agree to this policy on their behalf.</p>
                <p>This policy applies to: (a) business customers who purchase Operator subscriptions; (b) end users who interact with Operator AI instances deployed by our business customers; and (c) visitors to our marketing website.</p>
              </Section>

              <Section id="information" title="Information We Collect">
                <p><strong className="text-foreground">Account Information:</strong> When you create an account, we collect your name, email address, business name, phone number, and billing information.</p>
                <p><strong className="text-foreground">Business Configuration Data:</strong> Information you provide to configure Operator AI — service descriptions, pricing, business hours, staff information, and knowledge base documents.</p>
                <p><strong className="text-foreground">Conversation Data:</strong> Records of conversations between Operator AI and your customers, including chat transcripts, voice call recordings, and transcriptions. This data is owned by you, the business customer.</p>
                <p><strong className="text-foreground">Lead & Contact Data:</strong> Customer information captured during AI conversations — names, email addresses, phone numbers, and inquiry details provided by your customers.</p>
                <p><strong className="text-foreground">Calendar & Integration Data:</strong> When you connect your calendar or other integrations, we receive and process data necessary to provide the integration service (e.g., availability data from Google Calendar).</p>
                <p><strong className="text-foreground">Usage Data:</strong> Information about how you use our platform — pages visited, features used, API calls made, session duration, and error logs.</p>
                <p><strong className="text-foreground">Technical Data:</strong> IP addresses, browser type, device type, operating system, and similar technical identifiers collected automatically when you use our service.</p>
                <p><strong className="text-foreground">Payment Data:</strong> Payment information is collected and processed by our payment processors (Stripe, Razorpay). We do not store full card numbers. We receive and store transaction records and billing history.</p>
              </Section>

              <Section id="use" title="How We Use Information">
                <p>We use the information we collect for the following purposes:</p>
                <ul className="list-disc list-inside space-y-space-2 pl-space-2">
                  <li><strong className="text-foreground">Service Delivery:</strong> To provide, operate, and maintain the Operator platform</li>
                  <li><strong className="text-foreground">AI Operation:</strong> To power Operator AI&apos;s responses using your knowledge base and configuration</li>
                  <li><strong className="text-foreground">Booking & Calendar:</strong> To check availability, create bookings, and sync with connected calendar services</li>
                  <li><strong className="text-foreground">Communications:</strong> To send account notifications, booking confirmations, and service updates</li>
                  <li><strong className="text-foreground">Billing:</strong> To process payments, generate invoices, and manage subscriptions</li>
                  <li><strong className="text-foreground">Support:</strong> To provide customer support and respond to your inquiries</li>
                  <li><strong className="text-foreground">Security:</strong> To detect, prevent, and investigate fraudulent or unauthorized activity</li>
                  <li><strong className="text-foreground">Improvement:</strong> To analyze usage patterns and improve our platform (using aggregated, anonymized data)</li>
                  <li><strong className="text-foreground">Legal:</strong> To comply with legal obligations and enforce our terms of service</li>
                </ul>
                <p>We do <strong className="text-foreground">not</strong> use your conversation data or knowledge base content to train AI models shared with other customers, sell your data to third parties, or use your customer data for our own marketing purposes.</p>
              </Section>

              <Section id="sharing" title="Information Sharing">
                <p>We do not sell your personal information. We share information only in the following circumstances:</p>
                <p><strong className="text-foreground">Service Providers:</strong> We share data with third-party vendors who help us operate the platform: cloud hosting (AWS/Vercel), payment processing (Stripe, Razorpay), AI services (OpenAI), and communication services (Twilio). These providers are contractually required to protect your data.</p>
                <p><strong className="text-foreground">Agency Relationships:</strong> If you are a client account managed by an Agency customer, your business data is accessible to that agency as part of the service agreement.</p>
                <p><strong className="text-foreground">Legal Requirements:</strong> We may disclose information when required by law, legal process, or governmental authority, or when we believe in good faith that disclosure is necessary to protect our rights, your safety, or the safety of others.</p>
                <p><strong className="text-foreground">Business Transfers:</strong> In the event of a merger, acquisition, or sale of assets, user information may be transferred as part of the transaction. We will provide notice before your information is subject to a different privacy policy.</p>
                <p><strong className="text-foreground">With Your Consent:</strong> We may share information in other ways if you specifically consent to it.</p>
              </Section>

              <Section id="storage" title="Data Storage & Security">
                <p>Your data is stored on secure servers in data centers operated by AWS and Vercel. We implement industry-standard security measures including:</p>
                <ul className="list-disc list-inside space-y-space-2 pl-space-2">
                  <li>AES-256 encryption for all data at rest</li>
                  <li>TLS 1.3 encryption for all data in transit</li>
                  <li>Multi-tenant data isolation at the row level</li>
                  <li>Regular security audits and penetration testing</li>
                  <li>Automated backups with encrypted storage</li>
                </ul>
                <p>For detailed security information, see our <Link href="/security" className="text-primary hover:text-primary/80 transition-colors">Security Trust Center</Link>.</p>
              </Section>

              <Section id="retention" title="Data Retention">
                <p>We retain your data for as long as your account is active or as needed to provide services. Specifically:</p>
                <ul className="list-disc list-inside space-y-space-2 pl-space-2">
                  <li><strong className="text-foreground">Account data:</strong> Retained while your account is active, plus 30 days after account deletion for recovery purposes</li>
                  <li><strong className="text-foreground">Conversation data:</strong> Retained for the period specified in your plan (90 days for Starter, 1 year for Professional+)</li>
                  <li><strong className="text-foreground">Billing records:</strong> Retained for 7 years as required by financial regulations</li>
                  <li><strong className="text-foreground">Audit logs:</strong> Retained for 12 months minimum</li>
                  <li><strong className="text-foreground">Backups:</strong> Retained for 30 days (Enterprise: 1 year)</li>
                </ul>
                <p>When you delete your account, we delete your personal data within 30 days, except where we are legally required to retain certain records.</p>
              </Section>

              <Section id="rights" title="Your Rights">
                <p>Depending on your location, you may have the following rights regarding your personal information:</p>
                <ul className="list-disc list-inside space-y-space-2 pl-space-2">
                  <li><strong className="text-foreground">Access:</strong> Request a copy of the personal information we hold about you</li>
                  <li><strong className="text-foreground">Correction:</strong> Request correction of inaccurate or incomplete information</li>
                  <li><strong className="text-foreground">Erasure:</strong> Request deletion of your personal information (right to be forgotten)</li>
                  <li><strong className="text-foreground">Portability:</strong> Request your data in a machine-readable format</li>
                  <li><strong className="text-foreground">Objection:</strong> Object to processing of your data for certain purposes</li>
                  <li><strong className="text-foreground">Withdrawal:</strong> Withdraw consent where processing is based on consent</li>
                </ul>
                <p>To exercise any of these rights, contact us at privacy@nexx.ai. We will respond within 30 days. For EU/UK residents, we comply with GDPR requirements. For California residents, we comply with CCPA requirements.</p>
              </Section>

              <Section id="cookies" title="Cookies">
                <p>We use cookies and similar tracking technologies to provide and improve our service.</p>
                <p><strong className="text-foreground">Essential Cookies:</strong> Required for the service to function. These include authentication session cookies and security tokens. Cannot be disabled.</p>
                <p><strong className="text-foreground">Analytics Cookies:</strong> Help us understand how users interact with our platform. We use aggregated, anonymized data. Can be disabled in your browser settings.</p>
                <p><strong className="text-foreground">Preference Cookies:</strong> Remember your settings and preferences. Can be disabled in browser settings.</p>
                <p>The Operator website widget placed on your customers&apos; websites uses a minimal cookie only to maintain conversation session continuity. No cross-site tracking is performed.</p>
              </Section>

              <Section id="children" title="Children's Privacy">
                <p>Our service is not directed to children under 16 years of age. We do not knowingly collect personal information from children under 16. If you become aware that a child under 16 has provided us with personal information, please contact us at privacy@nexx.ai and we will take steps to delete that information.</p>
              </Section>

              <Section id="transfers" title="International Data Transfers">
                <p>Our service is operated globally. Your information may be transferred to and processed in countries other than the country in which you reside. These countries may have data protection laws that differ from your country.</p>
                <p>For transfers from the European Economic Area, UK, or Switzerland, we use standard contractual clauses approved by the European Commission. Enterprise customers can request data residency in specific regions.</p>
              </Section>

              <Section id="contact" title="Contact Us">
                <p>If you have questions about this Privacy Policy or our privacy practices, contact us at:</p>
                <div className="radius-lg border border-[hsl(var(--foreground)/0.06)] bg-[hsl(var(--foreground)/0.02)] p-space-5 space-y-space-2 mt-space-3">
                  <p><strong className="text-foreground">Email:</strong> privacy@nexx.ai</p>
                  <p><strong className="text-foreground">Subject line:</strong> Privacy Inquiry — [your name]</p>
                  <p><strong className="text-foreground">Response time:</strong> Within 5 business days</p>
                  <p className="pt-space-3 border-t border-[hsl(var(--foreground)/0.06)] text-caption">For GDPR-specific requests, use the subject line &quot;GDPR Request&quot;. For data deletion requests, use &quot;Data Deletion Request&quot; along with your account email address.</p>
                </div>
                <p className="mt-space-4 text-caption">We may update this Privacy Policy from time to time. We will notify you of significant changes by email and/or by posting a notice on our website. Your continued use of the service after changes take effect constitutes acceptance of the updated policy.</p>
              </Section>
            </div>
          </div>
        </div>
      </main>

      <MarketingFooter />
    </div>
  );
}
