import { drizzle } from "drizzle-orm/vercel-postgres";
import { sql } from "@vercel/postgres";
import {
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
  decimal,
  bigint,
} from "drizzle-orm/pg-core";
import { eq, relations } from "drizzle-orm";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";
// Use this object to send drizzle queries to your DB
// Create a pgTable that maps to a table in your DB

export const ApprovedQuoteGroup = pgTable(
  "approved_quote_group",
  {
    id: serial("id").primaryKey(),
    approvalTimestamp: decimal("approval_timestamp", {
      precision: 15,
      scale: 0,
    })
      .notNull()
      .$defaultFn(() => Math.floor(new Date().getTime() / 1000).toString()),
    quoteGroupId: serial("quote_group_id")
      .references(() => QuoteGroup.id, { onDelete: "cascade" })
      .notNull(),
  },
  (t) => {
    return {
      uniqueQuoteGroupId: uniqueIndex("unique_quote_group_id").on(
        t.quoteGroupId
      ),
    };
  }
);

export const approvedQuoteGroupRelations = relations(
  ApprovedQuoteGroup,
  ({ one }) => ({
    quoteGroup: one(QuoteGroup, {
      fields: [ApprovedQuoteGroup.quoteGroupId],
      references: [QuoteGroup.id],
    }),
  })
);

export const TotalBudgetGranted = pgTable("total_budget_granted", {
  id: serial("id").primaryKey(),
  amount: decimal("amount", { precision: 15, scale: 4 }).notNull(),
});
export const QuoteGroup = pgTable("quote_group", {
  id: serial("id").primaryKey(),
  createdAt: decimal("created_at", { precision: 15, scale: 0 })
    .$defaultFn(() => Math.floor(new Date().getTime() / 1000).toString())
    .notNull(),
  electricityPrice: decimal("electricity_price", {
    precision: 10,
    scale: 4,
  }).notNull(),
  powerOutput: bigint("power_output", { mode: "number" }).notNull(),
  systemSize: decimal("system_size", { precision: 10, scale: 4 }).notNull(),
  zipCode: text("zip_code"),
  maximumElectricityPrice: decimal("maximum_electricity_price", {
    precision: 10,
    scale: 4,
  }).notNull(),
  protocolFeeValueMultiplier: decimal("protocol_fee_value_multiplier", {
    precision: 10,
    scale: 4,
  }).notNull(),
  startingDateTimestamp: decimal("starting_date_timestamp", {
    precision: 15,
    scale: 0,
  }).notNull(),
  targetTimestamp: decimal("target_timestamp", {
    precision: 15,
    scale: 0,
  }).notNull(),
  decayPerDay: decimal("decay_per_day", { precision: 10, scale: 5 }).notNull(),
  scoutingFee: decimal("installer_fee", { precision: 10, scale: 4 }).notNull(),
  lat: decimal("lat", { precision: 10, scale: 4 }).notNull(),
  lon: decimal("lon", { precision: 10, scale: 4 }).notNull(),
  carbonCreditEffectiveness: decimal("carbon_credit_effectiveness", {
    precision: 10,
    scale: 4,
  }).notNull(),
  installFixedFee: decimal("install_fixed_fee", {
    precision: 12,
    scale: 4,
  }).notNull(),
  protocolFees: bigint("protocol_fees", { mode: "number" }).notNull(),
});

export const QuoteSingle = pgTable("quote", {
  id: serial("id").primaryKey(),
  quote: bigint("quote", { mode: "number" }).notNull(),
  timestampToBenchmark: decimal("timestamp_to_benchmark", {
    precision: 15,
    scale: 0,
  }).notNull(),
  quoteGroupId: serial("quote_group_id")
    .references(() => QuoteGroup.id, { onDelete: "cascade" })
    .notNull(),
});

export const quoteGroupRelations = relations(QuoteGroup, ({ many }) => ({
  quotes: many(QuoteSingle),
}));

export const quoteSingleRelations = relations(QuoteSingle, ({ one }) => ({
  quoteGroup: one(QuoteGroup, {
    fields: [QuoteSingle.quoteGroupId],
    references: [QuoteGroup.id],
  }),
}));

const InsertQuoteGroupSchema = createInsertSchema(QuoteGroup);
export type InsertQuoteGroup = z.infer<typeof InsertQuoteGroupSchema>;
const InsertQuoteSingleSchema = createInsertSchema(QuoteSingle);
export type InsertQuoteSingle = z.infer<typeof InsertQuoteSingleSchema>;
