import {
  boolean,
  customType,
  index,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { v7 as uuidv7 } from "uuid";
import { users } from "./users";

const bytea = customType<{ data: Uint8Array; driverData: Buffer }>({
  dataType: () => "bytea",
});

export const connectionStatusEnum = pgEnum("connection_status", [
  "connected",
  "token_expired",
  "revoked",
  "rate_limited",
]);

export const xAccounts = pgTable(
  "x_accounts",
  {
    id: uuid("id").primaryKey().$defaultFn(uuidv7),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    xUserId: text("x_user_id").notNull().unique(),
    handle: text("handle").notNull(),
    displayName: text("display_name").notNull(),
    avatarUrl: text("avatar_url"),
    accessTokenEnc: bytea("access_token_enc").notNull(),
    refreshTokenEnc: bytea("refresh_token_enc").notNull(),
    tokenExpiresAt: timestamp("token_expires_at", { withTimezone: true }).notNull(),
    scopes: text("scopes").array().notNull(),
    connectionStatus: connectionStatusEnum("connection_status").notNull().default("connected"),
    lastIngestedPostId: text("last_ingested_post_id"),
    isPrimary: boolean("is_primary").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [index("x_accounts_user_id_idx").on(table.userId)],
);

export type XAccountRow = typeof xAccounts.$inferSelect;
export type NewXAccountRow = typeof xAccounts.$inferInsert;
