import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { 
  MetaPromptResponse, 
  EvaluationResponse,
  PromptEvaluationParams 
} from "@/lib/types";

export const useOpenAI = () => {
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);
  const [isEvaluating, setIsEvaluating] = useState(false);

  /**
   * Generate a meta prompt from an initial prompt
   */
  const generateMetaPrompt = async (
    initialPrompt: string,
    complexity: string = "Standard",
    tone: string = "Balanced"
  ): Promise<MetaPromptResponse> => {
    setIsGenerating(true);

    try {
      const response = await apiRequest(
        "POST",
        "/api/generate-meta-prompt",
        { initialPrompt, complexity, tone }
      );
      
      const data = await response.json();
      return data;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      toast({
        title: "Generation failed",
        description: `Failed to generate meta prompt: ${errorMessage}`,
        variant: "destructive",
      });
      throw error;
    } finally {
      setIsGenerating(false);
    }
  };

  /**
   * Evaluate a prompt using a dataset
   */
  const evaluatePrompt = async (params: PromptEvaluationParams): Promise<EvaluationResponse> => {
    setIsEvaluating(true);

    try {
      // Step 1: Create the evaluation record
      const createResponse = await apiRequest(
        "POST",
        "/api/evaluations",
        {
          promptId: params.promptId,
          datasetId: params.datasetId,
          validationMethod: params.validationMethod,
          priority: params.priority
        }
      );
      
      const evaluation = await createResponse.json();
      
      // Step 2: Start the evaluation process
      const startResponse = await apiRequest(
        "POST",
        `/api/evaluations/${evaluation.id}/start`,
        {}
      );
      
      return await startResponse.json();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      toast({
        title: "Evaluation failed",
        description: `Failed to evaluate prompt: ${errorMessage}`,
        variant: "destructive",
      });
      throw error;
    } finally {
      setIsEvaluating(false);
    }
  };

  return {
    generateMetaPrompt,
    evaluatePrompt,
    isGenerating,
    isEvaluating
  };
};
