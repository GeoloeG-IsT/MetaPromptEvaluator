import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Prompt } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { queryClient } from "@/lib/queryClient";

interface MetaPromptFormProps {
  onSavePrompt: (prompt: Prompt) => void;
}

export default function MetaPromptForm({ onSavePrompt }: MetaPromptFormProps) {
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [metaPrompt, setMetaPrompt] = useState("");
  const [userPrompt, setUserPrompt] = useState("");
  const [processedMetaPrompt, setProcessedMetaPrompt] = useState("");
  const [llmResponse, setLlmResponse] = useState("");

  // Mutation for generating LLM response using processed meta prompt
  const generateLLMResponseMutation = useMutation({
    mutationFn: async (data: { processedPrompt: string }) => {
      const response = await apiRequest(
        "POST", 
        "/api/generate-llm-response", 
        data
      );
      return response.json();
    },
    onSuccess: (data) => {
      const response = data.llmResponse;
      setLlmResponse(response);
      
      // Save the prompt and response data
      saveGeneratedPrompt(processedMetaPrompt, response);
      
      toast({
        title: "Response generated!",
        description: "The LLM has generated a response based on your prompt.",
      });
    },
    onError: () => {
      toast({
        title: "Generation failed",
        description: "There was an error generating the LLM response. Please try again.",
        variant: "destructive",
      });
    }
  });

  // Function to save the generated prompt and LLM response
  const saveGeneratedPrompt = (processedPrompt: string, llmResponse: string) => {
    if (processedPrompt && name) {
      // Store info about the user prompt and meta prompt template
      const initialPromptWithContext = `Meta Prompt Template: ${metaPrompt}\nUser Prompt: ${userPrompt}`;
      
      const promptData = {
        name,
        category: "Other", // Default category
        initialPrompt: initialPromptWithContext,
        metaPrompt: llmResponse, // Store the LLM response in metaPrompt field
        complexity: "Standard", // Default complexity
        tone: "Balanced", // Default tone
        tags: [], // No tags as requested
        userId: 1 // Hard-coded for demo
      };
      
      // Call onSavePrompt with the prompt data
      onSavePrompt(promptData as Prompt);
    }
  };

  const handleGenerateFinalPrompt = () => {
    if (!metaPrompt.trim()) {
      toast({
        title: "Missing meta prompt",
        description: "Please enter a meta prompt first.",
        variant: "destructive",
      });
      return;
    }
    
    if (!name.trim()) {
      toast({
        title: "Missing name",
        description: "Please enter a name for your prompt.",
        variant: "destructive",
      });
      return;
    }
    
    if (!userPrompt.trim()) {
      toast({
        title: "Missing user prompt",
        description: "Please enter a user prompt first.",
        variant: "destructive",
      });
      return;
    }
    
    // Replace {{user_prompt}} with the actual user prompt
    const processedPrompt = metaPrompt.replace(/{{user_prompt}}/g, userPrompt);
    
    // Save the processed prompt for later use
    setProcessedMetaPrompt(processedPrompt);
    
    // Send the processed prompt to the LLM
    generateLLMResponseMutation.mutate({ processedPrompt });
  };

  return (
    <div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Panel */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium mb-4">Create Your Meta Prompt</h3>
          <div className="mb-4">
            <label htmlFor="prompt-name" className="block text-sm font-medium text-gray-700 mb-1">Name</label>
            <Input 
              id="prompt-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter a descriptive name"
            />
          </div>
          
          <div className="mb-4">
            <label htmlFor="prompt-text" className="block text-sm font-medium text-gray-700 mb-1">Meta Prompt</label>
            <Textarea 
              id="prompt-text" 
              rows={8} 
              className="code-editor"
              placeholder="Enter your meta prompt here..."
              value={metaPrompt}
              onChange={(e) => setMetaPrompt(e.target.value)}
            />
          </div>
        </div>
        
        {/* Right Panel */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium mb-4">User Input & Generated Prompt</h3>
          
          <div className="mb-4">
            <label htmlFor="user-prompt" className="block text-sm font-medium text-gray-700 mb-1">User Prompt</label>
            <Textarea 
              id="user-prompt" 
              rows={4} 
              className="code-editor"
              placeholder="Enter the user prompt here (will replace the template placeholder)"
              value={userPrompt}
              onChange={(e) => setUserPrompt(e.target.value)}
            />
            <p className="text-xs text-gray-500 mt-1">
              This will replace <code>{"{{user_prompt}}"}</code> in your meta prompt template.
            </p>
          </div>
          
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Generated Prompt</label>
            <div className="p-4 bg-gray-50 rounded-md code-editor overflow-auto max-h-96 custom-scrollbar">
              <pre className="text-sm whitespace-pre-wrap">{userInitialPrompt || "Your generated prompt will appear here..."}</pre>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-3 mb-6">
            {promptTags.map((tag, index) => (
              <div key={index} className="text-xs px-2 py-1 bg-indigo-100 text-primary rounded-full">
                {tag}
              </div>
            ))}
          </div>
          
          <div className="flex flex-wrap gap-3">
            <Button 
              className="ml-auto" 
              disabled={generateMutation.isPending || !metaPrompt.trim() || !userPrompt.trim()}
              onClick={handleGenerateFinalPrompt}
            >
              <span className="material-icons text-sm mr-1">auto_awesome</span>
              {generateMutation.isPending ? "Generating..." : "Generate"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
