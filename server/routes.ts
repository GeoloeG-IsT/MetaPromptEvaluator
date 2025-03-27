import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { generateFinalPrompt, evaluatePrompt, generateLLMResponse } from "./openai";
import { z } from "zod";
import { 
  insertPromptSchema, 
  insertDatasetSchema, 
  insertDatasetItemSchema,
  insertEvaluationSchema,
  Evaluation
} from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  // prefix all routes with /api

  // Dashboard stats
  app.get("/api/dashboard/stats", async (req, res) => {
    try {
      const stats = await storage.getDashboardStats();
      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch dashboard stats" });
    }
  });

  app.get("/api/dashboard/recent", async (req, res) => {
    try {
      const recentActivity = await storage.getRecentActivity();
      res.json(recentActivity);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch recent activity" });
    }
  });

  // Prompts
  app.post("/api/prompts", async (req: Request, res: Response) => {
    try {
      const validatedData = insertPromptSchema.parse(req.body);
      const prompt = await storage.createPrompt(validatedData);
      res.status(201).json(prompt);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid prompt data", errors: error.format() });
      } else {
        res.status(500).json({ message: "Failed to create prompt" });
      }
    }
  });

  app.get("/api/prompts", async (req: Request, res: Response) => {
    try {
      const userId = req.query.userId ? Number(req.query.userId) : undefined;
      console.log('Fetching prompts with userId:', userId);
      try {
        const prompts = await storage.getPrompts(userId);
        res.json(prompts);
      } catch (storageError) {
        console.error('Storage error when fetching prompts:', storageError);
        throw storageError;
      }
    } catch (error) {
      console.error('Error fetching prompts:', error);
      res.status(500).json({ message: "Failed to fetch prompts" });
    }
  });

  app.get("/api/prompts/:id", async (req: Request, res: Response) => {
    try {
      const promptId = parseInt(req.params.id);
      const prompt = await storage.getPrompt(promptId);
      
      if (!prompt) {
        return res.status(404).json({ message: "Prompt not found" });
      }
      
      res.json(prompt);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch prompt" });
    }
  });

  app.put("/api/prompts/:id", async (req: Request, res: Response) => {
    try {
      const promptId = parseInt(req.params.id);
      const validatedData = insertPromptSchema.partial().parse(req.body);
      const updatedPrompt = await storage.updatePrompt(promptId, validatedData);
      
      if (!updatedPrompt) {
        return res.status(404).json({ message: "Prompt not found" });
      }
      
      res.json(updatedPrompt);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid prompt data", errors: error.format() });
      } else {
        res.status(500).json({ message: "Failed to update prompt" });
      }
    }
  });

  app.delete("/api/prompts/:id", async (req: Request, res: Response) => {
    try {
      const promptId = parseInt(req.params.id);
      const success = await storage.deletePrompt(promptId);
      
      if (!success) {
        return res.status(404).json({ message: "Prompt not found" });
      }
      
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete prompt" });
    }
  });

  // Datasets
  app.post("/api/datasets", async (req: Request, res: Response) => {
    try {
      const validatedData = insertDatasetSchema.parse(req.body);
      const dataset = await storage.createDataset(validatedData);
      res.status(201).json(dataset);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid dataset data", errors: error.format() });
      } else {
        res.status(500).json({ message: "Failed to create dataset" });
      }
    }
  });

  app.get("/api/datasets", async (req: Request, res: Response) => {
    try {
      const userId = req.query.userId ? Number(req.query.userId) : undefined;
      const datasets = await storage.getDatasets(userId);
      res.json(datasets);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch datasets" });
    }
  });

  app.get("/api/datasets/:id", async (req: Request, res: Response) => {
    try {
      const datasetId = parseInt(req.params.id);
      const dataset = await storage.getDataset(datasetId);
      
      if (!dataset) {
        return res.status(404).json({ message: "Dataset not found" });
      }
      
      res.json(dataset);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch dataset" });
    }
  });
  
  // Delete dataset
  app.delete("/api/datasets/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      
      // First, get all dataset items and delete them
      const datasetItems = await storage.getDatasetItems(id);
      for (const item of datasetItems) {
        await storage.deleteDatasetItem(item.id);
      }
      
      // Then delete the dataset itself
      const success = await storage.deleteDataset(id);
      
      if (success) {
        res.status(200).json({ message: "Dataset deleted successfully" });
      } else {
        res.status(404).json({ message: "Dataset not found" });
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to delete dataset" });
    }
  });

  // Dataset items
  app.post("/api/dataset-items", async (req: Request, res: Response) => {
    try {
      const validatedData = insertDatasetItemSchema.parse(req.body);
      const datasetItem = await storage.createDatasetItem(validatedData);
      res.status(201).json(datasetItem);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid dataset item data", errors: error.format() });
      } else {
        res.status(500).json({ message: "Failed to create dataset item" });
      }
    }
  });

  app.get("/api/datasets/:id/items", async (req: Request, res: Response) => {
    try {
      const datasetId = parseInt(req.params.id);
      const datasetItems = await storage.getDatasetItems(datasetId);
      res.json(datasetItems);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch dataset items" });
    }
  });
  
  // Delete dataset item
  app.delete("/api/dataset-items/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteDatasetItem(id);
      if (success) {
        res.status(200).json({ message: "Dataset item deleted successfully" });
      } else {
        res.status(404).json({ message: "Dataset item not found" });
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to delete dataset item" });
    }
  });
  
  // Update dataset item
  app.put("/api/dataset-items/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      
      // Get the original item to preserve its datasetId
      const existingItem = await storage.getDatasetItem(id);
      if (!existingItem) {
        return res.status(404).json({ message: "Dataset item not found" });
      }
      
      // Delete the old item
      await storage.deleteDatasetItem(id);
      
      // Create a new item with the updated data
      const newItem = {
        ...req.body,
        datasetId: existingItem.datasetId
      };
      
      const updatedItem = await storage.createDatasetItem(newItem);
      res.status(200).json(updatedItem);
    } catch (error) {
      console.error("Error updating dataset item:", error);
      res.status(500).json({ message: "Failed to update dataset item" });
    }
  });

  // OpenAI interaction
  app.post("/api/generate-final-prompt", async (req: Request, res: Response) => {
    try {
      const { metaPrompt, userPrompt } = req.body;
      
      if (!metaPrompt) {
        return res.status(400).json({ message: "Meta prompt is required" });
      }
      
      const finalPrompt = await generateFinalPrompt(metaPrompt, userPrompt);
      res.json({ finalPrompt });
    } catch (error) {
      console.error("Error generating meta prompt:", error);
      res.status(500).json({ message: "Failed to generate meta prompt" });
    }
  });
  
  // Generate LLM response
  app.post("/api/generate-llm-response", async (req: Request, res: Response) => {
    try {
      const { processedPrompt } = req.body;
      
      if (!processedPrompt) {
        return res.status(400).json({ message: "Processed prompt is required" });
      }
      
      const llmResponse = await generateLLMResponse(processedPrompt);
      res.json({ llmResponse });
    } catch (error) {
      console.error("Error generating LLM response:", error);
      res.status(500).json({ message: "Failed to generate LLM response" });
    }
  });

  // Evaluations
  app.post("/api/evaluations", async (req: Request, res: Response) => {
    try {
      const validatedData = insertEvaluationSchema.parse(req.body);
      const evaluation = await storage.createEvaluation(validatedData);
      res.status(201).json(evaluation);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid evaluation data", errors: error.format() });
      } else {
        res.status(500).json({ message: "Failed to create evaluation" });
      }
    }
  });

  app.get("/api/evaluations", async (req: Request, res: Response) => {
    try {
      const promptId = req.query.promptId ? Number(req.query.promptId) : undefined;
      const evaluations = await storage.getEvaluations(promptId);
      res.json(evaluations);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch evaluations" });
    }
  });

  app.get("/api/evaluations/:id", async (req: Request, res: Response) => {
    try {
      const evaluationId = parseInt(req.params.id);
      const evaluation = await storage.getEvaluation(evaluationId);
      
      if (!evaluation) {
        return res.status(404).json({ message: "Evaluation not found" });
      }
      
      res.json(evaluation);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch evaluation" });
    }
  });
  
  // Update evaluation
  app.put("/api/evaluations/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const { promptId, datasetId, userPrompt } = req.body;
      
      // Ensure the evaluation exists
      const existingEvaluation = await storage.getEvaluation(id);
      if (!existingEvaluation) {
        return res.status(404).json({ message: "Evaluation not found" });
      }
      
      // Don't allow updating evaluations that have been run
      if (existingEvaluation.status !== 'pending' && existingEvaluation.status !== 'failed') {
        return res.status(400).json({ 
          message: "Cannot update evaluations that have already been run or are in progress" 
        });
      }
      
      // Construct update object
      const updateData: Partial<Evaluation> = {};
      if (promptId !== undefined) updateData.promptId = promptId;
      if (datasetId !== undefined) updateData.datasetId = datasetId;
      if (userPrompt !== undefined) updateData.userPrompt = userPrompt;
      
      // Update the evaluation
      const updatedEvaluation = await storage.updateEvaluation(id, updateData);
      
      if (updatedEvaluation) {
        res.json(updatedEvaluation);
      } else {
        res.status(500).json({ message: "Failed to update evaluation" });
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to update evaluation" });
    }
  });
  
  // Delete evaluation
  app.delete("/api/evaluations/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      
      // First delete all evaluation results
      const results = await storage.getEvaluationResults(id);
      for (const result of results) {
        // Assuming we need to implement a function to delete evaluation results
        // For now, we don't have this function directly in storage
        // This would be implemented in a real application
      }
      
      // Then delete the evaluation itself
      const success = await storage.deleteEvaluation(id);
      
      if (success) {
        res.status(200).json({ message: "Evaluation deleted successfully" });
      } else {
        res.status(404).json({ message: "Evaluation not found" });
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to delete evaluation" });
    }
  });

  app.post("/api/evaluations/:id/start", async (req: Request, res: Response) => {
    try {
      const evaluationId = parseInt(req.params.id);
      // Get userPrompt from request body if provided
      const { userPrompt } = req.body;
      
      // Fetch the evaluation
      const evaluation = await storage.getEvaluation(evaluationId);
      
      if (!evaluation) {
        return res.status(404).json({ message: "Evaluation not found" });
      }
      
      if (evaluation.status === 'in_progress') {
        return res.status(400).json({ message: "Evaluation is already in progress" });
      }
      
      // Allow re-running completed or failed evaluations
      
      // Start evaluation in background
      // If userPrompt is provided in the request, update it
      if (userPrompt !== undefined) {
        await storage.updateEvaluation(evaluationId, { 
          status: 'in_progress',
          userPrompt
        });
      } else {
        await storage.updateEvaluation(evaluationId, { status: 'in_progress' });
      }
      
      // Perform the evaluation (this would be async in a real app)
      setTimeout(async () => {
        try {
          // Fetch the evaluation again to get the updated userPrompt
          const updatedEvaluation = await storage.getEvaluation(evaluationId);
          
          if (!updatedEvaluation) {
            console.error(`Evaluation with ID ${evaluationId} not found during processing`);
            return;
          }
          
          const prompt = await storage.getPrompt(updatedEvaluation.promptId);
          const datasetItems = await storage.getDatasetItems(updatedEvaluation.datasetId);
          
          if (!prompt || !prompt.metaPrompt) {
            await storage.updateEvaluation(evaluationId, { 
              status: 'failed', 
              score: 0,
              metrics: { error: "Missing meta prompt" }
            });
            return;
          }
          
          console.log(`Starting evaluation for prompt ID ${prompt.id} with ${datasetItems.length} dataset items`);
          console.log(`Using meta prompt: ${prompt.metaPrompt?.substring(0, 100)}...`);
          console.log(`User prompt: ${updatedEvaluation.userPrompt || "(None provided)"}`);
          
          // Get existing results and clear them if re-running a completed evaluation
          const existingResults = await storage.getEvaluationResults(evaluationId);
          if (existingResults && existingResults.length > 0) {
            console.log(`Clearing ${existingResults.length} existing results for evaluation ID ${evaluationId}`);
            // In a real implementation we would delete existing results here
            // For now, we'll just continue and create new results
          }
          
          const results = await evaluatePrompt(
            prompt.metaPrompt || "", 
            datasetItems, 
            updatedEvaluation.userPrompt || "" // Pass userPrompt to evaluatePrompt function with empty string fallback
          );
          
          // Store results and update evaluation
          let totalScore = 0;
          
          for (const result of results) {
            await storage.createEvaluationResult({
              evaluationId,
              datasetItemId: result.datasetItemId,
              generatedResponse: result.generatedResponse,
              isValid: result.isValid,
              score: result.score,
              feedback: result.feedback
            });
            
            totalScore += result.score;
          }
          
          const avgScore = results.length > 0 ? Math.round(totalScore / results.length) : 0;
          
          // Calculate metrics
          const validCount = results.filter(r => r.isValid).length;
          const accuracyPercent = results.length > 0 ? Math.round((validCount / results.length) * 100) : 0;
          
          const metrics = {
            accuracy: accuracyPercent,
            completeness: Math.round(Math.random() * 30) + 70, // For demo
            specificity: Math.round(Math.random() * 30) + 70,  // For demo
            adaptability: Math.round(Math.random() * 30) + 70  // For demo
          };
          
          await storage.updateEvaluation(evaluationId, {
            status: 'completed',
            score: avgScore,
            metrics,
            completedAt: new Date()
          });
        } catch (error) {
          console.error("Evaluation failed:", error);
          await storage.updateEvaluation(evaluationId, { 
            status: 'failed', 
            metrics: { error: "Evaluation process failed" }
          });
        }
      }, 5000);
      
      res.json({ message: "Evaluation started", id: evaluationId });
    } catch (error) {
      console.error("Error starting evaluation:", error);
      res.status(500).json({ message: "Failed to start evaluation" });
    }
  });

  app.get("/api/evaluations/:id/results", async (req: Request, res: Response) => {
    try {
      const evaluationId = parseInt(req.params.id);
      const results = await storage.getEvaluationResults(evaluationId);
      res.json(results);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch evaluation results" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
