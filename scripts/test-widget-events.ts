import {
  OPERATOR_WIDGET_EVENTS,
  LEGACY_WIDGET_EVENTS,
  isValidWidgetMessage,
  normalizeWidgetEventType,
  OperatorWidgetMessagePayload
} from "../src/lib/constants/widget-events";
import { readFileSync } from "fs";
import { join } from "path";

let passedCount = 0;
let failedCount = 0;

function assert(condition: boolean, description: string) {
  if (condition) {
    console.log(`  ✅ PASS: ${description}`);
    passedCount++;
  } else {
    console.error(`  ❌ FAIL: ${description}`);
    failedCount++;
  }
}

console.log("\n=======================================================");
console.log("   OPERATOR WIDGET POSTMESSAGE EVENT VERIFICATION   ");
console.log("=======================================================\n");

// 1. Canonical Event Constants Definition
console.log("1. Checking Canonical Event Constants Contract...");
assert(OPERATOR_WIDGET_EVENTS.SESSION_STARTED === "operator:widget:session_started", "Session started event defined correctly");
assert(OPERATOR_WIDGET_EVENTS.BOOKING_COMPLETED === "operator:widget:booking_completed", "Booking completed event defined correctly");
assert(OPERATOR_WIDGET_EVENTS.LEAD_CAPTURED === "operator:widget:lead_captured", "Lead captured event defined correctly");
assert(OPERATOR_WIDGET_EVENTS.ESCALATED === "operator:widget:escalated", "Escalated event defined correctly");
assert(OPERATOR_WIDGET_EVENTS.TOGGLE === "operator:widget:toggle", "Toggle event defined correctly");
assert(OPERATOR_WIDGET_EVENTS.OPEN === "operator:widget:open", "Open event defined correctly");
assert(OPERATOR_WIDGET_EVENTS.CLOSE === "operator:widget:close", "Close event defined correctly");
assert(OPERATOR_WIDGET_EVENTS.READY === "operator:widget:ready", "Ready event defined correctly");
assert(OPERATOR_WIDGET_EVENTS.RESIZE === "operator:widget:resize", "Resize event defined correctly");

// 2. Legacy Event Constants Definition
console.log("\n2. Checking Isolated Legacy Compatibility Constants...");
assert(LEGACY_WIDGET_EVENTS.NEXX_SESSION_STARTED === "NEXX_SESSION_STARTED", "Legacy session started constant isolated");
assert(LEGACY_WIDGET_EVENTS.NEXX_BOOKING_COMPLETED === "NEXX_BOOKING_COMPLETED", "Legacy booking completed constant isolated");
assert(LEGACY_WIDGET_EVENTS.NEXX_LEAD_CAPTURED === "NEXX_LEAD_CAPTURED", "Legacy lead captured constant isolated");
assert(LEGACY_WIDGET_EVENTS.NEXX_ESCALATED === "NEXX_ESCALATED", "Legacy escalated constant isolated");
assert(LEGACY_WIDGET_EVENTS.NEXX_TOGGLE === "NEXX_TOGGLE", "Legacy toggle constant isolated");

// 3. Message Validation Utility
console.log("\n3. Testing Message Validation (isValidWidgetMessage)...");
assert(isValidWidgetMessage({ type: "operator:widget:session_started" }) === true, "Valid canonical session_started accepted");
assert(isValidWidgetMessage({ type: "operator:widget:booking_completed", details: {} }) === true, "Valid canonical booking_completed accepted");
assert(isValidWidgetMessage({ type: "operator:widget:toggle" }) === true, "Valid canonical toggle accepted");
assert(isValidWidgetMessage({ type: "NEXX_SESSION_STARTED" }) === true, "Legacy event accepted by compatibility validator");
assert(isValidWidgetMessage({ type: "NEXX_BOOKING_COMPLETED" }) === true, "Legacy booking accepted by compatibility validator");

// Malformed / Invalid messages
assert(isValidWidgetMessage(null) === false, "Null message rejected");
assert(isValidWidgetMessage(undefined) === false, "Undefined message rejected");
assert(isValidWidgetMessage("string-message") === false, "String primitive rejected");
assert(isValidWidgetMessage(12345) === false, "Number primitive rejected");
assert(isValidWidgetMessage({}) === false, "Empty object without type rejected");
assert(isValidWidgetMessage({ type: 123 }) === false, "Non-string type property rejected");
assert(isValidWidgetMessage({ type: "UNKNOWN_MALICIOUS_EVENT" }) === false, "Unknown event type rejected");
assert(isValidWidgetMessage({ type: "javascript:alert(1)" }) === false, "XSS injection event rejected");
assert(isValidWidgetMessage({ type: "__proto__" }) === false, "Prototype pollution event rejected");

// 4. Normalization to Canonical Operator Events
console.log("\n4. Testing Event Normalization (normalizeWidgetEventType)...");
assert(normalizeWidgetEventType("operator:widget:session_started") === OPERATOR_WIDGET_EVENTS.SESSION_STARTED, "Canonical event normalizes to itself");
assert(normalizeWidgetEventType("NEXX_SESSION_STARTED") === OPERATOR_WIDGET_EVENTS.SESSION_STARTED, "Legacy NEXX_SESSION_STARTED normalizes to operator:widget:session_started");
assert(normalizeWidgetEventType("NEXX_BOOKING_COMPLETED") === OPERATOR_WIDGET_EVENTS.BOOKING_COMPLETED, "Legacy NEXX_BOOKING_COMPLETED normalizes to operator:widget:booking_completed");
assert(normalizeWidgetEventType("NEXX_LEAD_CAPTURED") === OPERATOR_WIDGET_EVENTS.LEAD_CAPTURED, "Legacy NEXX_LEAD_CAPTURED normalizes to operator:widget:lead_captured");
assert(normalizeWidgetEventType("NEXX_ESCALATED") === OPERATOR_WIDGET_EVENTS.ESCALATED, "Legacy NEXX_ESCALATED normalizes to operator:widget:escalated");
assert(normalizeWidgetEventType("NEXX_TOGGLE") === OPERATOR_WIDGET_EVENTS.TOGGLE, "Legacy NEXX_TOGGLE normalizes to operator:widget:toggle");
assert(normalizeWidgetEventType("INVALID_EVENT") === null, "Invalid event returns null");

// 5. Origin and Source Security Simulation
console.log("\n5. Testing Security Origin & Source Isolation Logic...");
const hostUrl = "https://app.operator.ai";

function simulateWidgetListener(event: { origin: string; source: any; data: any }, trustedIframeWindow: any) {
  let executedAction: string | null = null;

  // 1. Origin validation
  if (event.origin !== hostUrl) {
    return { status: "REJECTED_ORIGIN", action: null };
  }

  // 2. Source validation
  if (trustedIframeWindow && event.source !== trustedIframeWindow) {
    return { status: "REJECTED_SOURCE", action: null };
  }

  // 3. Payload validation
  if (!isValidWidgetMessage(event.data)) {
    return { status: "REJECTED_PAYLOAD", action: null };
  }

  const normalized = normalizeWidgetEventType(event.data.type);
  if (!normalized) {
    return { status: "REJECTED_UNKNOWN_TYPE", action: null };
  }

  switch (normalized) {
    case OPERATOR_WIDGET_EVENTS.SESSION_STARTED:
      executedAction = "SAVE_SESSION";
      break;
    case OPERATOR_WIDGET_EVENTS.BOOKING_COMPLETED:
      executedAction = "TRACK_BOOKING";
      break;
    case OPERATOR_WIDGET_EVENTS.TOGGLE:
      executedAction = "TOGGLE_WIDGET";
      break;
    case OPERATOR_WIDGET_EVENTS.OPEN:
      executedAction = "OPEN_WIDGET";
      break;
    case OPERATOR_WIDGET_EVENTS.CLOSE:
      executedAction = "CLOSE_WIDGET";
      break;
    default:
      executedAction = "PROCESSED";
  }

  return { status: "ACCEPTED", action: executedAction };
}

const mockIframeWindow = { id: "trusted-iframe-window" };
const mockEvilWindow = { id: "attacker-iframe-window" };

// Scenario A: Canonical event from trusted origin & source
const resA = simulateWidgetListener(
  {
    origin: "https://app.operator.ai",
    source: mockIframeWindow,
    data: { type: "operator:widget:session_started", conversationId: "conv_123" }
  },
  mockIframeWindow
);
assert(resA.status === "ACCEPTED" && resA.action === "SAVE_SESSION", "Trusted canonical message accepted and processed");

// Scenario B: Legacy event from trusted origin & source (compatibility)
const resB = simulateWidgetListener(
  {
    origin: "https://app.operator.ai",
    source: mockIframeWindow,
    data: { type: "NEXX_TOGGLE" }
  },
  mockIframeWindow
);
assert(resB.status === "ACCEPTED" && resB.action === "TOGGLE_WIDGET", "Trusted legacy message accepted via compat layer");

// Scenario C: Malicious origin attempting to trigger widget toggle
const resC = simulateWidgetListener(
  {
    origin: "https://attacker.evil.com",
    source: mockIframeWindow,
    data: { type: "operator:widget:toggle" }
  },
  mockIframeWindow
);
assert(resC.status === "REJECTED_ORIGIN" && resC.action === null, "Message from unauthorized origin rejected immediately");

// Scenario D: Malicious window source attempting to spoof iframe
const resD = simulateWidgetListener(
  {
    origin: "https://app.operator.ai",
    source: mockEvilWindow,
    data: { type: "operator:widget:toggle" }
  },
  mockIframeWindow
);
assert(resD.status === "REJECTED_SOURCE" && resD.action === null, "Message from unauthorized window source rejected immediately");

// Scenario E: Invalid / malformed payload
const resE = simulateWidgetListener(
  {
    origin: "https://app.operator.ai",
    source: mockIframeWindow,
    data: "invalid-raw-string"
  },
  mockIframeWindow
);
assert(resE.status === "REJECTED_PAYLOAD" && resE.action === null, "Malformed non-object payload rejected");

// 6. Inspect Source Files for Outdated NEXX_ Runtime Senders
console.log("\n6. Auditing Source Files for Zero Outdated Outgoing NEXX_* Senders...");
const widgetFrameCode = readFileSync(join(__dirname, "../src/app/widget-frame/page.tsx"), "utf-8");
assert(!widgetFrameCode.includes('"NEXX_SESSION_STARTED"'), "widget-frame/page.tsx does not send raw NEXX_SESSION_STARTED");
assert(!widgetFrameCode.includes('"NEXX_ESCALATED"'), "widget-frame/page.tsx does not send raw NEXX_ESCALATED");
assert(!widgetFrameCode.includes('"NEXX_BOOKING_COMPLETED"'), "widget-frame/page.tsx does not send raw NEXX_BOOKING_COMPLETED");
assert(!widgetFrameCode.includes('"NEXX_TOGGLE"'), "widget-frame/page.tsx does not send raw NEXX_TOGGLE");
assert(widgetFrameCode.includes("OPERATOR_WIDGET_EVENTS"), "widget-frame/page.tsx uses OPERATOR_WIDGET_EVENTS constants");

const publicWidgetJs = readFileSync(join(__dirname, "../public/widget.js"), "utf-8");
assert(publicWidgetJs.includes("operator:widget:session_started"), "public/widget.js listens for canonical operator:widget:session_started");
assert(publicWidgetJs.includes("operator:widget:booking_completed"), "public/widget.js listens for canonical operator:widget:booking_completed");
assert(publicWidgetJs.includes("operator:widget:toggle"), "public/widget.js listens for canonical operator:widget:toggle");
assert(publicWidgetJs.includes("event.origin !== hostUrl"), "public/widget.js enforces strict event.origin validation");
assert(publicWidgetJs.includes("event.source !== iframe.contentWindow"), "public/widget.js enforces strict event.source validation");

console.log("\n=======================================================");
console.log(`TOTAL PASSED: ${passedCount}`);
console.log(`TOTAL FAILED: ${failedCount}`);
console.log("=======================================================\n");

if (failedCount > 0) {
  process.exit(1);
}
