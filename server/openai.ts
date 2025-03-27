import OpenAI from "openai";
import { DatasetItem } from "@shared/schema";
import * as fs from 'fs/promises';
import * as path from 'path';

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Generate a response using a processed meta prompt
export async function generateLLMResponse(
  processedPrompt: string
): Promise<string> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are a helpful assistant."
        },
        {
          role: "user",
          content: processedPrompt
        }
      ],
      temperature: 0.7,
      max_tokens: 1000
    });

    return response.choices[0].message.content || "Failed to generate response";
  } catch (error) {
    console.error("Error generating LLM response:", error);
    throw new Error("Failed to generate response from LLM");
  }
}

export async function generateFinalPrompt(
  metaPrompt: string,
  userPrompt: string,
): Promise<string> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: metaPrompt
        },
        {
          role: "user",
          content: userPrompt
        }
      ],
      temperature: 0.0,
      max_tokens: 2048
    });

    return response.choices[0].message.content || "Failed to generate meta prompt";
  } catch (error) {
    console.error("Error calling OpenAI:", error);
    throw new Error("Failed to generate meta prompt");
  }
}

export type EvaluationResultItem = {
  datasetItemId: number;
  generatedResponse: string;
  isValid: boolean;
  score: number;
  feedback: string;
};

export async function evaluatePrompt(
  metaPrompt: string,
  datasetItems: DatasetItem[],
  userPrompt: string
): Promise<EvaluationResultItem[]> {
  const results: EvaluationResultItem[] = [];
  
  // Inject user prompt into meta prompt
  const finalPrompt = await generateFinalPrompt(metaPrompt, userPrompt);
    
  console.log("=== EVALUATION INFO ===");
  console.log("Original Meta Prompt:", metaPrompt);
  console.log("User Prompt:", userPrompt);
  console.log("Final Prompt:", finalPrompt);
  console.log("Number of Dataset Items:", datasetItems.length);
  console.log("=======================");
  
  // Process each dataset item
  for (const item of datasetItems) {
    console.log(`\n=== Processing Dataset Item ID: ${item.id} ===`);
    console.log(`Input Type: ${item.inputType}`);
    console.log(`Has Input Image: ${!!item.inputImage}`);
    console.log(`Has Input Text: ${!!item.inputText}`);
    console.log(`Has Input PDF: ${!!item.inputPdf}`);
    console.log(`Expected Response: ${item.validResponse}`);
    
    try {
      // Generate a response using the processed meta prompt and the input (image, text, or PDF)
      let generatedResponse: string;
      if (item.inputType === "image" && item.inputImage) {
        console.log("Generating response for IMAGE input");
        generatedResponse = await generateImageResponse(finalPrompt, item.inputImage, userPrompt);
      } else if (item.inputType === "text" && item.inputText) {
        console.log("Generating response for TEXT input");
        generatedResponse = await generateTextResponse(finalPrompt, item.inputText, userPrompt);
      } else if (item.inputType === "pdf" && item.inputPdf) {
        console.log("Generating response for PDF input");
        generatedResponse = await generatePdfResponse(finalPrompt, item.inputPdf, userPrompt);
      } else {
        console.log("WARNING: Dataset item has no valid input (image, text, or PDF)");
        generatedResponse = "Error: Dataset item has no valid input";
      }
      
      console.log(`Generated Response (first 100 chars): ${generatedResponse.substring(0, 100)}...`);
      
      // Evaluate the generated response against the valid response
      const evaluationResult = await evaluateResponse(
        generatedResponse, 
        item.validResponse,
      );
      
      console.log(`Evaluation Result: Valid=${evaluationResult.isValid}, Score=${evaluationResult.score}`);
      
      results.push({
        datasetItemId: item.id,
        generatedResponse,
        isValid: evaluationResult.isValid,
        score: evaluationResult.score,
        feedback: evaluationResult.feedback
      });
    } catch (error) {
      console.error(`Error evaluating item ${item.id}:`, error);
      results.push({
        datasetItemId: item.id,
        generatedResponse: "Error generating response",
        isValid: false,
        score: 0,
        feedback: "Failed to process this dataset item"
      });
    }
  }
  
  return results;
}

/**
 * Generate a response for an image input using the OpenAI vision API.
 * This uses the processed meta prompt as the system message and the image as the user message.
 */
export async function generateImageResponse(finalPrompt: string, imageUrl: string, userPrompt?: string): Promise<string> {
  try {
    console.log("IMAGE RESPONSE GENERATION");
    console.log("Final Prompt:", finalPrompt.substring(0, 100) + "...");
    console.log("Image URL:", imageUrl);

    // Prepare the messages for the API call
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: finalPrompt
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: userPrompt || "Please analyze this image."
            },
            {
              type: "image_url",
              image_url: {
                url: imageUrl,
                detail: "high"
              }
            }
          ]
        }
      ],
      temperature: 0.5,
      max_tokens: 800
    });

    const result = response.choices[0].message.content || "Failed to generate response for image";
    console.log("Generated response (preview):", result.substring(0, 100) + "...");
    return result;
  } catch (error: any) {
    console.error("Error generating image response:", error);
    console.error("Error details:", JSON.stringify(error, null, 2));
    return "Error: Unable to generate response for this image. " + (error.message || "Unknown error");
  }
}

/**
 * Generate a response for a text input using the OpenAI API.
 * This uses the processed meta prompt as the system message and the text as the user message.
 */
export async function generateTextResponse(finalPrompt: string, inputText: string, userPrompt?: string): Promise<string> {
  try {
    console.log("TEXT RESPONSE GENERATION");
    console.log("Final Prompt:", finalPrompt.substring(0, 100) + "...");
    console.log("Input Text:", inputText.substring(0, 100) + "...");
    
    // Combine user prompt and input text if both are provided
    const userContent = userPrompt 
      ? `${userPrompt}\n\nInput: ${inputText}`
      : inputText;
    
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: finalPrompt
        },
        {
          role: "user",
          content: userContent
        }
      ],
      temperature: 0.5,
      max_tokens: 800
    });

    const result = response.choices[0].message.content || "Failed to generate response for text";
    console.log("Generated response (preview):", result.substring(0, 100) + "...");
    return result;
  } catch (error: any) {
    console.error("Error generating text response:", error);
    console.error("Error details:", JSON.stringify(error, null, 2));
    return "Error: Unable to generate response for this text input. " + (error.message || "Unknown error");
  }
}

/**
 * Generate a response for a PDF input using the OpenAI API.
 * This uses the processed meta prompt as the system message and the PDF as the user message.
 */
export async function generatePdfResponse(finalPrompt: string, pdfFileId: string, userPrompt?: string): Promise<string> {
  try {
    console.log("PDF RESPONSE GENERATION");
    console.log("Final Prompt:", finalPrompt.substring(0, 100) + "...");
    console.log("PDF File ID:", pdfFileId);
    
    // First, retrieve the PDF from our bucket storage directly from the filesystem
    console.log("Retrieving PDF data from bucket");
    
    const bucketPath = path.join('.', 'MetaPromptEvaluatorBucket');
    const filePath = path.join(bucketPath, `${pdfFileId}.pdf`);
    
    console.log(`Looking for PDF at path: ${filePath}`);
    
    // Read the PDF file directly from the bucket
    const pdfBuffer = await fs.readFile(filePath);
    
    // Convert to base64 data URL
    const base64Data = Buffer.from(pdfBuffer).toString('base64');
    const pdfDataUrl = `data:application/pdf;base64,${base64Data}`;
    
    console.log(`Read PDF file successfully, size: ${pdfBuffer.byteLength} bytes`);
    
    // Combine user prompt if provided
    const userContent = userPrompt 
      ? `${userPrompt}\n\nPlease analyze this PDF document.`
      : `Please analyze this PDF document.`;
    
    // Call the OpenAI API with the PDF data
    const openaiResponse = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: finalPrompt
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: userContent
            },
            {
              type: "image_url",
              image_url: {
                url: pdfDataUrl, // Send the actual PDF data URL (data:application/pdf;base64,...)
                detail: "high"
              }
            }
          ]
        }
      ],
      temperature: 0.5,
      max_tokens: 800
    });

    const generatedResult = openaiResponse.choices[0].message.content || "Failed to generate response for PDF";
    console.log("Generated response (preview):", generatedResult.substring(0, 100) + "...");
    return generatedResult;
  } catch (error: any) {
    console.error("Error generating PDF response:", error);
    console.error("Error details:", JSON.stringify(error, null, 2));
    return "Error: Unable to generate response for this PDF document. " + (error.status ? error.status + " " : "") + (error.message || "Unknown error");
  }
}

type EvaluationResponse = {
  isValid: boolean;
  score: number;
  feedback: string;
};

/**
 * Evaluate how well a generated response matches the expected valid response
 */
export async function evaluateResponse(
  generatedResponse: string,
  validResponse: string,
): Promise<EvaluationResponse> {
  try {
    console.log("EVALUATING RESPONSE");
    console.log("Generated Response:", generatedResponse.substring(0, 100) + "...");
    console.log("Valid Response:", validResponse.substring(0, 100) + "...");
    
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: 
            `You are an expert evaluator of AI-generated responses. Your task is to evaluate how well the generated response matches the valid reference response.
            
            Return your evaluation in JSON format with the following fields:
            - isValid: boolean indicating if the response meets quality threshold (set to true if the score is at least 70)
            - score: numeric score between 0-100
            - feedback: specific feedback about strengths and weaknesses`
        },
        {
          role: "user",
          content: 
            `Generated response: ${generatedResponse}
            
            Valid reference response: ${validResponse}
            
            Evaluate the generated response against the reference.`
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.2
    });

    const content = response.choices[0].message.content || "{}";
    console.log("Raw evaluation result:", content);
    
    let result;
    try {
      result = JSON.parse(content);
    } catch (parseError) {
      console.error("Error parsing evaluation result JSON:", parseError);
      return {
        isValid: false,
        score: 0,
        feedback: "Error: Failed to parse evaluation result"
      };
    }
    
    const evalResult = {
      isValid: result.isValid || false,
      score: result.score || 0,
      feedback: result.feedback || "No feedback provided"
    };
    
    console.log("Evaluation result:", evalResult);
    return evalResult;
  } catch (error: any) {
    console.error("Error evaluating response:", error);
    console.error("Error details:", JSON.stringify(error, null, 2));
    return {
      isValid: false,
      score: 0,
      feedback: "Error: Failed to evaluate this response. " + (error.message || "Unknown error")
    };
  }
}