import { db } from "../../src/server/db";
import { leadProfiles } from "../../src/server/db/schema";
import { ORG_ID } from "./business";

export interface SeededContact {
  id: string;
  name: string;
  email: string;
  phone: string;
}

export async function seedContacts(): Promise<SeededContact[]> {
  console.log("👤 Seeding fictional test contacts for Operator Demo Salon...");

  // Primary deterministic test customers
  const primaryContacts = [
    {
      id: "66666666-1001-1111-1111-111111111111",
      name: "Aarav Patel",
      email: "aarav.patel.demo@example.com",
      phone: "+919811122233",
      status: "Booked",
      leadScore: 95,
      tags: ["VIP Client", "Hair Regular"],
      notes: "Prefers Priya Sharma for precision fade and herbal wash.",
    },
    {
      id: "66666666-1002-1111-1111-111111111111",
      name: "Ananya Iyer",
      email: "ananya.iyer.demo@example.com",
      phone: "+919822233344",
      status: "Qualified",
      leadScore: 88,
      tags: ["Skincare VIP", "Herbal Facial Regular"],
      notes: "Enjoys botanical skin treatments with Rahul Mehta.",
    },
    {
      id: "66666666-1003-1111-1111-111111111111",
      name: "Vikram Malhotra",
      email: "vikram.malhotra.demo@example.com",
      phone: "+919833344455",
      status: "Hot",
      leadScore: 80,
      tags: ["Styling Inquiry", "Event Prep"],
      notes: "Booked consultation for custom texturized hair styling.",
    },
    {
      id: "66666666-1004-1111-1111-111111111111",
      name: "Rohan Verma",
      email: "rohan.verma.demo@example.com",
      phone: "+919844455566",
      status: "New",
      leadScore: 70,
      tags: ["New Guest"],
      notes: "First time salon inquiry via website chat widget.",
    },
    {
      id: "66666666-1005-1111-1111-111111111111",
      name: "Meera Joshi",
      email: "meera.joshi.demo@example.com",
      phone: "+919855566677",
      status: "Qualified",
      leadScore: 85,
      tags: ["Facial Treatment"],
      notes: "Interested in monthly herbal rejuvenating facials.",
    }
  ];

  const seeded: SeededContact[] = [];

  for (const c of primaryContacts) {
    await db.insert(leadProfiles).values({
      id: c.id,
      organizationId: ORG_ID,
      name: c.name,
      email: c.email,
      normalizedEmail: c.email.toLowerCase().trim(),
      phone: c.phone,
      normalizedPhone: c.phone.replace(/\D/g, ""),
      status: c.status,
      leadScore: c.leadScore,
      tags: c.tags,
      notes: c.notes,
    }).onConflictDoUpdate({
      target: leadProfiles.id,
      set: {
        name: c.name,
        email: c.email,
        normalizedEmail: c.email.toLowerCase().trim(),
        phone: c.phone,
        normalizedPhone: c.phone.replace(/\D/g, ""),
        status: c.status,
        leadScore: c.leadScore,
        tags: c.tags,
        notes: c.notes,
        updatedAt: new Date(),
      }
    });

    seeded.push({
      id: c.id,
      name: c.name,
      email: c.email,
      phone: c.phone
    });
  }

  // Seed 25 additional deterministic fictional customers for CRM volume
  const firstNames = ["Kavita", "Aditya", "Neha", "Arjun", "Pooja", "Siddharth", "Tara", "Karan", "Simran", "Varun"];
  const lastNames = ["Kapoor", "Nair", "Reddy", "Singhania", "Deshmukh", "Chopra", "Bose", "Menon", "Agarwal", "Bhatia"];

  for (let i = 0; i < 25; i++) {
    const fn = firstNames[i % firstNames.length];
    const ln = lastNames[Math.floor(i / firstNames.length) % lastNames.length];
    const name = `${fn} ${ln}`;
    const email = `${fn.toLowerCase()}.${ln.toLowerCase()}.${i}@operatordemosalon.test`;
    const phone = `+9198000${String(10000 + i).slice(-5)}`;
    const id = `66666666-20${String(i).padStart(2, "0")}-1111-1111-111111111111`;

    await db.insert(leadProfiles).values({
      id,
      organizationId: ORG_ID,
      name,
      email,
      normalizedEmail: email.toLowerCase().trim(),
      phone,
      normalizedPhone: phone.replace(/\D/g, ""),
      status: i % 4 === 0 ? "Booked" : i % 3 === 0 ? "Qualified" : "New",
      leadScore: 60 + (i % 35),
      tags: ["Demonstration Record"],
    }).onConflictDoNothing();

    seeded.push({ id, name, email, phone });
  }

  console.log(`✅ Seeded ${seeded.length} fictional contacts for Operator Demo Salon`);
  return seeded;
}
