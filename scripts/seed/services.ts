import { db } from "../../src/server/db";
import { serviceCategories, services } from "../../src/server/db/schema";
import { ORG_ID } from "./business";

export interface SeededService {
  id: string;
  name: string;
  price: string;
  duration: number;
}

export async function seedServices(): Promise<SeededService[]> {
  console.log("💇 Seeding service categories and salon services for Operator Demo Salon...");

  // Static category IDs
  const catHair = "44444444-1111-1111-1111-111111111111";
  const catSkin = "44444444-2222-2222-2222-222222222222";

  await db.insert(serviceCategories).values([
    { 
      id: catHair, 
      organizationId: ORG_ID, 
      name: "Hair Services", 
      description: "Precision cuts, wash, and bespoke hair styling by master stylists." 
    },
    { 
      id: catSkin, 
      organizationId: ORG_ID, 
      name: "Skincare & Facials", 
      description: "Herbal facials, deep pore purification, and revitalizing skin treatments." 
    }
  ]).onConflictDoUpdate({
    target: serviceCategories.id,
    set: {
      name: "Hair Services",
      description: "Precision cuts, wash, and bespoke hair styling by master stylists.",
      updatedAt: new Date(),
    }
  });

  const servicesData = [
    {
      id: "55555555-1001-1111-1111-111111111111",
      categoryId: catHair,
      name: "Haircut",
      description: "Precision haircut tailored to your personal aesthetic, including a clarifying herbal wash and style finish. (Demonstration Service)",
      duration: 30, // 30 minutes
      price: "500.00" // INR 500
    },
    {
      id: "55555555-1002-1111-1111-111111111111",
      categoryId: catHair,
      name: "Hair Styling",
      description: "Custom blow-out, texturizing, beard sculpt, and premium styling with natural argan oil. (Demonstration Service)",
      duration: 45, // 45 minutes
      price: "800.00" // INR 800
    },
    {
      id: "55555555-1003-1111-1111-111111111111",
      categoryId: catSkin,
      name: "Facial",
      description: "Rejuvenating herbal facial featuring botanical enzyme cleanse, pore detox, antioxidant mask, and restorative massage. (Demonstration Service)",
      duration: 60, // 60 minutes
      price: "1500.00" // INR 1500
    }
  ];

  const seeded: SeededService[] = [];

  for (const s of servicesData) {
    await db.insert(services).values({
      id: s.id,
      organizationId: ORG_ID,
      categoryId: s.categoryId,
      name: s.name,
      description: s.description,
      duration: s.duration,
      price: s.price,
      isActive: true,
      isArchived: false,
    }).onConflictDoUpdate({
      target: services.id,
      set: {
        name: s.name,
        description: s.description,
        duration: s.duration,
        price: s.price,
        isActive: true,
        isArchived: false,
        updatedAt: new Date(),
      }
    });

    seeded.push({
      id: s.id,
      name: s.name,
      duration: s.duration,
      price: s.price
    });
  }

  console.log(`✅ Seeded ${seeded.length} core salon services (Haircut, Hair Styling, Facial)!`);
  return seeded;
}
