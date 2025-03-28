import { useState, useEffect, ChangeEvent } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Evaluation, EvaluationResult, Prompt, Dataset, DatasetItem } from '@shared/schema';
import { EvaluationMetrics } from '@/lib/types';
import { formatDistanceToNow } from 'date-fns';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import ResponseComparisonModal from './ResponseComparisonModal';

interface EvaluationDetailProps {
  evaluationId: number;
  onBack: () => void;
  onEdit?: (evaluation: Evaluation) => void;
}

export default function EvaluationDetail({ evaluationId, onBack, onEdit }: EvaluationDetailProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [userPrompt, setUserPrompt] = useState('');
  const [selectedResult, setSelectedResult] = useState<EvaluationResult | null>(null);
  
  // Fetch evaluation details
  const { 
    data: evaluation, 
    isLoading: evaluationLoading 
  } = useQuery<Evaluation>({
    queryKey: ['/api/evaluations', evaluationId],
    queryFn: async () => {
      const res = await fetch(`/api/evaluations/${evaluationId}`);
      if (!res.ok) throw new Error('Failed to fetch evaluation');
      return res.json();
    },
  });
  
  // Fetch evaluation results
  const { 
    data: results, 
    isLoading: resultsLoading 
  } = useQuery<EvaluationResult[]>({
    queryKey: ['/api/evaluations', evaluationId, 'results'],
    queryFn: async () => {
      const res = await fetch(`/api/evaluations/${evaluationId}/results`);
      if (!res.ok) throw new Error('Failed to fetch evaluation results');
      return res.json();
    },
    enabled: !!evaluationId,
  });
  
  // Fetch associated prompt
  const { data: prompt } = useQuery<Prompt>({
    queryKey: ['/api/prompts', evaluation?.promptId],
    queryFn: async () => {
      const res = await fetch(`/api/prompts/${evaluation?.promptId}`);
      if (!res.ok) throw new Error('Failed to fetch prompt');
      return res.json();
    },
    enabled: !!evaluation?.promptId,
  });
  
  // Get the final prompt (either from stored value or expanded with userPrompt)
  const { data: finalPromptData, isLoading: finalPromptLoading } = useQuery({
    queryKey: ['/api/generate-final-prompt', evaluation?.finalPrompt, prompt?.metaPrompt, evaluation?.userPrompt],
    queryFn: async () => {
      // If we already have a final prompt stored in the evaluation, use that
      if (evaluation?.finalPrompt) {
        return { finalPrompt: evaluation.finalPrompt };
      }
      
      // Otherwise, generate it on the fly
      if (!prompt?.metaPrompt) {
        return { finalPrompt: "Meta prompt not available" };
      }
      
      const res = await fetch('/api/generate-final-prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          metaPrompt: prompt.metaPrompt, 
          userPrompt: evaluation?.userPrompt || '' 
        })
      });
      if (!res.ok) throw new Error('Failed to generate final prompt');
      return res.json();
    },
    enabled: !!evaluation && (!!evaluation.finalPrompt || !!prompt?.metaPrompt),
  });
  
  // Fetch associated dataset
  const { data: dataset } = useQuery<Dataset>({
    queryKey: ['/api/datasets', evaluation?.datasetId],
    queryFn: async () => {
      const res = await fetch(`/api/datasets/${evaluation?.datasetId}`);
      if (!res.ok) throw new Error('Failed to fetch dataset');
      return res.json();
    },
    enabled: !!evaluation?.datasetId,
  });
  
  // Fetch dataset items for the associated dataset
  const { data: datasetItems } = useQuery<DatasetItem[]>({
    queryKey: ['/api/datasets', evaluation?.datasetId, 'items'],
    queryFn: async () => {
      const res = await fetch(`/api/datasets/${evaluation?.datasetId}/items`);
      if (!res.ok) throw new Error('Failed to fetch dataset items');
      return res.json();
    },
    enabled: !!evaluation?.datasetId,
  });

  // Update evaluation mutation
  const updateEvaluationMutation = useMutation({
    mutationFn: async (data: Partial<Evaluation>) => {
      console.log("Updating evaluation:", { id: evaluationId, ...data });
      console.log("Updating evaluation via mutation:", { id: evaluationId, ...data });
      return await apiRequest('PUT', `/api/evaluations/${evaluationId}`, data);
    },
    onSuccess: (updatedEvaluation: Evaluation) => {
      toast({
        title: 'Evaluation updated',
        description: 'The evaluation has been updated successfully.',
      });
      
      // Important: Set the evaluation data directly to ensure the UI updates
      // This ensures we don't have to wait for the query invalidation to complete
      queryClient.setQueryData(['/api/evaluations', evaluationId], updatedEvaluation);
      
      console.log("Evaluation updated successfully:", updatedEvaluation);
      
      // Also invalidate the queries to ensure data consistency
      queryClient.invalidateQueries({ queryKey: ['/api/evaluations'] });
      queryClient.invalidateQueries({ queryKey: ['/api/evaluations', evaluationId] });
      
      setIsEditing(false);
    },
    onError: () => {
      toast({
        title: 'Update failed',
        description: 'There was an error updating the evaluation. Please try again.',
        variant: 'destructive',
      });
    },
  });

  // Handle save button click
  const handleSave = () => {
    if (!evaluation) return;
    
    updateEvaluationMutation.mutate({
      userPrompt,
      promptId: evaluation.promptId,
      datasetId: evaluation.datasetId
    });
  };
  
  // Delete evaluation mutation
  const deleteEvaluationMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest('DELETE', `/api/evaluations/${evaluationId}`);
    },
    onSuccess: () => {
      toast({
        title: 'Evaluation deleted',
        description: 'The evaluation has been deleted successfully.',
      });
      // Navigate back to the evaluations list
      onBack();
      // Invalidate the evaluations list query
      queryClient.invalidateQueries({ queryKey: ['/api/evaluations'] });
    },
    onError: () => {
      toast({
        title: 'Delete failed',
        description: 'There was an error deleting the evaluation. Please try again.',
        variant: 'destructive',
      });
    },
  });

  // Run evaluation mutation
  const runEvaluationMutation = useMutation({
    mutationFn: async () => {
      // Always fetch the latest evaluation to get the most up-to-date userPrompt
      const latestEvaluation = await fetch(`/api/evaluations/${evaluationId}`)
        .then(res => res.json())
        .catch(err => {
          console.error("Error fetching latest evaluation:", err);
          return evaluation; // Fall back to current evaluation on error
        });
      
      // Use the most recent userPrompt from the refreshed evaluation
      return await apiRequest('POST', `/api/evaluations/${evaluationId}/start`, { 
        userPrompt: latestEvaluation?.userPrompt || evaluation?.userPrompt || '' 
      });
    },
    onSuccess: () => {
      toast({
        title: 'Evaluation started',
        description: 'The evaluation is now being processed. Results will update automatically.',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/evaluations'] });
      queryClient.invalidateQueries({ queryKey: ['/api/evaluations', evaluationId] });
    },
    onError: () => {
      toast({
        title: 'Start failed',
        description: 'There was an error starting the evaluation. Please try again.',
        variant: 'destructive',
      });
    },
  });

  // Function to get status badge
  function getStatusBadge(status: string | null) {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-200">Completed</Badge>;
      case 'in_progress':
        return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-200">In Progress</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-200">Pending</Badge>;
      case 'failed':
        return <Badge className="bg-red-100 text-red-800 hover:bg-red-200">Failed</Badge>;
      default:
        return <Badge variant="outline">{status || 'Unknown'}</Badge>;
    }
  }

  // Function to get dataset item by id
  const getDatasetItem = (id: number) => {
    return datasetItems?.find(item => item.id === id);
  };
  
  // Helper function to safely handle metrics
  const getMetricsEntries = (metrics: unknown): [string, number][] => {
    if (!metrics || typeof metrics !== 'object') return [];
    
    return Object.entries(metrics as Record<string, unknown>)
      .filter((entry): entry is [string, number] => {
        const [key, value] = entry;
        return key !== 'error' && typeof value === 'number';
      });
  };

  // Set initial user prompt state when evaluation is loaded
  useEffect(() => {
    if (evaluation?.userPrompt) {
      setUserPrompt(evaluation.userPrompt);
    }
  }, [evaluation]);

  // If loading, show spinner
  if (evaluationLoading) {
    return (
      <div className="flex justify-center p-8">
        <span className="material-icons animate-spin">refresh</span>
      </div>
    );
  }

  // If evaluation not found, show error
  if (!evaluation) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <p className="text-red-500">Evaluation not found.</p>
          <Button variant="outline" onClick={onBack} className="mt-4">
            <span className="material-icons text-sm mr-1">arrow_back</span>
            Back to Evaluations
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={onBack}>
            <span className="material-icons text-sm mr-1">arrow_back</span>
            Back
          </Button>
          <h2 className="text-2xl font-semibold">Evaluation #{evaluation.id}</h2>
          {getStatusBadge(evaluation.status)}
        </div>
        <div className="flex gap-2">
          {!isEditing ? (
            <>
              <Button 
                variant="outline" 
                onClick={() => onEdit?.(evaluation)}
              >
                <span className="material-icons text-sm mr-1">edit</span>
                Edit
              </Button>
              <Button 
                onClick={() => runEvaluationMutation.mutate()}
                disabled={runEvaluationMutation.isPending || evaluation.status === 'in_progress'}
              >
                <span className="material-icons text-sm mr-1">play_arrow</span>
                {runEvaluationMutation.isPending ? 'Starting...' : 
                 (evaluation.status === 'completed' ? 'Re-run Evaluation' : 'Run Evaluation')}
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => setIsEditing(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={updateEvaluationMutation.isPending}
              >
                {updateEvaluationMutation.isPending ? 'Saving...' : 'Save Changes'}
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Evaluation Summary */}
      <Card>
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle>Evaluation Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-500">Prompt:</span>
                  <span className="font-medium">{prompt?.name || `ID: ${evaluation.promptId}`}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Dataset:</span>
                  <span className="font-medium">{dataset?.name || `ID: ${evaluation.datasetId}`}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Created:</span>
                  <span className="font-medium">
                    {evaluation.createdAt 
                      ? formatDistanceToNow(new Date(evaluation.createdAt), { addSuffix: true })
                      : "Unknown"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Completed:</span>
                  <span className="font-medium">
                    {evaluation.completedAt 
                      ? formatDistanceToNow(new Date(evaluation.completedAt), { addSuffix: true })
                      : "Not completed"}
                  </span>
                </div>
              </div>
            
              <div className="space-y-2">
                {isEditing ? (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="userPrompt">User Prompt</Label>
                      <Textarea
                        id="userPrompt"
                        value={userPrompt}
                        onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setUserPrompt(e.target.value)}
                        placeholder="Enter the user prompt that will replace the placeholder"
                        className="min-h-[80px]"
                      />
                      <p className="text-xs text-gray-500">
                        This will be used to replace placeholders in the meta prompt
                      </p>
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col">
                    <span className="text-gray-500 mb-1">User Prompt:</span>
                    <span className="font-medium text-sm bg-gray-50 p-2 rounded break-words">
                      {evaluation.userPrompt || "None"}
                    </span>
                  </div>
                )}
              </div>
            </div>
            
            {!isEditing && (
              <div className="pt-2">
                <div className="text-gray-500 mb-1">Final Prompt:</div>
                <div className="bg-gray-50 p-3 rounded-md overflow-auto max-h-56">
                  <span className="font-medium text-sm break-words whitespace-pre-wrap">
                    {evaluation.finalPrompt || "No final prompt available"}
                  </span>
                </div>
              </div>
            )}
          
            {evaluation.status === 'completed' && evaluation.score !== null && (
              <div className="mt-6 border-t pt-4">
                <div className="text-center">
                  <div className="text-2xl font-bold">{evaluation.score}%</div>
                  <div className="mt-2">
                    <Progress value={evaluation.score} className="h-2 w-full max-w-md mx-auto" />
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 max-w-md mx-auto">
                    {(() => {
                      const metricsEntries = getMetricsEntries(evaluation.metrics);
                      
                      if (metricsEntries.length === 0) {
                        return (
                          <div className="col-span-4 text-center text-gray-500">No metrics available</div>
                        );
                      }
                      
                      return metricsEntries.map(([key, value]) => (
                        <div key={key} className="text-center">
                          <div className="text-sm text-gray-500 capitalize">{key}</div>
                          <div className="font-semibold">{Math.round(value * 100)}%</div>
                        </div>
                      ));
                    })()}
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Results Table */}
      <div>
        <h3 className="text-lg font-medium mb-4">Evaluation Results</h3>
        
        {resultsLoading ? (
          <div className="flex justify-center p-8">
            <span className="material-icons animate-spin">refresh</span>
          </div>
        ) : !results || results.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <p className="text-gray-500">
                {evaluation.status === 'pending' 
                  ? 'This evaluation has not been run yet. Click the "Run Evaluation" button to start.' 
                  : evaluation.status === 'in_progress' 
                    ? 'Evaluation is in progress. Results will appear here when complete.'
                    : 'No results found for this evaluation.'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item #</TableHead>
                  <TableHead>Input</TableHead>
                  <TableHead>Generated Response</TableHead>
                  <TableHead>Expected Response</TableHead>
                  <TableHead>Valid</TableHead>
                  <TableHead>Score</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {results.map((result) => {
                  const datasetItem = getDatasetItem(result.datasetItemId);
                  return (
                    <TableRow 
                      key={result.id}
                      className="cursor-pointer hover:bg-gray-50"
                      onClick={() => setSelectedResult(result)}
                    >
                      <TableCell className="font-medium">{result.datasetItemId}</TableCell>
                      <TableCell>
                        {/* Text input type */}
                        {datasetItem?.inputType === 'text' && (
                          <div className="line-clamp-2 text-sm">
                            {datasetItem.inputText}
                          </div>
                        )}
                        
                        {/* Image input type */}
                        {datasetItem?.inputType === 'image' && datasetItem.inputImage && (
                          <div className="h-12 w-12 relative">
                            <img 
                              src={datasetItem.inputImage} 
                              alt="Input" 
                              className="h-full w-full object-cover rounded"
                              onError={(e) => {
                                e.currentTarget.src = '';
                                const parent = e.currentTarget.parentElement;
                                if (parent) {
                                  parent.innerHTML = '<span class="material-icons text-gray-400">broken_image</span>';
                                }
                              }}
                            />
                          </div>
                        )}
                        
                        {/* PDF input type */}
                        {datasetItem?.inputType === 'pdf' && datasetItem.inputPdf && (
                          <div className="flex items-center">
                            <span className="material-icons text-red-600 mr-2 text-lg">
                              picture_as_pdf
                            </span>
                            <div className="text-sm font-medium">{datasetItem.inputPdf}</div>
                          </div>
                        )}
                        
                        {/* No input data case */}
                        {(!datasetItem?.inputType || 
                          (datasetItem.inputType === 'image' && !datasetItem.inputImage) ||
                          (datasetItem.inputType === 'pdf' && !datasetItem.inputPdf) ||
                          (datasetItem.inputType === 'text' && !datasetItem.inputText)) && (
                          <div className="text-sm text-gray-500">No input data</div>
                        )}
                      </TableCell>
                      <TableCell className="max-w-xs">
                        <div className="truncate">{result.generatedResponse || "N/A"}</div>
                      </TableCell>
                      <TableCell className="max-w-xs">
                        <div className="truncate">{datasetItem?.validResponse || "N/A"}</div>
                      </TableCell>
                      <TableCell>
                        {result.isValid === true && (
                          <Badge className="bg-green-100 text-green-800">Valid</Badge>
                        )}
                        {result.isValid === false && (
                          <Badge className="bg-red-100 text-red-800">Invalid</Badge>
                        )}
                        {result.isValid === null && (
                          <Badge variant="outline">Unknown</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {result.score !== null ? `${result.score}%` : "N/A"}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Response Comparison Modal */}
      {selectedResult && (
        <ResponseComparisonModal
          isOpen={!!selectedResult}
          onClose={() => setSelectedResult(null)}
          generatedResponse={selectedResult.generatedResponse || ''}
          expectedResponse={getDatasetItem(selectedResult.datasetItemId)?.validResponse || ''}
          feedback={selectedResult.feedback || ''}
          isValid={selectedResult.isValid || false}
          score={selectedResult.score || 0}
          title={`Evaluation Result #${selectedResult.id}`}
        />
      )}
    </div>
  );
}