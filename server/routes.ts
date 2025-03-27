import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import * as path from "path";
import { storage } from "./storage";
import { generateFinalPrompt, evaluatePrompt, generateLLMResponse } from "./openai";
import { bucketStorage } from "./bucket";
import { isPdfAlreadyParsed, getExistingMarkdownContent } from "./llamaparse";
import { z } from "zod";
import { 
  insertPromptSchema, 
  insertDatasetSchema, 
  insertDatasetItemSchema,
  insertEvaluationSchema,
  Evaluation,
  InsertDataset
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
        console.error('Error creating dataset:', error);
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
  
  // Update dataset
  app.put("/api/datasets/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const { name, description } = req.body;
      
      // Ensure the dataset exists
      const existingDataset = await storage.getDataset(id);
      if (!existingDataset) {
        return res.status(404).json({ message: "Dataset not found" });
      }
      
      // Only allow updating name and description
      const updateData: Partial<InsertDataset> = {};
      if (name !== undefined) updateData.name = name;
      if (description !== undefined) updateData.description = description;
      
      // Update the dataset
      const updatedDataset = await storage.updateDataset(id, updateData);
      
      if (updatedDataset) {
        res.json(updatedDataset);
      } else {
        res.status(500).json({ message: "Failed to update dataset" });
      }
    } catch (error) {
      console.error("Error updating dataset:", error);
      res.status(500).json({ message: "Failed to update dataset" });
    }
  });
  
  // Delete dataset
  app.delete("/api/datasets/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      
      // First, get all dataset items and delete them
      const datasetItems = await storage.getDatasetItems(id);
      console.log(`Deleting ${datasetItems.length} items from dataset ${id}`);
      
      // Delete all dataset items (including associated PDFs and markdown files)
      for (const item of datasetItems) {
        // If this item has a PDF, delete both the PDF and markdown files
        if (item.inputType === 'pdf' && item.inputPdf) {
          try {
            console.log(`Deleting PDF file for item ${item.id}: ${item.inputPdf}`);
            await bucketStorage.deletePdf(item.inputPdf);
            console.log('PDF and markdown files deleted successfully');
          } catch (pdfError) {
            console.error('Error deleting PDF file:', pdfError);
            // Continue with the item deletion even if PDF deletion fails
          }
        }
        
        // Delete the dataset item from the database
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
      console.error('Error deleting dataset:', error);
      res.status(500).json({ message: "Failed to delete dataset" });
    }
  });

// Dataset items
  app.post("/api/dataset-items", async (req: Request, res: Response) => {
    try {
      console.log("POST /api/dataset-items - Request body:", JSON.stringify(req.body));
      const validatedData = insertDatasetItemSchema.parse(req.body);
      console.log("POST /api/dataset-items - Validated data:", JSON.stringify(validatedData));
      const datasetItem = await storage.createDatasetItem(validatedData);
      console.log("POST /api/dataset-items - Created item:", JSON.stringify(datasetItem));
      res.status(201).json(datasetItem);
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.error("POST /api/dataset-items - Validation error:", error.format());
        res.status(400).json({ message: "Invalid dataset item data", errors: error.format() });
      } else {
        console.error("POST /api/dataset-items - Server error:", error);
        res.status(500).json({ message: "Failed to create dataset item", error: String(error) });
      }
    }
  });

  app.get("/api/datasets/:id/items", async (req: Request, res: Response) => {
    try {
      const datasetId = parseInt(req.params.id);
      console.log(`GET /api/datasets/${datasetId}/items - Fetching items for dataset ID: ${datasetId}`);
      const datasetItems = await storage.getDatasetItems(datasetId);
      console.log(`GET /api/datasets/${datasetId}/items - Found ${datasetItems.length} items`);
      res.json(datasetItems);
    } catch (error: any) {
      console.error(`GET /api/datasets/:id/items - Error:`, error);
      res.status(500).json({ message: "Failed to fetch dataset items", error: String(error) });
    }
  });
  
  // Delete dataset item
  app.delete("/api/dataset-items/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      
      // Get the dataset item before deletion to check if it has a PDF file
      const item = await storage.getDatasetItem(id);
      if (!item) {
        return res.status(404).json({ message: "Dataset item not found" });
      }
      
      // If this item has a PDF, delete both the PDF and markdown files
      if (item.inputType === 'pdf' && item.inputPdf) {
        try {
          console.log(`Deleting PDF file for item ${id}: ${item.inputPdf}`);
          await bucketStorage.deletePdf(item.inputPdf);
          console.log('PDF and markdown files deleted successfully');
        } catch (pdfError) {
          console.error('Error deleting PDF file:', pdfError);
          // Continue with the item deletion even if PDF deletion fails
        }
      }
      
      // Delete the dataset item from the database
      const success = await storage.deleteDatasetItem(id);
      if (success) {
        res.status(200).json({ message: "Dataset item deleted successfully" });
      } else {
        res.status(404).json({ message: "Dataset item not found" });
      }
    } catch (error) {
      console.error('Error deleting dataset item:', error);
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
      
      // If the item had a PDF file, and the input type or PDF file is changing,
      // delete the old PDF file and markdown
      if (existingItem.inputType === 'pdf' && existingItem.inputPdf) {
        // Check if the input type is changing or the PDF file is changing
        const isInputTypeChanging = req.body.inputType && req.body.inputType !== 'pdf';
        const isPdfFileChanging = req.body.inputPdf && req.body.inputPdf !== existingItem.inputPdf;
        
        if (isInputTypeChanging || isPdfFileChanging) {
          try {
            console.log(`Deleting old PDF file for updated item ${id}: ${existingItem.inputPdf}`);
            await bucketStorage.deletePdf(existingItem.inputPdf);
            console.log('Old PDF and markdown files deleted successfully');
          } catch (pdfError) {
            console.error('Error deleting old PDF file during update:', pdfError);
            // Continue with the update even if PDF deletion fails
          }
        }
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
  
  // PDF management endpoints
  app.post("/api/pdf-upload", async (req: Request, res: Response) => {
    try {
      const { fileData, fileName } = req.body;
      
      if (!fileData) {
        console.error("PDF Upload Error: No PDF data provided");
        return res.status(400).json({ message: "PDF data is required" });
      }
      
      // Generate a file ID from the original filename (without extension)
      let fileId = '';
      
      // Store the original filename without modifications
      const originalFileName = fileName || 'unnamed.pdf';
      
      if (fileName) {
        // Extract the base name without extension and make it safe for filenames
        fileId = fileName.replace(/\.[^/.]+$/, '')  // Remove file extension
                         .replace(/[^a-zA-Z0-9_-]/g, '_')  // Replace unsafe chars
                         .replace(/_+/g, '_'); // Collapse multiple underscores
      } else {
        // Fallback to random ID if no filename is provided
        const randomPart = Math.random().toString(36).substring(2, 10);
        fileId = `unnamed_${randomPart}`;
      }
      
      console.log("Received PDF upload request with name:", fileName);
      console.log("PDF data length:", fileData.length, "characters");
      console.log("Generated file ID:", fileId);
      
      // Upload the PDF to the bucket and process it (extract text)
      const result = await bucketStorage.uploadPdf(fileData, fileId);
      
      // Include the original filename in the response
      const response = {
        ...result,
        originalFileName: fileName
      };
      
      console.log("PDF uploaded successfully with ID:", response.fileId);
      
      // Return the upload result with extraction status
      res.status(201).json(response);
    } catch (error: any) {
      console.error("Error uploading PDF:", error);
      res.status(500).json({ message: `Failed to upload PDF file: ${error.message}` });
    }
  });
  
  app.get("/api/pdf/:fileId", async (req: Request, res: Response) => {
    try {
      const { fileId } = req.params;
      
      // Retrieve the PDF from the bucket
      const pdfData = await bucketStorage.getPdf(fileId);
      res.json({ pdfData });
    } catch (error) {
      console.error("Error retrieving PDF:", error);
      res.status(500).json({ message: "Failed to retrieve PDF file" });
    }
  });
  
  // Get the Markdown content for a PDF file
  app.get("/api/pdf/:fileId/markdown", async (req: Request, res: Response) => {
    try {
      const { fileId } = req.params;
      
      // Check if the markdown file exists
      const markdownPath = path.join(bucketStorage.getBucketPath(), `${fileId}.md`);
      if (!isPdfAlreadyParsed(markdownPath)) {
        return res.status(404).json({ 
          message: "Markdown file not found for this PDF",
          markdownContent: null
        });
      }
      
      // Get the markdown content
      const markdownContent = await getExistingMarkdownContent(markdownPath);
      
      res.json({ 
        markdownContent,
        fileId 
      });
    } catch (error) {
      console.error("Error retrieving Markdown for PDF:", error);
      res.status(500).json({ 
        message: "Failed to retrieve Markdown content",
        error: String(error)
      });
    }
  });
  
  app.delete("/api/pdf/:fileId", async (req: Request, res: Response) => {
    try {
      const { fileId } = req.params;
      
      // Delete the PDF from the bucket
      await bucketStorage.deletePdf(fileId);
      res.status(200).json({ message: "PDF deleted successfully" });
    } catch (error) {
      console.error("Error deleting PDF:", error);
      res.status(500).json({ message: "Failed to delete PDF file" });
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
      
      // Get the meta prompt from the prompt ID
      const prompt = await storage.getPrompt(validatedData.promptId);
      if (!prompt) {
        return res.status(404).json({ message: "Prompt not found" });
      }
      
      // Use the generateFinalPrompt function to process the prompt through OpenAI
      let finalPrompt;
      try {
        finalPrompt = await generateFinalPrompt(
          prompt.metaPrompt, 
          validatedData.userPrompt || ""
        );
        console.log("Generated final prompt:", finalPrompt.substring(0, 100) + "...");
      } catch (promptError) {
        console.error("Error generating final prompt:", promptError);
        finalPrompt = validatedData.userPrompt ? 
          prompt.metaPrompt.replace(/{{user_prompt}}/g, validatedData.userPrompt) : 
          prompt.metaPrompt;
        console.log("Falling back to simple replacement for final prompt");
      }
        
      // Add the final prompt to the evaluation data
      const evaluationData = {
        ...validatedData,
        finalPrompt
      };
      
      const evaluation = await storage.createEvaluation(evaluationData);
      res.status(201).json(evaluation);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid evaluation data", errors: error.format() });
      } else {
        console.error("Error creating evaluation:", error);
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
      
      console.log(`PUT /api/evaluations/${id} body:`, { promptId, datasetId, userPrompt });
      
      // Ensure the evaluation exists
      const existingEvaluation = await storage.getEvaluation(id);
      if (!existingEvaluation) {
        return res.status(404).json({ message: "Evaluation not found" });
      }
      
      console.log("Existing evaluation before update:", {
        id: existingEvaluation.id,
        promptId: existingEvaluation.promptId,
        userPrompt: existingEvaluation.userPrompt,
        finalPrompt: existingEvaluation.finalPrompt?.substring(0, 50) + "..." 
      });
      
      // Get the evaluation results before updating
      const evaluationResults = await storage.getEvaluationResults(id);
      
      // Delete all existing evaluation results if there are any
      if (evaluationResults.length > 0) {
        for (const result of evaluationResults) {
          await storage.deleteEvaluationResult(result.id);
        }
        console.log(`Deleted ${evaluationResults.length} evaluation results for evaluation ${id}`);
      }
      
      // Construct update object
      const updateData: Partial<Evaluation> = {
        status: 'pending', // Reset the status to pending
        metrics: null      // Reset the metrics
      };
      
      if (promptId !== undefined) updateData.promptId = promptId;
      if (datasetId !== undefined) updateData.datasetId = datasetId;
      if (userPrompt !== undefined) updateData.userPrompt = userPrompt;
      
      console.log("Update data being prepared:", updateData);
      
      // Compute and update the final prompt
      if (promptId !== undefined || userPrompt !== undefined) {
        // Determine which prompt to use
        const targetPromptId = promptId !== undefined ? promptId : existingEvaluation.promptId;
        const targetUserPrompt = userPrompt !== undefined ? userPrompt : existingEvaluation.userPrompt;
        
        console.log("Creating final prompt with:", { 
          targetPromptId, 
          targetUserPrompt,
          isUserPromptProvided: userPrompt !== undefined
        });
        
        // Get the meta prompt
        const prompt = await storage.getPrompt(targetPromptId);
        if (prompt) {
          console.log("Using meta prompt:", prompt.metaPrompt?.substring(0, 50) + "...");
          
          // Use the generateFinalPrompt function to process the prompt through OpenAI
          try {
            const finalPrompt = await generateFinalPrompt(
              prompt.metaPrompt, 
              targetUserPrompt || ""
            );
            console.log("Generated final prompt for update:", finalPrompt.substring(0, 100) + "...");
            updateData.finalPrompt = finalPrompt;
          } catch (promptError) {
            console.error("Error generating final prompt for update:", promptError);
            // Fall back to simple placeholder replacement
            const finalPrompt = targetUserPrompt ? 
              prompt.metaPrompt.replace(/{{user_prompt}}/g, targetUserPrompt) : 
              prompt.metaPrompt;
            console.log("Falling back to simple replacement for final prompt in update");
            updateData.finalPrompt = finalPrompt;
          }
        } else {
          console.error(`Prompt with ID ${targetPromptId} not found`);
        }
      } else {
        console.log("No prompt ID or user prompt changes, skipping final prompt generation");
      }
      
      // Update the evaluation
      const updatedEvaluation = await storage.updateEvaluation(id, updateData);
      
      if (updatedEvaluation) {
        res.json(updatedEvaluation);
      } else {
        res.status(500).json({ message: "Failed to update evaluation" });
      }
    } catch (error) {
      console.error("Error updating evaluation:", error);
      res.status(500).json({ message: "Failed to update evaluation" });
    }
  });
  
  // Delete evaluation
  app.delete("/api/evaluations/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      
      // First delete all evaluation results
      const results = await storage.getEvaluationResults(id);
      console.log(`Deleting ${results.length} results for evaluation ID ${id}`);
      
      for (const result of results) {
        await storage.deleteEvaluationResult(result.id);
      }
      
      // Then delete the evaluation itself
      const success = await storage.deleteEvaluation(id);
      
      if (success) {
        res.status(200).json({ message: "Evaluation deleted successfully" });
      } else {
        res.status(404).json({ message: "Evaluation not found" });
      }
    } catch (error) {
      console.error("Error deleting evaluation:", error);
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
      // If userPrompt is provided in the request, update it and regenerate final prompt
      if (userPrompt !== undefined) {
        const prompt = await storage.getPrompt(evaluation.promptId);
        
        if (prompt) {
          try {
            // Generate a new final prompt with OpenAI
            const finalPrompt = await generateFinalPrompt(
              prompt.metaPrompt,
              userPrompt
            );
            
            console.log("Generated new final prompt for evaluation start:", finalPrompt.substring(0, 100) + "...");
            
            // Update the evaluation with new user prompt and final prompt
            await storage.updateEvaluation(evaluationId, { 
              status: 'in_progress',
              userPrompt,
              finalPrompt
            });
          } catch (promptError) {
            console.error("Error generating final prompt during evaluation start:", promptError);
            // Fall back to simple replacement
            const finalPrompt = prompt.metaPrompt.replace(/{{user_prompt}}/g, userPrompt);
            
            // Update with simple replacement
            await storage.updateEvaluation(evaluationId, { 
              status: 'in_progress',
              userPrompt,
              finalPrompt
            });
          }
        } else {
          // Just update the user prompt if we can't find the prompt
          await storage.updateEvaluation(evaluationId, { 
            status: 'in_progress',
            userPrompt
          });
        }
      } else {
        // No user prompt change, just update the status
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
          
          // Get existing results and delete them if re-running an evaluation
          const existingResults = await storage.getEvaluationResults(evaluationId);
          if (existingResults && existingResults.length > 0) {
            console.log(`Deleting ${existingResults.length} existing results for evaluation ID ${evaluationId}`);
            
            // Delete each existing result
            for (const result of existingResults) {
              await storage.deleteEvaluationResult(result.id);
            }
          }
          
          // Use finalPrompt if available, otherwise generate it
          let finalPrompt;
          
          if (updatedEvaluation.finalPrompt) {
            finalPrompt = updatedEvaluation.finalPrompt;
            console.log("Using existing final prompt:", finalPrompt.substring(0, 100) + "...");
          } else {
            // Generate a final prompt using the OpenAI API
            try {
              finalPrompt = await generateFinalPrompt(
                prompt.metaPrompt, 
                updatedEvaluation.userPrompt || ""
              );
              console.log("Generated final prompt for evaluation:", finalPrompt.substring(0, 100) + "...");
              
              // Update the evaluation with the final prompt
              await storage.updateEvaluation(evaluationId, { finalPrompt });
            } catch (promptError) {
              console.error("Error generating final prompt during evaluation:", promptError);
              // Fall back to simple replacement
              finalPrompt = updatedEvaluation.userPrompt ? 
                prompt.metaPrompt.replace(/{{user_prompt}}/g, updatedEvaluation.userPrompt) : 
                prompt.metaPrompt;
              console.log("Falling back to simple replacement for final prompt in evaluation");
              await storage.updateEvaluation(evaluationId, { finalPrompt });
            }
          }
              
          const results = await evaluatePrompt(
            finalPrompt, 
            datasetItems, 
            updatedEvaluation.userPrompt || "" // Pass userPrompt for reference if needed
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
