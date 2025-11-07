import {
  pgTable,
  text,
  integer,
  boolean,
  timestamp,
  uuid,
  jsonb,
  real,
} from "drizzle-orm/pg-core";

/**
 * Towns table - Main game entity
 */
export const towns = pgTable("towns", {
  address: text("address").primaryKey(), // User's hex address
  channelId: text("channel_id").notNull(),
  name: text("name").notNull(),
  level: integer("level").notNull().default(0),
  requestedLevel: integer("requested_level").notNull().default(1),
  leveledUpAt: integer("leveled_up_at").notNull().default(0),
  coins: integer("coins").notNull().default(0),
  troops: integer("troops").notNull().default(0),
  treasury: integer("treasury").notNull().default(0), // stored in cents
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

/**
 * Resources table - Buildings/structures owned by towns
 */
export const resources = pgTable("resources", {
  id: uuid("id").primaryKey().defaultRandom(),
  townAddress: text("town_address")
    .notNull()
    .references(() => towns.address, { onDelete: "cascade" }),
  type: integer("type").notNull(), // Resource type ID from RESOURCE_DEFINITIONS_TABLE
  level: integer("level").notNull().default(0),
  aquiredAt: integer("aquired_at").notNull(), // tick when acquired
  rewardsBank: integer("rewards_bank").notNull().default(0),
  collectedAt: integer("collected_at").notNull(), // tick when last collected
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

/**
 * Battles table - Combat encounters between towns
 */
export const battles = pgTable("battles", {
  id: uuid("id").primaryKey().defaultRandom(),
  defenderAddress: text("defender_address")
    .notNull()
    .references(() => towns.address, { onDelete: "cascade" }),
  attackerAddress: text("attacker_address")
    .notNull()
    .references(() => towns.address, { onDelete: "cascade" }),
  start: integer("start").notNull(), // tick when battle started
  end: integer("end").notNull(), // tick when battle ends
  cooldownEnd: integer("cooldown_end").notNull(), // tick when cooldown expires
  reward: integer("reward").notNull(), // cents
  penalty: integer("penalty").notNull(), // cents
  success: boolean("success").notNull(),
  percentage: integer("percentage").notNull(), // 0-100
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

/**
 * Shields table - Defense buffs for towns
 */
export const shields = pgTable("shields", {
  id: uuid("id").primaryKey().defaultRandom(),
  townAddress: text("town_address")
    .notNull()
    .references(() => towns.address, { onDelete: "cascade" }),
  start: integer("start").notNull(), // tick when shield started (inclusive)
  end: integer("end").notNull(), // tick when shield ends (exclusive)
  cooldownEnd: integer("cooldown_end").notNull(), // tick when cooldown expires
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

/**
 * Boosts table - Production multiplier buffs for towns
 */
export const boosts = pgTable("boosts", {
  id: uuid("id").primaryKey().defaultRandom(),
  townAddress: text("town_address")
    .notNull()
    .references(() => towns.address, { onDelete: "cascade" }),
  start: integer("start").notNull(), // tick when boost started
  end: integer("end").notNull(), // tick when boost ends
  cooldownEnd: integer("cooldown_end").notNull(), // tick when cooldown expires
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

/**
 * Actions table - Queued player actions to execute on tick
 */
export const actions = pgTable("actions", {
  id: uuid("id").primaryKey().defaultRandom(),
  townAddress: text("town_address")
    .notNull()
    .references(() => towns.address, { onDelete: "cascade" }),
  tick: integer("tick").notNull(), // tick when action should be executed
  type: integer("type").notNull(), // Action type: 0-8
  data: jsonb("data"), // Additional action data (e.g., resourceType, resourceIndex, targetAddress)
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

/**
 * Game State table - Global game state (tick counter, etc.)
 */
export const gameState = pgTable("game_state", {
  id: integer("id").primaryKey().default(1), // Singleton table
  currentTick: integer("current_tick").notNull().default(0),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

/**
 * Main Messages table - Track the last message sent to each channel
 */
export const mainMessages = pgTable("main_messages", {
  channelId: text("channel_id").primaryKey(),
  messageId: text("message_id").notNull(),
  messageContent: text("message_content").notNull(), // Store to compare if changed
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

/**
 * Town Errors table - Track errors for towns
 */
export const townErrors = pgTable("town_errors", {
  id: uuid("id").primaryKey().defaultRandom(),
  townAddress: text("town_address")
    .notNull()
    .references(() => towns.address, { onDelete: "cascade" }),
  message: text("message").notNull(),
  tick: integer("tick").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Export types for use in application
export type Town = typeof towns.$inferSelect;
export type NewTown = typeof towns.$inferInsert;

export type Resource = typeof resources.$inferSelect;
export type NewResource = typeof resources.$inferInsert;

export type Battle = typeof battles.$inferSelect;
export type NewBattle = typeof battles.$inferInsert;

export type Shield = typeof shields.$inferSelect;
export type NewShield = typeof shields.$inferInsert;

export type Boost = typeof boosts.$inferSelect;
export type NewBoost = typeof boosts.$inferInsert;

export type Action = typeof actions.$inferSelect;
export type NewAction = typeof actions.$inferInsert;

export type GameState = typeof gameState.$inferSelect;
export type NewGameState = typeof gameState.$inferInsert;

export type MainMessage = typeof mainMessages.$inferSelect;
export type NewMainMessage = typeof mainMessages.$inferInsert;

export type TownError = typeof townErrors.$inferSelect;
export type NewTownError = typeof townErrors.$inferInsert;
