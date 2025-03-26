import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Evaluation, EvaluationResult, Prompt, Dataset, DatasetItem } from '@shared/schema';
import { formatDistanceToNow } from 'date-fns';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface EvaluationDetailProps {
  evaluationId: number;
  onBack: () => void;
}

export default function EvaluationDetail({ evaluationId, onBack }: EvaluationDetailProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [validationMethod, setValidationMethod] = useState('');
  const [priority, setPriority] = useState('');
  
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

  // Set initial form values when evaluation data is loaded
  useEffect(() => {
    if (evaluation) {
      setValidationMethod(evaluation.validationMethod || 'Comprehensive');
      setPriority(evaluation.priority || 'Balanced');
    }
  }, [evaluation]);

  // Update evaluation mutation
  const updateEvaluationMutation = useMutation({
    mutationFn: async (data: Partial<Evaluation>) => {
      return await apiRequest('PUT', `/api/evaluations/${evaluationId}`, data);
    },
    onSuccess: () => {
      toast({
        title: 'Evaluation updated',
        description: 'The evaluation has been updated successfully.',
      });
      setIsEditing(false);
      queryClient.invalidateQueries({ queryKey: ['/api/evaluations'] });
      queryClient.invalidateQueries({ queryKey: ['/api/evaluations', evaluationId] });
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
    updateEvaluationMutation.mutate({
      validationMethod,
      priority
    });
  };

  // Run evaluation mutation
  const runEvaluationMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest('POST', `/api/evaluations/${evaluationId}/start`, { userPrompt: '' });
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
              <Button variant="outline" onClick={() => setIsEditing(true)}>
                <span className="material-icons text-sm mr-1">edit</span>
                Edit
              </Button>
              {(evaluation.status === 'pending' || evaluation.status === 'failed') && (
                <Button 
                  onClick={() => runEvaluationMutation.mutate()}
                  disabled={runEvaluationMutation.isPending}
                >
                  <span className="material-icons text-sm mr-1">play_arrow</span>
                  {runEvaluationMutation.isPending ? 'Starting...' : 'Run Evaluation'}
                </Button>
              )}
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
        <CardHeader className="pb-2">
          <CardTitle>Evaluation Summary</CardTitle>
        </CardHeader>
        <CardContent>
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
            </div>
            
            <div className="space-y-2">
              {isEditing ? (
                <>
                  <div className="space-y-1">
                    <Label htmlFor="validationMethod">Validation Method</Label>
                    <Select
                      value={validationMethod}
                      onValueChange={setValidationMethod}
                    >
                      <SelectTrigger id="validationMethod">
                        <SelectValue placeholder="Select method" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Comprehensive">Comprehensive Evaluation</SelectItem>
                        <SelectItem value="Semantic">Semantic Similarity</SelectItem>
                        <SelectItem value="Output Format">Output Format Validation</SelectItem>
                        <SelectItem value="Content Quality">Content Quality Assessment</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="priority">Priority</Label>
                    <Select
                      value={priority}
                      onValueChange={setPriority}
                    >
                      <SelectTrigger id="priority">
                        <SelectValue placeholder="Select priority" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Balanced">Balanced</SelectItem>
                        <SelectItem value="Speed (Fast, Less Accurate)">Speed (Fast, Less Accurate)</SelectItem>
                        <SelectItem value="Accuracy (Slower, More Precise)">Accuracy (Slower, More Precise)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Validation Method:</span>
                    <span className="font-medium">{evaluation.validationMethod}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Priority:</span>
                    <span className="font-medium">{evaluation.priority}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Completed:</span>
                    <span className="font-medium">
                      {evaluation.completedAt 
                        ? formatDistanceToNow(new Date(evaluation.completedAt), { addSuffix: true })
                        : "Not completed"}
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>
          
          {evaluation.status === 'completed' && evaluation.score !== null && (
            <div className="mt-6 border-t pt-4">
              <div className="text-center">
                <div className="text-2xl font-bold">{evaluation.score}%</div>
                <div className="mt-2">
                  <Progress value={evaluation.score} className="h-2 w-full max-w-md mx-auto" />
                </div>
                {evaluation.metrics && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 max-w-md mx-auto">
                    {Object.entries(evaluation.metrics as Record<string, number | string>).map(([key, value]) => (
                      typeof value === 'number' && key !== 'error' && (
                        <div key={key} className="text-center">
                          <div className="text-sm text-gray-500 capitalize">{key}</div>
                          <div className="font-semibold">{Math.round(value * 100)}%</div>
                        </div>
                      )
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
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
                    <TableRow key={result.id}>
                      <TableCell className="font-medium">{result.datasetItemId}</TableCell>
                      <TableCell>
                        {datasetItem?.inputType === 'text' ? (
                          <div className="max-w-xs truncate">{datasetItem.inputText}</div>
                        ) : datasetItem?.inputImage ? (
                          <div className="w-16 h-16 bg-gray-100 rounded flex items-center justify-center overflow-hidden">
                            <img 
                              src={datasetItem.inputImage} 
                              alt="Input" 
                              className="max-h-full max-w-full object-cover"
                              onError={(e) => {
                                e.currentTarget.src = '';
                                const parent = e.currentTarget.parentElement;
                                if (parent) {
                                  parent.innerHTML = '<span class="material-icons text-gray-400">broken_image</span>';
                                }
                              }}
                            />
                          </div>
                        ) : (
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
    </div>
  );
}