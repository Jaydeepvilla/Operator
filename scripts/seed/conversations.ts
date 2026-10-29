import { db } from "../../src/server/db";
import {
  communicationChannels,
  conversations,
  conversationMessages,
  inboxThreads,
  channelMessages
} from "../../src/server/db/schema";
import { ORG_ID } from "./business";
import { SeededContact } from "./contacts";

export async function seedConversations(contacts: SeededContact[]): Promise<void> {
  console.log("💬 Seeding communication channels, threads, and inbox dialogs for Operator Demo Salon...");

  // 1. Seed communication channels
  const chanSmsId = "dddddddd-1111-1111-1111-111111111111";
  const chanWhatsAppId = "dddddddd-2222-2222-2222-222222222222";
  const chanEmailId = "dddddddd-3333-3333-3333-333333333333";

  await db.insert(communicationChannels).values([
    { id: chanSmsId, organizationId: ORG_ID, type: "sms", name: "Main Line SMS (+919876543210)", status: "active", config: {} },
    { id: chanWhatsAppId, organizationId: ORG_ID, type: "whatsapp", name: "WhatsApp Business API", status: "active", config: {} },
    { id: chanEmailId, organizationId: ORG_ID, type: "email", name: "Operator Demo Salon Concierge Email", status: "active", config: {} }
  ]).onConflictDoNothing();

  const dialogs = [
    {
      conversationId: "eeeeeeee-1001-1111-1111-111111111111",
      threadId: "ffffffff-1001-1111-1111-111111111111",
      channelId: chanWhatsAppId,
      contact: contacts[0],
      convStatus: "active",
      threadStatus: "open",
      unreadCount: 1,
      messages: [
        { sender: "user", content: "Hi! I wanted to check if you have any opening for a Haircut this Saturday afternoon?" },
        { sender: "assistant", content: "Hello Aarav! Yes, we have two openings for a Haircut this Saturday: 2:00 PM with Priya Sharma or 4:30 PM with Rahul Mehta. Would you like me to reserve one of these for you?" },
        { sender: "user", content: "2:00 PM with Priya works great! Please confirm." }
      ]
    },
    {
      conversationId: "eeeeeeee-1002-1111-1111-111111111111",
      threadId: "ffffffff-1002-1111-1111-111111111111",
      channelId: chanSmsId,
      contact: contacts[1],
      convStatus: "active",
      threadStatus: "open",
      unreadCount: 0,
      messages: [
        { sender: "user", content: "Could you tell me how long the Rejuvenating Herbal Facial takes?" },
        { sender: "assistant", content: "Our signature Rejuvenating Herbal Facial is a 60-minute therapeutic session that includes deep pore cleansing, botanical enzyme exfoliation, antioxidant masking, and a relaxing facial massage for INR 1,500." },
        { sender: "user", content: "That sounds wonderful. What is your cancellation policy if my meeting runs late?" },
        { sender: "assistant", content: "You can reschedule or cancel free of charge up to 2 hours before your scheduled appointment time!" }
      ]
    },
    {
      conversationId: "eeeeeeee-1003-1111-1111-111111111111",
      threadId: "ffffffff-1003-1111-1111-111111111111",
      channelId: chanEmailId,
      contact: contacts[2],
      convStatus: "active",
      threadStatus: "closed",
      unreadCount: 0,
      messages: [
        { sender: "user", content: "Do you have parking available at the salon?" },
        { sender: "assistant", content: "Yes! Operator Demo Salon provides complimentary valet parking directly at our entrance in Plot 42, Bandra Kurla Complex." },
        { sender: "user", content: "Thank you for the quick assistance!" }
      ]
    }
  ];

  for (const d of dialogs) {
    await db.insert(conversations).values({
      id: d.conversationId,
      organizationId: ORG_ID,
      leadProfileId: d.contact.id,
      status: d.convStatus,
      metadata: { channelId: d.channelId }
    }).onConflictDoNothing();

    await db.insert(inboxThreads).values({
      id: d.threadId,
      organizationId: ORG_ID,
      conversationId: d.conversationId,
      channelId: d.channelId,
      status: d.threadStatus,
      unreadCount: d.unreadCount,
      aiAutonomy: "active"
    }).onConflictDoNothing();

    for (let i = 0; i < d.messages.length; i++) {
      const msg = d.messages[i];
      const msgId = `12121212-${d.conversationId.slice(9, 13)}-${i + 1}000-1111-111111111111`;
      await db.insert(conversationMessages).values({
        id: msgId,
        organizationId: ORG_ID,
        conversationId: d.conversationId,
        sender: msg.sender as any,
        content: msg.content,
        confidenceScore: "0.98",
      }).onConflictDoNothing();
    }
  }

  console.log(`✅ Seeded active threads and conversations for Operator Demo Salon`);
}
