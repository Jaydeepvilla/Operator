import "dotenv/config";
import { db } from "../src/server/db";
import {
  organizations,
  memberships,
  businessProfiles,
  businessSettings,
  serviceCategories,
  services,
  staffMembers,
  staffSchedules,
  serviceAssignments,
  leadProfiles,
  appointments,
  appointmentStatusHistory,
  appointmentNotes,
  appointmentReminders,
  knowledgeCategories,
  knowledgeSources,
  knowledgeDocuments,
  documentProcessingJobs,
  knowledgeChunks,
  faqItems,
  qualificationFlows,
  voiceSettings,
  voicePrompts,
  voiceAnalytics,
  communicationChannels,
  conversations,
  conversationMessages,
  inboxThreads,
  inboxParticipants,
  smartNotifications,
  businessActivityLog,
  messageTemplates,
  businessSnapshots,
} from "../src/server/db/schema";
import { eq, inArray } from "drizzle-orm";

const ORG_ID = "11111111-1111-1111-1111-111111111111";

export async function cleanupDemoSalon(): Promise<void> {
  console.log(`🧹 Cleaning up only demonstration records for organization ${ORG_ID}...`);

  try {
    // 1. Appointments & History
    const apts = await db.select({ id: appointments.id }).from(appointments).where(eq(appointments.organizationId, ORG_ID));
    const aptIds = apts.map(a => a.id);
    if (aptIds.length > 0) {
      await db.delete(appointmentStatusHistory).where(inArray(appointmentStatusHistory.appointmentId, aptIds));
      await db.delete(appointmentNotes).where(inArray(appointmentNotes.appointmentId, aptIds));
      await db.delete(appointmentReminders).where(inArray(appointmentReminders.appointmentId, aptIds));
      await db.delete(appointments).where(eq(appointments.organizationId, ORG_ID));
    }

    // 2. Conversations & Inbox
    await db.delete(conversationMessages).where(eq(conversationMessages.organizationId, ORG_ID));
    await db.delete(inboxParticipants).where(eq(inboxParticipants.organizationId, ORG_ID));
    await db.delete(inboxThreads).where(eq(inboxThreads.organizationId, ORG_ID));
    await db.delete(conversations).where(eq(conversations.organizationId, ORG_ID));
    await db.delete(communicationChannels).where(eq(communicationChannels.organizationId, ORG_ID));

    // 3. Knowledge Base
    await db.delete(knowledgeChunks).where(eq(knowledgeChunks.organizationId, ORG_ID));
    await db.delete(documentProcessingJobs).where(eq(documentProcessingJobs.organizationId, ORG_ID));
    await db.delete(knowledgeDocuments).where(eq(knowledgeDocuments.organizationId, ORG_ID));
    await db.delete(knowledgeCategories).where(eq(knowledgeCategories.organizationId, ORG_ID));
    await db.delete(knowledgeSources).where(eq(knowledgeSources.organizationId, ORG_ID));

    // 4. AI & Voice
    await db.delete(faqItems).where(eq(faqItems.organizationId, ORG_ID));
    await db.delete(qualificationFlows).where(eq(qualificationFlows.organizationId, ORG_ID));
    await db.delete(voiceSettings).where(eq(voiceSettings.organizationId, ORG_ID));
    await db.delete(voicePrompts).where(eq(voicePrompts.organizationId, ORG_ID));
    await db.delete(voiceAnalytics).where(eq(voiceAnalytics.organizationId, ORG_ID));

    // 5. Staff & Assignments
    await db.delete(serviceAssignments).where(eq(serviceAssignments.organizationId, ORG_ID));
    await db.delete(staffSchedules).where(eq(staffSchedules.organizationId, ORG_ID));
    await db.delete(staffMembers).where(eq(staffMembers.organizationId, ORG_ID));

    // 6. Services & Categories
    await db.delete(services).where(eq(services.organizationId, ORG_ID));
    await db.delete(serviceCategories).where(eq(serviceCategories.organizationId, ORG_ID));

    // 7. Contacts / Lead Profiles
    await db.delete(leadProfiles).where(eq(leadProfiles.organizationId, ORG_ID));

    // 8. Notifications, Logs & Snapshots
    await db.delete(smartNotifications).where(eq(smartNotifications.organizationId, ORG_ID));
    await db.delete(businessActivityLog).where(eq(businessActivityLog.organizationId, ORG_ID));
    await db.delete(messageTemplates).where(eq(messageTemplates.organizationId, ORG_ID));
    await db.delete(businessSnapshots).where(eq(businessSnapshots.organizationId, ORG_ID));

    // 9. Profile, Settings, Memberships & Organization
    await db.delete(businessProfiles).where(eq(businessProfiles.organizationId, ORG_ID));
    await db.delete(businessSettings).where(eq(businessSettings.organizationId, ORG_ID));
    await db.delete(memberships).where(eq(memberships.organizationId, ORG_ID));
    await db.delete(organizations).where(eq(organizations.id, ORG_ID));

    console.log(`✅ Cleanup complete. All records for demo salon ${ORG_ID} safely removed. All other organizations preserved.`);
  } catch (err: any) {
    console.error("❌ Cleanup error:", err);
    throw err;
  }
}

if (require.main === module) {
  cleanupDemoSalon()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

