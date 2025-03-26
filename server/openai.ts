import OpenAI from "openai";
import { DatasetItem } from "@shared/schema";

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

export async function generateMetaPrompt(
  initialPrompt: string,
  complexity: string = "Standard",
  tone: string = "Balanced"
): Promise<string> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: 
            `You are an expert in creating detailed meta prompts for LLMs. 
            A meta prompt is a higher-level prompt that will be used to generate more specific prompts based on user inputs.
            
            The meta prompt should:
            1. Be well-structured with clear sections and instructions
            2. Include comprehensive guidance on how to analyze and respond to the initial prompt
            3. Provide frameworks for generating consistent, high-quality responses
            
            Complexity level: ${complexity}
            Tone: ${tone}
            
            Generate a detailed meta prompt based on the initial prompt provided by the user.`
        },
        {
          role: "user",
          content: initialPrompt
        }
      ],
      temperature: 0.7,
      max_tokens: 1000
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
  validationMethod: string,
  priority: string,
  userPrompt?: string
): Promise<EvaluationResultItem[]> {
  const results: EvaluationResultItem[] = [];
  
  // Adjust temperature based on priority
  let temperature = 0.2;
  if (priority === "Speed (Fast, Less Accurate)") {
    temperature = 0.7;
  } else if (priority === "Accuracy (Slower, More Precise)") {
    temperature = 0;
  }
  
  // Process each dataset item
  for (const item of datasetItems) {
    try {
      // Generate a response using the meta prompt and the input image
      const generatedResponse = await simulateImageResponseGeneration(metaPrompt, item.inputImage, userPrompt);
      
      // Evaluate the generated response against the valid response
      const evaluationResult = await evaluateResponse(
        generatedResponse, 
        item.validResponse,
        validationMethod
      );
      
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

async function simulateImageResponseGeneration(metaPrompt: string, imageUrl: string, userPrompt?: string): Promise<string> {
  try {
    // Check if the meta prompt contains the {{user_prompt}} placeholder
    const processedMetaPrompt = userPrompt 
      ? metaPrompt.replace(/{{user_prompt}}/g, userPrompt)
      : metaPrompt;
    
    // In a real implementation, this would use OpenAI's vision capabilities
    // We'd pass the image URL or base64 to the API
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: processedMetaPrompt
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: userPrompt || "Please generate a response for this image."
            },
            // In a real app, we would include the actual image here
            // Since we don't have real images, we simulate with a text description
            {
              type: "text",
              text: `[This is where the image from ${imageUrl} would be processed. For now, imagine this is a landscape image with mountains, sky, and trees.]`
            }
          ]
        }
      ],
      temperature: 0.5,
      max_tokens: 500
    });

    return response.choices[0].message.content || "Failed to generate response for image";
  } catch (error) {
    console.error("Error simulating image response generation:", error);
    return "Error: Unable to generate response for this image";
  }
}

type EvaluationResponse = {
  isValid: boolean;
  score: number;
  feedback: string;
};

async function evaluateResponse(
  generatedResponse: string,
  validResponse: string,
  validationMethod: string
): Promise<EvaluationResponse> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: 
            `You are an expert evaluator of AI-generated responses. Your task is to evaluate how well the generated response matches the valid reference response.
            
            Validation method: ${validationMethod}
            
            Return your evaluation in JSON format with the following fields:
            - isValid: boolean indicating if the response meets quality threshold
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

    const result = JSON.parse(response.choices[0].message.content || "{}");
    
    return {
      isValid: result.isValid || false,
      score: result.score || 0,
      feedback: result.feedback || "No feedback provided"
    };
  } catch (error) {
    console.error("Error evaluating response:", error);
    return {
      isValid: false,
      score: 0,
      feedback: "Error: Failed to evaluate this response"
    };
  }
}
