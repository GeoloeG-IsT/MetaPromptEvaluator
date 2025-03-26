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
  const [userInitialPrompt, setUserInitialPrompt] = useState("");
  const [promptTags, setPromptTags] = useState<string[]>([]);

  // Mutation for generating final prompt based on meta prompt + user input
  const generateMutation = useMutation({
    mutationFn: async (data: { initialPrompt: string }) => {
      const response = await apiRequest(
        "POST", 
        "/api/generate-meta-prompt", 
        data
      );
      return response.json();
    },
    onSuccess: (data) => {
      const generatedPrompt = data.metaPrompt;
      setUserInitialPrompt(generatedPrompt);
      
      // Auto-generate tags based on content
      const autoTags = generateTags(generatedPrompt);
      setPromptTags(autoTags);
      
      // Save the prompt
      saveGeneratedPrompt(generatedPrompt, autoTags);
      
      toast({
        title: "Final prompt generated!",
        description: "Your final prompt has been generated successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Generation failed",
        description: "There was an error generating the final prompt. Please try again.",
        variant: "destructive",
      });
    }
  });

  // Function to save the generated prompt
  const saveGeneratedPrompt = (generatedPrompt: string, tags: string[]) => {
    if (generatedPrompt && name) {
      const promptData = {
        name,
        category: "Other", // Default category
        initialPrompt: metaPrompt,
        metaPrompt: generatedPrompt,
        complexity: "Standard", // Default complexity
        tone: "Balanced", // Default tone
        tags: tags,
        userId: 1 // Hard-coded for demo
      };
      
      // Call onSavePrompt with the generated prompt
      onSavePrompt(promptData as Prompt);
    }
  };

  // Simple tag generation based on prompt content
  const generateTags = (text: string): string[] => {
    const tags = new Set<string>();
    
    // Common tag patterns to check for
    const patternMap = {
      "Image Analysis": /image|analy[sz]e|visual/i,
      "Detailed Description": /detail|descri|comprehensive/i,
      "Structured Format": /structur|format|step/i,
      "Visual Elements": /visual|element|component/i,
      "Objective Language": /objective|neutral|unbiased/i,
    };
    
    Object.entries(patternMap).forEach(([tag, pattern]) => {
      if (pattern.test(text)) {
        tags.add(tag);
      }
    });
    
    return Array.from(tags).slice(0, 5); // Limit to 5 tags
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
    
    generateMutation.mutate({ initialPrompt: metaPrompt });
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
          <h3 className="text-lg font-medium mb-4">User Initial Prompt</h3>
          
          <div className="p-4 bg-gray-50 rounded-md mb-4 code-editor overflow-auto max-h-96 custom-scrollbar">
            <pre className="text-sm whitespace-pre-wrap">{userInitialPrompt || "Your generated prompt will appear here..."}</pre>
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
              disabled={generateMutation.isPending || !metaPrompt.trim()}
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
