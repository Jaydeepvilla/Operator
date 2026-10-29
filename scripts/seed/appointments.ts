import { db } from "../../src/server/db";
import { appointments, appointmentStatusHistory } from "../../src/server/db/schema";
import { ORG_ID } from "./business";
import { SeededStaff } from "./staff";
import { SeededService } from "./services";
import { SeededContact } from "./contacts";

export async function seedAppointments(
  contacts: SeededContact[],
  servicesList: SeededService[],
  staff: SeededStaff[]
): Promise<void> {
  console.log("📅 Seeding appointments in different valid states for Operator Demo Salon...");

  const priya = staff.find(s => s.name.includes("Priya")) || staff[0];
  const rahul = staff.find(s => s.name.includes("Rahul")) || staff[1] || staff[0];

  const haircut = servicesList.find(s => s.name.toLowerCase().includes("haircut")) || servicesList[0];
  const styling = servicesList.find(s => s.name.toLowerCase().includes("styling")) || servicesList[1] || servicesList[0];
  const facial = servicesList.find(s => s.name.toLowerCase().includes("facial")) || servicesList[2] || servicesList[0];

  const aarav = contacts.find(c => c.name.includes("Aarav")) || contacts[0];
  const ananya = contacts.find(c => c.name.includes("Ananya")) || contacts[1] || contacts[0];
  const vikram = contacts.find(c => c.name.includes("Vikram")) || contacts[2] || contacts[0];

  const now = new Date();

  // 1. Core Demonstration Appointments across distinct valid states
  const tomorrow11am = new Date(now);
  tomorrow11am.setDate(now.getDate() + 1);
  tomorrow11am.setHours(11, 0, 0, 0);
  const tomorrow1130am = new Date(tomorrow11am.getTime() + 30 * 60 * 1000);

  const twoDaysAgo3pm = new Date(now);
  twoDaysAgo3pm.setDate(now.getDate() - 2);
  twoDaysAgo3pm.setHours(15, 0, 0, 0);
  const twoDaysAgo4pm = new Date(twoDaysAgo3pm.getTime() + 60 * 60 * 1000);

  const threeDaysFuture2pm = new Date(now);
  threeDaysFuture2pm.setDate(now.getDate() + 3);
  threeDaysFuture2pm.setHours(14, 0, 0, 0);
  const threeDaysFuture245pm = new Date(threeDaysFuture2pm.getTime() + 45 * 60 * 1000);

  const coreAppointments = [
    {
      id: "99999999-1001-1111-1111-111111111111",
      leadProfileId: aarav.id,
      serviceId: haircut.id,
      staffMemberId: priya.id,
      status: "confirmed" as const,
      startTime: tomorrow11am,
      endTime: tomorrow1130am,
      customerName: aarav.name,
      customerEmail: aarav.email,
      customerPhone: aarav.phone,
      pricePaid: "500.00",
      history: [
        { oldStatus: "pending", newStatus: "confirmed", changedBy: "system", reason: "Customer confirmed booking via AI receptionist" }
      ]
    },
    {
      id: "99999999-1002-1111-1111-111111111111",
      leadProfileId: ananya.id,
      serviceId: facial.id,
      staffMemberId: rahul.id,
      status: "completed" as const,
      startTime: twoDaysAgo3pm,
      endTime: twoDaysAgo4pm,
      customerName: ananya.name,
      customerEmail: ananya.email,
      customerPhone: ananya.phone,
      pricePaid: "1500.00",
      history: [
        { oldStatus: "confirmed", newStatus: "completed", changedBy: "staff", reason: "Facial therapy session completed successfully" }
      ]
    },
    {
      id: "99999999-1003-1111-1111-111111111111",
      leadProfileId: vikram.id,
      serviceId: styling.id,
      staffMemberId: priya.id,
      status: "pending" as const,
      startTime: threeDaysFuture2pm,
      endTime: threeDaysFuture245pm,
      customerName: vikram.name,
      customerEmail: vikram.email,
      customerPhone: vikram.phone,
      pricePaid: "0.00",
      history: [
        { oldStatus: "pending", newStatus: "pending", changedBy: "system", reason: "Initial reservation requested, awaiting confirmation" }
      ]
    }
  ];

  for (const appt of coreAppointments) {
    await db.insert(appointments).values({
      id: appt.id,
      organizationId: ORG_ID,
      leadProfileId: appt.leadProfileId,
      serviceId: appt.serviceId,
      staffMemberId: appt.staffMemberId,
      status: appt.status,
      startTime: appt.startTime,
      endTime: appt.endTime,
      customerName: appt.customerName,
      customerEmail: appt.customerEmail,
      customerPhone: appt.customerPhone,
      pricePaid: appt.pricePaid,
    }).onConflictDoUpdate({
      target: appointments.id,
      set: {
        status: appt.status,
        startTime: appt.startTime,
        endTime: appt.endTime,
        customerName: appt.customerName,
        customerEmail: appt.customerEmail,
        customerPhone: appt.customerPhone,
        pricePaid: appt.pricePaid,
        updatedAt: new Date(),
      }
    });

    for (let hIdx = 0; hIdx < appt.history.length; hIdx++) {
      const h = appt.history[hIdx];
      const hId = `99999999-200${hIdx + 1}-${appt.id.slice(14)}`;
      await db.insert(appointmentStatusHistory).values({
        id: hId,
        organizationId: ORG_ID,
        appointmentId: appt.id,
        oldStatus: h.oldStatus,
        newStatus: h.newStatus,
        changedBy: h.changedBy,
        reason: h.reason,
      }).onConflictDoNothing();
    }
  }

  // Seed 10 additional past appointments for dashboard chart activity
  for (let i = 1; i <= 10; i++) {
    const pastDate = new Date(now);
    pastDate.setDate(now.getDate() - (i * 2));
    pastDate.setHours(10 + (i % 6), 0, 0, 0);
    const pastEndDate = new Date(pastDate.getTime() + 45 * 60 * 1000);

    const contact = contacts[i % contacts.length];
    const srv = servicesList[i % servicesList.length];
    const stf = staff[i % staff.length];
    const id = `99999999-30${String(i).padStart(2, "0")}-1111-1111-111111111111`;

    await db.insert(appointments).values({
      id,
      organizationId: ORG_ID,
      leadProfileId: contact.id,
      serviceId: srv.id,
      staffMemberId: stf.id,
      status: "completed",
      startTime: pastDate,
      endTime: pastEndDate,
      customerName: contact.name,
      customerEmail: contact.email,
      customerPhone: contact.phone,
      pricePaid: srv.price,
    }).onConflictDoNothing();
  }

  console.log(`✅ Seeded ${coreAppointments.length} core appointments (confirmed, completed, pending) and historical appointments`);
}
