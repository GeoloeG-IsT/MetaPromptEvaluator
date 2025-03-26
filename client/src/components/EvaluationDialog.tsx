import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Prompt, Dataset, Evaluation } from '@shared/schema';
import { getQueryFn, apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useLocation } from 'wouter';

interface EvaluationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  prompt?: Prompt | undefined; // Make prompt optional as we'll now select it from a dropdown
  evaluation?: Evaluation | undefined; // Add evaluation prop for editing existing evaluations
}

export default function EvaluationDialog({
  isOpen,
  onClose,
  prompt: initialPrompt, // Rename to initialPrompt to avoid confusion
  evaluation // Add evaluation for editing existing evaluations
}: EvaluationDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();
  
  // Form state
  const [userPrompt, setUserPrompt] = useState('');
  const [promptId, setPromptId] = useState<number | null>(null);
  const [datasetId, setDatasetId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Fetch available datasets
  const { data: datasets = [] } = useQuery({
    queryKey: ['/api/datasets'],
    queryFn: getQueryFn<Dataset[]>({ on401: 'returnNull' })
  });
  
  // Fetch available prompts
  const { data: prompts = [] } = useQuery<Prompt[]>({
    queryKey: ['/api/prompts'],
    queryFn: getQueryFn<Prompt[]>({ on401: 'returnNull' })
  });
  
  // Get selected prompt
  const selectedPrompt = prompts.find(p => p.id === promptId);
  
  // Create evaluation
  const createEvaluationMutation = useMutation({
    mutationFn: async (data: {
      promptId: number;
      datasetId: number;
    }) => {
      // Use default values for validation method and priority since they're being removed from UI
      return await apiRequest('POST', '/api/evaluations', {
        ...data,
        validationMethod: 'Comprehensive', // Default value
        priority: 'Balanced', // Default value
        userPrompt
      });
    },
    onSuccess: (response: any) => {
      // Access id from response
      startEvaluationMutation.mutate({ id: response.id, userPrompt });
    },
    onError: () => {
      setIsLoading(false);
      toast({
        title: 'Evaluation failed',
        description: 'There was an error creating the evaluation. Please try again.',
        variant: 'destructive'
      });
    }
  });
  
  // Start evaluation
  const startEvaluationMutation = useMutation({
    mutationFn: async ({ id, userPrompt }: { id: number, userPrompt: string }) => {
      return await apiRequest('POST', `/api/evaluations/${id}/start`, { userPrompt });
    },
    onSuccess: (response) => {
      setIsLoading(false);
      toast({
        title: 'Evaluation started',
        description: 'The prompt is being evaluated. You will be redirected to the evaluation details.'
      });
      
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({queryKey: ['/api/evaluations']});
      queryClient.invalidateQueries({queryKey: ['/api/dashboard/stats']});
      
      // Navigate to the evaluation details
      setTimeout(() => {
        onClose();
        navigate(`/evaluations`);
      }, 1000);
    },
    onError: () => {
      setIsLoading(false);
      toast({
        title: 'Evaluation failed',
        description: 'There was an error starting the evaluation. Please try again.',
        variant: 'destructive'
      });
    }
  });
  
  // Reset form when dialog opens
  useEffect(() => {
    if (isOpen) {
      // Set default values first
      setUserPrompt('');
      
      // If editing an existing evaluation, use its values
      if (evaluation) {
        setPromptId(evaluation.promptId);
        setDatasetId(evaluation.datasetId);
        if (evaluation.userPrompt) {
          setUserPrompt(evaluation.userPrompt);
        }
      } 
      // Otherwise use the initial prompt if provided
      else if (initialPrompt) {
        setPromptId(initialPrompt.id);
        // Set default dataset if available
        if (datasets.length > 0) {
          setDatasetId(datasets[0].id);
        } else {
          setDatasetId(null);
        }
      } 
      // If no initial prompt or evaluation, use defaults
      else {
        if (prompts.length > 0) {
          setPromptId(prompts[0].id);
        } else {
          setPromptId(null);
        }
        
        if (datasets.length > 0) {
          setDatasetId(datasets[0].id);
        } else {
          setDatasetId(null);
        }
      }
    }
  }, [isOpen, datasets, prompts, initialPrompt, evaluation]);
  
  // Update evaluation mutation
  const updateEvaluationMutation = useMutation({
    mutationFn: async (data: {
      id: number;
      promptId: number;
      datasetId: number;
    }) => {
      return await apiRequest('PUT', `/api/evaluations/${data.id}`, {
        promptId: data.promptId,
        datasetId: data.datasetId,
        validationMethod: 'Comprehensive', // Default value
        priority: 'Balanced', // Default value
        userPrompt
      });
    },
    onSuccess: () => {
      setIsSaving(false);
      toast({
        title: 'Evaluation updated',
        description: 'The evaluation has been updated successfully.'
      });
      
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({queryKey: ['/api/evaluations']});
      queryClient.invalidateQueries({queryKey: ['/api/evaluations', evaluation?.id]});
      onClose();
    },
    onError: () => {
      setIsSaving(false);
      toast({
        title: 'Update failed',
        description: 'There was an error updating the evaluation. Please try again.',
        variant: 'destructive'
      });
    }
  });

  // Handle save evaluation without running
  const handleSaveEvaluation = async () => {
    if (!promptId || !datasetId) {
      toast({
        title: 'Required fields missing',
        description: 'Please select both a prompt and a dataset.',
        variant: 'destructive'
      });
      return;
    }
    
    setIsSaving(true);
    
    // If we're editing an existing evaluation
    if (evaluation) {
      updateEvaluationMutation.mutate({
        id: evaluation.id,
        promptId,
        datasetId
      });
    } 
    // Otherwise create a new evaluation
    else {
      try {
        // Use default values for validation method and priority
        const response = await apiRequest('POST', '/api/evaluations', {
          promptId,
          datasetId,
          validationMethod: 'Comprehensive', // Default value
          priority: 'Balanced', // Default value
          userPrompt
        });
        
        setIsSaving(false);
        toast({
          title: 'Evaluation saved',
          description: 'The evaluation has been saved and can be run later.'
        });
        
        // Invalidate queries to refresh data
        queryClient.invalidateQueries({queryKey: ['/api/evaluations']});
        onClose();
      } catch (error) {
        setIsSaving(false);
        toast({
          title: 'Save failed',
          description: 'There was an error saving the evaluation. Please try again.',
          variant: 'destructive'
        });
      }
    }
  };
  
  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!promptId || !datasetId) {
      toast({
        title: 'Required fields missing',
        description: 'Please select both a prompt and a dataset.',
        variant: 'destructive'
      });
      return;
    }
    
    setIsLoading(true);
    
    createEvaluationMutation.mutate({
      promptId,
      datasetId
    });
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>
            {evaluation ? 'Edit Evaluation' : 'Create New Evaluation'}
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          {/* Meta prompt selection */}
          <div className="space-y-2">
            <Label htmlFor="prompt">Meta Prompt</Label>
            <Select
              value={promptId?.toString() || ''}
              onValueChange={(value) => setPromptId(parseInt(value))}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a meta prompt" />
              </SelectTrigger>
              <SelectContent>
                {prompts.length === 0 ? (
                  <SelectItem value="none" disabled>No prompts available</SelectItem>
                ) : (
                  prompts.map((prompt) => (
                    <SelectItem key={prompt.id} value={prompt.id.toString()}>
                      {prompt.name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            {prompts.length === 0 && (
              <p className="text-xs text-red-500 mt-1">
                Please create a meta prompt before evaluating.
              </p>
            )}
          </div>
          
          {/* User prompt input */}
          <div className="space-y-2">
            <Label htmlFor="userPrompt">User Prompt (replaces placeholder)</Label>
            <Textarea
              id="userPrompt"
              value={userPrompt}
              onChange={(e) => setUserPrompt(e.target.value)}
              placeholder="Enter the user prompt that will replace the placeholder"
              className="min-h-[80px]"
            />
          </div>
          
          {/* Dataset selection */}
          <div className="space-y-2">
            <Label htmlFor="dataset">Dataset</Label>
            <Select
              value={datasetId?.toString() || ''}
              onValueChange={(value) => setDatasetId(parseInt(value))}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a dataset" />
              </SelectTrigger>
              <SelectContent>
                {datasets.length === 0 ? (
                  <SelectItem value="none" disabled>No datasets available</SelectItem>
                ) : (
                  datasets.map((dataset) => (
                    <SelectItem key={dataset.id} value={dataset.id.toString()}>
                      {dataset.name} ({dataset.itemCount || 0} items)
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            {datasets.length === 0 && (
              <p className="text-xs text-red-500 mt-1">
                Please create a dataset before evaluating prompts.
              </p>
            )}
          </div>
          
          {/* Note about default settings */}
          <div className="text-sm text-gray-500 mt-4">
            <p>Default validation will use comprehensive evaluation with balanced accuracy/speed settings.</p>
          </div>
          
          <DialogFooter className="gap-2 mt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isLoading || isSaving}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={handleSaveEvaluation}
              disabled={isLoading || isSaving || !promptId || !datasetId}
            >
              {isSaving ? 'Saving...' : 'Save'}
            </Button>
            <Button
              type="submit"
              disabled={isLoading || isSaving || !promptId || !datasetId}
            >
              {isLoading ? 'Starting Evaluation...' : 'Run Evaluation'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}