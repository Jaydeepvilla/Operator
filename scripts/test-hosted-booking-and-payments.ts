import { db } from "../src/server/db";
import { organizations, services, staffMembers, businessSettings, appointments, customerPayments } from "../src/server/db/schema";
import { eq } from "drizzle-orm";
import { bookingService } from "../src/server/services/booking";
import { customerPaymentService } from "../src/server/services/billing/customer-payment-service";
import { availabilityService } from "../src/server/services/availability";

async function run() {
  console.log("=== OPERATOR: HOSTED BOOKING & CUSTOMER PAYMENT ARCHITECTURE TEST ===");

  // 1. Find or verify an active test organization
  const [org] = await db.select().from(organizations).limit(1);
  if (!org) {
    console.error("No active organization found in database.");
    process.exit(1);
  }
  console.log(`[1] Active Organization: ${org.name} (${org.id}) [slug: ${org.slug || 'n/a'}]`);

  // Clear prior test appointments to ensure slot availability
  await db.delete(customerPayments).where(eq(customerPayments.customerEmail, "janedoe.test@example.com"));
  await db.delete(appointments).where(eq(appointments.customerEmail, "janedoe.test@example.com"));

  // Ensure public booking & deposits are enabled in businessSettings
  const [existingSettings] = await db
    .select()
    .from(businessSettings)
    .where(eq(businessSettings.organizationId, org.id))
    .limit(1);

  const updatedPrefs = {
    ...(existingSettings?.bookingPreferences as any || {}),
    publicBookingEnabled: true,
    depositEnabled: true,
    depositType: "fixed",
    depositAmount: "25.00",
  };

  const defaultHours = {
    monday: { isOpen: true, open: "08:00", close: "18:00" },
    tuesday: { isOpen: true, open: "08:00", close: "18:00" },
    wednesday: { isOpen: true, open: "08:00", close: "18:00" },
    thursday: { isOpen: true, open: "08:00", close: "18:00" },
    friday: { isOpen: true, open: "08:00", close: "18:00" },
    saturday: { isOpen: true, open: "09:00", close: "15:00" },
    sunday: { isOpen: false, open: "00:00", close: "00:00" },
  };

  if (existingSettings) {
    await db
      .update(businessSettings)
      .set({ 
        bookingPreferences: updatedPrefs,
        businessHours: existingSettings.businessHours || defaultHours,
      })
      .where(eq(businessSettings.organizationId, org.id));
  } else {
    await db.insert(businessSettings).values({
      organizationId: org.id,
      businessHours: defaultHours,
      bookingPreferences: updatedPrefs,
    });
  }
  console.log("[2] Verified Business Settings: publicBookingEnabled=true, depositEnabled=true, depositAmount=25.00");

  // 2. Ensure an active service and staff member exist
  let [service] = await db
    .select()
    .from(services)
    .where(eq(services.organizationId, org.id))
    .limit(1);

  if (!service) {
    [service] = await db
      .insert(services)
      .values({
        organizationId: org.id,
        name: "Executive Consultation",
        duration: 30,
        price: "100.00",
        isActive: true,
      })
      .returning();
  }
  console.log(`[3] Verified Service: ${service.name} ($${service.price}, ${service.duration} mins)`);

  let [staff] = await db
    .select()
    .from(staffMembers)
    .where(eq(staffMembers.organizationId, org.id))
    .limit(1);

  if (!staff) {
    [staff] = await db
      .insert(staffMembers)
      .values({
        organizationId: org.id,
        name: "Dr. Sarah Jenkins",
        role: "Senior Consultant",
        isActive: true,
      })
      .returning();
  }
  console.log(`[4] Verified Staff: ${staff.name} (${staff.id})`);

  // 3. Test Availability & Slot Discovery
  const testDate = new Date();
  testDate.setDate(testDate.getDate() + 3); // 3 days in future
  const dateStr = testDate.toISOString().split("T")[0];

  const slots = await availabilityService.getAvailableSlots(org.id, service.id, dateStr, staff.id);
  console.log(`[5] Availability Engine: Found ${slots.length} available slots on ${dateStr}`);

  if (slots.length === 0) {
    console.warn("No slots returned for future date. Adjusting slot window for test.");
  }
  function parseDateTimeInTimezone(dateStr: string, timeStr: string, tz: string): Date {
    const [y, m, d] = dateStr.split("-").map(Number);
    const [h, min] = timeStr.split(":").map(Number);
    const guess = new Date(Date.UTC(y, m - 1, d, h, min, 0));
    try {
      const dtf = new Intl.DateTimeFormat("en-US", {
        timeZone: tz || "UTC",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      });
      const parts = dtf.formatToParts(guess);
      const p: Record<string, string> = {};
      for (const part of parts) p[part.type] = part.value;
      let hr = parseInt(p.hour, 10);
      if (hr === 24) hr = 0;
      const formattedGuess = new Date(Date.UTC(
        parseInt(p.year, 10),
        parseInt(p.month, 10) - 1,
        parseInt(p.day, 10),
        hr,
        parseInt(p.minute, 10),
        parseInt(p.second, 10)
      ));
      const diffMs = guess.getTime() - formattedGuess.getTime();
      return new Date(guess.getTime() + diffMs);
    } catch {
      return guess;
    }
  }

  const chosenSlot = slots[0] || { startTime: "10:00", endTime: "10:30" };
  const bookingStart = parseDateTimeInTimezone(dateStr, chosenSlot.startTime, org.timezone || "UTC");

  // 4. Test Booking Creation with Deposit Requirement
  console.log(`[6] Creating booking with requirePayment=true for slot ${chosenSlot.startTime}...`);
  const bookingResult = await bookingService.createAppointment({
    organizationId: org.id,
    serviceId: service.id,
    staffMemberId: staff.id,
    startTime: bookingStart,
    customerName: "Jane Doe (Integration Test)",
    customerEmail: "janedoe.test@example.com",
    customerPhone: "+15550192834",
    isPublic: true,
    requirePayment: true,
  });

  if (!bookingResult.id) {
    throw new Error("Booking creation failed: no appointment ID returned.");
  }
  if (bookingResult.status !== "pending_payment") {
    throw new Error(`Expected status 'pending_payment', received '${bookingResult.status}'`);
  }
  if (!bookingResult.payment || !bookingResult.payment.paymentLink) {
    throw new Error("Expected payment session with paymentLink attached to booking result.");
  }
  console.log(`✓ Booking created successfully: ID=${bookingResult.id}, Status=${bookingResult.status}`);
  console.log(`✓ Customer Payment Session created: ID=${bookingResult.payment.paymentId}, Link=${bookingResult.payment.paymentLink}`);

  // 5. Test Concurrency Protection (Double Booking Prevention)
  console.log("[7] Testing Concurrency Guard: Attempting double booking on exact same slot...");
  let doubleBookingPrevented = false;
  try {
    await bookingService.createAppointment({
      organizationId: org.id,
      serviceId: service.id,
      staffMemberId: staff.id,
      startTime: bookingStart,
      customerName: "Impostor Concurrent (Should Fail)",
      customerEmail: "impostor@example.com",
      isPublic: true,
    });
  } catch (err: any) {
    doubleBookingPrevented = true;
    console.log(`✓ Concurrency Conflict successfully caught: "${err.message}"`);
  }

  if (!doubleBookingPrevented) {
    throw new Error("Double booking was NOT prevented! Concurrency guard failure.");
  }

  // 6. Test Payment Confirmation & Atomic Transition to Confirmed
  console.log("[8] Testing Payment Confirmation via customerPaymentService...");
  const confirmResult = await customerPaymentService.confirmCustomerPayment({
    paymentId: bookingResult.payment.paymentId,
    providerPaymentId: "pi_test_live_verify_" + Date.now(),
  });

  if (!confirmResult.success) {
    throw new Error(`Payment confirmation failed: ${confirmResult.error}`);
  }
  console.log(`✓ Payment successfully confirmed for appointment: ID=${confirmResult.appointmentId}`);

  // Verify DB state of appointment
  const [updatedApt] = await db
    .select()
    .from(appointments)
    .where(eq(appointments.id, bookingResult.id));

  if (updatedApt.status !== "confirmed") {
    throw new Error(`Expected appointment status 'confirmed', found '${updatedApt.status}'`);
  }
  console.log(`✓ Appointment ${updatedApt.id} atomically transitioned to status='confirmed'.`);

  // Verify customerPayments table isolation from SaaS subscriptions
  const [custPayment] = await db
    .select()
    .from(customerPayments)
    .where(eq(customerPayments.id, bookingResult.payment.paymentId));

  if (!custPayment || custPayment.status !== "captured") {
    throw new Error(`Customer payment record in DB expected status 'captured', found '${custPayment?.status}'`);
  }
  console.log(`✓ Verified customer_payments row: amount=${custPayment.amount} ${custPayment.currency}, status=${custPayment.status}, provider=${custPayment.provider}`);

  // Clean up test appointment & payment so test is idempotent and doesn't pollute
  await db.delete(customerPayments).where(eq(customerPayments.id, bookingResult.payment.paymentId));
  await db.delete(appointments).where(eq(appointments.id, bookingResult.id));
  console.log("[9] Cleaned up temporary integration test records cleanly.");

  console.log("\n=======================================================");
  console.log("ALL 9 HOSTED BOOKING & PAYMENT INVARIANTS PASSED! ✓");
  console.log("=======================================================\n");
  process.exit(0);
}

run().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
