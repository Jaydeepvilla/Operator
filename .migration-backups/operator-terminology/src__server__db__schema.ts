import { pgTable, text, timestamp, boolean, pgEnum, uuid, integer, jsonb, vector, index, uniqueIndex } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const roleEnum = pgEnum("role", ["owner", "admin", "manager", "staff"]);
export const subscriptionStatusEnum = pgEnum("subscription_status", [
  "active",
  "trialing",
  "past_due",
  "canceled",
  "unpaid"
]);

export const answerTypeEnum = pgEnum("answer_type", [
  "text",
  "single_select",
  "multi_select",
  "number"
]);

export const visibilityEnum = pgEnum("category_visibility", [
  "public",
  "internal",
  "ai_only"
]);

export const users = pgTable("users", {
  id: text("id").primaryKey(), // Local user ID
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash"),
  name: text("name"),
  firstName: text("first_name"),
  lastName: text("last_name"),
  avatar: text("avatar"),
  isVerified: boolean("is_verified").default(false).notNull(),
  acceptTerms: boolean("accept_terms").default(false).notNull(),
  acceptPrivacy: boolean("accept_privacy").default(false).notNull(),
  marketingConsent: boolean("marketing_consent").default(false).notNull(),
  status: text("status").default("active").notNull(), // 'active', 'suspended', 'deactivated'
  suspendedAt: timestamp("suspended_at"),
  deletedAt: timestamp("deleted_at"),
  twoFactorSecret: text("two_factor_secret"),
  twoFactorEnabled: boolean("two_factor_enabled").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const sessions = pgTable("sessions", {
  id: text("id").primaryKey(), // Session token
  userId: text("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  userAgent: text("user_agent"),
  ipAddress: text("ip_address"),
  fingerprint: text("fingerprint"),
  isIdle: boolean("is_idle").default(false).notNull(),
  rememberMe: boolean("remember_me").default(false).notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const verificationTokens = pgTable("verification_tokens", {
  id: uuid("id").defaultRandom().primaryKey(),
  token: text("token").notNull().unique(),
  userId: text("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  type: text("type").notNull(), // 'email_verification' | 'password_reset' | 'invitation'
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const organizations = pgTable("organizations", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  industry: text("industry").notNull(),
  logo: text("logo"),
  website: text("website"),
  email: text("email"),
  phone: text("phone"),
  address: text("address"),
  timezone: text("timezone").notNull(),
  verificationStatus: text("verification_status").default("unverified").notNull(), // 'unverified', 'verifying', 'verified', 'needs_review'
  verificationMetadata: jsonb("verification_metadata").default({}).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const memberships = pgTable("memberships", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id")
    .references(() => organizations.id, { onDelete: "cascade" })
    .notNull(),
  userId: text("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  role: roleEnum("role").default("staff").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const subscriptionPlans = pgTable("subscription_plans", {
  id: text("id").primaryKey(), // e.g. 'free', 'pro', 'enterprise'
  name: text("name").notNull(),
  description: text("description"),
  price: text("price").notNull(), // stored as string/numeric or integer
  interval: text("interval").notNull(), // 'month', 'year'
  features: text("features").array(), // list of features
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const subscriptions = pgTable("subscriptions", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id")
    .references(() => organizations.id, { onDelete: "cascade" })
    .notNull()
    .unique(),
  planId: text("plan_id")
    .references(() => subscriptionPlans.id)
    .notNull(),
  status: subscriptionStatusEnum("status").default("trialing").notNull(),
  currentPeriodStart: timestamp("current_period_start"),
  currentPeriodEnd: timestamp("current_period_end"),
  cancelAtPeriodEnd: boolean("cancel_at_period_end").default(false).notNull(),
  stripeSubscriptionId: text("stripe_subscription_id"),
  razorpaySubscriptionId: text("razorpay_subscription_id"),
  trialStart: timestamp("trial_start"),
  trialEnd: timestamp("trial_end"),
  cancelAt: timestamp("cancel_at"),
  canceledAt: timestamp("canceled_at"),
  endedAt: timestamp("ended_at"),
  priceId: text("price_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const businessProfiles = pgTable("business_profiles", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id")
    .references(() => organizations.id, { onDelete: "cascade" })
    .notNull()
    .unique(),
  description: text("description"),
  logo: text("logo"),
  coverImage: text("cover_image"),
  socialLinks: jsonb("social_links").default({}), // e.g. { facebook: '', twitter: '' }
  googleBusinessUrl: text("google_business_url"),
  reviewUrl: text("review_url"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const serviceCategories = pgTable("service_categories", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id")
    .references(() => organizations.id, { onDelete: "cascade" })
    .notNull(),
  name: text("name").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const services = pgTable("services", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id")
    .references(() => organizations.id, { onDelete: "cascade" })
    .notNull(),
  categoryId: uuid("category_id")
    .references(() => serviceCategories.id, { onDelete: "set null" }),
  name: text("name").notNull(),
  description: text("description"),
  duration: integer("duration").notNull(), // duration in minutes
  price: text("price").notNull(), // e.g. "50.00"
  isActive: boolean("is_active").default(true).notNull(),
  isArchived: boolean("is_archived").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const faqItems = pgTable("faq_items", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id")
    .references(() => organizations.id, { onDelete: "cascade" })
    .notNull(),
  question: text("question").notNull(),
  answer: text("answer").notNull(),
  category: text("category").default("General").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  order: integer("order").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const qualificationFlows = pgTable("qualification_flows", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id")
    .references(() => organizations.id, { onDelete: "cascade" })
    .notNull(),
  question: text("question").notNull(),
  answerType: answerTypeEnum("answer_type").default("text").notNull(),
  options: text("options").array(), // options list for single_select/multi_select
  isRequired: boolean("is_required").default(true).notNull(),
  order: integer("order").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const businessSettings = pgTable("business_settings", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id")
    .references(() => organizations.id, { onDelete: "cascade" })
    .notNull()
    .unique(),
  businessHours: jsonb("business_hours").notNull(), // weekly hours representation
  holidays: text("holidays").array().default([]).notNull(), // closed dates
  languages: text("languages").array().default(["en"]).notNull(), // languages supported
  bookingPreferences: jsonb("booking_preferences").default({}).notNull(),
  notificationPreferences: jsonb("notification_preferences").default({}).notNull(),
  leadAssignmentRules: jsonb("lead_assignment_rules").default({}).notNull(),
  recommendationPreferences: jsonb("recommendation_preferences").default({}).notNull(),
  qualityScoresHistory: jsonb("quality_scores_history").default([]).notNull(),
  crmSegments: jsonb("crm_segments").default([]).notNull(),
  websiteImportUrl: text("website_import_url"),
  websiteImportStatus: text("website_import_status").default("pending").notNull(), // pending, imported, failed
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Relationships
export const usersRelations = relations(users, ({ many }) => ({
  memberships: many(memberships),
}));

export const organizationsRelations = relations(organizations, ({ one, many }) => ({
  memberships: many(memberships),
  subscription: one(subscriptions, {
    fields: [organizations.id],
    references: [subscriptions.organizationId],
  }),
  businessProfile: one(businessProfiles, {
    fields: [organizations.id],
    references: [businessProfiles.organizationId],
  }),
  serviceCategories: many(serviceCategories),
  services: many(services),
  faqItems: many(faqItems),
  qualificationFlows: many(qualificationFlows),
  businessSettings: one(businessSettings, {
    fields: [organizations.id],
    references: [businessSettings.organizationId],
  }),
}));

export const membershipsRelations = relations(memberships, ({ one }) => ({
  organization: one(organizations, {
    fields: [memberships.organizationId],
    references: [organizations.id],
  }),
  user: one(users, {
    fields: [memberships.userId],
    references: [users.id],
  }),
}));

export const subscriptionsRelations = relations(subscriptions, ({ one }) => ({
  organization: one(organizations, {
    fields: [subscriptions.organizationId],
    references: [organizations.id],
  }),
  plan: one(subscriptionPlans, {
    fields: [subscriptions.planId],
    references: [subscriptionPlans.id],
  }),
}));

export const businessProfilesRelations = relations(businessProfiles, ({ one }) => ({
  organization: one(organizations, {
    fields: [businessProfiles.organizationId],
    references: [organizations.id],
  }),
}));

export const serviceCategoriesRelations = relations(serviceCategories, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [serviceCategories.organizationId],
    references: [organizations.id],
  }),
  services: many(services),
}));

export const servicesRelations = relations(services, ({ one }) => ({
  organization: one(organizations, {
    fields: [services.organizationId],
    references: [organizations.id],
  }),
  category: one(serviceCategories, {
    fields: [services.categoryId],
    references: [serviceCategories.id],
  }),
}));

export const faqItemsRelations = relations(faqItems, ({ one }) => ({
  organization: one(organizations, {
    fields: [faqItems.organizationId],
    references: [organizations.id],
  }),
}));

export const qualificationFlowsRelations = relations(qualificationFlows, ({ one }) => ({
  organization: one(organizations, {
    fields: [qualificationFlows.organizationId],
    references: [organizations.id],
  }),
}));

export const businessSettingsRelations = relations(businessSettings, ({ one }) => ({
  organization: one(organizations, {
    fields: [businessSettings.organizationId],
    references: [organizations.id],
  }),
}));

// --- KNOWLEDGE BASE SCHEMAS ---

export const knowledgeCategories = pgTable("knowledge_categories", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id")
    .references(() => organizations.id, { onDelete: "cascade" })
    .notNull(),
  name: text("name").notNull(),
  slug: text("slug").notNull(),
  description: text("description"),
  icon: text("icon").default("folder").notNull(),
  priority: text("priority").default("medium").notNull(), // 'high', 'medium', 'low'
  color: text("color").default("primary").notNull(), // css/design token class
  sortOrder: integer("sort_order").default(0).notNull(),
  status: text("status").default("active").notNull(), // 'active', 'draft'
  aiWeight: text("ai_weight").default("normal").notNull(), // 'normal', 'high'
  
  // Enterprise Architecture Fields
  parentId: uuid("parent_id"), // Added relation later
  visibility: visibilityEnum("visibility").default("public").notNull(),
  aiInstructions: text("ai_instructions"),
  isArchived: boolean("is_archived").default(false).notNull(),
  createdById: text("created_by_id"),
  updatedById: text("updated_by_id"),
  metadata: jsonb("metadata").default({}).notNull(),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const knowledgeSources = pgTable("knowledge_sources", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id")
    .references(() => organizations.id, { onDelete: "cascade" })
    .notNull(),
  name: text("name").notNull(),
  type: text("type").notNull(), // 'website', 'pdf', 'docx', 'txt', 'faq', 'service', 'manual', 'future_api'
  isActive: boolean("is_active").default(true).notNull(),
  metadata: jsonb("metadata").default({}).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const knowledgeDocuments = pgTable("knowledge_documents", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id")
    .references(() => organizations.id, { onDelete: "cascade" })
    .notNull(),
  sourceId: uuid("source_id")
    .references(() => knowledgeSources.id, { onDelete: "set null" }),
  categoryId: uuid("category_id")
    .references(() => knowledgeCategories.id, { onDelete: "set null" }),
  name: text("name").notNull(),
  fileType: text("file_type").notNull(), // 'pdf', 'docx', 'txt', 'faq', 'service', 'manual'
  fileSize: integer("file_size"), // bytes
  filePath: text("file_path"),
  status: text("status").default("uploaded").notNull(), // 'uploaded', 'queued', 'processing', 'chunking', 'embedding', 'completed', 'failed'
  isArchived: boolean("is_archived").default(false).notNull(),
  metadata: jsonb("metadata").default({}).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const knowledgeChunks = pgTable("knowledge_chunks", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id")
    .references(() => organizations.id, { onDelete: "cascade" })
    .notNull(),
  documentId: uuid("document_id")
    .references(() => knowledgeDocuments.id, { onDelete: "cascade" })
    .notNull(),
  content: text("content").notNull(),
  chunkIndex: integer("chunk_index").notNull(),
  tokenCount: integer("token_count").notNull(),
  embedding: vector("embedding", { dimensions: 1536 }),
  metadata: jsonb("metadata").default({}).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const documentProcessingJobs = pgTable("document_processing_jobs", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id")
    .references(() => organizations.id, { onDelete: "cascade" })
    .notNull(),
  documentId: uuid("document_id")
    .references(() => knowledgeDocuments.id, { onDelete: "cascade" })
    .notNull(),
  status: text("status").notNull(), // 'queued', 'processing', 'chunking', 'embedding', 'completed', 'failed'
  logs: text("logs"),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  duration: integer("duration"), // ms
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const websiteImports = pgTable("website_imports", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id")
    .references(() => organizations.id, { onDelete: "cascade" })
    .notNull(),
  sourceId: uuid("source_id")
    .references(() => knowledgeSources.id, { onDelete: "cascade" })
    .notNull(),
  url: text("url").notNull(),
  status: text("status").default("pending").notNull(), // 'pending', 'scraping', 'processing', 'completed', 'failed'
  pagesFound: integer("pages_found").default(0).notNull(),
  pagesScraped: integer("pages_scraped").default(0).notNull(),
  errorMessage: text("error_message"),
  metadata: jsonb("metadata").default({}).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const knowledgeTags = pgTable("knowledge_tags", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id")
    .references(() => organizations.id, { onDelete: "cascade" })
    .notNull(),
  name: text("name").notNull(),
  slug: text("slug").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const knowledgeDocumentTags = pgTable("knowledge_document_tags", {
  id: uuid("id").defaultRandom().primaryKey(),
  documentId: uuid("document_id")
    .references(() => knowledgeDocuments.id, { onDelete: "cascade" })
    .notNull(),
  tagId: uuid("tag_id")
    .references(() => knowledgeTags.id, { onDelete: "cascade" })
    .notNull(),
});

export const vectorEmbeddings = pgTable("vector_embeddings", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id")
    .references(() => organizations.id, { onDelete: "cascade" })
    .notNull(),
  chunkId: uuid("chunk_id")
    .references(() => knowledgeChunks.id, { onDelete: "cascade" })
    .notNull(),
  embedding: jsonb("embedding").notNull(), // coordinates float array
  metadata: jsonb("metadata").default({}).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// --- RELATIONSHIPS ---

export const knowledgeCategoriesRelations = relations(knowledgeCategories, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [knowledgeCategories.organizationId],
    references: [organizations.id],
  }),
  documents: many(knowledgeDocuments),
  parent: one(knowledgeCategories, {
    fields: [knowledgeCategories.parentId],
    references: [knowledgeCategories.id],
    relationName: "parentCategory"
  }),
  children: many(knowledgeCategories, {
    relationName: "parentCategory"
  })
}));

export const knowledgeSourcesRelations = relations(knowledgeSources, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [knowledgeSources.organizationId],
    references: [organizations.id],
  }),
  documents: many(knowledgeDocuments),
  imports: many(websiteImports),
}));

export const knowledgeDocumentsRelations = relations(knowledgeDocuments, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [knowledgeDocuments.organizationId],
    references: [organizations.id],
  }),
  source: one(knowledgeSources, {
    fields: [knowledgeDocuments.sourceId],
    references: [knowledgeSources.id],
  }),
  category: one(knowledgeCategories, {
    fields: [knowledgeDocuments.categoryId],
    references: [knowledgeCategories.id],
  }),
  chunks: many(knowledgeChunks),
  jobs: many(documentProcessingJobs),
  tags: many(knowledgeDocumentTags),
}));

export const knowledgeChunksRelations = relations(knowledgeChunks, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [knowledgeChunks.organizationId],
    references: [organizations.id],
  }),
  document: one(knowledgeDocuments, {
    fields: [knowledgeChunks.documentId],
    references: [knowledgeDocuments.id],
  }),
  embeddings: many(vectorEmbeddings),
}));

export const documentProcessingJobsRelations = relations(documentProcessingJobs, ({ one }) => ({
  organization: one(organizations, {
    fields: [documentProcessingJobs.organizationId],
    references: [organizations.id],
  }),
  document: one(knowledgeDocuments, {
    fields: [documentProcessingJobs.documentId],
    references: [knowledgeDocuments.id],
  }),
}));

export const websiteImportsRelations = relations(websiteImports, ({ one }) => ({
  organization: one(organizations, {
    fields: [websiteImports.organizationId],
    references: [organizations.id],
  }),
  source: one(knowledgeSources, {
    fields: [websiteImports.sourceId],
    references: [knowledgeSources.id],
  }),
}));

export const knowledgeTagsRelations = relations(knowledgeTags, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [knowledgeTags.organizationId],
    references: [organizations.id],
  }),
  documents: many(knowledgeDocumentTags),
}));

export const knowledgeDocumentTagsRelations = relations(knowledgeDocumentTags, ({ one }) => ({
  document: one(knowledgeDocuments, {
    fields: [knowledgeDocumentTags.documentId],
    references: [knowledgeDocuments.id],
  }),
  tag: one(knowledgeTags, {
    fields: [knowledgeDocumentTags.tagId],
    references: [knowledgeTags.id],
  }),
}));

export const vectorEmbeddingsRelations = relations(vectorEmbeddings, ({ one }) => ({
  organization: one(organizations, {
    fields: [vectorEmbeddings.organizationId],
    references: [organizations.id],
  }),
  chunk: one(knowledgeChunks, {
    fields: [vectorEmbeddings.chunkId],
    references: [knowledgeChunks.id],
  }),
}));

// --- AI RECEPTIONIST SCHEMAS ---

export const conversations = pgTable("conversations", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id")
    .references(() => organizations.id, { onDelete: "cascade" })
    .notNull(),
  leadProfileId: uuid("lead_profile_id"), // link to lead profile when created
  status: text("status").default("active").notNull(), // 'active', 'closed', 'escalated'
  metadata: jsonb("metadata").default({}).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const conversationMessages = pgTable("conversation_messages", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id")
    .references(() => organizations.id, { onDelete: "cascade" })
    .notNull(),
  conversationId: uuid("conversation_id")
    .references(() => conversations.id, { onDelete: "cascade" })
    .notNull(),
  sender: text("sender").notNull(), // 'user', 'assistant', 'system'
  content: text("content").notNull(),
  intentDetected: text("intent_detected"), // e.g. 'pricing', 'booking', 'emergency', etc.
  confidenceScore: text("confidence_score").default("1.0").notNull(),
  citations: jsonb("citations").default([]).notNull(), // [{ docId: '', chunkId: '', name: '', content: '' }]
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const conversationSessions = pgTable("conversation_sessions", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id")
    .references(() => organizations.id, { onDelete: "cascade" })
    .notNull(),
  conversationId: uuid("conversation_id")
    .references(() => conversations.id, { onDelete: "cascade" })
    .notNull().unique(),
  state: jsonb("state").default({}).notNull(), // { currentQuestionIndex: 0, answersCollected: {}, etc. }
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const conversationEvents = pgTable("conversation_events", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id")
    .references(() => organizations.id, { onDelete: "cascade" })
    .notNull(),
  conversationId: uuid("conversation_id")
    .references(() => conversations.id, { onDelete: "cascade" })
    .notNull(),
  eventType: text("event_type").notNull(), // 'intent_detected', 'lead_captured', 'escalated', etc.
  payload: jsonb("payload").default({}).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const leadProfiles = pgTable("lead_profiles", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id")
    .references(() => organizations.id, { onDelete: "cascade" })
    .notNull(),
  name: text("name"),
  email: text("email"),
  phone: text("phone"),
  status: text("status").default("New").notNull(), // 'New', 'Qualified', 'Hot', 'Booked', 'Escalated', 'Closed'
  leadScore: integer("lead_score").default(0).notNull(),
  summary: text("summary"),
  lifetimeValue: integer("lifetime_value").default(0).notNull(),
  tags: jsonb("tags").default([]).notNull(),
  notes: text("notes"),
  conversationCount: integer("conversation_count").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const leadAnswers = pgTable("lead_answers", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id")
    .references(() => organizations.id, { onDelete: "cascade" })
    .notNull(),
  leadProfileId: uuid("lead_profile_id")
    .references(() => leadProfiles.id, { onDelete: "cascade" })
    .notNull(),
  questionId: uuid("question_id")
    .references(() => qualificationFlows.id, { onDelete: "set null" }),
  questionText: text("question_text").notNull(),
  answerValue: text("answer_value").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const leadScores = pgTable("lead_scores", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id")
    .references(() => organizations.id, { onDelete: "cascade" })
    .notNull(),
  leadProfileId: uuid("lead_profile_id")
    .references(() => leadProfiles.id, { onDelete: "cascade" })
    .notNull(),
  score: integer("score").notNull(),
  breakdown: jsonb("breakdown").default({}).notNull(), // { serviceInterest: 10, urgency: 20, etc. }
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const conversationSummaries = pgTable("conversation_summaries", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id")
    .references(() => organizations.id, { onDelete: "cascade" })
    .notNull(),
  conversationId: uuid("conversation_id")
    .references(() => conversations.id, { onDelete: "cascade" })
    .notNull().unique(),
  summaryText: text("summary_text").notNull(),
  actionItems: jsonb("action_items").default([]).notNull(), // string array
  intentsList: jsonb("intents_list").default([]).notNull(), // string array
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const escalationRequests = pgTable("escalation_requests", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id")
    .references(() => organizations.id, { onDelete: "cascade" })
    .notNull(),
  conversationId: uuid("conversation_id")
    .references(() => conversations.id, { onDelete: "cascade" })
    .notNull(),
  reason: text("reason").notNull(), // 'user_request', 'complaint', 'emergency', 'unknown_info', 'repeated_failure'
  status: text("status").default("pending").notNull(), // 'pending', 'resolved', 'ignored'
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const conversationFeedback = pgTable("conversation_feedback", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id")
    .references(() => organizations.id, { onDelete: "cascade" })
    .notNull(),
  conversationId: uuid("conversation_id")
    .references(() => conversations.id, { onDelete: "cascade" })
    .notNull(),
  rating: integer("rating").notNull(), // 1 to 5
  comments: text("comments"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// --- RELATIONSHIPS ---

export const conversationsRelations = relations(conversations, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [conversations.organizationId],
    references: [organizations.id],
  }),
  leadProfile: one(leadProfiles, {
    fields: [conversations.leadProfileId],
    references: [leadProfiles.id],
  }),
  messages: many(conversationMessages),
  session: one(conversationSessions, {
    fields: [conversations.id],
    references: [conversationSessions.conversationId],
  }),
  events: many(conversationEvents),
  summary: one(conversationSummaries, {
    fields: [conversations.id],
    references: [conversationSummaries.conversationId],
  }),
  escalations: many(escalationRequests),
  feedback: many(conversationFeedback),
}));

export const conversationMessagesRelations = relations(conversationMessages, ({ one }) => ({
  organization: one(organizations, {
    fields: [conversationMessages.organizationId],
    references: [organizations.id],
  }),
  conversation: one(conversations, {
    fields: [conversationMessages.conversationId],
    references: [conversations.id],
  }),
}));

export const conversationSessionsRelations = relations(conversationSessions, ({ one }) => ({
  organization: one(organizations, {
    fields: [conversationSessions.organizationId],
    references: [organizations.id],
  }),
  conversation: one(conversations, {
    fields: [conversationSessions.conversationId],
    references: [conversations.id],
  }),
}));

export const conversationEventsRelations = relations(conversationEvents, ({ one }) => ({
  organization: one(organizations, {
    fields: [conversationEvents.organizationId],
    references: [organizations.id],
  }),
  conversation: one(conversations, {
    fields: [conversationEvents.conversationId],
    references: [conversations.id],
  }),
}));

export const leadProfilesRelations = relations(leadProfiles, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [leadProfiles.organizationId],
    references: [organizations.id],
  }),
  conversations: many(conversations),
  answers: many(leadAnswers),
  scores: many(leadScores),
}));

export const leadAnswersRelations = relations(leadAnswers, ({ one }) => ({
  organization: one(organizations, {
    fields: [leadAnswers.organizationId],
    references: [organizations.id],
  }),
  leadProfile: one(leadProfiles, {
    fields: [leadAnswers.leadProfileId],
    references: [leadProfiles.id],
  }),
  question: one(qualificationFlows, {
    fields: [leadAnswers.questionId],
    references: [qualificationFlows.id],
  }),
}));

export const leadScoresRelations = relations(leadScores, ({ one }) => ({
  organization: one(organizations, {
    fields: [leadScores.organizationId],
    references: [organizations.id],
  }),
  leadProfile: one(leadProfiles, {
    fields: [leadScores.leadProfileId],
    references: [leadProfiles.id],
  }),
}));

export const conversationSummariesRelations = relations(conversationSummaries, ({ one }) => ({
  organization: one(organizations, {
    fields: [conversationSummaries.organizationId],
    references: [organizations.id],
  }),
  conversation: one(conversations, {
    fields: [conversationSummaries.conversationId],
    references: [conversations.id],
  }),
}));

export const escalationRequestsRelations = relations(escalationRequests, ({ one }) => ({
  organization: one(organizations, {
    fields: [escalationRequests.organizationId],
    references: [organizations.id],
  }),
  conversation: one(conversations, {
    fields: [escalationRequests.conversationId],
    references: [conversations.id],
  }),
}));

export const conversationFeedbackRelations = relations(conversationFeedback, ({ one }) => ({
  organization: one(organizations, {
    fields: [conversationFeedback.organizationId],
    references: [organizations.id],
  }),
  conversation: one(conversations, {
    fields: [conversationFeedback.conversationId],
    references: [conversations.id],
  }),
}));

// --- APPOINTMENT BOOKING & CALENDAR CONNECTION SCHEMAS ---

export const staffMembers = pgTable("staff_members", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id")
    .references(() => organizations.id, { onDelete: "cascade" })
    .notNull(),
  name: text("name").notNull(),
  role: text("role").default("staff").notNull(), // 'staff', 'admin'
  email: text("email"),
  phone: text("phone"),
  avatarUrl: text("avatar_url"),
  bufferTime: integer("buffer_time").default(0).notNull(), // individual staff buffer in mins
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const staffSchedules = pgTable("staff_schedules", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id")
    .references(() => organizations.id, { onDelete: "cascade" })
    .notNull(),
  staffMemberId: uuid("staff_member_id")
    .references(() => staffMembers.id, { onDelete: "cascade" })
    .notNull(),
  dayOfWeek: integer("day_of_week").notNull(), // 0 (Sunday) to 6 (Saturday)
  shifts: jsonb("shifts").notNull(), // [{ start: "09:00", end: "13:00" }, { start: "14:00", end: "18:00" }]
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const staffAvailability = pgTable("staff_availability", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id")
    .references(() => organizations.id, { onDelete: "cascade" })
    .notNull(),
  staffMemberId: uuid("staff_member_id")
    .references(() => staffMembers.id, { onDelete: "cascade" })
    .notNull(),
  exceptionDate: text("exception_date").notNull(), // "YYYY-MM-DD"
  isAvailable: boolean("is_available").notNull(), // true = custom shifts, false = holiday/closed
  shifts: jsonb("shifts"), // null if isAvailable=false, or [{ start: "10:00", end: "15:00" }]
  reason: text("reason"), // e.g. "Dentist Vacation", "Clinic Maintenance"
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const calendarConnections = pgTable("calendar_connections", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id")
    .references(() => organizations.id, { onDelete: "cascade" })
    .notNull(),
  staffMemberId: uuid("staff_member_id")
    .references(() => staffMembers.id, { onDelete: "cascade" }), // null if organization-wide
  provider: text("provider").notNull(), // 'google', 'outlook', 'calendly'
  email: text("email").notNull(),
  accessToken: text("access_token").notNull(),
  refreshToken: text("refresh_token"),
  expiresAt: timestamp("expires_at"),
  externalCalendarId: text("external_calendar_id"), // target calendar id in provider
  syncStatus: text("sync_status").default("active").notNull(), // 'active', 'error', 'disabled'
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const calendarSyncLogs = pgTable("calendar_sync_logs", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id")
    .references(() => organizations.id, { onDelete: "cascade" })
    .notNull(),
  connectionId: uuid("connection_id")
    .references(() => calendarConnections.id, { onDelete: "cascade" })
    .notNull(),
  eventType: text("event_type").notNull(), // 'sync_started', 'sync_completed', 'sync_failed'
  details: jsonb("details").default({}).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const bookingRules = pgTable("booking_rules", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id")
    .references(() => organizations.id, { onDelete: "cascade" })
    .notNull()
    .unique(),
  minLeadTime: integer("min_lead_time").default(2).notNull(), // in hours
  maxLookahead: integer("max_lookahead").default(30).notNull(), // in days
  defaultBufferBefore: integer("default_buffer_before").default(0).notNull(), // in mins
  defaultBufferAfter: integer("default_buffer_after").default(0).notNull(), // in mins
  allowRescheduling: boolean("allow_rescheduling").default(true).notNull(),
  allowCancellation: boolean("allow_cancellation").default(true).notNull(),
  cancellationLeadTime: integer("cancellation_lead_time").default(24).notNull(), // in hours
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const serviceAssignments = pgTable("service_assignments", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id")
    .references(() => organizations.id, { onDelete: "cascade" })
    .notNull(),
  serviceId: uuid("service_id")
    .references(() => services.id, { onDelete: "cascade" })
    .notNull(),
  staffMemberId: uuid("staff_member_id")
    .references(() => staffMembers.id, { onDelete: "cascade" })
    .notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const appointments = pgTable("appointments", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id")
    .references(() => organizations.id, { onDelete: "cascade" })
    .notNull(),
  leadProfileId: uuid("lead_profile_id")
    .references(() => leadProfiles.id, { onDelete: "set null" }),
  serviceId: uuid("service_id")
    .references(() => services.id, { onDelete: "set null" }),
  staffMemberId: uuid("staff_member_id")
    .references(() => staffMembers.id, { onDelete: "set null" }),
  status: text("status").default("pending").notNull(), // 'pending', 'confirmed', 'completed', 'cancelled', 'rescheduled', 'no_show'
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time").notNull(),
  customerName: text("customer_name").notNull(),
  customerEmail: text("customer_email"),
  customerPhone: text("customer_phone"),
  pricePaid: text("price_paid"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("appointments_org_staff_time_idx").on(table.organizationId, table.staffMemberId, table.startTime),
  index("appointments_status_idx").on(table.status),
]);

export const appointmentEvents = pgTable("appointment_events", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id")
    .references(() => organizations.id, { onDelete: "cascade" })
    .notNull(),
  appointmentId: uuid("appointment_id")
    .references(() => appointments.id, { onDelete: "cascade" })
    .notNull(),
  eventType: text("event_type").notNull(), // 'created', 'status_changed', 'rescheduled', 'cancelled', 'reminder_sent'
  payload: jsonb("payload").default({}).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const appointmentStatusHistory = pgTable("appointment_status_history", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id")
    .references(() => organizations.id, { onDelete: "cascade" })
    .notNull(),
  appointmentId: uuid("appointment_id")
    .references(() => appointments.id, { onDelete: "cascade" })
    .notNull(),
  oldStatus: text("old_status"),
  newStatus: text("new_status").notNull(),
  changedBy: text("changed_by").default("system").notNull(), // 'user', 'assistant', 'staff', 'system'
  reason: text("reason"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const appointmentReminders = pgTable("appointment_reminders", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id")
    .references(() => organizations.id, { onDelete: "cascade" })
    .notNull(),
  appointmentId: uuid("appointment_id")
    .references(() => appointments.id, { onDelete: "cascade" })
    .notNull(),
  type: text("type").notNull(), // 'email', 'sms'
  sendAt: timestamp("send_at").notNull(),
  status: text("status").default("pending").notNull(), // 'pending', 'sent', 'failed'
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const appointmentNotes = pgTable("appointment_notes", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id")
    .references(() => organizations.id, { onDelete: "cascade" })
    .notNull(),
  appointmentId: uuid("appointment_id")
    .references(() => appointments.id, { onDelete: "cascade" })
    .notNull(),
  noteText: text("note_text").notNull(),
  author: text("author").notNull(), // 'assistant', 'staff'
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const appointmentReschedules = pgTable("appointment_reschedules", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id")
    .references(() => organizations.id, { onDelete: "cascade" })
    .notNull(),
  appointmentId: uuid("appointment_id")
    .references(() => appointments.id, { onDelete: "cascade" })
    .notNull(),
  requestedBy: text("requested_by").notNull(), // 'user', 'staff'
  originalStartTime: timestamp("original_start_time").notNull(),
  requestedStartTime: timestamp("requested_start_time").notNull(),
  reason: text("reason"),
  status: text("status").default("pending").notNull(), // 'applied', 'rejected', 'pending'
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const appointmentCancellations = pgTable("appointment_cancellations", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id")
    .references(() => organizations.id, { onDelete: "cascade" })
    .notNull(),
  appointmentId: uuid("appointment_id")
    .references(() => appointments.id, { onDelete: "cascade" })
    .notNull(),
  cancelledBy: text("cancelled_by").notNull(), // 'user', 'staff'
  reason: text("reason"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// --- RELATIONSHIPS MAPS ---

export const staffMembersRelations = relations(staffMembers, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [staffMembers.organizationId],
    references: [organizations.id],
  }),
  schedules: many(staffSchedules),
  exceptions: many(staffAvailability),
  connections: many(calendarConnections),
  assignments: many(serviceAssignments),
  appointments: many(appointments),
}));

export const staffSchedulesRelations = relations(staffSchedules, ({ one }) => ({
  organization: one(organizations, {
    fields: [staffSchedules.organizationId],
    references: [organizations.id],
  }),
  staffMember: one(staffMembers, {
    fields: [staffSchedules.staffMemberId],
    references: [staffMembers.id],
  }),
}));

export const staffAvailabilityRelations = relations(staffAvailability, ({ one }) => ({
  organization: one(organizations, {
    fields: [staffAvailability.organizationId],
    references: [organizations.id],
  }),
  staffMember: one(staffMembers, {
    fields: [staffAvailability.staffMemberId],
    references: [staffMembers.id],
  }),
}));

export const calendarConnectionsRelations = relations(calendarConnections, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [calendarConnections.organizationId],
    references: [organizations.id],
  }),
  staffMember: one(staffMembers, {
    fields: [calendarConnections.staffMemberId],
    references: [staffMembers.id],
  }),
  logs: many(calendarSyncLogs),
}));

export const calendarSyncLogsRelations = relations(calendarSyncLogs, ({ one }) => ({
  organization: one(organizations, {
    fields: [calendarSyncLogs.organizationId],
    references: [organizations.id],
  }),
  connection: one(calendarConnections, {
    fields: [calendarSyncLogs.connectionId],
    references: [calendarConnections.id],
  }),
}));

export const bookingRulesRelations = relations(bookingRules, ({ one }) => ({
  organization: one(organizations, {
    fields: [bookingRules.organizationId],
    references: [organizations.id],
  }),
}));

export const serviceAssignmentsRelations = relations(serviceAssignments, ({ one }) => ({
  organization: one(organizations, {
    fields: [serviceAssignments.organizationId],
    references: [organizations.id],
  }),
  service: one(services, {
    fields: [serviceAssignments.serviceId],
    references: [services.id],
  }),
  staffMember: one(staffMembers, {
    fields: [serviceAssignments.staffMemberId],
    references: [staffMembers.id],
  }),
}));

export const appointmentsRelations = relations(appointments, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [appointments.organizationId],
    references: [organizations.id],
  }),
  leadProfile: one(leadProfiles, {
    fields: [appointments.leadProfileId],
    references: [leadProfiles.id],
  }),
  service: one(services, {
    fields: [appointments.serviceId],
    references: [services.id],
  }),
  staffMember: one(staffMembers, {
    fields: [appointments.staffMemberId],
    references: [staffMembers.id],
  }),
  events: many(appointmentEvents),
  statusHistory: many(appointmentStatusHistory),
  reminders: many(appointmentReminders),
  notes: many(appointmentNotes),
  reschedules: many(appointmentReschedules),
  cancellations: many(appointmentCancellations),
}));

export const appointmentEventsRelations = relations(appointmentEvents, ({ one }) => ({
  organization: one(organizations, {
    fields: [appointmentEvents.organizationId],
    references: [organizations.id],
  }),
  appointment: one(appointments, {
    fields: [appointmentEvents.appointmentId],
    references: [appointments.id],
  }),
}));

export const appointmentStatusHistoryRelations = relations(appointmentStatusHistory, ({ one }) => ({
  organization: one(organizations, {
    fields: [appointmentStatusHistory.organizationId],
    references: [organizations.id],
  }),
  appointment: one(appointments, {
    fields: [appointmentStatusHistory.appointmentId],
    references: [appointments.id],
  }),
}));

export const appointmentRemindersRelations = relations(appointmentReminders, ({ one }) => ({
  organization: one(organizations, {
    fields: [appointmentReminders.organizationId],
    references: [organizations.id],
  }),
  appointment: one(appointments, {
    fields: [appointmentReminders.appointmentId],
    references: [appointments.id],
  }),
}));

export const appointmentNotesRelations = relations(appointmentNotes, ({ one }) => ({
  organization: one(organizations, {
    fields: [appointmentNotes.organizationId],
    references: [organizations.id],
  }),
  appointment: one(appointments, {
    fields: [appointmentNotes.appointmentId],
    references: [appointments.id],
  }),
}));

export const appointmentReschedulesRelations = relations(appointmentReschedules, ({ one }) => ({
  organization: one(organizations, {
    fields: [appointmentReschedules.organizationId],
    references: [organizations.id],
  }),
  appointment: one(appointments, {
    fields: [appointmentReschedules.appointmentId],
    references: [appointments.id],
  }),
}));

export const appointmentCancellationsRelations = relations(appointmentCancellations, ({ one }) => ({
  organization: one(organizations, {
    fields: [appointmentCancellations.organizationId],
    references: [organizations.id],
  }),
  appointment: one(appointments, {
    fields: [appointmentCancellations.appointmentId],
    references: [appointments.id],
  }),
}));

export const widgetConfigs = pgTable("widget_configs", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id")
    .references(() => organizations.id, { onDelete: "cascade" })
    .notNull(),
  enabled: boolean("enabled").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const widgetThemes = pgTable("widget_themes", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id")
    .references(() => organizations.id, { onDelete: "cascade" })
    .notNull(),
  themeMode: text("theme_mode").default("dark").notNull(), // light, dark, auto, custom
  primaryColor: text("primary_color").default("#3b82f6").notNull(),
  backgroundColor: text("background_color").default("#09090b").notNull(),
  textColor: text("text_color").default("#fafafa").notNull(),
  borderColor: text("border_color").default("#27272a").notNull(),
  borderRadius: text("border_radius").default("0.5rem").notNull(),
  customCss: text("custom_css"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const widgetBranding = pgTable("widget_branding", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id")
    .references(() => organizations.id, { onDelete: "cascade" })
    .notNull(),
  companyName: text("company_name").notNull(),
  tagline: text("tagline").default("AI Assistant").notNull(),
  logoUrl: text("logo_url"),
  avatarUrl: text("avatar_url"),
  welcomeMessage: text("welcome_message").default("Hello! How can I help you today?").notNull(),
  headerImageUrl: text("header_image_url"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const widgetLaunchers = pgTable("widget_launchers", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id")
    .references(() => organizations.id, { onDelete: "cascade" })
    .notNull(),
  position: text("position").default("bottom_right").notNull(),
  icon: text("icon").default("message-square").notNull(),
  size: text("size").default("medium").notNull(),
  spacingX: integer("spacing_x").default(20).notNull(),
  spacingY: integer("spacing_y").default(20).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const widgetCustomizations = pgTable("widget_customizations", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id")
    .references(() => organizations.id, { onDelete: "cascade" })
    .notNull(),
  starterQuestions: jsonb("starter_questions").default([]).notNull(),
  suggestedActions: jsonb("suggested_actions").default([]).notNull(),
  proactiveTriggers: jsonb("proactive_triggers").default({ timeOnPage: 10, scrollDepth: 50, exitIntent: false, active: false }).notNull(),
  widgetWidth: integer("widget_width").default(380).notNull(),
  widgetHeight: integer("widget_height").default(600).notNull(),
  shadowStyle: text("shadow_style").default("lg").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const widgetDomains = pgTable("widget_domains", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id")
    .references(() => organizations.id, { onDelete: "cascade" })
    .notNull(),
  domain: text("domain").notNull(),
  isVerified: boolean("is_verified").default(false).notNull(),
  verificationToken: text("verification_token").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const widgetInstallations = pgTable("widget_installations", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id")
    .references(() => organizations.id, { onDelete: "cascade" })
    .notNull(),
  domain: text("domain").notNull(),
  status: text("status").default("active").notNull(),
  lastDetectedAt: timestamp("last_detected_at").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const widgetSessions = pgTable("widget_sessions", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id")
    .references(() => organizations.id, { onDelete: "cascade" })
    .notNull(),
  conversationId: uuid("conversation_id")
    .references(() => conversations.id, { onDelete: "cascade" })
    .notNull(),
  visitorType: text("visitor_type").default("new").notNull(),
  deviceInfo: jsonb("device_info"),
  lastActiveAt: timestamp("last_active_at").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const widgetEvents = pgTable("widget_events", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id")
    .references(() => organizations.id, { onDelete: "cascade" })
    .notNull(),
  sessionId: uuid("session_id")
    .references(() => widgetSessions.id, { onDelete: "cascade" }),
  eventType: text("event_type").notNull(),
  eventData: jsonb("event_data"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const widgetConfigsRelations = relations(widgetConfigs, ({ one }) => ({
  organization: one(organizations, {
    fields: [widgetConfigs.organizationId],
    references: [organizations.id],
  }),
}));

export const widgetThemesRelations = relations(widgetThemes, ({ one }) => ({
  organization: one(organizations, {
    fields: [widgetThemes.organizationId],
    references: [organizations.id],
  }),
}));

export const widgetBrandingRelations = relations(widgetBranding, ({ one }) => ({
  organization: one(organizations, {
    fields: [widgetBranding.organizationId],
    references: [organizations.id],
  }),
}));

export const widgetLaunchersRelations = relations(widgetLaunchers, ({ one }) => ({
  organization: one(organizations, {
    fields: [widgetLaunchers.organizationId],
    references: [organizations.id],
  }),
}));

export const widgetCustomizationsRelations = relations(widgetCustomizations, ({ one }) => ({
  organization: one(organizations, {
    fields: [widgetCustomizations.organizationId],
    references: [organizations.id],
  }),
}));

export const widgetDomainsRelations = relations(widgetDomains, ({ one }) => ({
  organization: one(organizations, {
    fields: [widgetDomains.organizationId],
    references: [organizations.id],
  }),
}));

export const widgetInstallationsRelations = relations(widgetInstallations, ({ one }) => ({
  organization: one(organizations, {
    fields: [widgetInstallations.organizationId],
    references: [organizations.id],
  }),
}));

export const widgetSessionsRelations = relations(widgetSessions, ({ one }) => ({
  organization: one(organizations, {
    fields: [widgetSessions.organizationId],
    references: [organizations.id],
  }),
  conversation: one(conversations, {
    fields: [widgetSessions.conversationId],
    references: [conversations.id],
  }),
}));

export const widgetEventsRelations = relations(widgetEvents, ({ one }) => ({
  organization: one(organizations, {
    fields: [widgetEvents.organizationId],
    references: [organizations.id],
  }),
  session: one(widgetSessions, {
    fields: [widgetEvents.sessionId],
    references: [widgetSessions.id],
  }),
}));

// --- OMNICHANNEL COMMUNICATION SCHEMAS ---

export const communicationChannels = pgTable("communication_channels", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id")
    .references(() => organizations.id, { onDelete: "cascade" })
    .notNull(),
  type: text("type").notNull(), // 'whatsapp', 'sms', 'email', 'instagram', 'facebook'
  name: text("name").notNull(),
  status: text("status").default("active").notNull(), // 'active', 'inactive'
  config: jsonb("config").default({}).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const channelConnections = pgTable("channel_connections", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id")
    .references(() => organizations.id, { onDelete: "cascade" })
    .notNull(),
  channelId: uuid("channel_id")
    .references(() => communicationChannels.id, { onDelete: "cascade" })
    .notNull(),
  externalId: text("external_id").notNull(),
  status: text("status").default("connected").notNull(), // 'connected', 'disconnected', 'error'
  credentials: jsonb("credentials").default({}).notNull(),
  metadata: jsonb("metadata").default({}).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const channelMessages = pgTable("channel_messages", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id")
    .references(() => organizations.id, { onDelete: "cascade" })
    .notNull(),
  channelId: uuid("channel_id")
    .references(() => communicationChannels.id, { onDelete: "cascade" })
    .notNull(),
  conversationId: uuid("conversation_id")
    .references(() => conversations.id, { onDelete: "cascade" })
    .notNull(),
  direction: text("direction").notNull(), // 'incoming', 'outgoing'
  senderId: text("sender_id").notNull(),
  recipientId: text("recipient_id").notNull(),
  content: text("content").notNull(),
  status: text("status").default("queued").notNull(), // 'queued', 'sent', 'delivered', 'read', 'failed', 'replied'
  externalId: text("external_id"),
  metadata: jsonb("metadata").default({}).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const channelEvents = pgTable("channel_events", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id")
    .references(() => organizations.id, { onDelete: "cascade" })
    .notNull(),
  channelId: uuid("channel_id")
    .references(() => communicationChannels.id, { onDelete: "cascade" })
    .notNull(),
  eventType: text("event_type").notNull(), // 'delivery_status', 'read_receipt', 'webhook_ping', 'error'
  payload: jsonb("payload").default({}).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const messageDeliveries = pgTable("message_deliveries", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id")
    .references(() => organizations.id, { onDelete: "cascade" })
    .notNull(),
  messageId: uuid("message_id")
    .references(() => channelMessages.id, { onDelete: "cascade" })
    .notNull(),
  status: text("status").default("queued").notNull(), // 'queued', 'sent', 'delivered', 'read', 'failed'
  errorCode: text("error_code"),
  errorMessage: text("error_message"),
  retries: integer("retries").default(0).notNull(),
  sentAt: timestamp("sent_at"),
  deliveredAt: timestamp("delivered_at"),
  readAt: timestamp("read_at"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const messageTemplates = pgTable("message_templates", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id")
    .references(() => organizations.id, { onDelete: "cascade" })
    .notNull(),
  channelType: text("channel_type").notNull(), // 'whatsapp', 'sms', 'email', 'all'
  name: text("name").notNull(),
  category: text("category").notNull(), // 'welcome', 'appointment_confirmation', 'appointment_reminder', 'follow_up', 'lead_nurture', 're_engagement', 'review_request', 'custom'
  variables: jsonb("variables").default([]).notNull(), // string array of placeholders e.g. ['customer_name']
  body: text("body").notNull(),
  subject: text("subject"), // only for email
  status: text("status").default("approved").notNull(), // 'pending', 'approved', 'rejected'
  approvedAt: timestamp("approved_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const messageAttachments = pgTable("message_attachments", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id")
    .references(() => organizations.id, { onDelete: "cascade" })
    .notNull(),
  messageId: uuid("message_id")
    .references(() => channelMessages.id, { onDelete: "cascade" })
    .notNull(),
  url: text("url").notNull(),
  fileName: text("file_name").notNull(),
  fileSize: integer("file_size").notNull(),
  mimeType: text("mime_type").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const channelWebhooks = pgTable("channel_webhooks", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id")
    .references(() => organizations.id, { onDelete: "cascade" })
    .notNull(),
  channelId: uuid("channel_id")
    .references(() => communicationChannels.id, { onDelete: "cascade" })
    .notNull(),
  url: text("url").notNull(),
  secret: text("secret").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const communicationLogs = pgTable("communication_logs", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id")
    .references(() => organizations.id, { onDelete: "cascade" })
    .notNull(),
  level: text("level").notNull(), // 'info', 'warn', 'error'
  message: text("message").notNull(),
  channel: text("channel"),
  payload: jsonb("payload"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const inboxThreads = pgTable("inbox_threads", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id")
    .references(() => organizations.id, { onDelete: "cascade" })
    .notNull(),
  conversationId: uuid("conversation_id")
    .references(() => conversations.id, { onDelete: "cascade" })
    .notNull(),
  channelId: uuid("channel_id")
    .references(() => communicationChannels.id, { onDelete: "cascade" })
    .notNull(),
  lastMessageId: uuid("last_message_id"),
  unreadCount: integer("unread_count").default(0).notNull(),
  status: text("status").default("open").notNull(), // 'open', 'closed', 'snoozed'
  aiAutonomy: text("ai_autonomy").default("active").notNull(), // 'active', 'paused'
  assignedStaffId: text("assigned_staff_id")
    .references(() => users.id, { onDelete: "set null" }), // assign to staff member
  metadata: jsonb("metadata").default({}).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const inboxParticipants = pgTable("inbox_participants", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id")
    .references(() => organizations.id, { onDelete: "cascade" })
    .notNull(),
  threadId: uuid("thread_id")
    .references(() => inboxThreads.id, { onDelete: "cascade" })
    .notNull(),
  participantType: text("participant_type").notNull(), // 'contact', 'staff', 'assistant'
  participantId: text("participant_id").notNull(), // references lead_profiles.id or users.id or 'assistant'
  name: text("name").notNull(),
  avatar: text("avatar"),
  joinedAt: timestamp("joined_at").defaultNow().notNull(),
});

export const contactChannels = pgTable("contact_channels", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id")
    .references(() => organizations.id, { onDelete: "cascade" })
    .notNull(),
  contactId: uuid("contact_id")
    .references(() => leadProfiles.id, { onDelete: "cascade" })
    .notNull(),
  channelType: text("channel_type").notNull(), // 'whatsapp', 'sms', 'email', 'instagram', 'facebook'
  channelUserId: text("channel_user_id").notNull(), // external scope id e.g. sender phone, email address, IG username
  value: text("value").notNull(), // readable handle/value
  isVerified: boolean("is_verified").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const channelSettings = pgTable("channel_settings", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id")
    .references(() => organizations.id, { onDelete: "cascade" })
    .notNull(),
  channelId: uuid("channel_id")
    .references(() => communicationChannels.id, { onDelete: "cascade" })
    .notNull(),
  aiEnabled: boolean("ai_enabled").default(true).notNull(),
  aiTone: text("ai_tone").default("Professional").notNull(), // 'Professional', 'Friendly', 'Empathetic', 'Casual'
  responseDelaySeconds: integer("response_delay_seconds").default(0).notNull(),
  businessHoursOnly: boolean("business_hours_only").default(false).notNull(),
  humanEscalationRules: jsonb("human_escalation_rules").default({}).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// --- RELATION MAPPINGS ---

export const communicationChannelsRelations = relations(communicationChannels, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [communicationChannels.organizationId],
    references: [organizations.id],
  }),
  connections: many(channelConnections),
  settings: many(channelSettings),
}));

export const channelConnectionsRelations = relations(channelConnections, ({ one }) => ({
  organization: one(organizations, {
    fields: [channelConnections.organizationId],
    references: [organizations.id],
  }),
  channel: one(communicationChannels, {
    fields: [channelConnections.channelId],
    references: [communicationChannels.id],
  }),
}));

export const channelMessagesRelations = relations(channelMessages, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [channelMessages.organizationId],
    references: [organizations.id],
  }),
  channel: one(communicationChannels, {
    fields: [channelMessages.channelId],
    references: [communicationChannels.id],
  }),
  conversation: one(conversations, {
    fields: [channelMessages.conversationId],
    references: [conversations.id],
  }),
  attachments: many(messageAttachments),
  deliveries: many(messageDeliveries),
}));

export const channelEventsRelations = relations(channelEvents, ({ one }) => ({
  organization: one(organizations, {
    fields: [channelEvents.organizationId],
    references: [organizations.id],
  }),
  channel: one(communicationChannels, {
    fields: [channelEvents.channelId],
    references: [communicationChannels.id],
  }),
}));

export const messageDeliveriesRelations = relations(messageDeliveries, ({ one }) => ({
  organization: one(organizations, {
    fields: [messageDeliveries.organizationId],
    references: [organizations.id],
  }),
  message: one(channelMessages, {
    fields: [messageDeliveries.messageId],
    references: [channelMessages.id],
  }),
}));

export const messageTemplatesRelations = relations(messageTemplates, ({ one }) => ({
  organization: one(organizations, {
    fields: [messageTemplates.organizationId],
    references: [organizations.id],
  }),
}));

export const messageAttachmentsRelations = relations(messageAttachments, ({ one }) => ({
  organization: one(organizations, {
    fields: [messageAttachments.organizationId],
    references: [organizations.id],
  }),
  message: one(channelMessages, {
    fields: [messageAttachments.messageId],
    references: [channelMessages.id],
  }),
}));

export const channelWebhooksRelations = relations(channelWebhooks, ({ one }) => ({
  organization: one(organizations, {
    fields: [channelWebhooks.organizationId],
    references: [organizations.id],
  }),
  channel: one(communicationChannels, {
    fields: [channelWebhooks.channelId],
    references: [communicationChannels.id],
  }),
}));

export const communicationLogsRelations = relations(communicationLogs, ({ one }) => ({
  organization: one(organizations, {
    fields: [communicationLogs.organizationId],
    references: [organizations.id],
  }),
}));

export const inboxThreadsRelations = relations(inboxThreads, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [inboxThreads.organizationId],
    references: [organizations.id],
  }),
  conversation: one(conversations, {
    fields: [inboxThreads.conversationId],
    references: [conversations.id],
  }),
  channel: one(communicationChannels, {
    fields: [inboxThreads.channelId],
    references: [communicationChannels.id],
  }),
  lastMessage: one(channelMessages, {
    fields: [inboxThreads.lastMessageId],
    references: [channelMessages.id],
  }),
  assignedStaff: one(users, {
    fields: [inboxThreads.assignedStaffId],
    references: [users.id],
  }),
  participants: many(inboxParticipants),
}));

export const inboxParticipantsRelations = relations(inboxParticipants, ({ one }) => ({
  organization: one(organizations, {
    fields: [inboxParticipants.organizationId],
    references: [organizations.id],
  }),
  thread: one(inboxThreads, {
    fields: [inboxParticipants.threadId],
    references: [inboxThreads.id],
  }),
}));

export const contactChannelsRelations = relations(contactChannels, ({ one }) => ({
  organization: one(organizations, {
    fields: [contactChannels.organizationId],
    references: [organizations.id],
  }),
  contact: one(leadProfiles, {
    fields: [contactChannels.contactId],
    references: [leadProfiles.id],
  }),
}));

export const channelSettingsRelations = relations(channelSettings, ({ one }) => ({
  organization: one(organizations, {
    fields: [channelSettings.organizationId],
    references: [organizations.id],
  }),
  channel: one(communicationChannels, {
    fields: [channelSettings.channelId],
    references: [communicationChannels.id],
  }),
}));

// --- VOICE AI & CALL CENTER SCHEMAS ---

export const phoneNumbers = pgTable("phone_numbers", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id")
    .references(() => organizations.id, { onDelete: "cascade" })
    .notNull(),
  phoneNumber: text("phone_number").notNull().unique(),
  type: text("type").notNull(), // 'purchased', 'connected'
  status: text("status").default("active").notNull(), // 'active', 'inactive'
  name: text("name").notNull(),
  isRecordingEnabled: boolean("is_recording_enabled").default(true).notNull(),
  voiceSettingsId: uuid("voice_settings_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const callSessions = pgTable("call_sessions", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id")
    .references(() => organizations.id, { onDelete: "cascade" })
    .notNull(),
  phoneNumberId: uuid("phone_number_id")
    .references(() => phoneNumbers.id, { onDelete: "cascade" })
    .notNull(),
  direction: text("direction").notNull(), // 'inbound', 'outbound'
  externalSessionId: text("external_session_id").notNull(), // Twilio Call SID
  callerNumber: text("caller_number").notNull(),
  recipientNumber: text("recipient_number").notNull(),
  status: text("status").default("ringing").notNull(), // 'ringing', 'in-progress', 'completed', 'voicemail', 'transferred', 'failed'
  durationSeconds: integer("duration_seconds").default(0).notNull(),
  endedReason: text("ended_reason"), // 'completed', 'user-hung-up', 'error', 'transferred'
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const callEvents = pgTable("call_events", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id")
    .references(() => organizations.id, { onDelete: "cascade" })
    .notNull(),
  sessionId: uuid("session_id")
    .references(() => callSessions.id, { onDelete: "cascade" })
    .notNull(),
  eventType: text("event_type").notNull(), // 'ringing', 'answered', 'speech-to-text', 'text-to-speech', 'interrupted', 'transfer-started', 'transfer-completed', 'completed'
  timestamp: timestamp("timestamp").defaultNow().notNull(),
  payload: jsonb("payload").default({}).notNull(),
});

export const callRecordings = pgTable("call_recordings", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id")
    .references(() => organizations.id, { onDelete: "cascade" })
    .notNull(),
  sessionId: uuid("session_id")
    .references(() => callSessions.id, { onDelete: "cascade" })
    .notNull(),
  url: text("url").notNull(),
  fileName: text("file_name").notNull(),
  fileSize: integer("file_size").notNull(),
  durationSeconds: integer("duration_seconds").notNull(),
  consentGiven: boolean("consent_given").default(true).notNull(),
  isArchived: boolean("is_archived").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const callTranscripts = pgTable("call_transcripts", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id")
    .references(() => organizations.id, { onDelete: "cascade" })
    .notNull(),
  sessionId: uuid("session_id")
    .references(() => callSessions.id, { onDelete: "cascade" })
    .notNull(),
  speaker: text("speaker").notNull(), // 'caller', 'agent'
  content: text("content").notNull(),
  confidence: text("confidence").default("1.0").notNull(),
  relativeStartTime: integer("relative_start_time").notNull(), // ms from call start
  relativeEndTime: integer("relative_end_time").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const callSummaries = pgTable("call_summaries", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id")
    .references(() => organizations.id, { onDelete: "cascade" })
    .notNull(),
  sessionId: uuid("session_id")
    .references(() => callSessions.id, { onDelete: "cascade" })
    .notNull().unique(),
  summary: text("summary").notNull(),
  actionItems: jsonb("action_items").default([]).notNull(), // ['reschedule appointment', 'follow up on email']
  outcome: text("outcome").notNull(), // 'appointment-booked', 'human-escalation', 'general-info', 'voicemail-recorded'
  bookingStatus: text("booking_status").default("none").notNull(), // 'none', 'booked', 'rescheduled', 'cancelled'
  escalationStatus: text("escalation_status").default("none").notNull(), // 'none', 'transferred', 'voicemail'
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const callOutcomes = pgTable("call_outcomes", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id")
    .references(() => organizations.id, { onDelete: "cascade" })
    .notNull(),
  sessionId: uuid("session_id")
    .references(() => callSessions.id, { onDelete: "cascade" })
    .notNull(),
  outcomeType: text("outcome_type").notNull(), // 'booked', 'transferred', 'voicemail', 'abandoned'
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const callTransfers = pgTable("call_transfers", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id")
    .references(() => organizations.id, { onDelete: "cascade" })
    .notNull(),
  sessionId: uuid("session_id")
    .references(() => callSessions.id, { onDelete: "cascade" })
    .notNull(),
  transferType: text("transfer_type").notNull(), // 'warm', 'cold'
  targetNumber: text("target_number"),
  targetStaffId: text("target_staff_id")
    .references(() => users.id, { onDelete: "set null" }),
  status: text("status").default("initiated").notNull(), // 'initiated', 'completed', 'failed', 'busy'
  durationSeconds: integer("duration_seconds").default(0).notNull(),
  endedReason: text("ended_reason"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const callQueues = pgTable("call_queues", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id")
    .references(() => organizations.id, { onDelete: "cascade" })
    .notNull(),
  queueName: text("queue_name").notNull(),
  currentSize: integer("current_size").default(0).notNull(),
  maxWaitTimeMinutes: integer("max_wait_time_minutes").default(10).notNull(),
  status: text("status").default("active").notNull(), // 'active', 'paused'
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const callRoutingRules = pgTable("call_routing_rules", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id")
    .references(() => organizations.id, { onDelete: "cascade" })
    .notNull(),
  ruleName: text("rule_name").notNull(),
  triggerType: text("trigger_type").notNull(), // 'business-hours', 'after-hours', 'busy', 'no-answer'
  routingAction: text("routing_action").notNull(), // 'ai-receptionist', 'staff-dial', 'voicemail', 'queue'
  targetId: text("target_id"), // phone settings ID, staff member ID, or queue ID
  isActive: boolean("is_active").default(true).notNull(),
  priority: integer("priority").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const voiceSettings = pgTable("voice_settings", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id")
    .references(() => organizations.id, { onDelete: "cascade" })
    .notNull(),
  voiceName: text("voice_name").default("Rachel").notNull(), // ElevenLabs / Cartesia speaking voice name
  speakingSpeed: text("speaking_speed").default("1.0").notNull(), // e.g. "0.9", "1.0", "1.1"
  greetingMessage: text("greeting_message").notNull(),
  fallbackNumber: text("fallback_number"),
  businessHoursMode: text("business_hours_mode").default("ai-only").notNull(), // 'ai-only', 'forward', 'hybrid'
  voicemailActive: boolean("voicemail_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const voicePrompts = pgTable("voice_prompts", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id")
    .references(() => organizations.id, { onDelete: "cascade" })
    .notNull(),
  name: text("name").notNull(),
  promptText: text("prompt_text").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const voiceAnalytics = pgTable("voice_analytics", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id")
    .references(() => organizations.id, { onDelete: "cascade" })
    .notNull(),
  dateStr: text("date_str").notNull(), // 'YYYY-MM-DD'
  callsAnswered: integer("calls_answered").default(0).notNull(),
  callsMissed: integer("calls_missed").default(0).notNull(),
  bookingsCount: integer("bookings_count").default(0).notNull(),
  transfersCount: integer("transfers_count").default(0).notNull(),
  averageDurationSeconds: integer("average_duration_seconds").default(0).notNull(),
  csatAverage: text("csat_average").default("5.0").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const voicemailMessages = pgTable("voicemail_messages", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id")
    .references(() => organizations.id, { onDelete: "cascade" })
    .notNull(),
  sessionId: uuid("session_id")
    .references(() => callSessions.id, { onDelete: "cascade" })
    .notNull(),
  recordingUrl: text("recording_url").notNull(),
  transcriptText: text("transcript_text"),
  summaryText: text("summary_text"),
  callbackStatus: text("callback_status").default("pending").notNull(), // 'pending', 'called', 'no-action'
  callbackTime: timestamp("callback_time"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// --- RELATION MAPPINGS ---

export const phoneNumbersRelations = relations(phoneNumbers, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [phoneNumbers.organizationId],
    references: [organizations.id],
  }),
  calls: many(callSessions),
}));

export const callSessionsRelations = relations(callSessions, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [callSessions.organizationId],
    references: [organizations.id],
  }),
  phoneNumber: one(phoneNumbers, {
    fields: [callSessions.phoneNumberId],
    references: [phoneNumbers.id],
  }),
  events: many(callEvents),
  transcripts: many(callTranscripts),
  recording: one(callRecordings),
  summary: one(callSummaries),
  outcomes: many(callOutcomes),
  transfers: many(callTransfers),
  voicemails: many(voicemailMessages),
}));

export const callEventsRelations = relations(callEvents, ({ one }) => ({
  organization: one(organizations, {
    fields: [callEvents.organizationId],
    references: [organizations.id],
  }),
  session: one(callSessions, {
    fields: [callEvents.sessionId],
    references: [callSessions.id],
  }),
}));

export const callRecordingsRelations = relations(callRecordings, ({ one }) => ({
  organization: one(organizations, {
    fields: [callRecordings.organizationId],
    references: [organizations.id],
  }),
  session: one(callSessions, {
    fields: [callRecordings.sessionId],
    references: [callSessions.id],
  }),
}));

export const callTranscriptsRelations = relations(callTranscripts, ({ one }) => ({
  organization: one(organizations, {
    fields: [callTranscripts.organizationId],
    references: [organizations.id],
  }),
  session: one(callSessions, {
    fields: [callTranscripts.sessionId],
    references: [callSessions.id],
  }),
}));

export const callSummariesRelations = relations(callSummaries, ({ one }) => ({
  organization: one(organizations, {
    fields: [callSummaries.organizationId],
    references: [organizations.id],
  }),
  session: one(callSessions, {
    fields: [callSummaries.sessionId],
    references: [callSessions.id],
  }),
}));

export const callOutcomesRelations = relations(callOutcomes, ({ one }) => ({
  organization: one(organizations, {
    fields: [callOutcomes.organizationId],
    references: [organizations.id],
  }),
  session: one(callSessions, {
    fields: [callOutcomes.sessionId],
    references: [callSessions.id],
  }),
}));

export const callTransfersRelations = relations(callTransfers, ({ one }) => ({
  organization: one(organizations, {
    fields: [callTransfers.organizationId],
    references: [organizations.id],
  }),
  session: one(callSessions, {
    fields: [callTransfers.sessionId],
    references: [callSessions.id],
  }),
  targetStaff: one(users, {
    fields: [callTransfers.targetStaffId],
    references: [users.id],
  }),
}));

export const callQueuesRelations = relations(callQueues, ({ one }) => ({
  organization: one(organizations, {
    fields: [callQueues.organizationId],
    references: [organizations.id],
  }),
}));

export const callRoutingRulesRelations = relations(callRoutingRules, ({ one }) => ({
  organization: one(organizations, {
    fields: [callRoutingRules.organizationId],
    references: [organizations.id],
  }),
}));

export const voiceSettingsRelations = relations(voiceSettings, ({ one }) => ({
  organization: one(organizations, {
    fields: [voiceSettings.organizationId],
    references: [organizations.id],
  }),
}));

export const voicePromptsRelations = relations(voicePrompts, ({ one }) => ({
  organization: one(organizations, {
    fields: [voicePrompts.organizationId],
    references: [organizations.id],
  }),
}));

export const voiceAnalyticsRelations = relations(voiceAnalytics, ({ one }) => ({
  organization: one(organizations, {
    fields: [voiceAnalytics.organizationId],
    references: [organizations.id],
  }),
}));

export const voicemailMessagesRelations = relations(voicemailMessages, ({ one }) => ({
  organization: one(organizations, {
    fields: [voicemailMessages.organizationId],
    references: [organizations.id],
  }),
  session: one(callSessions, {
    fields: [voicemailMessages.sessionId],
    references: [callSessions.id],
  }),
}));

// --- WHITE LABEL & AGENCY PORTAL SCHEMAS ---

export const agencies = pgTable("agencies", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(), // agency subdomain or slug
  ownerId: text("owner_id").references(() => users.id, { onDelete: "cascade" }),
  status: text("status").default("active").notNull(), // 'active', 'suspended', 'archived'
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const agencyBranding = pgTable("agency_branding", {
  id: uuid("id").defaultRandom().primaryKey(),
  agencyId: uuid("agency_id")
    .references(() => agencies.id, { onDelete: "cascade" })
    .notNull()
    .unique(),
  platformName: text("platform_name").notNull(),
  logoUrl: text("logo_url"),
  faviconUrl: text("favicon_url"),
  primaryColor: text("primary_color").default("#3b82f6").notNull(),
  secondaryColor: text("secondary_color").default("#1e293b").notNull(),
  typography: text("typography").default("Inter").notNull(),
  emailSenderName: text("email_sender_name"),
  emailSenderDomain: text("email_sender_domain"),
  customCss: text("custom_css"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const agencyDomains = pgTable("agency_domains", {
  id: uuid("id").defaultRandom().primaryKey(),
  agencyId: uuid("agency_id")
    .references(() => agencies.id, { onDelete: "cascade" })
    .notNull(),
  domainName: text("domain_name").notNull().unique(), // e.g. portal.agency.com
  type: text("type").default("portal").notNull(), // 'portal', 'client', 'widget', 'api'
  sslStatus: text("ssl_status").default("pending").notNull(), // 'pending', 'active', 'failed'
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const agencyMembers = pgTable("agency_members", {
  id: uuid("id").defaultRandom().primaryKey(),
  agencyId: uuid("agency_id")
    .references(() => agencies.id, { onDelete: "cascade" })
    .notNull(),
  userId: text("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  role: text("role").default("staff").notNull(), // 'owner', 'admin', 'manager', 'staff'
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const agencyClients = pgTable("agency_clients", {
  id: uuid("id").defaultRandom().primaryKey(),
  agencyId: uuid("agency_id")
    .references(() => agencies.id, { onDelete: "cascade" })
    .notNull(),
  name: text("name").notNull(),
  email: text("email"),
  phone: text("phone"),
  status: text("status").default("active").notNull(), // 'active', 'suspended', 'archived'
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const clientWorkspaces = pgTable("client_workspaces", {
  id: uuid("id").defaultRandom().primaryKey(),
  agencyClientId: uuid("agency_client_id")
    .references(() => agencyClients.id, { onDelete: "cascade" })
    .notNull(),
  organizationId: uuid("organization_id")
    .references(() => organizations.id, { onDelete: "cascade" })
    .notNull()
    .unique(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const resellerPlans = pgTable("reseller_plans", {
  id: uuid("id").defaultRandom().primaryKey(),
  agencyId: uuid("agency_id")
    .references(() => agencies.id, { onDelete: "cascade" })
    .notNull(),
  name: text("name").notNull(),
  price: text("price").notNull(), // e.g. "199.00"
  interval: text("interval").default("month").notNull(), // 'month', 'year'
  limits: jsonb("limits").default({}).notNull(), // { seatsLimit: 5, callMinutesLimit: 500 }
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const resellerUsage = pgTable("reseller_usage", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id")
    .references(() => organizations.id, { onDelete: "cascade" })
    .notNull(),
  metricName: text("metric_name").notNull(), // 'conversations', 'tokens', 'bookings', 'calls', 'messages', 'contacts', 'storage'
  usageCount: integer("usage_count").default(0).notNull(),
  limitCount: integer("limit_count"),
  billingPeriodStart: timestamp("billing_period_start").defaultNow().notNull(),
  billingPeriodEnd: timestamp("billing_period_end").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const agencyInvitations = pgTable("agency_invitations", {
  id: uuid("id").defaultRandom().primaryKey(),
  agencyId: uuid("agency_id")
    .references(() => agencies.id, { onDelete: "cascade" })
    .notNull(),
  email: text("email").notNull(),
  role: text("role").default("staff").notNull(),
  token: text("token").notNull().unique(),
  status: text("status").default("pending").notNull(), // 'pending', 'accepted', 'expired'
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const agencyAuditLogs = pgTable("agency_audit_logs", {
  id: uuid("id").defaultRandom().primaryKey(),
  agencyId: uuid("agency_id")
    .references(() => agencies.id, { onDelete: "cascade" })
    .notNull(),
  userId: text("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  action: text("action").notNull(), // 'client-impersonation-start', 'client-impersonation-end', 'branding-update', etc.
  targetId: text("target_id"),
  details: jsonb("details").default({}).notNull(),
  ipAddress: text("ip_address"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const agencyPermissions = pgTable("agency_permissions", {
  id: uuid("id").defaultRandom().primaryKey(),
  agencyId: uuid("agency_id")
    .references(() => agencies.id, { onDelete: "cascade" })
    .notNull(),
  role: text("role").notNull(), // 'admin', 'manager', 'staff'
  permissions: text("permissions").array().default([]).notNull(), // ['billing:read', 'clients:write']
});

export const whiteLabelSettings = pgTable("white_label_settings", {
  id: uuid("id").defaultRandom().primaryKey(),
  isWhiteLabelEnabled: boolean("is_white_label_enabled").default(true).notNull(),
  defaultFavicon: text("default_favicon"),
  supportEmail: text("support_email"),
});

export const agencyBilling = pgTable("agency_billing", {
  id: uuid("id").defaultRandom().primaryKey(),
  agencyId: uuid("agency_id")
    .references(() => agencies.id, { onDelete: "cascade" })
    .notNull()
    .unique(),
  stripeCustomerId: text("stripe_customer_id"),
  paymentMethodStatus: text("payment_method_status"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const agencySubscriptions = pgTable("agency_subscriptions", {
  id: uuid("id").defaultRandom().primaryKey(),
  agencyId: uuid("agency_id")
    .references(() => agencies.id, { onDelete: "cascade" })
    .notNull(),
  planId: text("plan_id").notNull(), // 'reseller-starter', 'reseller-pro', 'reseller-enterprise'
  status: text("status").notNull(),
  currentPeriodStart: timestamp("current_period_start"),
  currentPeriodEnd: timestamp("current_period_end"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const plans = pgTable("plans", {
  id: text("id").primaryKey(), // 'free', 'starter', 'pro', 'business', 'agency', 'enterprise'
  name: text("name").notNull(),
  description: text("description"),
  monthlyPrice: text("monthly_price").notNull(),
  yearlyPrice: text("yearly_price").notNull(),
  trialDays: integer("trial_days").default(14).notNull(),
  features: text("features").array().default([]).notNull(),
  usageLimits: jsonb("usage_limits").default({}).notNull(),
  overageRules: jsonb("overage_rules").default({}).notNull(),
  visibility: text("visibility").default("public").notNull(),
  status: text("status").default("active").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const planFeatures = pgTable("plan_features", {
  id: uuid("id").defaultRandom().primaryKey(),
  planId: text("plan_id").references(() => plans.id, { onDelete: "cascade" }).notNull(),
  featureKey: text("feature_key").notNull(),
  limitValue: integer("limit_value"),
  isUnlimited: boolean("is_unlimited").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const subscriptionItems = pgTable("subscription_items", {
  id: uuid("id").defaultRandom().primaryKey(),
  subscriptionId: uuid("subscription_id").references(() => subscriptions.id, { onDelete: "cascade" }).notNull(),
  priceId: text("price_id").notNull(),
  quantity: integer("quantity").default(1).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const subscriptionUsage = pgTable("subscription_usage", {
  id: uuid("id").defaultRandom().primaryKey(),
  subscriptionItemId: uuid("subscription_item_id").references(() => subscriptionItems.id, { onDelete: "cascade" }).notNull(),
  metricName: text("metric_name").notNull(),
  usageCount: integer("usage_count").default(0).notNull(),
  lastResetAt: timestamp("last_reset_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const usageRecords = pgTable("usage_records", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id").references(() => organizations.id, { onDelete: "cascade" }).notNull(),
  metricName: text("metric_name").notNull(),
  amount: integer("amount").notNull(),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
});

export const usageCounters = pgTable("usage_counters", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id").references(() => organizations.id, { onDelete: "cascade" }).notNull(),
  metricName: text("metric_name").notNull(),
  currentValue: integer("current_value").default(0).notNull(),
  limitValue: integer("limit_value").notNull(),
  resetDate: timestamp("reset_date").notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const billingAccounts = pgTable("billing_accounts", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id").references(() => organizations.id, { onDelete: "cascade" }).notNull().unique(),
  stripeCustomerId: text("stripe_customer_id"),
  razorpayCustomerId: text("razorpay_customer_id"),
  email: text("email").notNull(),
  currency: text("currency").default("USD").notNull(),
  billingAddress: jsonb("billing_address").default({}).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const paymentMethods = pgTable("payment_methods", {
  id: uuid("id").defaultRandom().primaryKey(),
  billingAccountId: uuid("billing_account_id").references(() => billingAccounts.id, { onDelete: "cascade" }).notNull(),
  provider: text("provider").notNull(),
  providerPaymentMethodId: text("provider_payment_method_id").notNull(),
  brand: text("brand"),
  last4: text("last_4"),
  expMonth: integer("exp_month"),
  expYear: integer("exp_year"),
  isDefault: boolean("is_default").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const payments = pgTable("payments", {
  id: uuid("id").defaultRandom().primaryKey(),
  billingAccountId: uuid("billing_account_id").references(() => billingAccounts.id, { onDelete: "cascade" }).notNull(),
  subscriptionId: uuid("subscription_id").references(() => subscriptions.id, { onDelete: "set null" }),
  amount: text("amount").notNull(),
  currency: text("currency").default("USD").notNull(),
  status: text("status").default("pending").notNull(),
  providerPaymentId: text("provider_payment_id"),
  invoiceId: text("invoice_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const paymentAttempts = pgTable("payment_attempts", {
  id: uuid("id").defaultRandom().primaryKey(),
  paymentId: uuid("payment_id").references(() => payments.id, { onDelete: "cascade" }).notNull(),
  status: text("status").notNull(),
  errorCode: text("error_code"),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const refunds = pgTable("refunds", {
  id: uuid("id").defaultRandom().primaryKey(),
  paymentId: uuid("payment_id").references(() => payments.id, { onDelete: "cascade" }).notNull(),
  amount: text("amount").notNull(),
  reason: text("reason"),
  providerRefundId: text("provider_refund_id"),
  status: text("status").default("pending").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const invoices = pgTable("invoices", {
  id: uuid("id").defaultRandom().primaryKey(),
  billingAccountId: uuid("billing_account_id").references(() => billingAccounts.id, { onDelete: "cascade" }).notNull(),
  subscriptionId: uuid("subscription_id").references(() => subscriptions.id, { onDelete: "set null" }),
  number: text("number").notNull().unique(),
  status: text("status").default("draft").notNull(),
  subtotal: text("subtotal").notNull(),
  tax: text("tax").default("0.00").notNull(),
  total: text("total").notNull(),
  dueDate: timestamp("due_date"),
  paidAt: timestamp("paid_at"),
  pdfUrl: text("pdf_url"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const invoiceItems = pgTable("invoice_items", {
  id: uuid("id").defaultRandom().primaryKey(),
  invoiceId: uuid("invoice_id").references(() => invoices.id, { onDelete: "cascade" }).notNull(),
  description: text("description").notNull(),
  amount: text("amount").notNull(),
  quantity: integer("quantity").default(1).notNull(),
  taxRateId: uuid("tax_rate_id"),
});

export const creditNotes = pgTable("credit_notes", {
  id: uuid("id").defaultRandom().primaryKey(),
  invoiceId: uuid("invoice_id").references(() => invoices.id, { onDelete: "cascade" }).notNull(),
  amount: text("amount").notNull(),
  status: text("status").default("issued").notNull(),
  reason: text("reason"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const coupons = pgTable("coupons", {
  id: uuid("id").defaultRandom().primaryKey(),
  code: text("code").notNull().unique(),
  type: text("type").notNull(),
  value: text("value").notNull(),
  expirationDate: timestamp("expiration_date"),
  usageLimit: integer("usage_limit"),
  redemptionsCount: integer("redemptions_count").default(0).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const discounts = pgTable("discounts", {
  id: uuid("id").defaultRandom().primaryKey(),
  billingAccountId: uuid("billing_account_id").references(() => billingAccounts.id, { onDelete: "cascade" }).notNull(),
  subscriptionId: uuid("subscription_id").references(() => subscriptions.id, { onDelete: "cascade" }),
  couponId: uuid("coupon_id").references(() => coupons.id, { onDelete: "cascade" }).notNull(),
  appliedAt: timestamp("applied_at").defaultNow().notNull(),
  endedAt: timestamp("ended_at"),
});

export const taxProfiles = pgTable("tax_profiles", {
  id: uuid("id").defaultRandom().primaryKey(),
  billingAccountId: uuid("billing_account_id").references(() => billingAccounts.id, { onDelete: "cascade" }).notNull().unique(),
  country: text("country").notNull(),
  region: text("region"),
  taxIdType: text("tax_id_type"),
  taxIdValue: text("tax_id_value"),
  isExempt: boolean("is_exempt").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const taxRates = pgTable("tax_rates", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  rate: text("rate").notNull(),
  type: text("type").notNull(),
  country: text("country").notNull(),
  region: text("region"),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const billingEvents = pgTable("billing_events", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id").references(() => organizations.id, { onDelete: "cascade" }),
  eventType: text("event_type").notNull(),
  payload: jsonb("payload").default({}).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const revenueMetrics = pgTable("revenue_metrics", {
  id: uuid("id").defaultRandom().primaryKey(),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
  mrr: text("mrr").notNull(),
  arr: text("arr").notNull(),
  churnRate: text("churn_rate").notNull(),
  ltv: text("ltv").notNull(),
  arpu: text("arpu").notNull(),
  netRevenue: text("net_revenue").notNull(),
  grossRevenue: text("gross_revenue").notNull(),
});

export const featureEntitlements = pgTable("feature_entitlements", {
  id: uuid("id").defaultRandom().primaryKey(),
  planId: text("plan_id").notNull(),
  featureName: text("feature_name").notNull(),
  isEnabled: boolean("is_enabled").default(true).notNull(),
  maxLimit: integer("max_limit"),
});

export const meteredFeatures = pgTable("metered_features", {
  id: uuid("id").defaultRandom().primaryKey(),
  featureName: text("feature_name").notNull().unique(),
  unitPrice: text("unit_price").notNull(),
  overagePrice: text("overage_price").notNull(),
  billingTrigger: text("billing_trigger").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// --- RELATION MAPPINGS ---

export const agenciesRelations = relations(agencies, ({ one, many }) => ({
  branding: one(agencyBranding),
  domains: many(agencyDomains),
  members: many(agencyMembers),
  clients: many(agencyClients),
  plans: many(resellerPlans),
  invitations: many(agencyInvitations),
  auditLogs: many(agencyAuditLogs),
  billing: one(agencyBilling),
  subscriptions: many(agencySubscriptions),
}));

export const agencyBrandingRelations = relations(agencyBranding, ({ one }) => ({
  agency: one(agencies, {
    fields: [agencyBranding.agencyId],
    references: [agencies.id],
  }),
}));

export const agencyDomainsRelations = relations(agencyDomains, ({ one }) => ({
  agency: one(agencies, {
    fields: [agencyDomains.agencyId],
    references: [agencies.id],
  }),
}));

export const agencyMembersRelations = relations(agencyMembers, ({ one }) => ({
  agency: one(agencies, {
    fields: [agencyMembers.agencyId],
    references: [agencies.id],
  }),
  user: one(users, {
    fields: [agencyMembers.userId],
    references: [users.id],
  }),
}));

export const agencyClientsRelations = relations(agencyClients, ({ one, many }) => ({
  agency: one(agencies, {
    fields: [agencyClients.agencyId],
    references: [agencies.id],
  }),
  workspaces: many(clientWorkspaces),
}));

export const clientWorkspacesRelations = relations(clientWorkspaces, ({ one }) => ({
  client: one(agencyClients, {
    fields: [clientWorkspaces.agencyClientId],
    references: [agencyClients.id],
  }),
  organization: one(organizations, {
    fields: [clientWorkspaces.organizationId],
    references: [organizations.id],
  }),
}));

export const resellerPlansRelations = relations(resellerPlans, ({ one }) => ({
  agency: one(agencies, {
    fields: [resellerPlans.agencyId],
    references: [agencies.id],
  }),
}));

export const resellerUsageRelations = relations(resellerUsage, ({ one }) => ({
  organization: one(organizations, {
    fields: [resellerUsage.organizationId],
    references: [organizations.id],
  }),
}));

export const agencyInvitationsRelations = relations(agencyInvitations, ({ one }) => ({
  agency: one(agencies, {
    fields: [agencyInvitations.agencyId],
    references: [agencies.id],
  }),
}));

export const agencyAuditLogsRelations = relations(agencyAuditLogs, ({ one }) => ({
  agency: one(agencies, {
    fields: [agencyAuditLogs.agencyId],
    references: [agencies.id],
  }),
  user: one(users, {
    fields: [agencyAuditLogs.userId],
    references: [users.id],
  }),
}));

export const agencyPermissionsRelations = relations(agencyPermissions, ({ one }) => ({
  agency: one(agencies, {
    fields: [agencyPermissions.agencyId],
    references: [agencies.id],
  }),
}));

export const agencyBillingRelations = relations(agencyBilling, ({ one }) => ({
  agency: one(agencies, {
    fields: [agencyBilling.agencyId],
    references: [agencies.id],
  }),
}));

export const agencySubscriptionsRelations = relations(agencySubscriptions, ({ one }) => ({
  agency: one(agencies, {
    fields: [agencySubscriptions.agencyId],
    references: [agencies.id],
  }),
}));

export const plansRelations = relations(plans, ({ many }) => ({
  features: many(planFeatures),
}));

export const planFeaturesRelations = relations(planFeatures, ({ one }) => ({
  plan: one(plans, {
    fields: [planFeatures.planId],
    references: [plans.id],
  }),
}));

export const subscriptionItemsRelations = relations(subscriptionItems, ({ one, many }) => ({
  subscription: one(subscriptions, {
    fields: [subscriptionItems.subscriptionId],
    references: [subscriptions.id],
  }),
  usages: many(subscriptionUsage),
}));

export const subscriptionUsageRelations = relations(subscriptionUsage, ({ one }) => ({
  item: one(subscriptionItems, {
    fields: [subscriptionUsage.subscriptionItemId],
    references: [subscriptionItems.id],
  }),
}));

export const usageRecordsRelations = relations(usageRecords, ({ one }) => ({
  organization: one(organizations, {
    fields: [usageRecords.organizationId],
    references: [organizations.id],
  }),
}));

export const usageCountersRelations = relations(usageCounters, ({ one }) => ({
  organization: one(organizations, {
    fields: [usageCounters.organizationId],
    references: [organizations.id],
  }),
}));

export const billingAccountsRelations = relations(billingAccounts, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [billingAccounts.organizationId],
    references: [organizations.id],
  }),
  paymentMethods: many(paymentMethods),
  payments: many(payments),
  invoices: many(invoices),
  discounts: many(discounts),
  taxProfile: one(taxProfiles),
}));

export const paymentMethodsRelations = relations(paymentMethods, ({ one }) => ({
  billingAccount: one(billingAccounts, {
    fields: [paymentMethods.billingAccountId],
    references: [billingAccounts.id],
  }),
}));

export const paymentsRelations = relations(payments, ({ one, many }) => ({
  billingAccount: one(billingAccounts, {
    fields: [payments.billingAccountId],
    references: [billingAccounts.id],
  }),
  subscription: one(subscriptions, {
    fields: [payments.subscriptionId],
    references: [subscriptions.id],
  }),
  attempts: many(paymentAttempts),
  refunds: many(refunds),
}));

export const paymentAttemptsRelations = relations(paymentAttempts, ({ one }) => ({
  payment: one(payments, {
    fields: [paymentAttempts.paymentId],
    references: [payments.id],
  }),
}));

export const refundsRelations = relations(refunds, ({ one }) => ({
  payment: one(payments, {
    fields: [refunds.paymentId],
    references: [payments.id],
  }),
}));

export const invoicesRelations = relations(invoices, ({ one, many }) => ({
  billingAccount: one(billingAccounts, {
    fields: [invoices.billingAccountId],
    references: [billingAccounts.id],
  }),
  subscription: one(subscriptions, {
    fields: [invoices.subscriptionId],
    references: [subscriptions.id],
  }),
  items: many(invoiceItems),
  creditNotes: many(creditNotes),
}));

export const invoiceItemsRelations = relations(invoiceItems, ({ one }) => ({
  invoice: one(invoices, {
    fields: [invoiceItems.invoiceId],
    references: [invoices.id],
  }),
}));

export const creditNotesRelations = relations(creditNotes, ({ one }) => ({
  invoice: one(invoices, {
    fields: [creditNotes.invoiceId],
    references: [invoices.id],
  }),
}));

export const couponsRelations = relations(coupons, ({ many }) => ({
  discounts: many(discounts),
}));

export const discountsRelations = relations(discounts, ({ one }) => ({
  billingAccount: one(billingAccounts, {
    fields: [discounts.billingAccountId],
    references: [billingAccounts.id],
  }),
  subscription: one(subscriptions, {
    fields: [discounts.subscriptionId],
    references: [subscriptions.id],
  }),
  coupon: one(coupons, {
    fields: [discounts.couponId],
    references: [coupons.id],
  }),
}));

export const taxProfilesRelations = relations(taxProfiles, ({ one }) => ({
  billingAccount: one(billingAccounts, {
    fields: [taxProfiles.billingAccountId],
    references: [billingAccounts.id],
  }),
}));

export const billingEventsRelations = relations(billingEvents, ({ one }) => ({
  organization: one(organizations, {
    fields: [billingEvents.organizationId],
    references: [organizations.id],
  }),
}));

// --- JOBS SCHEMAS ---

export const backgroundJobs = pgTable("background_jobs", {
  id: uuid("id").defaultRandom().primaryKey(),
  queueName: text("queue_name").default("default").notNull(),
  payload: jsonb("payload").default({}).notNull(),
  attempts: integer("attempts").default(0).notNull(),
  maxAttempts: integer("max_attempts").default(3).notNull(),
  runAt: timestamp("run_at").defaultNow().notNull(),
  lockedAt: timestamp("locked_at"),
  status: text("status").default("pending").notNull(), // 'pending', 'processing', 'completed', 'failed'
  error: text("error"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// --- AUDIT LOGS SCHEMAS ---

export const auditLogs = pgTable("audit_logs", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id")
    .references(() => organizations.id, { onDelete: "cascade" }), // Can be null for system events
  userId: text("user_id")
    .references(() => users.id, { onDelete: "set null" }),
  action: text("action").notNull(),
  resource: text("resource").notNull(),
  resourceId: text("resource_id"),
  metadata: jsonb("metadata").default({}).notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  organization: one(organizations, {
    fields: [auditLogs.organizationId],
    references: [organizations.id],
  }),
  user: one(users, {
    fields: [auditLogs.userId],
    references: [users.id],
  }),
}));

// --- PROGRESS & NOTIFICATION SCHEMAS ---

export const businessActivityLog = pgTable("business_activity_log", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id")
    .references(() => organizations.id, { onDelete: "cascade" })
    .notNull(),
  task: text("task").notNull(),
  category: text("category").notNull(),
  impact: text("impact").notNull(), // 'low', 'medium', 'high', 'critical'
  metadata: jsonb("metadata").default({}).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const businessActivityLogRelations = relations(businessActivityLog, ({ one }) => ({
  organization: one(organizations, {
    fields: [businessActivityLog.organizationId],
    references: [organizations.id],
  }),
}));

export const businessSnapshots = pgTable("business_snapshots", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id")
    .references(() => organizations.id, { onDelete: "cascade" })
    .notNull(),
  healthScore: integer("health_score").notNull(),
  knowledgeScore: integer("knowledge_score").notNull(),
  crmScore: integer("crm_score").notNull(),
  websiteScore: integer("website_score").notNull(),
  aiScore: integer("ai_score").notNull(),
  automationScore: integer("automation_score").notNull(),
  bookingScore: integer("booking_score").notNull(),
  progressPercentage: integer("progress_percentage").notNull(),
  readinessScore: integer("readiness_score").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const businessSnapshotsRelations = relations(businessSnapshots, ({ one }) => ({
  organization: one(organizations, {
    fields: [businessSnapshots.organizationId],
    references: [organizations.id],
  }),
}));

export const smartNotifications = pgTable("smart_notifications", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id")
    .references(() => organizations.id, { onDelete: "cascade" })
    .notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  priority: text("priority").notNull(), // 'low', 'medium', 'high', 'urgent'
  severity: text("severity").notNull(), // 'info', 'warning', 'critical'
  category: text("category").notNull(), // 'setup', 'alert', 'ai_improvement', 'website_change'
  isRead: boolean("is_read").default(false).notNull(),
  isDismissed: boolean("is_dismissed").default(false).notNull(),
  actionUrl: text("action_url"),
  snoozeUntil: timestamp("snooze_until"),
  expiresAt: timestamp("expires_at"),
  metadata: jsonb("metadata").default({}).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const smartNotificationsRelations = relations(smartNotifications, ({ one }) => ({
  organization: one(organizations, {
    fields: [smartNotifications.organizationId],
    references: [organizations.id],
  }),
}));

// ── Global Billing Infrastructure Schemas ──

export const paymentProviders = pgTable("payment_providers", {
  id: text("id").primaryKey(), // 'stripe', 'razorpay', 'paypal', 'paddle', 'mollie', etc.
  name: text("name").notNull(),
  description: text("description"),
  isEnabled: boolean("is_enabled").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const paymentProviderRegions = pgTable("payment_provider_regions", {
  id: uuid("id").defaultRandom().primaryKey(),
  providerId: text("provider_id").references(() => paymentProviders.id, { onDelete: "cascade" }).notNull(),
  countryCode: text("country_code").notNull(), // 'US', 'IN', 'DE', 'FR', etc.
  isRecommended: boolean("is_recommended").default(false).notNull(),
  recommendationReason: text("recommendation_reason"),
});

export const paymentProviderLanguages = pgTable("payment_provider_languages", {
  id: uuid("id").defaultRandom().primaryKey(),
  providerId: text("provider_id").references(() => paymentProviders.id, { onDelete: "cascade" }).notNull(),
  languageCode: text("language_code").notNull(), // 'en', 'hi', 'fr', 'de', etc.
});

export const paymentProviderCurrencies = pgTable("payment_provider_currencies", {
  id: uuid("id").defaultRandom().primaryKey(),
  providerId: text("provider_id").references(() => paymentProviders.id, { onDelete: "cascade" }).notNull(),
  currencyCode: text("currency_code").notNull(), // 'USD', 'INR', 'EUR', etc.
});

export const paymentProviderCapabilities = pgTable("payment_provider_capabilities", {
  id: uuid("id").defaultRandom().primaryKey(),
  providerId: text("provider_id").references(() => paymentProviders.id, { onDelete: "cascade" }).notNull(),
  oneTime: boolean("one_time").default(true).notNull(),
  subscriptions: boolean("subscriptions").default(false).notNull(),
  refunds: boolean("refunds").default(false).notNull(),
  applePay: boolean("apple_pay").default(false).notNull(),
  googlePay: boolean("google_pay").default(false).notNull(),
  upi: boolean("upi").default(false).notNull(),
  netbanking: boolean("netbanking").default(false).notNull(),
  bnpl: boolean("bnpl").default(false).notNull(),
});

export const businessPaymentSettings = pgTable("business_payment_settings", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id").references(() => organizations.id, { onDelete: "cascade" }).notNull(),
  providerId: text("provider_id").references(() => paymentProviders.id, { onDelete: "cascade" }).notNull(),
  connectionStatus: text("connection_status").default("disconnected").notNull(), // 'connected', 'disconnected', 'pending_verification'
  priority: integer("priority").default(0).notNull(),
  credentials: jsonb("credentials").default({}).notNull(), // encrypted keys, sandbox config, webhooks
  isSandbox: boolean("is_sandbox").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ── Global Localization & Regionalization Schemas ──

export const countries = pgTable("countries", {
  code: text("code").primaryKey(), // ISO 2-letter (e.g. 'US', 'IN', 'DE')
  name: text("name").notNull(),
  primaryCurrency: text("primary_currency").notNull(),
  primaryLanguage: text("primary_language").notNull(),
  phoneCode: text("phone_code").notNull(), // e.g. '+91', '+1'
  taxType: text("tax_type").notNull(), // 'GST', 'VAT', 'SalesTax'
  dateFormat: text("date_format").default("YYYY-MM-DD").notNull(),
  timeFormat: text("time_format").default("24h").notNull(),
  weekStart: integer("week_start").default(1).notNull(), // 0 = Sunday, 1 = Monday
  measurementUnit: text("measurement_unit").default("metric").notNull(), // 'metric', 'imperial'
});

export const languages = pgTable("languages", {
  code: text("code").primaryKey(), // ISO 639-1 (e.g. 'en', 'hi', 'fr')
  name: text("name").notNull(),
  nativeName: text("native_name").notNull(),
  isRtl: boolean("is_rtl").default(false).notNull(),
  pluralRules: text("plural_rules").default("one_other").notNull(),
  fallbackCode: text("fallback_code"),
  isEnabled: boolean("is_enabled").default(true).notNull(),
});

export const currencies = pgTable("currencies", {
  code: text("code").primaryKey(), // e.g. 'USD', 'INR', 'EUR'
  symbol: text("symbol").notNull(), // e.g. '$', '₹', '€'
  position: text("position").default("prefix").notNull(), // 'prefix' ($100), 'suffix' (100€)
  decimalSeparator: text("decimal_separator").default(".").notNull(),
  thousandSeparator: text("thousand_separator").default(",").notNull(),
  exchangeRateToUsd: text("exchange_rate_to_usd").default("1.0").notNull(),
});

export const holidays = pgTable("holidays", {
  id: uuid("id").defaultRandom().primaryKey(),
  countryCode: text("country_code").references(() => countries.code, { onDelete: "cascade" }).notNull(),
  name: text("name").notNull(),
  date: text("date").notNull(), // MM-DD format or YYYY-MM-DD
  isNational: boolean("is_national").default(true).notNull(),
});

export const businessLocalization = pgTable("business_localization", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id").references(() => organizations.id, { onDelete: "cascade" }).notNull().unique(),
  countryCode: text("country_code").references(() => countries.code).notNull(),
  primaryLanguage: text("primary_language").references(() => languages.code).notNull(),
  currencyCode: text("currency_code").references(() => currencies.code).notNull(),
  timezone: text("timezone").notNull(),
  dateFormat: text("date_format").default("YYYY-MM-DD").notNull(),
  timeFormat: text("time_format").default("24h").notNull(),
  weekStart: integer("week_start").default(1).notNull(),
  measurementUnit: text("measurement_unit").default("metric").notNull(),
});

export const translations = pgTable("translations", {
  id: uuid("id").defaultRandom().primaryKey(),
  languageCode: text("language_code").references(() => languages.code, { onDelete: "cascade" }).notNull(),
  namespace: text("namespace").default("common").notNull(), // 'common', 'dashboard', 'voice'
  key: text("key").notNull(),
  value: text("value").notNull(),
});

// --- USER PROFILE & CONFIG SCHEMAS ---

export const profiles = pgTable("profiles", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  phone: text("phone"),
  bio: text("bio"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const refreshTokens = pgTable("refresh_tokens", {
  id: text("id").primaryKey(),
  token: text("token").notNull().unique(),
  userId: text("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  sessionId: text("session_id")
    .references(() => sessions.id, { onDelete: "cascade" })
    .notNull(),
  userAgent: text("user_agent"),
  ipAddress: text("ip_address"),
  expiresAt: timestamp("expires_at").notNull(),
  isRevoked: boolean("is_revoked").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const emailVerifications = pgTable("email_verifications", {
  id: uuid("id").defaultRandom().primaryKey(),
  token: text("token").notNull().unique(),
  userId: text("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  email: text("email").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  isUsed: boolean("is_used").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const passwordResetTokens = pgTable("password_reset_tokens", {
  id: uuid("id").defaultRandom().primaryKey(),
  token: text("token").notNull().unique(),
  userId: text("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  isUsed: boolean("is_used").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const loginAttempts = pgTable("login_attempts", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: text("email").notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  success: boolean("success").notNull(),
  attemptedAt: timestamp("attempted_at").defaultNow().notNull(),
});

export const loginHistory = pgTable("login_history", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  browser: text("browser"),
  os: text("os"),
  device: text("device"),
  loginAt: timestamp("login_at").defaultNow().notNull(),
});

export const devices = pgTable("devices", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  fingerprint: text("fingerprint").notNull(),
  name: text("name"),
  type: text("type"),
  lastActive: timestamp("last_active").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const userPreferences = pgTable("user_preferences", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull().unique(),
  theme: text("theme").default("system").notNull(),
  language: text("language").default("en").notNull(),
  timezone: text("timezone").default("UTC").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const userSettings = pgTable("user_settings", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull().unique(),
  mfaEnabled: boolean("mfa_enabled").default(false).notNull(),
  mfaSecret: text("mfa_secret"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const notificationSettings = pgTable("notification_settings", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull().unique(),
  emailNotifications: boolean("email_notifications").default(true).notNull(),
  smsNotifications: boolean("sms_notifications").default(true).notNull(),
  pushNotifications: boolean("push_notifications").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const securitySettings = pgTable("security_settings", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull().unique(),
  loginLockoutDuration: integer("login_lockout_duration").default(15).notNull(), // in minutes
  passwordExpiryDays: integer("password_expiry_days").default(90).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// --- RELATION SHAPES FOR DRIZZLE ---

export const profilesRelations = relations(profiles, ({ one }) => ({
  user: one(users, {
    fields: [profiles.userId],
    references: [users.id],
  }),
}));

export const refreshTokensRelations = relations(refreshTokens, ({ one }) => ({
  user: one(users, {
    fields: [refreshTokens.userId],
    references: [users.id],
  }),
  session: one(sessions, {
    fields: [refreshTokens.sessionId],
    references: [sessions.id],
  }),
}));

export const userPreferencesRelations = relations(userPreferences, ({ one }) => ({
  user: one(users, {
    fields: [userPreferences.userId],
    references: [users.id],
  }),
}));

export const userSettingsRelations = relations(userSettings, ({ one }) => ({
  user: one(users, {
    fields: [userSettings.userId],
    references: [users.id],
  }),
}));

export const notificationSettingsRelations = relations(notificationSettings, ({ one }) => ({
  user: one(users, {
    fields: [notificationSettings.userId],
    references: [users.id],
  }),
}));

export const securitySettingsRelations = relations(securitySettings, ({ one }) => ({
  user: one(users, {
    fields: [securitySettings.userId],
    references: [users.id],
  }),
}));

// --- AUTOMATION RULES & WORKFLOW EXECUTION SCHEMAS ---

export const automationRules = pgTable("automation_rules", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id")
    .references(() => organizations.id, { onDelete: "cascade" })
    .notNull(),
  name: text("name").notNull(),
  description: text("description"),
  triggerType: text("trigger_type").notNull(), // 'lead_created', 'appointment_created', 'appointment_rescheduled', 'appointment_cancelled', 'appointment_no_show', 'call_completed', 'tag_added', 'custom'
  triggerConfig: jsonb("trigger_config").default({}).notNull(),
  conditions: jsonb("conditions").default([]).notNull(), // array of { field: string, operator: 'eq'|'neq'|'gt'|'lt'|'gte'|'lte'|'contains'|'in', value: any }
  actions: jsonb("actions").default([]).notNull(), // array of { type: 'send_sms'|'send_email'|'send_whatsapp'|'update_lead_status'|'apply_tag'|'create_notification'|'assign_staff'|'webhook_post', config: Record<string, any> }
  isActive: boolean("is_active").default(true).notNull(),
  executionCount: integer("execution_count").default(0).notNull(),
  lastExecutedAt: timestamp("last_executed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const automationRuleExecutions = pgTable("automation_rule_executions", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id")
    .references(() => organizations.id, { onDelete: "cascade" })
    .notNull(),
  ruleId: uuid("rule_id")
    .references(() => automationRules.id, { onDelete: "cascade" })
    .notNull(),
  triggerEvent: text("trigger_event").notNull(),
  eventPayload: jsonb("event_payload").default({}).notNull(),
  status: text("status").default("success").notNull(), // 'success', 'failed', 'skipped'
  actionsExecuted: jsonb("actions_executed").default([]).notNull(),
  errorMessage: text("error_message"),
  executedAt: timestamp("executed_at").defaultNow().notNull(),
});

export const automationRulesRelations = relations(automationRules, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [automationRules.organizationId],
    references: [organizations.id],
  }),
  executions: many(automationRuleExecutions),
}));

export const automationRuleExecutionsRelations = relations(automationRuleExecutions, ({ one }) => ({
  organization: one(organizations, {
    fields: [automationRuleExecutions.organizationId],
    references: [organizations.id],
  }),
  rule: one(automationRules, {
    fields: [automationRuleExecutions.ruleId],
    references: [automationRules.id],
  }),
}));

// --- APPOINTMENT WAITLIST SCHEMA ---

export const appointmentWaitlist = pgTable("appointment_waitlist", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id")
    .references(() => organizations.id, { onDelete: "cascade" })
    .notNull(),
  staffMemberId: uuid("staff_member_id")
    .references(() => staffMembers.id, { onDelete: "cascade" })
    .notNull(),
  serviceId: uuid("service_id")
    .references(() => services.id, { onDelete: "cascade" })
    .notNull(),
  leadProfileId: uuid("lead_profile_id")
    .references(() => leadProfiles.id, { onDelete: "set null" }),
  customerName: text("customer_name").notNull(),
  customerEmail: text("customer_email"),
  customerPhone: text("customer_phone"),
  preferredDate: timestamp("preferred_date").notNull(),
  status: text("status").default("waiting").notNull(), // 'waiting', 'offered', 'booked', 'expired', 'cancelled'
  offeredAt: timestamp("offered_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const appointmentWaitlistRelations = relations(appointmentWaitlist, ({ one }) => ({
  organization: one(organizations, {
    fields: [appointmentWaitlist.organizationId],
    references: [organizations.id],
  }),
  staffMember: one(staffMembers, {
    fields: [appointmentWaitlist.staffMemberId],
    references: [staffMembers.id],
  }),
  service: one(services, {
    fields: [appointmentWaitlist.serviceId],
    references: [services.id],
  }),
  lead: one(leadProfiles, {
    fields: [appointmentWaitlist.leadProfileId],
    references: [leadProfiles.id],
  }),
}));

