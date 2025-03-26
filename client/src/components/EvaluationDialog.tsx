import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Prompt, Dataset } from '@shared/schema';
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
  prompt: Prompt;
}

export default function EvaluationDialog({
  isOpen,
  onClose,
  prompt
}: EvaluationDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();
  
  // Form state
  const [userPrompt, setUserPrompt] = useState('');
  const [datasetId, setDatasetId] = useState<number | null>(null);
  const [validationMethod, setValidationMethod] = useState('Comprehensive');
  const [priority, setPriority] = useState('Balanced');
  const [isLoading, setIsLoading] = useState(false);
  
  // Fetch available datasets
  const { data: datasets = [] } = useQuery({
    queryKey: ['/api/datasets'],
    queryFn: getQueryFn<Dataset[]>({ on401: 'returnNull' })
  });
  
  // Create evaluation
  const createEvaluationMutation = useMutation({
    mutationFn: async (data: {
      promptId: number;
      datasetId: number;
      validationMethod: string;
      priority: string;
    }) => {
      return await apiRequest('POST', '/api/evaluations', data);
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
      setUserPrompt('');
      if (datasets.length > 0) {
        setDatasetId(datasets[0].id);
      } else {
        setDatasetId(null);
      }
      setValidationMethod('Comprehensive');
      setPriority('Balanced');
    }
  }, [isOpen, datasets]);
  
  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!datasetId) {
      toast({
        title: 'Dataset required',
        description: 'Please select a dataset for evaluation.',
        variant: 'destructive'
      });
      return;
    }
    
    setIsLoading(true);
    
    createEvaluationMutation.mutate({
      promptId: prompt.id,
      datasetId,
      validationMethod,
      priority
    });
  };
  
  // Show meta prompt with highlighted placeholders
  const highlightedPrompt = prompt.metaPrompt?.replace(/\{\{user_prompt\}\}/g, '<span class="bg-yellow-100 dark:bg-yellow-900 px-1 rounded">{{user_prompt}}</span>') || '';
  
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Evaluate Meta Prompt: {prompt.name}</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          {/* Meta prompt preview */}
          <div className="space-y-2">
            <Label>Meta Prompt Template</Label>
            <div 
              className="border rounded-md p-3 bg-gray-50 dark:bg-gray-900 h-32 overflow-y-auto text-sm"
              dangerouslySetInnerHTML={{ __html: highlightedPrompt }}
            />
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
          
          {/* Validation method selection */}
          <div className="space-y-2">
            <Label htmlFor="validationMethod">Validation Method</Label>
            <Select
              value={validationMethod}
              onValueChange={(value) => setValidationMethod(value)}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Comprehensive">Comprehensive Evaluation</SelectItem>
                <SelectItem value="Semantic">Semantic Similarity</SelectItem>
                <SelectItem value="Output Format">Output Format Validation</SelectItem>
                <SelectItem value="Content Quality">Content Quality Assessment</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {/* Priority selection */}
          <div className="space-y-2">
            <Label htmlFor="priority">Priority</Label>
            <Select
              value={priority}
              onValueChange={(value) => setPriority(value)}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Balanced">Balanced</SelectItem>
                <SelectItem value="Speed (Fast, Less Accurate)">Speed (Fast, Less Accurate)</SelectItem>
                <SelectItem value="Accuracy (Slower, More Precise)">Accuracy (Slower, More Precise)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <DialogFooter className="gap-2 mt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading || !datasetId}
            >
              {isLoading ? 'Starting Evaluation...' : 'Run Evaluation'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}