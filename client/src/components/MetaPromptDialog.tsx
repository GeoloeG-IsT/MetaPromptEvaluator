import { useState, useEffect } from 'react';
import { Prompt } from '@shared/schema';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

interface MetaPromptDialogProps {
  isOpen: boolean;
  onClose: () => void;
  existingPrompt?: Prompt;
}

export default function MetaPromptDialog({
  isOpen,
  onClose,
  existingPrompt
}: MetaPromptDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isEditing = !!existingPrompt;

  // Form state
  const [name, setName] = useState('');
  const [metaPrompt, setMetaPrompt] = useState('');
  const [userPrompt, setUserPrompt] = useState('');
  const [processedMetaPrompt, setProcessedMetaPrompt] = useState('');
  const [llmResponse, setLlmResponse] = useState('');

  // Reset form when dialog opens or closes
  useEffect(() => {
    if (isOpen) {
      if (existingPrompt) {
        setName(existingPrompt.name);
        
        // Parse the initialPrompt to extract the original meta prompt template and user prompt
        if (existingPrompt.initialPrompt) {
          const match = existingPrompt.initialPrompt.match(/Meta Prompt Template: ([\s\S]*?)\nUser Prompt: ([\s\S]*)/);
          if (match && match.length >= 3) {
            setMetaPrompt(match[1]);
            setUserPrompt(match[2]);
          }
        }
        
        // The LLM response is stored in the metaPrompt field
        setLlmResponse(existingPrompt.metaPrompt || '');
      } else {
        // Reset form for new meta prompt
        setName('');
        setMetaPrompt('');
        setUserPrompt('');
        setProcessedMetaPrompt('');
        setLlmResponse('');
      }
    }
  }, [isOpen, existingPrompt]);

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

  // Mutation for saving or updating the prompt
  const savePromptMutation = useMutation({
    mutationFn: async (promptData: any) => {
      const url = isEditing 
        ? `/api/prompts/${existingPrompt.id}` 
        : '/api/prompts';
      
      const method = isEditing ? 'PUT' : 'POST';
      
      const response = await apiRequest(method, url, promptData);
      return response.json();
    },
    onSuccess: () => {
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({queryKey: ['/api/prompts']});
      queryClient.invalidateQueries({queryKey: ['/api/dashboard/recent']});
      queryClient.invalidateQueries({queryKey: ['/api/dashboard/stats']});
      
      toast({
        title: isEditing ? "Meta prompt updated!" : "Meta prompt created!",
        description: isEditing 
          ? "Your meta prompt has been updated successfully." 
          : "Your new meta prompt has been created successfully.",
      });
      
      onClose();
    },
    onError: () => {
      toast({
        title: "Save failed",
        description: "There was an error saving your meta prompt. Please try again.",
        variant: "destructive",
      });
    }
  });

  const handleGenerateFinalPrompt = () => {
    if (!metaPrompt.trim()) {
      toast({
        title: "Missing meta prompt",
        description: "Please enter a meta prompt first.",
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

  const handleSave = () => {
    if (!name.trim()) {
      toast({
        title: "Missing name",
        description: "Please enter a name for your meta prompt.",
        variant: "destructive",
      });
      return;
    }
    
    if (!llmResponse) {
      toast({
        title: "Missing LLM response",
        description: "Please generate an LLM response first.",
        variant: "destructive",
      });
      return;
    }
    
    // Store info about the user prompt and meta prompt template
    const initialPromptWithContext = `Meta Prompt Template: ${metaPrompt}\nUser Prompt: ${userPrompt}`;
    
    // Create data that matches our insert schema
    const promptData = {
      name,
      category: "Other", // Default category
      initialPrompt: initialPromptWithContext,
      metaPrompt: llmResponse, // Store the LLM response in metaPrompt field
      complexity: "Standard", // Default complexity
      tone: "Balanced", // Default tone
      tags: null, // No tags as requested
      userId: 1, // Hard-coded for demo
    };
    
    // For edit mode, we'll use the proper API endpoint with PUT
    
    // Save the prompt
    savePromptMutation.mutate(promptData);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[900px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Edit Meta Prompt' : 'Create New Meta Prompt'}
          </DialogTitle>
        </DialogHeader>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 py-4">
          {/* Left Panel */}
          <div className="space-y-4">
            <div>
              <label htmlFor="prompt-name" className="block text-sm font-medium text-gray-700 mb-1">Name</label>
              <Input 
                id="prompt-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter a descriptive name"
              />
            </div>
            
            <div>
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
          <div className="space-y-4">
            <div>
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
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">LLM Response</label>
              <div className="p-4 bg-gray-50 rounded-md code-editor overflow-auto max-h-40 custom-scrollbar">
                <pre className="text-sm whitespace-pre-wrap">{llmResponse || "LLM response will appear here after generating..."}</pre>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Processed Meta Prompt</label>
              <div className="p-3 bg-gray-50 rounded-md code-editor overflow-auto max-h-20 custom-scrollbar">
                <pre className="text-xs text-gray-500 whitespace-pre-wrap">{processedMetaPrompt || "The processed meta prompt will be shown here..."}</pre>
              </div>
            </div>
            
            <div className="flex justify-end">
              <Button 
                variant="outline"
                disabled={generateLLMResponseMutation.isPending || !metaPrompt.trim() || !userPrompt.trim()}
                onClick={handleGenerateFinalPrompt}
                className="mr-2"
              >
                <span className="material-icons text-sm mr-1">auto_awesome</span>
                {generateLLMResponseMutation.isPending ? "Generating..." : "Generate"}
              </Button>
            </div>
          </div>
        </div>
        
        <DialogFooter>
          <Button
            variant="outline"
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={savePromptMutation.isPending || !name.trim() || !llmResponse}
          >
            {savePromptMutation.isPending ? "Saving..." : "Save Meta Prompt"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}