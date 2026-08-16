import { 
  whatsappAdapter, 
  voiceAdapter, 
  widgetAdapter, 
  InboundMessage, 
  ReceptionistResponse 
} from "../src/server/services/receptionist";

function runUnifiedReceptionistTests() {
  console.log("\n=======================================================");
  console.log("🤖 TESTING UNIFIED AI RECEPTIONIST ARCHITECTURE");
  console.log("=======================================================\n");

  let passed = 0;
  let total = 0;

  function assert(condition: boolean, testName: string) {
    total++;
    if (condition) {
      console.log(`   ✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`   ❌ FAIL: ${testName}`);
      throw new Error(`Test failed: ${testName}`);
    }
  }

  // 1. WhatsApp Canonical Normalization
  console.log("1. Testing WhatsApp Webhook Inbound Normalization...");
  const waInbound: InboundMessage = whatsappAdapter.fromMetaWebhook({
    organizationId: "org-123",
    phoneId: "meta-phone-999",
    fromNumber: "+15550192834",
    profileName: "Sarah Connor",
    messageId: "wamid.HBgLMTU1NTAxOTI4MzQVAgASGBQz",
    textBody: "Hi, how much is a dental cleaning?",
    timestamp: Math.floor(Date.now() / 1000),
  });

  assert(waInbound.channel === "whatsapp", "Channel is normalized to 'whatsapp'");
  assert(waInbound.customer.phone === "+15550192834", "Customer phone is extracted");
  assert(waInbound.customer.name === "Sarah Connor", "Customer name is extracted");
  assert(waInbound.content.text === "Hi, how much is a dental cleaning?", "Text body is normalized");

  // 2. Voice Speech Turn Canonical Normalization
  console.log("\n2. Testing Voice Inbound Turn Normalization...");
  const voiceInbound: InboundMessage = voiceAdapter.fromVoiceSpeechTurn({
    organizationId: "org-123",
    phoneNumberId: "phone-did-444",
    callSid: "CA1234567890abcdef",
    callerNumber: "+15559998877",
    speechTranscript: "Can I book an appointment tomorrow afternoon?",
    conversationId: "conv-voice-001",
  });

  assert(voiceInbound.channel === "voice", "Channel is normalized to 'voice'");
  assert(voiceInbound.customer.phone === "+15559998877", "Caller phone is extracted");
  assert(voiceInbound.externalConversationId === "CA1234567890abcdef", "CallSid mapped to external thread");
  assert(voiceInbound.content.text === "Can I book an appointment tomorrow afternoon?", "Speech transcript normalized");

  // 3. Web Widget Turn Canonical Normalization
  console.log("\n3. Testing Web Widget Inbound Turn Normalization...");
  const widgetInbound: InboundMessage = widgetAdapter.fromWidgetEvent({
    organizationId: "org-123",
    sessionId: "sess_web_xyz123",
    userText: "What are your hours on Saturday?",
    visitorName: "David Miller",
    visitorEmail: "david@example.com",
  });

  assert(widgetInbound.channel === "widget", "Channel is normalized to 'widget'");
  assert(widgetInbound.customer.externalId === "sess_web_xyz123", "Session ID mapped to external ID");
  assert(widgetInbound.customer.email === "david@example.com", "Visitor email captured");
  assert(widgetInbound.content.text === "What are your hours on Saturday?", "Chat message text normalized");

  console.log("\n=======================================================");
  console.log(`🎉 ALL ${passed}/${total} UNIFIED RECEPTIONIST CONTRACT TESTS PASSED!`);
  console.log("=======================================================\n");
}

runUnifiedReceptionistTests();
