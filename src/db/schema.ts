import {
  pgTable,
  pgEnum,
  serial,
  integer,
  text,
  varchar,
  boolean,
  timestamp,
  numeric,
  jsonb,
  date,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

/* ---------------------------------------------------------------- enums */

export const paymentMethodEnum = pgEnum("payment_method", [
  "cash",
  "bank_transfer",
  "cheque",
  "online",
]);

export const donationStatusEnum = pgEnum("donation_status", [
  "completed", // money in hand / confirmed
  "pending", // cheque or transfer not yet cleared
  "void", // reversed, kept for audit
]);

export const scopeEnum = pgEnum("data_scope", ["own", "team", "all"]);

/* ---------------------------------------------------------------- roles */

export const roles = pgTable("roles", {
  id: serial("id").primaryKey(),
  key: varchar("key", { length: 40 }).notNull().unique(),
  name: varchar("name", { length: 80 }).notNull(),
  description: text("description"),
  // 1 is the top of the hierarchy. Lower number = more senior.
  level: integer("level").notNull().default(50),
  // list of permission keys, see src/lib/permissions.ts
  permissions: jsonb("permissions").$type<string[]>().notNull().default([]),
  // how much collection data a holder of this role may read
  dataScope: scopeEnum("data_scope").notNull().default("own"),
  isSystem: boolean("is_system").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/* ---------------------------------------------------------------- users */

export const users = pgTable(
  "users",
  {
    id: serial("id").primaryKey(),
    username: varchar("username", { length: 40 }).notNull().unique(),
    fullName: varchar("full_name", { length: 120 }).notNull(),
    email: varchar("email", { length: 160 }),
    mobile: varchar("mobile", { length: 24 }),
    passwordHash: text("password_hash").notNull(),
    roleId: integer("role_id")
      .notNull()
      .references(() => roles.id),
    // hierarchy: who reviews this person's collections
    managerId: integer("manager_id"),
    postedAt: varchar("posted_at", { length: 80 }), // counter / area, free text for now
    isActive: boolean("is_active").notNull().default(true),
    mustChangePassword: boolean("must_change_password").notNull().default(false),
    lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("users_role_idx").on(t.roleId), index("users_manager_idx").on(t.managerId)],
);

export const usersRelations = relations(users, ({ one }) => ({
  role: one(roles, { fields: [users.roleId], references: [roles.id] }),
  manager: one(users, {
    fields: [users.managerId],
    references: [users.id],
    relationName: "manager",
  }),
}));

/* --------------------------------------------------------------- donors */

export const donors = pgTable(
  "donors",
  {
    id: serial("id").primaryKey(),
    donorCode: varchar("donor_code", { length: 20 }).notNull().unique(),
    legacyCode: varchar("legacy_code", { length: 40 }), // old register / Excel number
    fullName: varchar("full_name", { length: 140 }).notNull(),
    mobile: varchar("mobile", { length: 24 }).notNull(), // unique identifier per client
    altMobile: varchar("alt_mobile", { length: 24 }),
    cnic: varchar("cnic", { length: 20 }),
    email: varchar("email", { length: 160 }),
    address: text("address"),
    city: varchar("city", { length: 80 }),
    // set when several people genuinely share one number (family account)
    sharesMobileWith: varchar("shares_mobile_with", { length: 24 }),
    notes: text("notes"),
    isActive: boolean("is_active").notNull().default(true),
    createdById: integer("created_by_id").references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("donors_mobile_key").on(t.mobile),
    index("donors_name_idx").on(t.fullName),
    index("donors_legacy_idx").on(t.legacyCode),
  ],
);

/* ------------------------------------------------- collection heads */

export const heads = pgTable(
  "heads",
  {
    id: serial("id").primaryKey(),
    code: varchar("code", { length: 30 }).notNull().unique(),
    name: varchar("name", { length: 120 }).notNull(),
    nameUr: varchar("name_ur", { length: 120 }),
    parentId: integer("parent_id"), // null = top level head, else subhead
    // subheads that represent one dated occasion (28th Safar, 9th Muharram ...)
    isEvent: boolean("is_event").notNull().default(false),
    eventDate: date("event_date"),
    sortOrder: integer("sort_order").notNull().default(0),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("heads_parent_idx").on(t.parentId)],
);

export const headsRelations = relations(heads, ({ one, many }) => ({
  parent: one(heads, {
    fields: [heads.parentId],
    references: [heads.id],
    relationName: "parent",
  }),
  children: many(heads, { relationName: "parent" }),
}));

/* ------------------------------------------------------------ donations */

export const donations = pgTable(
  "donations",
  {
    id: serial("id").primaryKey(),
    receiptNo: varchar("receipt_no", { length: 20 }).notNull().unique(),
    donorId: integer("donor_id")
      .notNull()
      .references(() => donors.id),
    headId: integer("head_id")
      .notNull()
      .references(() => heads.id),
    amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
    paymentMethod: paymentMethodEnum("payment_method").notNull().default("cash"),
    status: donationStatusEnum("status").notNull().default("completed"),
    chequeNo: varchar("cheque_no", { length: 40 }),
    bankName: varchar("bank_name", { length: 80 }),
    slipRef: varchar("slip_ref", { length: 120 }), // transfer / slip number
    slipUrl: text("slip_url"), // link to the scanned slip
    receivedAt: timestamp("received_at", { withTimezone: true }).notNull().defaultNow(),
    collectedById: integer("collected_by_id")
      .notNull()
      .references(() => users.id),
    isMembership: boolean("is_membership").notNull().default(false),
    membershipMonth: varchar("membership_month", { length: 7 }), // YYYY-MM
    remarks: text("remarks"),
    voidedById: integer("voided_by_id").references(() => users.id),
    voidReason: text("void_reason"),
    voidedAt: timestamp("voided_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("donations_donor_idx").on(t.donorId),
    index("donations_head_idx").on(t.headId),
    index("donations_received_idx").on(t.receivedAt),
    index("donations_collector_idx").on(t.collectedById),
  ],
);

/* ----------------------------------------------------------- membership */

export const pledges = pgTable(
  "pledges",
  {
    id: serial("id").primaryKey(),
    donorId: integer("donor_id")
      .notNull()
      .references(() => donors.id)
      .unique(),
    monthlyAmount: numeric("monthly_amount", { precision: 12, scale: 2 }).notNull(),
    headId: integer("head_id").references(() => heads.id),
    dueDay: integer("due_day").notNull().default(5),
    startedOn: date("started_on").notNull(),
    isActive: boolean("is_active").notNull().default(true),
    createdById: integer("created_by_id").references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("pledges_active_idx").on(t.isActive)],
);

/* ------------------------------------------------ chatter / discussion */

export const notes = pgTable(
  "notes",
  {
    id: serial("id").primaryKey(),
    entityType: varchar("entity_type", { length: 24 }).notNull(), // donor | donation
    entityId: integer("entity_id").notNull(),
    body: text("body").notNull(),
    authorId: integer("author_id")
      .notNull()
      .references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("notes_entity_idx").on(t.entityType, t.entityId)],
);

/* -------------------------------------------------------------- audit */

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: serial("id").primaryKey(),
    actorId: integer("actor_id").references(() => users.id),
    actorName: varchar("actor_name", { length: 120 }),
    action: varchar("action", { length: 40 }).notNull(), // login, create, update, void ...
    entityType: varchar("entity_type", { length: 24 }).notNull(),
    entityId: integer("entity_id"),
    summary: text("summary").notNull(),
    before: jsonb("before"),
    after: jsonb("after"),
    ip: varchar("ip", { length: 60 }),
    userAgent: text("user_agent"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("audit_entity_idx").on(t.entityType, t.entityId),
    index("audit_created_idx").on(t.createdAt),
  ],
);

/* ----------------------------------------------------------- counters */

// gapless human readable numbers for receipts and donor codes
export const counters = pgTable("counters", {
  key: varchar("key", { length: 40 }).primaryKey(),
  value: integer("value").notNull().default(0),
});

/* ----------------------------------------------------------- settings */

export const settings = pgTable("settings", {
  key: varchar("key", { length: 60 }).primaryKey(),
  value: text("value"),
});
