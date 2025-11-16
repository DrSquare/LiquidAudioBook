import { sql } from "drizzle-orm";
import {
  pgTable,
  text,
  varchar,
  uuid,
  integer,
  timestamp,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Audiobook processing jobs table
export const audiobookJobs = pgTable("audiobook_jobs", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id"), // Optional: for future multi-user support
  status: varchar("status", { length: 50 }).default("uploading"), // uploading|extracting|refining|generating|completed|failed
  totalImages: integer("total_images").default(0),
  currentImage: integer("current_image").default(0),
  extractedTexts: text("extracted_texts"), // JSON stringified
  refinedText: text("refined_text"),
  audioUrl: varchar("audio_url", { length: 512 }),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at").defaultNow(),
  completedAt: timestamp("completed_at"),
});

export type AudiobookJob = typeof audiobookJobs.$inferSelect;
export type InsertAudiobookJob = typeof audiobookJobs.$inferInsert;

// Individual images in a job
export const jobImages = pgTable("job_images", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  jobId: uuid("job_id").notNull(),
  pageNumber: integer("page_number").notNull(),
  filePath: varchar("file_path", { length: 512 }),
  extractedText: text("extracted_text"),
  createdAt: timestamp("created_at").defaultNow(),
});

export type JobImage = typeof jobImages.$inferSelect;
export type InsertJobImage = typeof jobImages.$inferInsert;

// Audio files storage
export const audioFiles = pgTable("audio_files", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  jobId: uuid("job_id").notNull(),
  filePath: varchar("file_path", { length: 512 }).notNull(),
  mimeType: varchar("mime_type", { length: 50 }).default("audio/mpeg"),
  fileSize: integer("file_size"),
  createdAt: timestamp("created_at").defaultNow(),
});

export type AudioFile = typeof audioFiles.$inferSelect;
export type InsertAudioFile = typeof audioFiles.$inferInsert;
