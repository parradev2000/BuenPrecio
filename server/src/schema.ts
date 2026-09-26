import { relations } from 'drizzle-orm';
import {
  boolean,
  index,
  integer,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

export const roleEnum = pgEnum('role', ['consumidor', 'productor', 'administrador']);
export const userStatusEnum = pgEnum('user_status', ['active', 'suspended']);
export const applicationStatusEnum = pgEnum('application_status', ['pending', 'approved', 'rejected']);
export const categoryKindEnum = pgEnum('category_kind', ['negocio', 'item']);
export const itemTypeEnum = pgEnum('item_type', ['producto', 'servicio']);
export const itemUnitEnum = pgEnum('item_unit', ['unidad', 'kg', 'litro', 'paquete']);

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  email: text('email').notNull(),
  passwordHash: text('password_hash'),
  role: roleEnum('role').notNull().default('consumidor'),
  status: userStatusEnum('status').notNull().default('active'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const producerApplications = pgTable(
  'producer_applications',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    status: applicationStatusEnum('status').notNull().default('pending'),
    reviewedBy: uuid('reviewed_by').references(() => users.id),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    reviewedAt: timestamp('reviewed_at', { withTimezone: true }),
  },
  (table) => [uniqueIndex('producer_applications_user_unique').on(table.userId)],
);

export const categories = pgTable(
  'categories',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: text('name').notNull(),
    kind: categoryKindEnum('kind').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex('categories_kind_name_unique').on(table.kind, table.name)],
);

export const productCategories = pgTable(
  'product_categories',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: text('name').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex('product_categories_name_unique').on(table.name)],
);

export const businesses = pgTable(
  'businesses',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    ownerId: uuid('owner_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    description: text('description'),
    categoryId: uuid('category_id').references(() => categories.id),
    address: text('address'),
    phone: text('phone'),
    email: text('email'),
    latitude: numeric('latitude', { precision: 10, scale: 7, mode: 'number' }),
    longitude: numeric('longitude', { precision: 10, scale: 7, mode: 'number' }),
    photoUrl: text('photo_url'),
    active: boolean('active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('businesses_owner_idx').on(table.ownerId)],
);

export const businessPhones = pgTable(
  'business_phones',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    businessId: uuid('business_id')
      .notNull()
      .references(() => businesses.id, { onDelete: 'cascade' }),
    phone: text('phone').notNull(),
    position: integer('position').notNull().default(0),
  },
  (table) => [index('business_phones_business_idx').on(table.businessId)],
);

export const businessItems = pgTable(
  'business_items',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    businessId: uuid('business_id')
      .notNull()
      .references(() => businesses.id, { onDelete: 'cascade' }),
    type: itemTypeEnum('type').notNull(),
    name: text('name').notNull(),
    description: text('description'),
    price: numeric('price', { precision: 12, scale: 2, mode: 'number' }).notNull(),
    unit: itemUnitEnum('unit'),
    photoUrl: text('photo_url'),
    categoryId: uuid('category_id').references(() => productCategories.id),
    available: boolean('available').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('business_items_business_idx').on(table.businessId)],
);

// Fecha futura: reportes de "avisar un mejor precio"
export const priceReports = pgTable(
  'price_reports',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    itemId: uuid('item_id')
      .notNull()
      .references(() => businessItems.id, { onDelete: 'cascade' }),
    reportedBy: uuid('reported_by').references(() => users.id),
    price: numeric('price', { precision: 12, scale: 2, mode: 'number' }).notNull(),
    note: text('note'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('price_reports_item_idx').on(table.itemId)],
);

export const usersRelations = relations(users, ({ many }) => ({
  applications: many(producerApplications),
  businesses: many(businesses),
  refreshTokens: many(refreshTokens),
}));

export const producerApplicationsRelations = relations(producerApplications, ({ one }) => ({
  user: one(users, { fields: [producerApplications.userId], references: [users.id] }),
  reviewer: one(users, { fields: [producerApplications.reviewedBy], references: [users.id] }),
}));

export const refreshTokens = pgTable(
  'refresh_tokens',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    tokenHash: text('token_hash').notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('refresh_tokens_hash_idx').on(table.tokenHash)],
);

export const refreshTokensRelations = relations(refreshTokens, ({ one }) => ({
  user: one(users, { fields: [refreshTokens.userId], references: [users.id] }),
}));

export const passwordResets = pgTable(
  'password_resets',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    tokenHash: text('token_hash').notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    usedAt: timestamp('used_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('password_resets_hash_idx').on(table.tokenHash)],
);

export const passwordResetsRelations = relations(passwordResets, ({ one }) => ({
  user: one(users, { fields: [passwordResets.userId], references: [users.id] }),
}));

export const businessesRelations = relations(businesses, ({ one, many }) => ({
  owner: one(users, { fields: [businesses.ownerId], references: [users.id] }),
  category: one(categories, { fields: [businesses.categoryId], references: [categories.id] }),
  items: many(businessItems),
  phones: many(businessPhones),
}));

export const businessPhonesRelations = relations(businessPhones, ({ one }) => ({
  business: one(businesses, { fields: [businessPhones.businessId], references: [businesses.id] }),
}));

export const businessItemsRelations = relations(businessItems, ({ one, many }) => ({
  business: one(businesses, { fields: [businessItems.businessId], references: [businesses.id] }),
  category: one(productCategories, { fields: [businessItems.categoryId], references: [productCategories.id] }),
  reports: many(priceReports),
}));

export const categoriesRelations = relations(categories, ({ many }) => ({
  businesses: many(businesses),
  items: many(businessItems),
}));

export const productCategoriesRelations = relations(productCategories, ({ many }) => ({
  items: many(businessItems),
}));

export const priceReportsRelations = relations(priceReports, ({ one }) => ({
  item: one(businessItems, { fields: [priceReports.itemId], references: [businessItems.id] }),
  reporter: one(users, { fields: [priceReports.reportedBy], references: [users.id] }),
}));

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type ProducerApplication = typeof producerApplications.$inferSelect;
export type Category = typeof categories.$inferSelect;
export type ProductCategory = typeof productCategories.$inferSelect;
export type Business = typeof businesses.$inferSelect;
export type NewBusiness = typeof businesses.$inferInsert;
export type BusinessPhone = typeof businessPhones.$inferSelect;
export type NewBusinessPhone = typeof businessPhones.$inferInsert;
export type BusinessItem = typeof businessItems.$inferSelect;
export type NewBusinessItem = typeof businessItems.$inferInsert;
export type RefreshToken = typeof refreshTokens.$inferSelect;