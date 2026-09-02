import { eq, and, desc, asc } from "drizzle-orm";
import { db } from "../db";
import { 
  communicationChannels, 
  channelConnections, 
  channelMessages, 
  messageTemplates,
  inboxThreads, 
  inboxParticipants,
  contactChannels,
  channelSettings,
  communicationLogs,
  leadProfiles
} from "../db/schema";

export const omnichannelRepository = {
  // --- Channels ---
  async getChannelById(id: string, organizationId?: string) {
    const conditions = organizationId
      ? and(eq(communicationChannels.id, id), eq(communicationChannels.organizationId, organizationId))
      : eq(communicationChannels.id, id);
    const [chan] = await db.select().from(communicationChannels).where(conditions);
    return chan || null;
  },

  async listChannels(organizationId: string) {
    return db
      .select()
      .from(communicationChannels)
      .where(eq(communicationChannels.organizationId, organizationId));
  },

  async createChannel(data: typeof communicationChannels.$inferInsert) {
    const [chan] = await db.insert(communicationChannels).values(data).returning();
    
    // Auto-create default settings
    await db.insert(channelSettings).values({
      organizationId: data.organizationId,
      channelId: chan.id,
      aiEnabled: true,
      aiTone: "Professional",
      responseDelaySeconds: 0,
      businessHoursOnly: false
    });

    return chan;
  },

  async updateChannel(id: string, organizationId: string, updates: Partial<typeof communicationChannels.$inferInsert>) {
    const [chan] = await db
      .update(communicationChannels)
      .set({ ...updates, updatedAt: new Date() })
      .where(and(eq(communicationChannels.id, id), eq(communicationChannels.organizationId, organizationId)))
      .returning();
    return chan;
  },

  // --- Connections ---
  async getConnection(organizationId: string, channelId: string) {
    const [conn] = await db
      .select()
      .from(channelConnections)
      .where(
        and(
          eq(channelConnections.organizationId, organizationId),
          eq(channelConnections.channelId, channelId)
        )
      );
    return conn || null;
  },

  async saveConnection(data: typeof channelConnections.$inferInsert) {
    const existing = await this.getConnection(data.organizationId, data.channelId);
    
    if (existing) {
      const [updated] = await db
        .update(channelConnections)
        .set({
          externalId: data.externalId,
          credentials: data.credentials,
          metadata: data.metadata,
          status: data.status,
          updatedAt: new Date()
        })
        .where(eq(channelConnections.id, existing.id))
        .returning();
      return updated;
    }

    const [created] = await db.insert(channelConnections).values(data).returning();
    return created;
  },

  // --- Settings ---
  async getSettings(organizationId: string, channelId: string) {
    const [settings] = await db
      .select()
      .from(channelSettings)
      .where(
        and(
          eq(channelSettings.organizationId, organizationId),
          eq(channelSettings.channelId, channelId)
        )
      );
    return settings || null;
  },

  async updateSettings(organizationId: string, channelId: string, updates: Partial<typeof channelSettings.$inferInsert>) {
    const existing = await this.getSettings(organizationId, channelId);
    if (!existing) return null;

    const [updated] = await db
      .update(channelSettings)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(channelSettings.id, existing.id))
      .returning();
    return updated;
  },

  // --- Inbox Threads ---
  async listInboxThreads(organizationId: string) {
    return db
      .select()
      .from(inboxThreads)
      .where(eq(inboxThreads.organizationId, organizationId))
      .orderBy(desc(inboxThreads.updatedAt));
  },

  async getThreadById(id: string, organizationId?: string) {
    const conditions = organizationId
      ? and(eq(inboxThreads.id, id), eq(inboxThreads.organizationId, organizationId))
      : eq(inboxThreads.id, id);
    const [thread] = await db.select().from(inboxThreads).where(conditions);
    return thread || null;
  },

  async updateThread(id: string, organizationId: string, updates: Partial<typeof inboxThreads.$inferInsert>) {
    const [thread] = await db
      .update(inboxThreads)
      .set({ ...updates, updatedAt: new Date() })
      .where(and(eq(inboxThreads.id, id), eq(inboxThreads.organizationId, organizationId)))
      .returning();
    return thread;
  },

  async listMessagesByConversation(organizationId: string, conversationId: string) {
    return db
      .select()
      .from(channelMessages)
      .where(
        and(
          eq(channelMessages.organizationId, organizationId),
          eq(channelMessages.conversationId, conversationId)
        )
      )
      .orderBy(asc(channelMessages.createdAt));
  },

  // --- Templates ---
  async listTemplates(organizationId: string) {
    return db
      .select()
      .from(messageTemplates)
      .where(eq(messageTemplates.organizationId, organizationId))
      .orderBy(desc(messageTemplates.createdAt));
  },

  async getTemplateById(id: string, organizationId?: string) {
    const conditions = organizationId
      ? and(eq(messageTemplates.id, id), eq(messageTemplates.organizationId, organizationId))
      : eq(messageTemplates.id, id);
    const [tpl] = await db.select().from(messageTemplates).where(conditions);
    return tpl || null;
  },

  async createTemplate(data: typeof messageTemplates.$inferInsert) {
    const [tpl] = await db.insert(messageTemplates).values(data).returning();
    return tpl;
  },

  async updateTemplate(id: string, organizationId: string, updates: Partial<typeof messageTemplates.$inferInsert>) {
    const [tpl] = await db
      .update(messageTemplates)
      .set({ ...updates, updatedAt: new Date() })
      .where(and(eq(messageTemplates.id, id), eq(messageTemplates.organizationId, organizationId)))
      .returning();
    return tpl;
  },

  async deleteTemplate(id: string, organizationId: string) {
    await db
      .delete(messageTemplates)
      .where(and(eq(messageTemplates.id, id), eq(messageTemplates.organizationId, organizationId)));
  },

  // --- Logs ---
  async listLogs(organizationId: string) {
    return db
      .select()
      .from(communicationLogs)
      .where(eq(communicationLogs.organizationId, organizationId))
      .orderBy(desc(communicationLogs.createdAt));
  }
};
