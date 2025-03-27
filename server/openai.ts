import OpenAI from "openai";
import { DatasetItem } from "@shared/schema";
import { bucketStorage } from "./bucket";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Generate a response using a processed meta prompt
/**
 * Cleans response content by removing markdown code blocks and language identifiers
 *
 * @param content The content to clean
 * @returns Cleaned content
 */
function cleanResponseContent(content: string): string {
  // Remove ```json or ```javascript at the beginning
  let cleaned = content.replace(/^```(json|javascript|js)\s*\n/i, "");

  // Remove ``` at the end
  cleaned = cleaned.replace(/\n```\s*$/i, "");

  // If the entire content is wrapped in code blocks (not just at beginning/end)
  if (content.startsWith("```") && content.endsWith("```")) {
    // Extract content between first ``` and last ```
    const match = content.match(
      /```(?:json|javascript|js)?\s*\n([\s\S]*)\n```\s*$/i,
    );
    if (match && match[1]) {
      cleaned = match[1];
    }
  }

  // Remove json/ prefix
  cleaned = cleaned.replace(/^json\//, "");

  return cleaned;
}

export async function generateLLMResponse(
  processedPrompt: string,
): Promise<string> {
  try {
    console.log("GENERATING LLM RESPONSE");
    console.log("Processed prompt (first 100 chars):", processedPrompt.substring(0, 100) + "...");
    
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are an expert prompt engineer who creates clear, detailed, instructional prompts for AI models.",
        },
        {
          role: "user",
          content: processedPrompt,
        },
        {
          role: "user",
          content: "Based on the instructions above, generate a system prompt that can be used directly with an LLM.",
        }
      ],
      temperature: 0.0,
      max_tokens: 2000,
    });

    let result = response.choices[0].message.content || "Failed to generate response";

    // Clean the response content
    result = cleanResponseContent(result);
    
    console.log("Generated LLM response (first 100 chars):", result.substring(0, 100) + "...");

    return result;
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
    console.log("== generateFinalPrompt Function Input ==");
    console.log("Meta Prompt (first 50 chars):", metaPrompt.substring(0, 50) + "...");
    console.log("User Prompt:", userPrompt);
    
    // Step 1: Replace the placeholder with the user prompt
    const combinedPrompt = userPrompt ? 
      metaPrompt.replace(/{{user_prompt}}/g, userPrompt) : 
      metaPrompt;
    
    console.log("Combined prompt (with placeholder replaced):", combinedPrompt.substring(0, 100) + "...");
    
    // Step 2: Generate the final prompt by sending it to the LLM
    console.log("Calling generateLLMResponse with combined prompt...");
    const response = await generateLLMResponse(combinedPrompt);
    console.log("LLM response received (first 100 chars):", response.substring(0, 100) + "...");
    
    return response;
  } catch (error) {
    console.error("Error generating final prompt:", error);
    throw new Error("Failed to generate final prompt");
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
  finalPrompt: string,
  datasetItems: DatasetItem[],
  userPrompt: string,
): Promise<EvaluationResultItem[]> {
  const results: EvaluationResultItem[] = [];

  console.log("=== EVALUATION INFO ===");
  console.log("Final Prompt:", finalPrompt);
  console.log("User Prompt (reference only):", userPrompt);
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
        generatedResponse = await generateImageResponse(
          finalPrompt,
          item.inputImage,
        );
      } else if (item.inputType === "text" && item.inputText) {
        console.log("Generating response for TEXT input");
        generatedResponse = await generateTextResponse(
          finalPrompt,
          item.inputText,
        );
      } else if (item.inputType === "pdf" && item.inputPdf) {
        console.log("Generating response for PDF input");
        generatedResponse = await generatePdfResponse(
          finalPrompt,
          item.inputPdf,
        );
      } else {
        console.log(
          "WARNING: Dataset item has no valid input (image, text, or PDF)",
        );
        generatedResponse = "Error: Dataset item has no valid input";
      }

      console.log(
        `Generated Response (first 100 chars): ${generatedResponse.substring(0, 100)}...`,
      );

      // Evaluate the generated response against the valid response
      const evaluationResult = await evaluateResponse(
        generatedResponse,
        item.validResponse,
      );

      console.log(
        `Evaluation Result: Valid=${evaluationResult.isValid}, Score=${evaluationResult.score}`,
      );

      results.push({
        datasetItemId: item.id,
        generatedResponse,
        isValid: evaluationResult.isValid,
        score: evaluationResult.score,
        feedback: evaluationResult.feedback,
      });
    } catch (error) {
      console.error(`Error evaluating item ${item.id}:`, error);
      results.push({
        datasetItemId: item.id,
        generatedResponse: "Error generating response",
        isValid: false,
        score: 0,
        feedback: "Failed to process this dataset item",
      });
    }
  }

  return results;
}

/**
 * Generate a response for an image input using the OpenAI vision API.
 * This uses the processed meta prompt as the system message and the image as the user message.
 */
export async function generateImageResponse(
  finalPrompt: string,
  imageUrl: string,
): Promise<string> {
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
          content: finalPrompt,
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Please analyze this image.",
            },
            {
              type: "image_url",
              image_url: {
                url: imageUrl,
                detail: "high",
              },
            },
          ],
        },
      ],
      temperature: 0.5,
      max_tokens: 800,
    });

    let result =
      response.choices[0].message.content ||
      "Failed to generate response for image";

    // Clean the response content
    result = cleanResponseContent(result);

    console.log(
      "Generated response (preview):",
      result.substring(0, 100) + "...",
    );
    return result;
  } catch (error: any) {
    console.error("Error generating image response:", error);
    console.error("Error details:", JSON.stringify(error, null, 2));
    return (
      "Error: Unable to generate response for this image. " +
      (error.message || "Unknown error")
    );
  }
}

/**
 * Generate a response for a text input using the OpenAI API.
 * This uses the processed meta prompt as the system message and the text as the user message.
 */
export async function generateTextResponse(
  finalPrompt: string,
  inputText: string,
): Promise<string> {
  try {
    console.log("TEXT RESPONSE GENERATION");
    console.log("Final Prompt:", finalPrompt.substring(0, 100) + "...");
    console.log("Input Text:", inputText.substring(0, 100) + "...");

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: finalPrompt,
        },
        {
          role: "user",
          content: inputText,
        },
      ],
      temperature: 0.0,
      max_tokens: 2048,
    });

    let result =
      response.choices[0].message.content ||
      "Failed to generate response for text";

    // Clean the response content
    result = cleanResponseContent(result);

    console.log(
      "Generated response (preview):",
      result.substring(0, 100) + "...",
    );
    return result;
  } catch (error: any) {
    console.error("Error generating text response:", error);
    console.error("Error details:", JSON.stringify(error, null, 2));
    return (
      "Error: Unable to generate response for this text input. " +
      (error.message || "Unknown error")
    );
  }
}

/**
 * Generate a response for a PDF input using the OpenAI API.
 * This uses the processed meta prompt as the system message and the PDF as the user message.
 *
 * Note: OpenAI doesn't directly support PDFs through the chat completions API.
 * However, we can check if the file exists and send content about the PDF.
 */
export async function generatePdfResponse(
  finalPrompt: string,
  pdfFileId: string,
): Promise<string> {
  try {
    console.log("PDF RESPONSE GENERATION");
    console.log("Final Prompt:", finalPrompt.substring(0, 100) + "...");
    console.log("PDF File ID:", pdfFileId);

    try {
      // Extract text from PDF using our bucket storage's enhanced extraction
      console.log("Extracting text from PDF using bucket storage");
      const extractedText = await bucketStorage.extractTextFromPdf(pdfFileId);

      if (extractedText) {
        console.log(
          `Successfully extracted text from PDF, length: ${extractedText.length} characters`,
        );
        console.log(`Text preview: ${extractedText.substring(0, 100)}...`);

        // Process the extracted text through the LLM using our text response function
        return await generateTextResponse(finalPrompt, extractedText);
      } else {
        throw new Error("Extracted text is empty");
      }
    } catch (error: any) {
      console.error(`Error processing PDF ${pdfFileId}:`, error);
      return `Error: Unable to process PDF file with ID ${pdfFileId}. ${error.message || "Unknown error"}`;
    }
  } catch (error: any) {
    console.error("Error generating PDF response:", error);
    console.error("Error details:", error.message || "Unknown error");
    return (
      "Error: Unable to generate response for this PDF document. " +
      (error.message || "Unknown error")
    );
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
    console.log(
      "Generated Response:",
      generatedResponse.substring(0, 100) + "...",
    );
    console.log("Valid Response:", validResponse.substring(0, 100) + "...");

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are an expert evaluator of AI-generated responses. Your task is to evaluate how well the generated response matches the valid reference response.
            
            Return your evaluation in JSON format with the following fields:
            - isValid: boolean indicating if the response meets quality threshold (set to true if the score is at least 70)
            - score: numeric score between 0-100
            - feedback: specific feedback about strengths and weaknesses`,
        },
        {
          role: "user",
          content: `Generated response: ${generatedResponse}
            
            Valid reference response: ${validResponse}
            
            Evaluate the generated response against the reference.`,
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.2,
    });

    const content = response.choices[0].message.content || "{}";
    console.log("Raw evaluation result:", content);

    // Clean the response content
    const cleanedContent = cleanResponseContent(content);
    console.log("Cleaned content:", cleanedContent);

    let result;
    try {
      result = JSON.parse(cleanedContent);
    } catch (parseError) {
      console.error("Error parsing evaluation result JSON:", parseError);
      return {
        isValid: false,
        score: 0,
        feedback: "Error: Failed to parse evaluation result",
      };
    }

    const evalResult = {
      isValid: result.isValid || false,
      score: result.score || 0,
      feedback: result.feedback || "No feedback provided",
    };

    console.log("Evaluation result:", evalResult);
    return evalResult;
  } catch (error: any) {
    console.error("Error evaluating response:", error);
    console.error("Error details:", JSON.stringify(error, null, 2));
    return {
      isValid: false,
      score: 0,
      feedback:
        "Error: Failed to evaluate this response. " +
        (error.message || "Unknown error"),
    };
  }
}
