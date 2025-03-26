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
  const [initialPrompt, setInitialPrompt] = useState("");
  const [metaPrompt, setMetaPrompt] = useState("");
  const [promptTags, setPromptTags] = useState<string[]>([]);

  // Mutation for generating meta prompt
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
      setMetaPrompt(data.metaPrompt);
      
      // Auto-generate tags based on content
      const autoTags = generateTags(data.metaPrompt);
      setPromptTags(autoTags);
      
      toast({
        title: "Meta prompt generated!",
        description: "Your meta prompt has been created successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Generation failed",
        description: "There was an error generating the meta prompt. Please try again.",
        variant: "destructive",
      });
    }
  });

  // Mutation for saving prompt
  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("POST", "/api/prompts", data);
      return response.json();
    },
    onSuccess: (savedPrompt) => {
      toast({
        title: "Meta prompt saved!",
        description: "Your meta prompt has been saved successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/prompts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/recent"] });
      onSavePrompt(savedPrompt);
    },
    onError: () => {
      toast({
        title: "Save failed",
        description: "There was an error saving the meta prompt. Please try again.",
        variant: "destructive",
      });
    }
  });

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

  const handleGenerateMetaPrompt = () => {
    if (!initialPrompt.trim()) {
      toast({
        title: "Missing prompt",
        description: "Please enter an initial prompt first.",
        variant: "destructive",
      });
      return;
    }
    
    generateMutation.mutate({ initialPrompt });
  };

  const handleSavePrompt = () => {
    if (!name.trim() || !metaPrompt.trim()) {
      toast({
        title: "Missing fields",
        description: "Please ensure all required fields are filled out.",
        variant: "destructive",
      });
      return;
    }
    
    const promptData = {
      name,
      category: "Other", // Default category
      initialPrompt,
      metaPrompt,
      complexity: "Standard", // Default complexity
      tone: "Balanced", // Default tone
      tags: promptTags,
      userId: 1 // Hard-coded for demo
    };
    
    saveMutation.mutate(promptData);
  };

  const handleCopyToClipboard = () => {
    navigator.clipboard.writeText(metaPrompt);
    toast({
      title: "Copied!",
      description: "Meta prompt copied to clipboard.",
    });
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
            <label htmlFor="prompt-text" className="block text-sm font-medium text-gray-700 mb-1">Initial Prompt</label>
            <Textarea 
              id="prompt-text" 
              rows={8} 
              className="code-editor"
              placeholder="Enter your initial prompt here..."
              value={initialPrompt}
              onChange={(e) => setInitialPrompt(e.target.value)}
            />
          </div>
          
          <div className="flex justify-end">
            <Button
              onClick={handleGenerateMetaPrompt}
              disabled={generateMutation.isPending || !initialPrompt.trim()}
            >
              {generateMutation.isPending ? "Generating..." : "Generate Meta Prompt"}
            </Button>
          </div>
        </div>
        
        {/* Right Panel */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium mb-4">Generated Meta Prompt</h3>
          
          <div className="p-4 bg-gray-50 rounded-md mb-4 code-editor overflow-auto max-h-96 custom-scrollbar">
            <pre className="text-sm whitespace-pre-wrap">{metaPrompt || "Your generated meta prompt will appear here..."}</pre>
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
              variant="outline" 
              onClick={() => setMetaPrompt("")}
              disabled={!metaPrompt}
            >
              <span className="material-icons text-sm mr-1">edit</span>
              Edit
            </Button>
            <Button 
              variant="outline" 
              onClick={handleCopyToClipboard}
              disabled={!metaPrompt}
            >
              <span className="material-icons text-sm mr-1">content_copy</span>
              Copy
            </Button>
            <Button 
              variant="outline" 
              onClick={handleSavePrompt}
              disabled={saveMutation.isPending || !metaPrompt || !name}
            >
              <span className="material-icons text-sm mr-1">save</span>
              Save
            </Button>
            <Button 
              className="ml-auto" 
              disabled={!metaPrompt}
            >
              <span className="material-icons text-sm mr-1">analytics</span>
              Evaluate
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
