import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Prompt, Dataset, Evaluation } from '@shared/schema';
import { PromptEvaluationParams } from '@/lib/types';
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
  selectedPrompt?: Prompt | undefined;
  evaluation?: Evaluation | undefined;
}

export default function EvaluationDialog({
  isOpen,
  onClose,
  selectedPrompt,
  evaluation
}: EvaluationDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();
  
  // Form state
  const [promptId, setPromptId] = useState<number | null>(null);
  const [datasetId, setDatasetId] = useState<number | null>(null);
  const [userPrompt, setUserPrompt] = useState('');
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
  
  // Create evaluation
  const createEvaluationMutation = useMutation({
    mutationFn: async (data: PromptEvaluationParams) => {
      console.log("Creating evaluation with data:", data);
      return await apiRequest('POST', '/api/evaluations', {
        ...data,
        validationMethod: 'Comprehensive', // Default value
        priority: 'Balanced' // Default value
      });
    },
    onSuccess: (response: any, variables: any) => {
      // Access id from response and userPrompt from variables
      console.log("Evaluation created successfully, starting evaluation with:", {
        id: response.id, 
        userPrompt: variables.userPrompt
      });
      startEvaluationMutation.mutate({ 
        id: response.id, 
        userPrompt: variables.userPrompt 
      });
    },
    onError: (error) => {
      console.error("Error creating evaluation:", error);
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
      // If editing an existing evaluation
      if (evaluation) {
        setPromptId(evaluation.promptId);
        setDatasetId(evaluation.datasetId);
        setUserPrompt(evaluation.userPrompt || '');
      } 
      // If a prompt is pre-selected
      else if (selectedPrompt) {
        setPromptId(selectedPrompt.id);
        setUserPrompt('');
        
        if (datasets.length > 0) {
          setDatasetId(datasets[0].id);
        } else {
          setDatasetId(null);
        }
      }
      // Otherwise use defaults
      else {
        setUserPrompt('');
        
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
  }, [isOpen, datasets, prompts, selectedPrompt, evaluation]);
  
  // Update evaluation mutation
  const updateEvaluationMutation = useMutation({
    mutationFn: async (data: {
      id: number;
    } & PromptEvaluationParams) => {
      console.log("Updating evaluation via mutation:", data);
      return await apiRequest('PUT', `/api/evaluations/${data.id}`, {
        promptId: data.promptId,
        datasetId: data.datasetId,
        userPrompt: data.userPrompt
      });
    },
    onSuccess: (response) => {
      console.log("Evaluation updated successfully:", response);
      setIsSaving(false);
      toast({
        title: 'Evaluation updated',
        description: 'The evaluation has been updated successfully.'
      });
      
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({queryKey: ['/api/evaluations']});
      if (evaluation?.id) {
        queryClient.invalidateQueries({queryKey: ['/api/evaluations', evaluation.id]});
      }
      onClose();
    },
    onError: (error: any) => {
      console.error("Error updating evaluation:", error);
      setIsSaving(false);
      
      // Check for the specific error message about already run evaluations
      if (error?.response?.data?.message?.includes("Cannot update evaluations")) {
        toast({
          title: 'Cannot edit this evaluation',
          description: 'Evaluations that have already been run cannot be edited. Please create a new evaluation instead.',
          variant: 'destructive'
        });
      } else {
        toast({
          title: 'Update failed',
          description: 'There was an error updating the evaluation. Please try again.',
          variant: 'destructive'
        });
      }
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
    
    // Ensure userPrompt is at least an empty string if undefined
    const safeUserPrompt = userPrompt || '';
    
    // If we're editing an existing evaluation
    if (evaluation) {
      console.log("Updating evaluation:", {
        id: evaluation.id,
        promptId,
        datasetId,
        userPrompt: safeUserPrompt
      });
      
      updateEvaluationMutation.mutate({
        id: evaluation.id,
        promptId,
        datasetId,
        userPrompt: safeUserPrompt
      });
    } 
    // Otherwise create a new evaluation
    else {
      try {
        console.log("Creating evaluation (save only):", {
          promptId,
          datasetId,
          userPrompt: safeUserPrompt
        });
        
        const response = await apiRequest('POST', '/api/evaluations', {
          promptId,
          datasetId,
          userPrompt: safeUserPrompt,
          validationMethod: 'Comprehensive', // Default value 
          priority: 'Balanced' // Default value
        });
        
        console.log("Evaluation saved successfully:", response);
        
        setIsSaving(false);
        toast({
          title: 'Evaluation saved',
          description: 'The evaluation has been saved and can be run later.'
        });
        
        // Invalidate queries to refresh data
        queryClient.invalidateQueries({queryKey: ['/api/evaluations']});
        onClose();
      } catch (error) {
        console.error("Error saving evaluation:", error);
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
    
    // Ensure userPrompt is at least an empty string if undefined
    const safeUserPrompt = userPrompt || '';
    
    createEvaluationMutation.mutate({
      promptId,
      datasetId,
      userPrompt: safeUserPrompt
    });
  };
  
  // Check if the evaluation is editable
  const isEvaluationEditable = !evaluation || 
    evaluation.status === 'pending' || 
    evaluation.status === 'failed';
  
  // Display a warning if the evaluation is not editable
  const alreadyRunWarning = evaluation && !isEvaluationEditable && (
    <div className="bg-amber-50 border border-amber-200 rounded-md p-3 mb-4">
      <p className="text-amber-800 text-sm">
        <span className="material-icons text-sm mr-1 align-middle">warning</span>
        This evaluation has already been run and cannot be edited. You can view the details or create a new evaluation.
      </p>
    </div>
  );
  
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>
            {evaluation ? 'Edit Evaluation' : 'Create New Evaluation'}
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            {evaluation ? 'Modify the evaluation settings.' : 'Create a new evaluation for your meta prompt.'}
          </p>
        </DialogHeader>
        
        {alreadyRunWarning}
        
        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          {/* Meta prompt selection */}
          <div className="space-y-2">
            <Label htmlFor="prompt">Meta Prompt</Label>
            <Select
              value={promptId?.toString() || ''}
              onValueChange={(value) => setPromptId(parseInt(value))}
              disabled={!isEvaluationEditable}
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
              disabled={!isEvaluationEditable}
            />
          </div>
          
          {/* Dataset selection */}
          <div className="space-y-2">
            <Label htmlFor="dataset">Dataset</Label>
            <Select
              value={datasetId?.toString() || ''}
              onValueChange={(value) => setDatasetId(parseInt(value))}
              disabled={!isEvaluationEditable}
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
          
          <DialogFooter className="gap-2 mt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isLoading || isSaving}
            >
              {evaluation && !isEvaluationEditable ? 'Close' : 'Cancel'}
            </Button>
            {isEvaluationEditable && (
              <>
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
              </>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}