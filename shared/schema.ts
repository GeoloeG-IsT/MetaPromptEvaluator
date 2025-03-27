import { pgTable, text, serial, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Prompts table
export const prompts = pgTable("prompts", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  metaPrompt: text("meta_prompt").notNull(),
  userId: integer("user_id"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertPromptSchema = createInsertSchema(prompts).omit({
  id: true,
  createdAt: true,
});

export type InsertPrompt = z.infer<typeof insertPromptSchema>;
export type Prompt = typeof prompts.$inferSelect;

// Dataset items - each entry in a dataset
export const datasetItems = pgTable("dataset_items", {
  id: serial("id").primaryKey(),
  datasetId: integer("dataset_id").notNull(),
  inputType: text("input_type").notNull().default("text"), // 'text' or 'image'
  inputText: text("input_text"),
  inputImage: text("input_image"), // URL or Base64 of image
  validResponse: text("valid_response").notNull(),
  fileId: text("file_id"), // For tracking external file IDs (Airtable, etc.)
});

export const insertDatasetItemSchema = createInsertSchema(datasetItems).omit({
  id: true,
});

export type InsertDatasetItem = z.infer<typeof insertDatasetItemSchema>;
export type DatasetItem = typeof datasetItems.$inferSelect;

// Datasets table
export const datasets = pgTable("datasets", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  userId: integer("user_id"),
  itemCount: integer("item_count").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertDatasetSchema = createInsertSchema(datasets).omit({
  id: true,
  itemCount: true, 
  createdAt: true,
});

export type InsertDataset = z.infer<typeof insertDatasetSchema>;
export type Dataset = typeof datasets.$inferSelect;

// Evaluations table
export const evaluations = pgTable("evaluations", {
  id: serial("id").primaryKey(),
  promptId: integer("prompt_id").notNull(),
  datasetId: integer("dataset_id").notNull(),
  // TODO(pg): Remove these fields
  validationMethod: text("validation_method").notNull(),  // deprecated
  priority: text("priority").default("Balanced"), // deprecated
  // TODO(pg)
  userPrompt: text("user_prompt"),
  score: integer("score"),
  metrics: jsonb("metrics"), // Store metrics like accuracy, completeness, etc.
  status: text("status").default("pending"),
  createdAt: timestamp("created_at").defaultNow(),
  completedAt: timestamp("completed_at"),
});

export const insertEvaluationSchema = createInsertSchema(evaluations).omit({
  id: true,
  score: true,
  metrics: true,
  status: true,
  createdAt: true,
  completedAt: true,
});

export type InsertEvaluation = z.infer<typeof insertEvaluationSchema>;
export type Evaluation = typeof evaluations.$inferSelect;

// EvaluationResults - individual results for each item in the dataset
export const evaluationResults = pgTable("evaluation_results", {
  id: serial("id").primaryKey(),
  evaluationId: integer("evaluation_id").notNull(),
  datasetItemId: integer("dataset_item_id").notNull(),
  generatedResponse: text("generated_response"),
  isValid: boolean("is_valid"),
  score: integer("score"),
  feedback: text("feedback"),
});

export const insertEvaluationResultSchema = createInsertSchema(evaluationResults).omit({
  id: true,
});

export type InsertEvaluationResult = z.infer<typeof insertEvaluationResultSchema>;
export type EvaluationResult = typeof evaluationResults.$inferSelect;

// Stats model for dashboard
export type DashboardStats = {
  totalPrompts: number;
  totalEvaluations: number;
  averageScore: number;
  dataElements: number;
};
