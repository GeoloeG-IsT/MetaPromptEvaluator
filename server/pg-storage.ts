import { eq, sql, desc, and } from 'drizzle-orm';
import { db } from './db';
import { 
  User, InsertUser, users,
  Prompt, InsertPrompt, prompts,
  Dataset, InsertDataset, datasets,
  DatasetItem, InsertDatasetItem, datasetItems,
  Evaluation, InsertEvaluation, evaluations,
  EvaluationResult, InsertEvaluationResult, evaluationResults,
  DashboardStats
} from '@shared/schema';
import { IStorage } from './storage';

export class PgStorage implements IStorage {
  
  // User operations
  async getUser(id: number): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.id, id));
    return result[0];
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.username, username));
    return result[0];
  }

  async createUser(user: InsertUser): Promise<User> {
    const result = await db.insert(users).values(user).returning();
    return result[0];
  }

  // Prompt operations
  async createPrompt(prompt: InsertPrompt): Promise<Prompt> {
    const result = await db.insert(prompts).values(prompt).returning();
    return result[0];
  }

  async getPrompt(id: number): Promise<Prompt | undefined> {
    const result = await db.select().from(prompts).where(eq(prompts.id, id));
    return result[0];
  }

  async getPrompts(userId?: number): Promise<Prompt[]> {
    if (userId) {
      return db.select().from(prompts).where(eq(prompts.userId, userId));
    }
    return db.select().from(prompts).orderBy(desc(prompts.createdAt));
  }

  async updatePrompt(id: number, prompt: Partial<InsertPrompt>): Promise<Prompt | undefined> {
    const result = await db.update(prompts)
      .set(prompt)
      .where(eq(prompts.id, id))
      .returning();
    
    return result[0];
  }

  async deletePrompt(id: number): Promise<boolean> {
    const result = await db.delete(prompts).where(eq(prompts.id, id)).returning();
    return result.length > 0;
  }

  // Dataset operations
  async createDataset(dataset: InsertDataset): Promise<Dataset> {
    const result = await db.insert(datasets).values(dataset).returning();
    return result[0];
  }

  async getDataset(id: number): Promise<Dataset | undefined> {
    const result = await db.select().from(datasets).where(eq(datasets.id, id));
    return result[0];
  }

  async getDatasets(userId?: number): Promise<Dataset[]> {
    if (userId) {
      return db.select().from(datasets).where(eq(datasets.userId, userId));
    }
    return db.select().from(datasets);
  }

  async updateDataset(id: number, dataset: Partial<InsertDataset>): Promise<Dataset | undefined> {
    const result = await db.update(datasets)
      .set(dataset)
      .where(eq(datasets.id, id))
      .returning();
    
    return result[0];
  }

  async deleteDataset(id: number): Promise<boolean> {
    const result = await db.delete(datasets).where(eq(datasets.id, id)).returning();
    return result.length > 0;
  }

  // Dataset item operations
  async createDatasetItem(item: InsertDatasetItem): Promise<DatasetItem> {
    // Start a transaction
    const result = await db.transaction(async (tx) => {
      // Insert the dataset item
      const insertedItem = await tx.insert(datasetItems).values(item).returning();
      
      // Update the item count in the dataset
      await tx.update(datasets)
        .set({
          itemCount: sql`${datasets.itemCount} + 1`
        })
        .where(eq(datasets.id, item.datasetId));
      
      return insertedItem[0];
    });
    
    return result;
  }

  async getDatasetItems(datasetId: number): Promise<DatasetItem[]> {
    return db.select().from(datasetItems).where(eq(datasetItems.datasetId, datasetId));
  }

  async getDatasetItem(id: number): Promise<DatasetItem | undefined> {
    const result = await db.select().from(datasetItems).where(eq(datasetItems.id, id));
    return result[0];
  }

  async deleteDatasetItem(id: number): Promise<boolean> {
    // Find the item first to get the datasetId
    const item = await this.getDatasetItem(id);
    if (!item) return false;

    // Start a transaction
    const result = await db.transaction(async (tx) => {
      // Delete the item
      const deleteResult = await tx.delete(datasetItems)
        .where(eq(datasetItems.id, id))
        .returning();
      
      // Decrement the item count in the dataset
      if (deleteResult.length > 0) {
        await tx.update(datasets)
          .set({
            itemCount: sql`GREATEST(${datasets.itemCount} - 1, 0)`
          })
          .where(eq(datasets.id, item.datasetId));
      }
      
      return deleteResult.length > 0;
    });
    
    return result;
  }

  // Evaluation operations
  async createEvaluation(evaluation: InsertEvaluation): Promise<Evaluation> {
    const newEvaluation = {
      ...evaluation,
      status: 'pending',
      score: null,
      metrics: null,
      completedAt: null
    };
    
    const result = await db.insert(evaluations).values(newEvaluation).returning();
    return result[0];
  }

  async getEvaluation(id: number): Promise<Evaluation | undefined> {
    const result = await db.select().from(evaluations).where(eq(evaluations.id, id));
    return result[0];
  }

  async getEvaluations(promptId?: number): Promise<Evaluation[]> {
    if (promptId) {
      return db.select().from(evaluations).where(eq(evaluations.promptId, promptId));
    }
    return db.select().from(evaluations).orderBy(desc(evaluations.createdAt));
  }

  async updateEvaluation(id: number, evaluation: Partial<Evaluation>): Promise<Evaluation | undefined> {
    const result = await db.update(evaluations)
      .set(evaluation)
      .where(eq(evaluations.id, id))
      .returning();
    
    return result[0];
  }

  // Evaluation result operations
  async createEvaluationResult(result: InsertEvaluationResult): Promise<EvaluationResult> {
    const insertResult = await db.insert(evaluationResults).values(result).returning();
    return insertResult[0];
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