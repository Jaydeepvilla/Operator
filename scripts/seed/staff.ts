import { db } from "../../src/server/db";
import { staffMembers, staffSchedules, serviceAssignments } from "../../src/server/db/schema";
import { ORG_ID } from "./business";

export interface SeededStaff {
  id: string;
  name: string;
  email: string;
  role: string;
}

export async function seedStaff(): Promise<SeededStaff[]> {
  console.log("👥 Seeding salon staff members for Operator Demo Salon...");

  // Static UUIDs for idempotency
  const staffData = [
    {
      id: "77777777-1111-1111-1111-111111111111",
      name: "Priya Sharma",
      role: "admin", // Lead Stylist & Salon Manager
      email: "priya.sharma@operatordemosalon.test",
      phone: "+919876543211",
      avatarUrl: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&h=150&fit=crop",
      bufferTime: 10,
    },
    {
      id: "77777777-2222-2222-2222-222222222222",
      name: "Rahul Mehta",
      role: "staff", // Senior Aesthetician & Skin Specialist
      email: "rahul.mehta@operatordemosalon.test",
      phone: "+919876543212",
      avatarUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop",
      bufferTime: 15,
    }
  ];

  for (const staff of staffData) {
    await db.insert(staffMembers).values({
      id: staff.id,
      organizationId: ORG_ID,
      name: staff.name,
      role: staff.role,
      email: staff.email,
      phone: staff.phone,
      avatarUrl: staff.avatarUrl,
      bufferTime: staff.bufferTime,
      isActive: true,
    }).onConflictDoUpdate({
      target: staffMembers.id,
      set: {
        name: staff.name,
        role: staff.role,
        email: staff.email,
        phone: staff.phone,
        bufferTime: staff.bufferTime,
        isActive: true,
        updatedAt: new Date(),
      }
    });

    // Seed Schedules (Tuesday to Sunday, Monday closed)
    // 0 is Sunday, 1 is Monday, ..., 6 is Saturday
    for (let day = 0; day <= 6; day++) {
      if (day === 1) continue; // Skip Monday (closed)

      let shifts = [{ start: "10:00", end: "20:00" }];
      if (day === 0) { // Sunday shifts: 10:00 to 18:00
        shifts = [{ start: "10:00", end: "18:00" }];
      } else if (day === 6) { // Saturday shifts: 09:00 to 21:00
        shifts = [{ start: "09:00", end: "21:00" }];
      }

      await db.insert(staffSchedules).values({
        organizationId: ORG_ID,
        staffMemberId: staff.id,
        dayOfWeek: day,
        shifts: shifts,
      }).onConflictDoNothing();
    }
  }

  // Link staff to services
  const svcHaircut = "55555555-1001-1111-1111-111111111111";
  const svcStyling = "55555555-1002-1111-1111-111111111111";
  const svcFacial = "55555555-1003-1111-1111-111111111111";

  const assignments = [
    { id: "88888888-1001-1111-1111-111111111111", serviceId: svcHaircut, staffMemberId: staffData[0].id },
    { id: "88888888-1002-1111-1111-111111111111", serviceId: svcStyling, staffMemberId: staffData[0].id },
    { id: "88888888-1003-1111-1111-111111111111", serviceId: svcFacial, staffMemberId: staffData[1].id },
    { id: "88888888-1004-1111-1111-111111111111", serviceId: svcHaircut, staffMemberId: staffData[1].id },
  ];

  for (const assign of assignments) {
    await db.insert(serviceAssignments).values({
      id: assign.id,
      organizationId: ORG_ID,
      serviceId: assign.serviceId,
      staffMemberId: assign.staffMemberId,
    }).onConflictDoNothing();
  }

  console.log(`✅ Seeded ${staffData.length} Staff members with schedules and service assignments`);
  return staffData.map(s => ({ id: s.id, name: s.name, email: s.email, role: s.role }));
}
