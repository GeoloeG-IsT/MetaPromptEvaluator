import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Evaluation, Prompt } from "@shared/schema";
import { formatDistanceToNow } from "date-fns";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import EvaluationDialog from "@/components/EvaluationDialog";
import EvaluationDetail from "@/components/EvaluationDetail";

export default function Evaluations() {
  const [isEvaluationDialogOpen, setIsEvaluationDialogOpen] = useState(false);
  const [selectedPrompt, setSelectedPrompt] = useState<Prompt | null>(null);
  const [selectedEvaluationId, setSelectedEvaluationId] = useState<number | null>(null);
  
  const { data: evaluations, isLoading } = useQuery<Evaluation[]>({
    queryKey: ["/api/evaluations"],
  });
  
  // Fetch prompts for the dialog
  const { data: prompts = [] } = useQuery<Prompt[]>({
    queryKey: ["/api/prompts"],
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
        <div className="flex space-x-2">
          <Button variant="outline">
            <span className="material-icons text-sm mr-1">filter_list</span>
            Filter
          </Button>
          <Button variant="outline">
            <span className="material-icons text-sm mr-1">sort</span>
            Sort
          </Button>
        </div>
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
      {selectedPrompt && (
        <EvaluationDialog
          isOpen={isEvaluationDialogOpen}
          onClose={() => setIsEvaluationDialogOpen(false)}
          prompt={selectedPrompt}
        />
      )}
    </div>
  );
}
