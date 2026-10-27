const fs = require('fs');

let file = fs.readFileSync('src/app/integrations/page.tsx', 'utf8');

// 1. Replace visualNodes definition with PIPELINE_NODES
const visualNodesStart = file.indexOf('const visualNodes = [');
const visualNodesEnd = file.indexOf('];', visualNodesStart) + 2;

const pipelineNodesCode = `  const PIPELINE_NODES = [
    {
      id: "google-calendar",
      name: "Google Calendar",
      category: "Scheduling",
      logo: LOGOS.googleCalendar,
      protocol: "REST v3 / Webhook",
      latency: "42ms",
      throughput: "99.98% Synced",
      payload: \`{
  "action": "calendar.slot_reserve",
  "provider": "google_calendar",
  "data": {
    "calendarId": "primary",
    "slot": "2026-07-28T14:30:00Z",
    "duration": 45,
    "summary": "Emergency Dental Checkup - John Doe",
    "collisionCheck": "passed"
  }
}\`
    },
    {
      id: "outlook",
      name: "Microsoft Outlook",
      category: "Scheduling",
      logo: LOGOS.outlook,
      protocol: "Microsoft Graph API",
      latency: "58ms",
      throughput: "100% Conflict-Free",
      payload: \`{
  "action": "m365.event_sync",
  "provider": "outlook_calendar",
  "data": {
    "mailbox": "appointments@clinic.com",
    "start": "2026-07-28T15:00:00Z",
    "chair": "Operator_Chair_2",
    "autoLock": true
  }
}\`
    },
    {
      id: "calendly",
      name: "Calendly",
      category: "Scheduling",
      logo: LOGOS.calendly,
      protocol: "Webhooks v2",
      latency: "35ms",
      throughput: "Instant Push",
      payload: \`{
  "event": "invitee.created",
  "source": "calendly",
  "data": {
    "event_type": "30min_consultation",
    "email": "caller@example.com",
    "status": "confirmed"
  }
}\`
    },
    {
      id: "whatsapp",
      name: "WhatsApp Business",
      category: "Communication",
      logo: LOGOS.whatsapp,
      protocol: "Meta Cloud API v20",
      latency: "65ms",
      throughput: "Zero Delay Dispatch",
      payload: \`{
  "action": "message.dispatch",
  "provider": "whatsapp_cloud",
  "data": {
    "recipient": "+15550192834",
    "template": "appointment_reminder_v2",
    "params": ["Dr. Mitchell", "Tomorrow at 10:00 AM"]
  }
}\`
    },
    {
      id: "stripe",
      name: "Stripe Payments",
      category: "Payments",
      logo: LOGOS.stripe,
      protocol: "Stripe Connect v1",
      latency: "74ms",
      throughput: "PCI-DSS Level 1",
      payload: \`{
  "action": "checkout.session_create",
  "provider": "stripe",
  "data": {
    "amount": 5000,
    "currency": "usd",
    "description": "Retainer Fee for Consultation",
    "status": "authorized"
  }
}\`
    },
    {
      id: "razorpay",
      name: "Razorpay",
      category: "Payments",
      logo: LOGOS.razorpay,
      protocol: "UPI Gateway Direct",
      latency: "82ms",
      throughput: "Instant Settlement",
      payload: \`{
  "action": "payment_link.generate",
  "provider": "razorpay",
  "data": {
    "amount": 150000,
    "currency": "INR",
    "customer": "+919876543210",
    "method": "upi"
  }
}\`
    },
    {
      id: "twilio",
      name: "Twilio Telephony",
      category: "Telephony",
      logo: LOGOS.twilio,
      protocol: "SIP Duplex RFC 3261",
      latency: "18ms",
      throughput: "< 800ms Voice Bridge",
      payload: \`{
  "event": "voice.stream_established",
  "provider": "twilio_sip",
  "data": {
    "callSid": "CA928371928374",
    "codec": "Opus 48kHz",
    "duplex": true,
    "jitter": "< 4ms"
  }
}\`
    },
    {
      id: "gemini",
      name: "Google Gemini Models",
      category: "AI",
      logo: LOGOS.gemini,
      protocol: "Multimodal Reasoning API",
      latency: "94ms",
      throughput: "Real-Time Context Match",
      payload: \`{
  "model": "gemini-2.0-flash",
  "intent": "emergency_intake_triage",
  "confidence": 0.994,
  "structuredOutput": {
    "urgency": "high",
    "insuranceVerified": true
  }
}\`
    }
  ];`;

if (visualNodesStart !== -1) {
  file = file.slice(0, visualNodesStart) + pipelineNodesCode + file.slice(visualNodesEnd);
  console.log('Replaced visualNodes with PIPELINE_NODES');
}

// 2. Replace SECTION 2 in markup
const s2Start = file.indexOf('SECTION 2: ELEVATED NETWORK GRAPH VISUALIZER');
const s3Start = file.indexOf('SECTION 3: CORE MAPPINGS');

if (s2Start !== -1 && s3Start !== -1) {
  const sectionCutStart = file.lastIndexOf('{/*', s2Start);
  const sectionCutEnd = file.lastIndexOf('{/*', s3Start);

  const newSection2 = `{/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        SECTION 2: ENTERPRISE BI-DIRECTIONAL SYNC ARCHITECTURE
        ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        <section className="relative max-w-5xl mx-auto px-space-6 pb-space-24 z-10">
          <GsapScrollSection animation="scale-up">
            <div className="rounded-3xl border border-[hsl(var(--foreground)/0.08)] bg-card/40 backdrop-blur-md p-space-6 md:p-space-8 overflow-hidden relative shadow-lg">
              <div className="absolute inset-0 dot-grid opacity-15 pointer-events-none" />

              {/* Architecture Telemetry Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-space-4 border-b border-[hsl(var(--foreground)/0.06)] pb-space-5 mb-space-8 relative z-10">
                <div className="flex items-center gap-space-3">
                  <div className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-ping" />
                  <span className="text-caption font-mono uppercase tracking-widest text-emerald-500 font-medium">
                    Live Enterprise Sync Hub
                  </span>
                  <span className="text-muted-foreground/40 hidden sm:inline">•</span>
                  <span className="text-caption font-mono text-muted-foreground hidden sm:inline">
                    Zero-Collision Lock Protocol
                  </span>
                </div>
                <div className="flex items-center gap-space-4 font-mono text-caption text-muted-foreground">
                  <span>Network Latency: <strong className="text-primary font-medium">&lt; 95ms</strong></span>
                  <span>Uptime: <strong className="text-emerald-500 font-medium">99.99%</strong></span>
                </div>
              </div>

              {/* 3-Tier Enterprise Architecture Flow */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-6 items-stretch relative z-10 mb-space-8">
                {/* Tier 1: Inbound Gateways (3 cols) */}
                <div className="lg:col-span-3 flex flex-col justify-between gap-space-3">
                  <span className="text-caption font-mono uppercase tracking-wider text-muted-foreground font-medium">
                    1. Inbound Ingestion
                  </span>
                  {[
                    { label: "Twilio SIP Voice", sub: "Duplex Audio (<800ms)", icon: <Phone className="h-4 w-4 text-primary" /> },
                    { label: "WhatsApp Cloud API", sub: "Verified Webhooks", icon: <MessageSquare className="h-4 w-4 text-emerald-500" /> },
                    { label: "REST / Webhook Bridge", sub: "JSON Payload Intake", icon: <FileJson className="h-4 w-4 text-indigo-400" /> },
                  ].map((gw, idx) => (
                    <div
                      key={idx}
                      className="p-space-3.5 rounded-xl border border-[hsl(var(--foreground)/0.06)] bg-card/60 flex items-center gap-space-3 shadow-xs"
                    >
                      <div className="h-8 w-8 rounded-lg bg-[hsl(var(--foreground)/0.04)] flex items-center justify-center shrink-0">
                        {gw.icon}
                      </div>
                      <div className="min-w-0">
                        <p className="text-caption font-medium text-foreground truncate">{gw.label}</p>
                        <p className="text-[11px] text-muted-foreground font-mono truncate">{gw.sub}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Tier 2: Operator AI Brain & Dispatch Engine (4 cols) */}
                <div className="lg:col-span-4 rounded-2xl border border-primary/30 bg-primary/[0.03] p-space-5 flex flex-col justify-between relative overflow-hidden shadow-sm">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-2xl pointer-events-none" />
                  <div>
                    <div className="flex items-center justify-between mb-space-3">
                      <span className="text-caption font-mono uppercase tracking-wider text-primary font-medium">
                        2. Operator Core
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-primary/15 text-primary text-[10px] font-mono font-medium">
                        ACTIVE ENGINE
                      </span>
                    </div>

                    <div className="flex items-center gap-space-3 mb-space-4">
                      <div className="w-10 h-10 rounded-xl bg-card border border-primary/40 p-1 flex items-center justify-center shadow-md">
                        <Image src="/logo.png" alt="Operator Core" width={32} height={32} unoptimized className="object-contain" />
                      </div>
                      <div>
                        <h4 className="text-body-sm font-bold text-foreground">Autonomous Router</h4>
                        <p className="text-[11px] text-muted-foreground font-mono">Bi-Directional State Machine</p>
                      </div>
                    </div>

                    <div className="space-y-space-2 text-caption font-mono">
                      <div className="p-2 rounded-lg bg-card/70 border border-[hsl(var(--foreground)/0.05)] flex items-center justify-between">
                        <span className="text-muted-foreground">Intent Extraction:</span>
                        <span className="text-emerald-500 font-medium">99.4% Match</span>
                      </div>
                      <div className="p-2 rounded-lg bg-card/70 border border-[hsl(var(--foreground)/0.05)] flex items-center justify-between">
                        <span className="text-muted-foreground">Double-Booking Guard:</span>
                        <span className="text-emerald-500 font-medium">Active Lock</span>
                      </div>
                      <div className="p-2 rounded-lg bg-card/70 border border-[hsl(var(--foreground)/0.05)] flex items-center justify-between">
                        <span className="text-muted-foreground">Secure Payment Gate:</span>
                        <span className="text-primary font-medium">PCI-DSS Synced</span>
                      </div>
                    </div>
                  </div>

                  <p className="text-[11px] text-muted-foreground font-mono mt-space-3 text-center border-t border-[hsl(var(--foreground)/0.06)] pt-space-2.5">
                    Sync Event Engine: <span className="text-foreground">2,840 calls triaged today</span>
                  </p>
                </div>

                {/* Tier 3: Connected Adapters Grid (5 cols) */}
                <div className="lg:col-span-5 flex flex-col justify-between gap-space-2">
                  <div className="flex items-center justify-between">
                    <span className="text-caption font-mono uppercase tracking-wider text-muted-foreground font-medium">
                      3. Production Adapters (Click to inspect)
                    </span>
                    <span className="text-[11px] font-mono text-muted-foreground">
                      {PIPELINE_NODES.length} Active
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-space-2">
                    {PIPELINE_NODES.map((node) => {
                      const isSelected = activeVisualId === node.id;
                      const isConnected = connectedIds.includes(node.id);

                      return (
                        <button
                          key={node.id}
                          type="button"
                          onClick={() => setActiveVisualId(node.id)}
                          className={cn(
                            "p-space-2.5 rounded-xl border text-left transition-all cursor-pointer flex items-center gap-space-2.5 select-none",
                            isSelected
                              ? "border-primary bg-primary/10 shadow-sm ring-1 ring-primary/30"
                              : "border-[hsl(var(--foreground)/0.06)] bg-card/60 hover:border-primary/30 hover:bg-card"
                          )}
                        >
                          <div className="w-7 h-7 rounded-lg bg-white p-1 border border-border/40 flex items-center justify-center shrink-0 shadow-xs">
                            {node.logo}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-caption font-medium text-foreground truncate leading-tight">
                              {node.name}
                            </p>
                            <span className="text-[10px] font-mono text-emerald-500 flex items-center gap-1">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 inline-block" />
                              {isConnected ? "Linked" : "Standby"}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Dynamic Selected Adapter Inspector Bar */}
              {(() => {
                const selected = PIPELINE_NODES.find((n) => n.id === activeVisualId) || PIPELINE_NODES[0];
                const activeIntegration = INTEGRATIONS.find((i) => i.id === selected.id) || INTEGRATIONS[0];
                const isConnected = connectedIds.includes(selected.id);
                const isLoading = connectingId === selected.id;

                return (
                  <div className="rounded-2xl border border-[hsl(var(--foreground)/0.08)] bg-card/80 p-space-5 shadow-xs relative z-10 animate-in fade-in duration-200">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-space-4 border-b border-[hsl(var(--foreground)/0.06)] pb-space-4 mb-space-4">
                      <div className="flex items-center gap-space-3">
                        <div className="w-10 h-10 rounded-xl bg-white p-2 border border-border/40 flex items-center justify-center shadow-xs shrink-0">
                          {selected.logo}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-body-md font-bold text-foreground">{selected.name}</h4>
                            <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 font-medium">
                              {selected.category}
                            </span>
                          </div>
                          <p className="text-caption text-muted-foreground font-mono mt-0.5">
                            Protocol: <span className="text-foreground">{selected.protocol}</span> • Latency: <span className="text-emerald-500">{selected.latency}</span> • {selected.throughput}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-space-3">
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(selected.payload);
                            setIsCopied(true);
                            setTimeout(() => setIsCopied(false), 2000);
                          }}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[hsl(var(--foreground)/0.08)] bg-[hsl(var(--foreground)/0.02)] hover:bg-[hsl(var(--foreground)/0.05)] text-caption font-mono text-muted-foreground hover:text-foreground transition-colors cursor-pointer select-none"
                        >
                          {isCopied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                          <span>{isCopied ? "Copied" : "Copy Payload"}</span>
                        </button>
                        <Button
                          onClick={() => handleConnect(selected.id)}
                          variant={isConnected ? "outline" : "default"}
                          size="sm"
                          disabled={isLoading}
                          className="font-medium text-caption h-8"
                        >
                          {isLoading ? "Syncing..." : isConnected ? "Disconnect Adapter" : "Connect Adapter"}
                        </Button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-12 gap-space-4 items-center">
                      <div className="md:col-span-5 text-caption text-muted-foreground leading-relaxed">
                        <p className="text-foreground font-medium mb-1">{activeIntegration.desc}</p>
                        <p className="text-caption font-mono bg-[hsl(var(--foreground)/0.02)] p-2 rounded-lg border border-[hsl(var(--foreground)/0.04)]">
                          Active AI Function: {activeIntegration.capabilities}
                        </p>
                      </div>
                      <div className="md:col-span-7 bg-[#07090E] rounded-xl p-space-3.5 border border-border/30 overflow-x-auto text-[11px] font-mono text-slate-300">
                        <pre className="whitespace-pre"><code>{selected.payload}</code></pre>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          </GsapScrollSection>
        </section>\n\n        `;

  file = file.slice(0, sectionCutStart) + newSection2 + file.slice(sectionCutEnd);
  console.log('Replaced Section 2 with Enterprise Sync Architecture!');
}

// 3. Add Scoped Future Integrations Section after Section 4 (or before Final CTA)
const s5Pos = file.indexOf('SECTION 5: ENTERPRISE TELEMETRY');
if (s5Pos !== -1) {
  const cutPoint = file.lastIndexOf('{/*', s5Pos);
  const futureSectionMarkup = `{/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        SCOPED FUTURE INTEGRATIONS (ROADMAP)
        ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        <section className="mx-auto max-w-5xl px-space-6 pb-space-24 z-10 relative">
          <GsapScrollSection animation="fade-up">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-space-4 mb-space-10">
              <div>
                <div className="inline-flex items-center gap-space-2 px-space-3 py-space-1 rounded-full border border-primary/20 bg-primary/5 mb-space-4">
                  <span className="text-caption uppercase font-mono tracking-widest font-medium text-primary">Future Roadmap</span>
                </div>
                <h2 className="text-heading-xl tracking-tight-md font-bold text-foreground">
                  Scoped Integrations.
                  <br />
                  <span className="text-primary">Scheduled for upcoming releases.</span>
                </h2>
              </div>
              <p className="text-caption md:text-body-sm text-muted-foreground max-w-xs leading-relaxed">
                Connectors currently in active API partner verification and protocol architecture.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-space-5">
              {FUTURE_INTEGRATIONS.map((item) => (
                <div
                  key={item.id}
                  className="rounded-2xl border border-[hsl(var(--foreground)/0.06)] bg-card/40 backdrop-blur-xs p-space-6 flex flex-col justify-between hover:border-primary/25 transition-all"
                >
                  <div>
                    <div className="flex items-center justify-between mb-space-4">
                      <div className="flex items-center gap-space-3">
                        <div className="w-10 h-10 rounded-xl bg-card border border-border/40 p-2 flex items-center justify-center shadow-xs">
                          {item.logo}
                        </div>
                        <div>
                          <h4 className="text-body-sm font-bold text-foreground">{item.name}</h4>
                          <span className="text-[10px] font-mono text-muted-foreground uppercase">{item.category}</span>
                        </div>
                      </div>
                      <span className="text-[11px] font-mono font-medium px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/20">
                        {item.quarter}
                      </span>
                    </div>
                    <p className="text-caption text-muted-foreground leading-relaxed mb-space-4">
                      {item.desc}
                    </p>
                  </div>
                  <div className="pt-space-3 border-t border-[hsl(var(--foreground)/0.04)] flex items-center justify-between text-[11px] font-mono text-muted-foreground">
                    <span>Scope: <strong className="text-foreground/80 font-medium">{item.scope}</strong></span>
                    <span className="text-primary">In Specification →</span>
                  </div>
                </div>
              ))}
            </div>
          </GsapScrollSection>
        </section>\n\n        `;

  file = file.slice(0, cutPoint) + futureSectionMarkup + file.slice(cutPoint);
  console.log('Added Future Scoped Integrations Section!');
}

fs.writeFileSync('src/app/integrations/page.tsx', file, 'utf8');
console.log('Integrations page successfully upgraded!');
