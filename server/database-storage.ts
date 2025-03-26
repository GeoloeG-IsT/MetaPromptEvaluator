import { users, type User, type InsertUser, prompts, type Prompt, type InsertPrompt, type Dataset, type InsertDataset, type DatasetItem, type InsertDatasetItem, type Evaluation, type InsertEvaluation, type EvaluationResult, type InsertEvaluationResult, type DashboardStats, datasets, datasetItems, evaluations, evaluationResults } from "@shared/schema";
import { db } from "./db";
import { eq, desc, sql } from "drizzle-orm";
import { IStorage } from "./storage";

// Database storage implementation that adheres to IStorage interface
export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  // Prompt operations
  async createPrompt(prompt: InsertPrompt): Promise<Prompt> {
    // Ensure nullable fields have proper null values instead of undefined
    const insertValues = {
      ...prompt,
      userId: prompt.userId || null
    };
    
    const [result] = await db.insert(prompts).values(insertValues).returning();
    return result;
  }
  
  async getPrompt(id: number): Promise<Prompt | undefined> {
    const [prompt] = await db.select().from(prompts).where(eq(prompts.id, id));
    return prompt || undefined;
  }
  
  async getPrompts(userId?: number): Promise<Prompt[]> {
    if (userId) {
      return db.select().from(prompts).where(eq(prompts.userId, userId));
    }
    return db.select().from(prompts).orderBy(desc(prompts.createdAt));
  }
  
  async updatePrompt(id: number, prompt: Partial<InsertPrompt>): Promise<Prompt | undefined> {
    // Ensure any partial updates handle undefined vs null correctly
    const updateValues: Record<string, any> = {};
    
    if (prompt.name !== undefined) updateValues.name = prompt.name;
    if (prompt.metaPrompt !== undefined) updateValues.metaPrompt = prompt.metaPrompt;
    if (prompt.userId !== undefined) updateValues.userId = prompt.userId;
    
    const [result] = await db.update(prompts)
      .set(updateValues)
      .where(eq(prompts.id, id))
      .returning();
    
    return result;
  }
  
  async deletePrompt(id: number): Promise<boolean> {
    const result = await db.delete(prompts).where(eq(prompts.id, id)).returning();
    return result.length > 0;
  }
  
  // Dataset operations
  async createDataset(dataset: InsertDataset): Promise<Dataset> {
    const insertValues = {
      ...dataset,
      description: dataset.description || null,
      userId: dataset.userId || null
    };
    
    const [result] = await db.insert(datasets).values(insertValues).returning();
    return result;
  }
  
  async getDataset(id: number): Promise<Dataset | undefined> {
    const [dataset] = await db.select().from(datasets).where(eq(datasets.id, id));
    return dataset || undefined;
  }
  
  async getDatasets(userId?: number): Promise<Dataset[]> {
    if (userId) {
      return db.select().from(datasets).where(eq(datasets.userId, userId));
    }
    return db.select().from(datasets);
  }
  
  async updateDataset(id: number, dataset: Partial<InsertDataset>): Promise<Dataset | undefined> {
    const updateValues: Record<string, any> = {};
    
    if (dataset.name !== undefined) updateValues.name = dataset.name;
    if (dataset.description !== undefined) updateValues.description = dataset.description;
    if (dataset.category !== undefined) updateValues.category = dataset.category;
    if (dataset.userId !== undefined) updateValues.userId = dataset.userId;
    
    const [result] = await db.update(datasets)
      .set(updateValues)
      .where(eq(datasets.id, id))
      .returning();
    
    return result;
  }
  
  async deleteDataset(id: number): Promise<boolean> {
    // First, delete all dataset items
    await db.delete(datasetItems).where(eq(datasetItems.datasetId, id));
    
    // Then delete the dataset
    const result = await db.delete(datasets).where(eq(datasets.id, id)).returning();
    return result.length > 0;
  }
  
  // Dataset item operations
  async createDatasetItem(item: InsertDatasetItem): Promise<DatasetItem> {
    // Set default values for new fields
    const defaultedItem = {
      ...item,
      inputType: item.inputType || 'image',
      inputText: item.inputText || null,
      inputImage: item.inputImage || null
    };

    // Start a transaction to create the item and update dataset item count
    const result = await db.transaction(async (tx) => {
      const [insertedItem] = await tx.insert(datasetItems).values(defaultedItem).returning();
      
      // Update the dataset item count
      await tx.update(datasets)
        .set({
          itemCount: sql`COALESCE(${datasets.itemCount}, 0) + 1`
        })
        .where(eq(datasets.id, item.datasetId));
      
      return insertedItem;
    });
    
    return result;
  }
  
  async getDatasetItems(datasetId: number): Promise<DatasetItem[]> {
    return db.select().from(datasetItems).where(eq(datasetItems.datasetId, datasetId));
  }
  
  async getDatasetItem(id: number): Promise<DatasetItem | undefined> {
    const [item] = await db.select().from(datasetItems).where(eq(datasetItems.id, id));
    return item || undefined;
  }
  
  async deleteDatasetItem(id: number): Promise<boolean> {
    // First get the item to know which dataset to update
    const item = await this.getDatasetItem(id);
    if (!item) return false;
    
    // Use a transaction to delete the item and update the dataset count
    const result = await db.transaction(async (tx) => {
      const deleteResult = await tx.delete(datasetItems)
        .where(eq(datasetItems.id, id))
        .returning();
      
      if (deleteResult.length > 0) {
        await tx.update(datasets)
          .set({
            itemCount: sql`GREATEST(COALESCE(${datasets.itemCount}, 0) - 1, 0)`
          })
          .where(eq(datasets.id, item.datasetId));
      }
      
      return deleteResult.length > 0;
    });
    
    return result;
  }
  
  // Evaluation operations
  async createEvaluation(evaluation: InsertEvaluation): Promise<Evaluation> {
    const insertValues = {
      ...evaluation,
      priority: evaluation.priority || null,
      status: 'pending',
      score: null,
      metrics: null,
      completedAt: null
    };
    
    const [result] = await db.insert(evaluations).values(insertValues).returning();
    return result;
  }
  
  async getEvaluation(id: number): Promise<Evaluation | undefined> {
    const [evaluation] = await db.select().from(evaluations).where(eq(evaluations.id, id));
    return evaluation || undefined;
  }
  
  async getEvaluations(promptId?: number): Promise<Evaluation[]> {
    if (promptId) {
      return db.select().from(evaluations).where(eq(evaluations.promptId, promptId));
    }
    return db.select().from(evaluations).orderBy(desc(evaluations.createdAt));
  }
  
  async updateEvaluation(id: number, evaluation: Partial<Evaluation>): Promise<Evaluation | undefined> {
    const updateValues: Record<string, any> = {};
    
    if (evaluation.status !== undefined) updateValues.status = evaluation.status;
    if (evaluation.score !== undefined) updateValues.score = evaluation.score;
    if (evaluation.metrics !== undefined) updateValues.metrics = evaluation.metrics;
    if (evaluation.completedAt !== undefined) updateValues.completedAt = evaluation.completedAt;
    if (evaluation.priority !== undefined) updateValues.priority = evaluation.priority;
    if (evaluation.promptId !== undefined) updateValues.promptId = evaluation.promptId;
    if (evaluation.datasetId !== undefined) updateValues.datasetId = evaluation.datasetId;
    if (evaluation.validationMethod !== undefined) updateValues.validationMethod = evaluation.validationMethod;
    
    const [result] = await db.update(evaluations)
      .set(updateValues)
      .where(eq(evaluations.id, id))
      .returning();
    
    return result;
  }
  
  async deleteEvaluation(id: number): Promise<boolean> {
    // Use a transaction to delete the evaluation and all its results
    const result = await db.transaction(async (tx) => {
      // First delete all related evaluation results
      await tx.delete(evaluationResults)
        .where(eq(evaluationResults.evaluationId, id));
      
      // Then delete the evaluation itself
      const deleteResult = await tx.delete(evaluations)
        .where(eq(evaluations.id, id))
        .returning();
      
      return deleteResult.length > 0;
    });
    
    return result;
  }
  
  // Evaluation result operations
  async createEvaluationResult(result: InsertEvaluationResult): Promise<EvaluationResult> {
    const insertValues = {
      ...result,
      generatedResponse: result.generatedResponse || null,
      isValid: result.isValid || null,
      score: result.score || null,
      feedback: result.feedback || null
    };
    
    const [insertedResult] = await db.insert(evaluationResults).values(insertValues).returning();
    return insertedResult;
  }
  
  async getEvaluationResults(evaluationId: number): Promise<EvaluationResult[]> {
    return db.select().from(evaluationResults).where(eq(evaluationResults.evaluationId, evaluationId));
  }
  
  // Dashboard stats
  async getDashboardStats(): Promise<DashboardStats> {
    // Total prompts count
    const promptsCountResult = await db.select({ count: sql<number>`count(*)` }).from(prompts);
    const totalPrompts = promptsCountResult[0]?.count || 0;
    
    // Total evaluations count
    const evalsCountResult = await db.select({ count: sql<number>`count(*)` }).from(evaluations);
    const totalEvaluations = evalsCountResult[0]?.count || 0;
    
    // Average score from evaluations
    const avgScoreResult = await db.select({ 
      avg: sql<number>`COALESCE(AVG(score), 0)` 
    }).from(evaluations).where(sql`score IS NOT NULL`);
    const averageScore = avgScoreResult[0]?.avg || 0;
    
    // Total data elements (dataset items)
    const dataElementsResult = await db.select({ count: sql<number>`count(*)` }).from(datasetItems);
    const dataElements = dataElementsResult[0]?.count || 0;
    
    return {
      totalPrompts,
      totalEvaluations,
      averageScore,
      dataElements
    };
  }
  
  // Recent activity
  async getRecentActivity(): Promise<Prompt[]> {
    // Get the 5 most recently created prompts
    return db.select().from(prompts).orderBy(desc(prompts.createdAt)).limit(5);
  }
}