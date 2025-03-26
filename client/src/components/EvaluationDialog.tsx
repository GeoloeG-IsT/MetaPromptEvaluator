import { useState, useEffect } from 'react';
import { Prompt, Dataset } from '@shared/schema';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';

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

  // Form state
  const [userPrompt, setUserPrompt] = useState('');
  const [selectedDatasetId, setSelectedDatasetId] = useState<string>('');
  const [validationMethod, setValidationMethod] = useState('LLM Pattern Matching');
  const [priority, setPriority] = useState('Balanced');

  // Fetch available datasets
  const { data: datasets, isLoading: datasetsLoading } = useQuery<Dataset[]>({
    queryKey: ['/api/datasets'],
    enabled: isOpen
  });

  // Reset form when dialog opens or closes
  useEffect(() => {
    if (isOpen) {
      setUserPrompt('');
      setSelectedDatasetId('');
      setValidationMethod('LLM Pattern Matching');
      setPriority('Balanced');
    }
  }, [isOpen]);

  // Mutation for starting evaluation
  const startEvaluationMutation = useMutation({
    mutationFn: async (evaluationData: any) => {
      // First create the evaluation
      const createResponse = await apiRequest(
        'POST', 
        '/api/evaluations', 
        evaluationData
      );
      const evaluation = await createResponse.json();
      
      // Then start the evaluation process
      const startResponse = await apiRequest(
        'POST', 
        `/api/evaluations/${evaluation.id}/start`, 
        {}
      );
      return startResponse.json();
    },
    onSuccess: () => {
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({queryKey: ['/api/evaluations']});
      
      toast({
        title: 'Evaluation started',
        description: 'Your prompt evaluation has been started successfully.',
      });
      
      onClose();
    },
    onError: () => {
      toast({
        title: 'Evaluation failed',
        description: 'There was an error starting the evaluation. Please try again.',
        variant: 'destructive',
      });
    }
  });

  const handleStartEvaluation = () => {
    if (!selectedDatasetId) {
      toast({
        title: 'Missing dataset',
        description: 'Please select a dataset for evaluation.',
        variant: 'destructive',
      });
      return;
    }

    if (!userPrompt.trim()) {
      toast({
        title: 'Missing user prompt',
        description: 'Please enter a user prompt to test the meta prompt with.',
        variant: 'destructive',
      });
      return;
    }
    
    // Create data for evaluation
    const evaluationData = {
      promptId: prompt.id,
      datasetId: parseInt(selectedDatasetId),
      validationMethod,
      priority,
      userPrompt: userPrompt.trim()
    };
    
    // Start the evaluation
    startEvaluationMutation.mutate(evaluationData);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Evaluate Meta Prompt</DialogTitle>
        </DialogHeader>
        
        <div className="grid gap-6 py-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Meta Prompt</label>
            <div className="p-3 bg-gray-50 rounded-md border text-sm">
              {prompt.metaPrompt}
            </div>
          </div>
          
          <div>
            <label htmlFor="user-prompt" className="block text-sm font-medium text-gray-700 mb-1">User Prompt</label>
            <Textarea 
              id="user-prompt" 
              rows={3} 
              placeholder="Enter the user prompt to test with..."
              value={userPrompt}
              onChange={(e) => setUserPrompt(e.target.value)}
            />
            <p className="text-xs text-gray-500 mt-1">
              This will replace <code>{"{{user_prompt}}"}</code> in the meta prompt template.
            </p>
          </div>
          
          <div>
            <label htmlFor="dataset" className="block text-sm font-medium text-gray-700 mb-1">Dataset</label>
            <Select 
              value={selectedDatasetId} 
              onValueChange={setSelectedDatasetId}
            >
              <SelectTrigger id="dataset">
                <SelectValue placeholder="Select a dataset" />
              </SelectTrigger>
              <SelectContent>
                {datasetsLoading ? (
                  <SelectItem value="loading" disabled>Loading datasets...</SelectItem>
                ) : (
                  datasets?.map(dataset => (
                    <SelectItem key={dataset.id} value={dataset.id.toString()}>
                      {dataset.name} ({dataset.itemCount || 0} items)
                    </SelectItem>
                  ))
                )}
                {datasets?.length === 0 && (
                  <SelectItem value="none" disabled>No datasets available</SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="validation-method" className="block text-sm font-medium text-gray-700 mb-1">Validation Method</label>
              <Select 
                value={validationMethod} 
                onValueChange={setValidationMethod}
              >
                <SelectTrigger id="validation-method">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="LLM Pattern Matching">LLM Pattern Matching</SelectItem>
                  <SelectItem value="Semantic Similarity">Semantic Similarity</SelectItem>
                  <SelectItem value="Comprehensive Analysis">Comprehensive Analysis</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label htmlFor="priority" className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
              <Select 
                value={priority} 
                onValueChange={setPriority}
              >
                <SelectTrigger id="priority">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Speed">Speed (Fast, Less Accurate)</SelectItem>
                  <SelectItem value="Balanced">Balanced</SelectItem>
                  <SelectItem value="Accuracy">Accuracy (Slower, More Precise)</SelectItem>
                </SelectContent>
              </Select>
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
            onClick={handleStartEvaluation}
            disabled={startEvaluationMutation.isPending || !selectedDatasetId || !userPrompt.trim()}
          >
            {startEvaluationMutation.isPending ? "Starting..." : "Start Evaluation"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}