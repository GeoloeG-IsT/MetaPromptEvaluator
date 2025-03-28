import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Evaluation, Prompt } from "@shared/schema";
import { formatDistanceToNow } from "date-fns";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger 
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import EvaluationDialog from "@/components/EvaluationDialog";
import EvaluationDetail from "@/components/EvaluationDetail";

export default function Evaluations() {
  const [isEvaluationDialogOpen, setIsEvaluationDialogOpen] = useState(false);
  const [selectedPrompt, setSelectedPrompt] = useState<Prompt | undefined>(undefined);
  const [selectedEvaluationId, setSelectedEvaluationId] = useState<number | null>(null);
  const [selectedEvaluation, setSelectedEvaluation] = useState<Evaluation | undefined>(undefined);
  const { toast } = useToast();
  
  // Fetch evaluations with polling enabled when there are in-progress evaluations
  const { data: evaluations, isLoading } = useQuery<Evaluation[]>({
    queryKey: ["/api/evaluations"],
    // Poll every 3 seconds to check for updates on in-progress evaluations
    refetchInterval: 3000,
  });
  
  // Fetch prompts for the dialog
  const { data: prompts = [] } = useQuery<Prompt[]>({
    queryKey: ["/api/prompts"],
  });
  
  // Delete evaluation mutation
  const deleteEvaluationMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest('DELETE', `/api/evaluations/${id}`);
    },
    onSuccess: () => {
      toast({
        title: 'Evaluation deleted',
        description: 'The evaluation has been successfully deleted.',
      });
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
    mutationFn: async (data: { id: number, userPrompt: string }) => {
      // Fetch the latest version of the evaluation first
      const latestEvaluation = await fetch(`/api/evaluations/${data.id}`)
        .then(res => res.json())
        .catch(err => {
          console.error("Error fetching latest evaluation:", err);
          return null; // Return null on error
        });
      
      // Use the latest userPrompt if available, otherwise fall back to the provided one
      const userPrompt = latestEvaluation?.userPrompt || data.userPrompt;
      console.log(`Starting evaluation ${data.id} with userPrompt:`, userPrompt);
      
      return await apiRequest('POST', `/api/evaluations/${data.id}/start`, { userPrompt });
    },
    onSuccess: (data, variables) => {
      toast({
        title: 'Evaluation started',
        description: 'The evaluation is now being processed. Results will update automatically.',
      });
      
      // Invalidate all relevant queries to ensure fresh data
      // Main evaluations list
      queryClient.invalidateQueries({ queryKey: ['/api/evaluations'] });
      
      // This specific evaluation and its results
      queryClient.invalidateQueries({ queryKey: ['/api/evaluations', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['/api/evaluations', variables.id, 'results'] });
    },
    onError: () => {
      toast({
        title: 'Start failed',
        description: 'There was an error starting the evaluation. Please try again.',
        variant: 'destructive',
      });
    },
  });

  // Group evaluations by status
  const completed = evaluations?.filter(e => e.status === 'completed') || [];
  const inProgress = evaluations?.filter(e => e.status === 'in_progress' || e.status === 'pending') || [];
  const failed = evaluations?.filter(e => e.status === 'failed') || [];
  
  const viewEvaluation = (evaluationId: number) => {
    setSelectedEvaluationId(evaluationId);
  };
  
  const closeEvaluationDetail = () => {
    setSelectedEvaluationId(null);
  };
  
  // Function to open the edit dialog
  const openEditDialog = (evaluation: Evaluation) => {
    // Make sure we have the full evaluation data before editing
    setSelectedEvaluation(evaluation);
    // Clear the selected prompt to avoid conflicts
    setSelectedPrompt(undefined);
    // Show the evaluation dialog (same as for creating)
    setIsEvaluationDialogOpen(true);
  };
  
  // Close the dialog and reset selection
  const closeDialog = () => {
    setIsEvaluationDialogOpen(false);
    setSelectedEvaluation(undefined);
    setSelectedPrompt(undefined);
  };

  function getStatusBadge(status: string) {
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
        return <Badge variant="outline">{status}</Badge>;
    }
  }

  // If we're viewing a specific evaluation, show the detail view
  if (selectedEvaluationId) {
    return (
      <EvaluationDetail 
        evaluationId={selectedEvaluationId} 
        onBack={closeEvaluationDetail}
        onEdit={(evaluation) => {
          setSelectedEvaluation(evaluation);
          setSelectedEvaluationId(null);
          setIsEvaluationDialogOpen(true);
        }}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-dark">Evaluations</h2>
        <p className="text-gray-500">Track and manage your prompt evaluations</p>
      </div>

      <div className="flex justify-between">
        <div></div>
        <Button onClick={() => {
          if (prompts.length > 0) {
            setSelectedPrompt(prompts[0]);
            setIsEvaluationDialogOpen(true);
          }
        }}>
          <span className="material-icons text-sm mr-1">add</span>
          New Evaluation
        </Button>
      </div>

      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all">All ({evaluations?.length || 0})</TabsTrigger>
          <TabsTrigger value="completed">Completed ({completed.length})</TabsTrigger>
          <TabsTrigger value="in-progress">In Progress ({inProgress.length})</TabsTrigger>
          <TabsTrigger value="failed">Failed ({failed.length})</TabsTrigger>
        </TabsList>
        
        <TabsContent value="all" className="mt-4">
          {isLoading ? (
            <div className="flex justify-center p-8">
              <span className="material-icons animate-spin">refresh</span>
            </div>
          ) : (
            evaluations?.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <p className="text-gray-500">No evaluations found. Start by creating a new evaluation.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {evaluations?.map((evaluation) => (
                  <Card key={evaluation.id}>
                    <CardHeader className="p-4 pb-2">
                      <div className="flex justify-between items-center">
                        <CardTitle className="text-lg">Evaluation #{evaluation.id}</CardTitle>
                        {getStatusBadge(evaluation.status || 'pending')}
                      </div>
                    </CardHeader>
                    <CardContent className="p-4 pt-0">
                      <div className="flex flex-col md:flex-row justify-between mb-2">
                        <div className="text-sm text-gray-500">
                          Prompt ID: {evaluation.promptId}
                        </div>
                        <div className="text-sm text-gray-500">
                          Dataset ID: {evaluation.datasetId}
                        </div>
                        <div className="text-sm text-gray-500">
                          {evaluation.createdAt 
                            ? formatDistanceToNow(new Date(evaluation.createdAt), { addSuffix: true })
                            : "Unknown date"}
                        </div>
                      </div>
                      
                      <div className="flex justify-between items-center mt-4">
                        <div className="flex items-center">
                          <span className="text-lg font-semibold mr-2">
                            {evaluation.score !== null ? `${evaluation.score}%` : '--'}
                          </span>
                          {evaluation.score !== null && (
                            <Progress value={evaluation.score} className="w-24 h-2" />
                          )}
                        </div>
                        <div className="flex space-x-2">
                          {evaluation.status !== 'in_progress' && (
                            <>
                              <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={() => openEditDialog(evaluation)}
                              >
                                <span className="material-icons text-sm mr-1">edit</span>
                                Edit
                              </Button>
                              <Button 
                                variant={evaluation.status === 'completed' ? "outline" : "default"}
                                size="sm" 
                                onClick={() => runEvaluationMutation.mutate({
                                  id: evaluation.id,
                                  userPrompt: evaluation.userPrompt || ''
                                })}
                                disabled={runEvaluationMutation.isPending}
                              >
                                <span className="material-icons text-sm mr-1">play_arrow</span>
                                {runEvaluationMutation.isPending ? 'Running...' : 
                                 (evaluation.status === 'completed' ? 'Re-run' : 'Run')}
                              </Button>
                            </>
                          )}
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="border-red-200 text-red-600 hover:bg-red-50"
                              >
                                <span className="material-icons text-sm mr-1">delete</span>
                                Delete
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This will permanently delete this evaluation and all its results.
                                  This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => deleteEvaluationMutation.mutate(evaluation.id)}
                                  className="bg-red-600 hover:bg-red-700"
                                  disabled={deleteEvaluationMutation.isPending}
                                >
                                  {deleteEvaluationMutation.isPending ? 'Deleting...' : 'Delete Evaluation'}
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                          <Button variant="outline" size="sm" onClick={() => viewEvaluation(evaluation.id)}>
                            <span className="material-icons text-sm mr-1">visibility</span>
                            View Details
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )
          )}
        </TabsContent>
        
        <TabsContent value="completed" className="mt-4">
          {completed.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <p className="text-gray-500">No completed evaluations found.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {completed.map((evaluation) => (
                <Card key={evaluation.id}>
                  <CardHeader className="p-4 pb-2">
                    <div className="flex justify-between items-center">
                      <CardTitle className="text-lg">Evaluation #{evaluation.id}</CardTitle>
                      {getStatusBadge(evaluation.status || 'completed')}
                    </div>
                  </CardHeader>
                  <CardContent className="p-4 pt-0">
                    <div className="flex flex-col md:flex-row justify-between mb-2">
                      <div className="text-sm text-gray-500">
                        Prompt ID: {evaluation.promptId}
                      </div>
                      <div className="text-sm text-gray-500">
                        Dataset ID: {evaluation.datasetId}
                      </div>
                      <div className="text-sm text-gray-500">
                        {evaluation.createdAt 
                          ? formatDistanceToNow(new Date(evaluation.createdAt), { addSuffix: true })
                          : "Unknown date"}
                      </div>
                    </div>
                    
                    <div className="flex justify-between items-center mt-4">
                      <div className="flex items-center">
                        <span className="text-lg font-semibold mr-2">
                          {evaluation.score !== null ? `${evaluation.score}%` : '--'}
                        </span>
                        {evaluation.score !== null && (
                          <Progress value={evaluation.score} className="w-24 h-2" />
                        )}
                      </div>
                      <div className="flex space-x-2">
                        {evaluation.status !== 'in_progress' && (
                          <>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={() => openEditDialog(evaluation)}
                            >
                              <span className="material-icons text-sm mr-1">edit</span>
                              Edit
                            </Button>
                            <Button 
                              variant={evaluation.status === 'completed' ? "outline" : "default"}
                              size="sm" 
                              onClick={() => runEvaluationMutation.mutate({
                                id: evaluation.id,
                                userPrompt: evaluation.userPrompt || ''
                              })}
                              disabled={runEvaluationMutation.isPending}
                            >
                              <span className="material-icons text-sm mr-1">play_arrow</span>
                              {runEvaluationMutation.isPending ? 'Running...' : 
                               (evaluation.status === 'completed' ? 'Re-run' : 'Run')}
                            </Button>
                          </>
                        )}
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="border-red-200 text-red-600 hover:bg-red-50"
                            >
                              <span className="material-icons text-sm mr-1">delete</span>
                              Delete
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will permanently delete this evaluation and all its results.
                                This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => deleteEvaluationMutation.mutate(evaluation.id)}
                                className="bg-red-600 hover:bg-red-700"
                                disabled={deleteEvaluationMutation.isPending}
                              >
                                {deleteEvaluationMutation.isPending ? 'Deleting...' : 'Delete Evaluation'}
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                        <Button variant="outline" size="sm" onClick={() => viewEvaluation(evaluation.id)}>
                          <span className="material-icons text-sm mr-1">visibility</span>
                          View Details
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="in-progress" className="mt-4">
          {inProgress.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <p className="text-gray-500">No in-progress evaluations found.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {inProgress.map((evaluation) => (
                <Card key={evaluation.id}>
                  <CardHeader className="p-4 pb-2">
                    <div className="flex justify-between items-center">
                      <CardTitle className="text-lg">Evaluation #{evaluation.id}</CardTitle>
                      {getStatusBadge(evaluation.status || 'in_progress')}
                    </div>
                  </CardHeader>
                  <CardContent className="p-4 pt-0">
                    <div className="flex flex-col md:flex-row justify-between mb-2">
                      <div className="text-sm text-gray-500">
                        Prompt ID: {evaluation.promptId}
                      </div>
                      <div className="text-sm text-gray-500">
                        Dataset ID: {evaluation.datasetId}
                      </div>
                      <div className="text-sm text-gray-500">
                        {evaluation.createdAt 
                          ? formatDistanceToNow(new Date(evaluation.createdAt), { addSuffix: true })
                          : "Unknown date"}
                      </div>
                    </div>
                    <div className="flex justify-end mt-4">
                      <Button variant="outline" size="sm" onClick={() => viewEvaluation(evaluation.id)}>
                        <span className="material-icons text-sm mr-1">visibility</span>
                        View Details
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="failed" className="mt-4">
          {failed.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <p className="text-gray-500">No failed evaluations found.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {failed.map((evaluation) => (
                <Card key={evaluation.id}>
                  <CardHeader className="p-4 pb-2">
                    <div className="flex justify-between items-center">
                      <CardTitle className="text-lg">Evaluation #{evaluation.id}</CardTitle>
                      {getStatusBadge(evaluation.status || 'failed')}
                    </div>
                  </CardHeader>
                  <CardContent className="p-4 pt-0">
                    <div className="flex flex-col md:flex-row justify-between mb-2">
                      <div className="text-sm text-gray-500">
                        Prompt ID: {evaluation.promptId}
                      </div>
                      <div className="text-sm text-gray-500">
                        Dataset ID: {evaluation.datasetId}
                      </div>
                      <div className="text-sm text-gray-500">
                        {evaluation.createdAt 
                          ? formatDistanceToNow(new Date(evaluation.createdAt), { addSuffix: true })
                          : "Unknown date"}
                      </div>
                    </div>
                    
                    <div className="mt-2 text-red-500 text-sm">
                      {((evaluation.metrics as any)?.error) || "Unknown error"}
                    </div>
                    
                    <div className="flex justify-end mt-4">
                      <Button 
                        variant="default"
                        size="sm" 
                        onClick={() => runEvaluationMutation.mutate({
                          id: evaluation.id,
                          userPrompt: evaluation.userPrompt || ''
                        })}
                        disabled={runEvaluationMutation.isPending}
                        className="mr-2"
                      >
                        <span className="material-icons text-sm mr-1">play_arrow</span>
                        {runEvaluationMutation.isPending ? 'Running...' : 'Run Again'}
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => viewEvaluation(evaluation.id)}>
                        <span className="material-icons text-sm mr-1">visibility</span>
                        View Details
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
      
      {/* EvaluationDialog component */}
      <EvaluationDialog
        isOpen={isEvaluationDialogOpen}
        onClose={closeDialog}
        selectedPrompt={selectedPrompt}
        evaluation={selectedEvaluation}
      />
    </div>
  );
}
