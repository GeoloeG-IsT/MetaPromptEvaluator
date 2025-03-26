import type { 
  Prompt, 
  Dataset, 
  DatasetItem, 
  Evaluation, 
  EvaluationResult 
} from "@shared/schema";

// Response from the meta prompt generation API
export interface MetaPromptResponse {
  metaPrompt: string;
}

// Response from the evaluation API
export interface EvaluationResponse {
  message: string;
  id: number;
}

// Parameters for prompt evaluation
export interface PromptEvaluationParams {
  promptId: number;
  datasetId: number;
  validationMethod: string;
  priority: string;
}

// Metrics from evaluation
export interface EvaluationMetrics {
  accuracy: number;
  completeness: number;
  specificity: number;
  adaptability: number;
  error?: string;
  [key: string]: number | string | undefined;
}

// Extended evaluation with calculated metrics
export interface EvaluationWithMetrics extends Evaluation {
  metrics: EvaluationMetrics;
  dataset?: Dataset;
  prompt?: Prompt;
  results?: EvaluationResult[];
}

// Parameters for meta prompt generation
export interface MetaPromptParams {
  initialPrompt: string;
  complexity: string;
  tone: string;
}

// Stats for dashboard display
export interface DashboardStat {
  title: string;
  value: string | number;
  icon: string;
  iconBgColor: string;
  iconColor: string;
  trend?: {
    value: number;
    label: string;
    isPositive: boolean;
  };
}

// Filter options for prompts, evaluations, etc.
export interface FilterOptions {
  category?: string[];
  dateRange?: [Date, Date];
  searchQuery?: string;
  sortBy?: 'date' | 'name' | 'score';
  sortOrder?: 'asc' | 'desc';
}

// Navigation item type
export interface NavigationItem {
  name: string;
  href: string;
  icon: string;
}

// Type for image with base64 data
export interface ImageData {
  id: string;
  url?: string;
  base64?: string;
  filename: string;
  contentType: string;
}

// Configuration for the OpenAI API
export interface OpenAIConfig {
  apiKey: string;
  model: string;
  temperature: number;
  maxTokens: number;
}

// User settings
export interface UserSettings {
  theme: 'light' | 'dark' | 'system';
  defaultDatasetId?: number;
  defaultValidationMethod: string;
  defaultPriority: string;
  autoEvaluate: boolean;
  notifications: boolean;
  apiConfig: Partial<OpenAIConfig>;
}
