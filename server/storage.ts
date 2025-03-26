import {
  users, User, InsertUser,
  prompts, Prompt, InsertPrompt,
  datasets, Dataset, InsertDataset,
  datasetItems, DatasetItem, InsertDatasetItem,
  evaluations, Evaluation, InsertEvaluation,
  evaluationResults, EvaluationResult, InsertEvaluationResult,
  DashboardStats
} from "@shared/schema";

export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Prompt operations
  createPrompt(prompt: InsertPrompt): Promise<Prompt>;
  getPrompt(id: number): Promise<Prompt | undefined>;
  getPrompts(userId?: number): Promise<Prompt[]>;
  updatePrompt(id: number, prompt: Partial<InsertPrompt>): Promise<Prompt | undefined>;
  deletePrompt(id: number): Promise<boolean>;

  // Dataset operations
  createDataset(dataset: InsertDataset): Promise<Dataset>;
  getDataset(id: number): Promise<Dataset | undefined>;
  getDatasets(userId?: number): Promise<Dataset[]>;
  updateDataset(id: number, dataset: Partial<InsertDataset>): Promise<Dataset | undefined>;
  deleteDataset(id: number): Promise<boolean>;

  // Dataset item operations
  createDatasetItem(item: InsertDatasetItem): Promise<DatasetItem>;
  getDatasetItems(datasetId: number): Promise<DatasetItem[]>;
  getDatasetItem(id: number): Promise<DatasetItem | undefined>;
  deleteDatasetItem(id: number): Promise<boolean>;

  // Evaluation operations
  createEvaluation(evaluation: InsertEvaluation): Promise<Evaluation>;
  getEvaluation(id: number): Promise<Evaluation | undefined>;
  getEvaluations(promptId?: number): Promise<Evaluation[]>;
  updateEvaluation(id: number, evaluation: Partial<Evaluation>): Promise<Evaluation | undefined>;
  
  // Evaluation result operations
  createEvaluationResult(result: InsertEvaluationResult): Promise<EvaluationResult>;
  getEvaluationResults(evaluationId: number): Promise<EvaluationResult[]>;

  // Dashboard stats
  getDashboardStats(): Promise<DashboardStats>;
  getRecentActivity(): Promise<Prompt[]>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private prompts: Map<number, Prompt>;
  private datasets: Map<number, Dataset>;
  private datasetItems: Map<number, DatasetItem>;
  private evaluations: Map<number, Evaluation>;
  private evaluationResults: Map<number, EvaluationResult>;
  
  currentUserId: number;
  currentPromptId: number;
  currentDatasetId: number;
  currentDatasetItemId: number;
  currentEvaluationId: number;
  currentEvaluationResultId: number;

  constructor() {
    this.users = new Map();
    this.prompts = new Map();
    this.datasets = new Map();
    this.datasetItems = new Map();
    this.evaluations = new Map();
    this.evaluationResults = new Map();
    
    this.currentUserId = 1;
    this.currentPromptId = 1;
    this.currentDatasetId = 1;
    this.currentDatasetItemId = 1;
    this.currentEvaluationId = 1;
    this.currentEvaluationResultId = 1;

    // Add sample dataset for testing
    this.createDataset({
      name: "Landscape Images",
      description: "A collection of landscape images for evaluation",
      category: "Vision",
      userId: 1
    }).then(dataset => {
      // Add some sample dataset items
      for (let i = 1; i <= 12; i++) {
        this.createDatasetItem({
          datasetId: dataset.id,
          inputImage: `https://example.com/landscape${i}.jpg`,
          validResponse: `Detailed description of landscape image ${i}`
        });
      }
    });
  }

  // User operations
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  // Prompt operations
  async createPrompt(insertPrompt: InsertPrompt): Promise<Prompt> {
    const id = this.currentPromptId++;
    const createdAt = new Date();
    const prompt: Prompt = { ...insertPrompt, id, createdAt };
    this.prompts.set(id, prompt);
    return prompt;
  }

  async getPrompt(id: number): Promise<Prompt | undefined> {
    return this.prompts.get(id);
  }

  async getPrompts(userId?: number): Promise<Prompt[]> {
    const prompts = Array.from(this.prompts.values());
    if (userId) {
      return prompts.filter(prompt => prompt.userId === userId);
    }
    return prompts;
  }

  async updatePrompt(id: number, promptUpdate: Partial<InsertPrompt>): Promise<Prompt | undefined> {
    const existingPrompt = this.prompts.get(id);
    if (!existingPrompt) return undefined;
    
    const updatedPrompt: Prompt = { ...existingPrompt, ...promptUpdate };
    this.prompts.set(id, updatedPrompt);
    return updatedPrompt;
  }

  async deletePrompt(id: number): Promise<boolean> {
    return this.prompts.delete(id);
  }

  // Dataset operations
  async createDataset(insertDataset: InsertDataset): Promise<Dataset> {
    const id = this.currentDatasetId++;
    const createdAt = new Date();
    const dataset: Dataset = { ...insertDataset, id, itemCount: 0, createdAt };
    this.datasets.set(id, dataset);
    return dataset;
  }

  async getDataset(id: number): Promise<Dataset | undefined> {
    return this.datasets.get(id);
  }

  async getDatasets(userId?: number): Promise<Dataset[]> {
    const datasets = Array.from(this.datasets.values());
    if (userId) {
      return datasets.filter(dataset => dataset.userId === userId);
    }
    return datasets;
  }

  async updateDataset(id: number, datasetUpdate: Partial<InsertDataset>): Promise<Dataset | undefined> {
    const existingDataset = this.datasets.get(id);
    if (!existingDataset) return undefined;
    
    const updatedDataset: Dataset = { ...existingDataset, ...datasetUpdate };
    this.datasets.set(id, updatedDataset);
    return updatedDataset;
  }

  async deleteDataset(id: number): Promise<boolean> {
    // Delete all dataset items first
    Array.from(this.datasetItems.values())
      .filter(item => item.datasetId === id)
      .forEach(item => this.datasetItems.delete(item.id));
    
    return this.datasets.delete(id);
  }

  // Dataset item operations
  async createDatasetItem(insertItem: InsertDatasetItem): Promise<DatasetItem> {
    const id = this.currentDatasetItemId++;
    const item: DatasetItem = { ...insertItem, id };
    this.datasetItems.set(id, item);
    
    // Update dataset item count
    const dataset = this.datasets.get(insertItem.datasetId);
    if (dataset) {
      dataset.itemCount = (dataset.itemCount || 0) + 1;
      this.datasets.set(dataset.id, dataset);
    }
    
    return item;
  }

  async getDatasetItems(datasetId: number): Promise<DatasetItem[]> {
    return Array.from(this.datasetItems.values())
      .filter(item => item.datasetId === datasetId);
  }

  async getDatasetItem(id: number): Promise<DatasetItem | undefined> {
    return this.datasetItems.get(id);
  }

  async deleteDatasetItem(id: number): Promise<boolean> {
    const item = this.datasetItems.get(id);
    if (item) {
      const success = this.datasetItems.delete(id);
      
      // Update dataset item count
      if (success) {
        const dataset = this.datasets.get(item.datasetId);
        if (dataset && dataset.itemCount > 0) {
          dataset.itemCount--;
          this.datasets.set(dataset.id, dataset);
        }
      }
      
      return success;
    }
    return false;
  }

  // Evaluation operations
  async createEvaluation(insertEvaluation: InsertEvaluation): Promise<Evaluation> {
    const id = this.currentEvaluationId++;
    const createdAt = new Date();
    const evaluation: Evaluation = { 
      ...insertEvaluation, 
      id, 
      score: null, 
      metrics: null, 
      status: 'pending', 
      createdAt,
      completedAt: null 
    };
    this.evaluations.set(id, evaluation);
    return evaluation;
  }

  async getEvaluation(id: number): Promise<Evaluation | undefined> {
    return this.evaluations.get(id);
  }

  async getEvaluations(promptId?: number): Promise<Evaluation[]> {
    const evaluations = Array.from(this.evaluations.values());
    if (promptId) {
      return evaluations.filter(evaluation => evaluation.promptId === promptId);
    }
    return evaluations;
  }

  async updateEvaluation(id: number, evaluationUpdate: Partial<Evaluation>): Promise<Evaluation | undefined> {
    const existingEvaluation = this.evaluations.get(id);
    if (!existingEvaluation) return undefined;
    
    const updatedEvaluation: Evaluation = { ...existingEvaluation, ...evaluationUpdate };
    this.evaluations.set(id, updatedEvaluation);
    return updatedEvaluation;
  }

  // Evaluation result operations
  async createEvaluationResult(insertResult: InsertEvaluationResult): Promise<EvaluationResult> {
    const id = this.currentEvaluationResultId++;
    const result: EvaluationResult = { ...insertResult, id };
    this.evaluationResults.set(id, result);
    return result;
  }

  async getEvaluationResults(evaluationId: number): Promise<EvaluationResult[]> {
    return Array.from(this.evaluationResults.values())
      .filter(result => result.evaluationId === evaluationId);
  }

  // Dashboard stats
  async getDashboardStats(): Promise<DashboardStats> {
    const totalPrompts = this.prompts.size;
    const totalEvaluations = this.evaluations.size;
    
    // Calculate average score
    const completedEvaluations = Array.from(this.evaluations.values())
      .filter(evaluation => evaluation.status === 'completed' && evaluation.score !== null);
    
    const averageScore = completedEvaluations.length > 0 
      ? completedEvaluations.reduce((acc, evaluation) => acc + (evaluation.score || 0), 0) / completedEvaluations.length
      : 0;
    
    const dataElements = this.datasetItems.size;
    
    return {
      totalPrompts,
      totalEvaluations,
      averageScore,
      dataElements
    };
  }

  async getRecentActivity(): Promise<Prompt[]> {
    // Get prompts with latest first
    return Array.from(this.prompts.values())
      .sort((a, b) => {
        if (!a.createdAt || !b.createdAt) return 0;
        return b.createdAt.getTime() - a.createdAt.getTime();
      })
      .slice(0, 5); // Get only the latest 5
  }
}

export const storage = new MemStorage();
