import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";

export const sessions = sqliteTable("sessions", {
  id: text("id").primaryKey(),
  deck: text("deck").notNull(),
  slideCount: integer("slide_count").notNull(),
  hostHash: text("host_hash").notNull(),
  slide: integer("slide").notNull(),
  sequence: integer("sequence").notNull().default(0),
  updatedAt: integer("updated_at").notNull(),
  expiresAt: integer("expires_at").notNull(),
  ended: integer("ended", { mode: "boolean" }).notNull().default(false),
}, table => [index("sessions_expiry").on(table.expiresAt)]);

export const creationLimits = sqliteTable("creation_limits", {
  key: text("key").primaryKey(),
  count: integer("count").notNull(),
  expiresAt: integer("expires_at").notNull(),
}, table => [index("limits_expiry").on(table.expiresAt)]);
