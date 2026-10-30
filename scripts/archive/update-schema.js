const fs = require('fs');
const filePath = 'src/server/db/schema.ts';
let content = fs.readFileSync(filePath, 'utf8');

// 1. Add visibilityEnum
const answerTypeEnum = `export const answerTypeEnum = pgEnum("answer_type", [
  "text",
  "single_select",
  "multi_select",
  "number"
]);`;

const visibilityEnum = `export const answerTypeEnum = pgEnum("answer_type", [
  "text",
  "single_select",
  "multi_select",
  "number"
]);

export const visibilityEnum = pgEnum("category_visibility", [
  "public",
  "internal",
  "ai_only"
]);`;

content = content.replace(answerTypeEnum, visibilityEnum);

// 2. Add fields to knowledgeCategories
const oldCats = `export const knowledgeCategories = pgTable("knowledge_categories", {
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
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});`;

const newCats = `export const knowledgeCategories = pgTable("knowledge_categories", {
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
  parentId: uuid("parent_id"), // self-referential relations added in relations block if needed, avoiding circular type issues here
  visibility: visibilityEnum("visibility").default("public").notNull(),
  aiInstructions: text("ai_instructions"),
  isArchived: boolean("is_archived").default(false).notNull(),
  createdById: text("created_by_id"),
  updatedById: text("updated_by_id"),
  metadata: jsonb("metadata").default({}).notNull(),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});`;

content = content.replace(oldCats, newCats);

fs.writeFileSync(filePath, content, 'utf8');
console.log('schema.ts updated.');
