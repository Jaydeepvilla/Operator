import type { Metadata } from "next";
import Link from "next/link";
import { MarketingNav } from "@/components/marketing/nav";
import { MarketingFooter } from "@/components/marketing/footer";
import { FileText, ArrowRight } from "lucide-react";
import { NativeA } from "@/components/shared/native";

export const metadata: Metadata = {
  title: "Terms of Service | Operator",
  description: "Operator's Terms of Service — your rights and obligations when using the Operator platform.",
};

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-28 mb-space-10 pb-space-10 border-b border-[hsl(var(--foreground)/0.06)] last:border-0">
      <h2 className="text-title-lg text-foreground mb-space-4 font-semibold">{title}</h2>
      <div className="space-y-space-3 text-body-sm text-muted-foreground leading-relaxed">{children}</div>
    </section>
  );
}

export default function TermsPage() {
  return (
    <div className="relative flex flex-col min-h-screen bg-background text-foreground overflow-x-hidden">
      <MarketingNav />

      <main className="flex-1 pt-28 md:pt-32">
        {/* Header */}
        <div className="border-b border-[hsl(var(--foreground)/0.06)] pb-space-10">
          <div className="mx-auto max-w-5xl px-space-6">
            <div className="flex items-center gap-space-2 text-caption text-muted-foreground mb-space-4">
              <Link href="/" className="hover:text-foreground transition-colors">Home</Link>
              <span>›</span>
              <span>Terms of Service</span>
            </div>
            <h1 className="text-heading-xl tracking-tight-md text-foreground mb-space-3 font-semibold">Terms of Service</h1>
            <p className="text-muted-foreground text-body-sm">Last updated: June 21, 2025 · Effective: June 21, 2025</p>
            <div className="mt-space-5 flex items-center gap-space-3 radius-lg border border-primary/20 bg-primary/[0.03] p-space-4 max-w-lg">
              <FileText className="h-5 w-5 text-primary shrink-0" />
              <p className="text-body-sm text-foreground/80">These Terms govern your use of the Operator platform. By creating an account or using the service, you agree to these Terms.</p>
            </div>
          </div>
        </div>

        {/* TOC + Content */}
        <div className="mx-auto max-w-5xl px-space-6 py-space-12">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-8 items-start">
            {/* Table of Contents */}
            <aside className="lg:col-span-4 sticky top-28 self-start">
              <div className="radius-xl border border-border-muted bg-card/60 p-space-5 backdrop-blur-md max-h-[calc(100vh-9rem)] overflow-y-auto shadow-sm">
                <p className="text-caption font-mono uppercase tracking-wider text-muted-foreground mb-space-3 font-bold">Contents</p>
                <nav className="space-y-space-1">
                  {[
                    ["acceptance", "Acceptance of Terms"],
                    ["service", "Description of Service"],
                    ["eligibility", "Eligibility"],
                    ["account", "Account Responsibilities"],
                    ["acceptable-use", "Acceptable Use"],
                    ["payment", "Payment & Billing"],
                    ["intellectual-property", "Intellectual Property"],
                    ["data", "Data & Privacy"],
                    ["third-party", "Third-Party Services"],
                    ["disclaimers", "Disclaimers"],
                    ["limitation", "Limitation of Liability"],
                    ["indemnification", "Indemnification"],
                    ["termination", "Termination"],
                    ["agency", "Agency & Reseller Terms"],
                    ["governing-law", "Governing Law"],
                    ["changes", "Changes to Terms"],
                    ["contact-terms", "Contact"],
                  ].map(([id, label]) => (
                    <NativeA key={id} href={`#${id}`} className="block text-caption text-muted-foreground hover:text-foreground transition-colors py-space-1 hover:pl-space-1 transition-all">
                      {label}
                    </NativeA>
                  ))}
                </nav>
              </div>
            </aside>

            {/* Content */}
            <div className="lg:col-span-8">

              <Section id="acceptance" title="1. Acceptance of Terms">
                <p>These Terms of Service ("Terms") are a legally binding agreement between you ("Customer", "you", or "your") and Operator Technologies ("Operator", "we", "us", or "our"), governing your access to and use of the Operatorplatform, including all associated services, APIs, widgets, and features (collectively, the "Service").</p>
                <p>By creating an account, accessing the Service, or using any part of the Service, you confirm that you have read, understood, and agree to be bound by these Terms and our Privacy Policy, which is incorporated herein by reference.</p>
                <p>If you are using the Service on behalf of a business or organization, you represent that you have the authority to bind that entity to these Terms.</p>
              </Section>

              <Section id="service" title="2. Description of Service">
                <p>Operatoris a software-as-a-service (SaaS) platform that enables businesses to deploy Operator AI capable of handling customer communications across multiple channels, including website chat, voice calls, SMS, email, WhatsApp, Instagram, and Facebook Messenger.</p>
                <p>The Service includes: an AI conversation engine, appointment booking system, lead qualification tools, knowledge base management, omnichannel messaging, voice AI infrastructure, analytics dashboard, and agency/reseller management tools.</p>
                <p>We reserve the right to modify, suspend, or discontinue any feature of the Service at any time with reasonable notice. We will not materially reduce core functionality of paid plans without notice and the opportunity to cancel.</p>
              </Section>

              <Section id="eligibility" title="3. Eligibility">
                <p>You must be at least 18 years old to use the Service. By agreeing to these Terms, you represent that you meet this requirement.</p>
                <p>The Service is intended for legitimate business use. You must be operating a real business or organization to use the Service for commercial purposes.</p>
                <p>The Service is not available to persons or entities previously banned from using the Service or in jurisdictions where the Service is prohibited by applicable law.</p>
              </Section>

              <Section id="account" title="4. Account Responsibilities">
                <p><strong className="text-foreground">Account Security:</strong> You are responsible for maintaining the security of your account credentials. You must immediately notify us of any unauthorized access to your account. We are not liable for losses caused by unauthorized use of your account if you failed to take reasonable security precautions.</p>
                <p><strong className="text-foreground">Accurate Information:</strong> You agree to provide accurate, current, and complete information when creating and maintaining your account. Providing false information may result in account suspension.</p>
                <p><strong className="text-foreground">One Account Per Business:</strong> Each business entity should have one primary account. Multiple accounts created to circumvent usage limits or subscription fees are prohibited.</p>
                <p><strong className="text-foreground">API Keys:</strong> You are responsible for all use of your API keys. Do not share API keys in public repositories or client-side code.</p>
              </Section>

              <Section id="acceptable-use" title="5. Acceptable Use Policy">
                <p>You agree to use the Service only for lawful purposes and in accordance with these Terms. You may not use the Service to:</p>
                <ul className="list-disc list-inside space-y-space-2 pl-space-2">
                  <li>Violate any applicable laws or regulations</li>
                  <li>Engage in deceptive practices, impersonation, or fraud</li>
                  <li>Spam, harass, or send unsolicited communications to users who have not consented</li>
                  <li>Deploy AI that violates consumer protection or telemarketing laws (TCPA, CAN-SPAM, etc.)</li>
                  <li>Collect personal information without proper disclosure and consent</li>
                  <li>Attempt to reverse engineer or extract our AI models or proprietary systems</li>
                  <li>Interfere with the Service's infrastructure or security systems</li>
                  <li>Use the Service for illegal surveillance, discrimination, or to target protected classes</li>
                  <li>Exceed usage limits in ways that degrade service for other customers</li>
                </ul>
                <p>We reserve the right to investigate and terminate accounts that violate this policy without refund.</p>
              </Section>

              <Section id="payment" title="6. Payment & Billing">
                <p><strong className="text-foreground">Subscription Fees:</strong> Paid plans are billed in advance on a monthly or annual cycle. All fees are non-refundable except as specified in our refund policy.</p>
                <p><strong className="text-foreground">Usage-Based Charges:</strong> Some plans include usage-based fees (per conversation, per call minute, etc.) billed at the end of each billing cycle.</p>
                <p><strong className="text-foreground">Free Trial:</strong> New accounts receive a 14-day free trial. No credit card is required to start. After the trial, you must subscribe to a paid plan to continue using the Service.</p>
                <p><strong className="text-foreground">Price Changes:</strong> We may change subscription prices with 30 days notice. Existing annual subscriptions will honor the current price until renewal.</p>
                <p><strong className="text-foreground">Payment Failure:</strong> If payment fails, we will notify you and provide a 7-day grace period to update payment information. After the grace period, the account may be suspended.</p>
                <p><strong className="text-foreground">Cancellation:</strong> You may cancel your subscription at any time. Cancellation takes effect at the end of the current billing period. You will retain access until the period ends.</p>
                <p><strong className="text-foreground">Refunds:</strong> We offer refunds within 14 days of initial payment for new subscribers who are not satisfied with the service. Contact support@operator.ai. Annual plan refunds are prorated after 14 days.</p>
              </Section>

              <Section id="intellectual-property" title="7. Intellectual Property">
                <p><strong className="text-foreground">Our Property:</strong> The Operator platform, including all software, AI models, designs, logos, trademarks, and documentation, is owned by Operator Technologies. You receive a limited, non-exclusive, non-transferable license to use the Service in accordance with these Terms.</p>
                <p><strong className="text-foreground">Your Content:</strong> You retain ownership of all content you upload to the Service — knowledge base documents, business information, and conversation data. You grant us a limited license to use this content solely to provide the Service.</p>
                <p><strong className="text-foreground">Feedback:</strong> If you provide us with feedback or suggestions, you grant us a perpetual, irrevocable, royalty-free license to use that feedback for any purpose, including product improvement.</p>
              </Section>

              <Section id="data" title="8. Data & Privacy">
                <p>Your use of the Service is also governed by our <Link href="/privacy" className="text-primary hover:text-primary/80 transition-colors">Privacy Policy</Link>, which is incorporated into these Terms.</p>
                <p><strong className="text-foreground">Data Ownership:</strong> You own your business data and your customers' data. We process this data only as directed by your use of the Service and as described in our Privacy Policy.</p>
                <p><strong className="text-foreground">Data Processing Agreement:</strong> For customers subject to GDPR, we offer a Data Processing Agreement (DPA). Contact privacy@operator.ai to request a DPA.</p>
                <p><strong className="text-foreground">Data Security:</strong> We implement and maintain appropriate technical and organizational measures to protect your data. See our <Link href="/security" className="text-primary hover:text-primary/80 transition-colors">Security Trust Center</Link> for details.</p>
              </Section>

              <Section id="third-party" title="9. Third-Party Services">
                <p>The Service integrates with third-party services including Google Calendar, Microsoft Outlook, Twilio, OpenAI, Stripe, Razorpay, and others. Your use of these integrations is subject to the respective third parties' terms of service.</p>
                <p>We are not responsible for the availability, accuracy, or content of third-party services. Integration disruptions caused by third-party service outages are not breaches of our Service Level Agreement.</p>
              </Section>

              <Section id="disclaimers" title="10. Disclaimers">
                <p>THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE". WE DISCLAIM ALL WARRANTIES, EXPRESS OR IMPLIED, INCLUDING WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT.</p>
                <p>We do not warrant that the Service will be uninterrupted, error-free, or completely secure. AI-generated responses may be inaccurate, incomplete, or inappropriate for specific situations. You are responsible for reviewing AI responses and configuring the system appropriately for your business.</p>
                <p>We are not liable for any decisions made by your customers or staff based on AI-generated information. Operator AI is a tool to assist, not replace, professional judgment in regulated industries.</p>
              </Section>

              <Section id="limitation" title="11. Limitation of Liability">
                <p>TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, IN NO EVENT SHALL Operator TECHNOLOGIES BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING BUT NOT LIMITED TO LOST PROFITS, LOST REVENUE, LOST BUSINESS OPPORTUNITIES, OR LOSS OF DATA, ARISING FROM YOUR USE OF THE SERVICE.</p>
                <p>OUR TOTAL LIABILITY TO YOU FOR ANY CLAIMS ARISING FROM OR RELATED TO THE SERVICE SHALL NOT EXCEED THE GREATER OF: (A) THE AMOUNT YOU PAID US IN THE 3 MONTHS PRECEDING THE CLAIM, OR (B) $100 USD.</p>
                <p>Some jurisdictions do not allow the limitation or exclusion of certain damages, so the above limitation may not apply to you in full.</p>
              </Section>

              <Section id="indemnification" title="12. Indemnification">
                <p>You agree to defend, indemnify, and hold harmless Operator Technologies and its officers, directors, employees, and agents from any claims, liabilities, damages, costs, and expenses (including reasonable legal fees) arising from:</p>
                <ul className="list-disc list-inside space-y-space-2 pl-space-2">
                  <li>Your use of the Service in violation of these Terms</li>
                  <li>Your violation of any applicable laws or regulations</li>
                  <li>Content you upload or publish through the Service</li>
                  <li>Your customers' interactions with Operator AI</li>
                  <li>Any claim that your use of the Service infringes a third party's rights</li>
                </ul>
              </Section>

              <Section id="termination" title="13. Termination">
                <p><strong className="text-foreground">By You:</strong> You may close your account at any time from your account settings or by contacting us. Closing your account cancels your subscription at the end of the current billing period.</p>
                <p><strong className="text-foreground">By Us:</strong> We may suspend or terminate your account immediately if you: violate these Terms; fail to pay fees; engage in fraudulent activity; or if required by law. We will provide notice when possible.</p>
                <p><strong className="text-foreground">Effect of Termination:</strong> Upon termination, your right to use the Service ends. We will provide a 30-day window to export your data. After that, your data will be deleted in accordance with our Privacy Policy and data retention schedules.</p>
              </Section>

              <Section id="agency" title="14. Agency & Reseller Terms">
                <p>Customers on Agency plans ("Agencies") agree to additional terms:</p>
                <ul className="list-disc list-inside space-y-space-2 pl-space-2">
                  <li>Agencies are responsible for ensuring their client accounts comply with these Terms</li>
                  <li>Agencies may resell the Service to clients at their own pricing, but may not misrepresent the underlying platform</li>
                  <li>Agencies must provide their own terms of service to their clients covering the agency's liability</li>
                  <li>Agencies may white-label the Service under their own brand for the purposes permitted in their plan</li>
                  <li>Operator is not responsible for disputes between Agencies and their clients</li>
                </ul>
              </Section>

              <Section id="governing-law" title="15. Governing Law">
                <p>These Terms are governed by the laws of India, without regard to its conflict of law provisions. Any disputes shall be subject to the exclusive jurisdiction of the courts in Mumbai, Maharashtra, India.</p>
                <p>For customers in the European Union or United Kingdom, mandatory consumer protection laws in your country of residence apply and are not affected by this choice of law clause.</p>
                <p>Disputes must first be raised with us in writing. We will attempt to resolve disputes informally within 30 days before any formal proceedings are initiated.</p>
              </Section>

              <Section id="changes" title="16. Changes to Terms">
                <p>We may modify these Terms at any time. For material changes, we will provide at least 30 days notice via email and/or in-app notification.</p>
                <p>Your continued use of the Service after the effective date of changes constitutes acceptance of the new Terms. If you do not agree to the modified Terms, you must stop using the Service and may cancel your subscription for a prorated refund.</p>
              </Section>

              <Section id="contact-terms" title="17. Contact">
                <p>For questions about these Terms, contact us at:</p>
                <div className="radius-xl border border-border/40 bg-card/30 p-space-5 mt-space-3 space-y-space-2">
                  <p><strong className="text-foreground">Legal inquiries:</strong> legal@operator.ai</p>
                  <p><strong className="text-foreground">General support:</strong> support@operator.ai</p>
                  <p><strong className="text-foreground">Response time:</strong> Within 5 business days</p>
                </div>
              </Section>

            </div>
          </div>
        </div>
      </main>

      <MarketingFooter />
    </div>
  );
}
