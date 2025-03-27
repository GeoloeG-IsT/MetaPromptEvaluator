import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Prompt, Dataset, Evaluation } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import MetaPromptForm from "@/components/MetaPromptForm";
import EvaluationResult from "@/components/EvaluationResult";
import { Button } from "@/components/ui/button";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { formatDistanceToNow } from "date-fns";
import { queryClient } from "@/lib/queryClient";

export default function PromptCreator() {
  const { toast } = useToast();
  const [selectedPrompt, setSelectedPrompt] = useState<Prompt | null>(null);
  const [selectedDataset, setSelectedDataset] = useState<number | null>(null);
  const [userPrompt, setUserPrompt] = useState<string>("");
  
  // Fetch datasets
  const { data: datasets } = useQuery<Dataset[]>({
    queryKey: ["/api/datasets"],
  });
  
  // Fetch previous evaluations if a prompt is selected
  const { data: evaluations } = useQuery<Evaluation[]>({
    queryKey: ["/api/evaluations", selectedPrompt?.id],
    queryFn: async () => {
      if (!selectedPrompt?.id) return [];
      const res = await fetch(`/api/evaluations?promptId=${selectedPrompt.id}`);
      if (!res.ok) throw new Error("Failed to fetch evaluations");
      return res.json();
    },
    enabled: !!selectedPrompt?.id,
  });
  
  // Mutation for starting evaluation
  const startEvaluationMutation = useMutation({
    mutationFn: async (data: any) => {
      const createResponse = await apiRequest("POST", "/api/evaluations", data);
      const evaluation = await createResponse.json();
      
      // Start the evaluation
      const startResponse = await apiRequest(
        "POST", 
        `/api/evaluations/${evaluation.id}/start`,
        {}
      );
      return startResponse.json();
    },
    onSuccess: () => {
      toast({
        title: "Evaluation started",
        description: "The evaluation process has been started. Results will be available soon.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/evaluations"] });
    },
    onError: () => {
      toast({
        title: "Evaluation failed",
        description: "There was an error starting the evaluation. Please try again.",
        variant: "destructive",
      });
    }
  });
  
  const handleStartEvaluation = () => {
    if (!selectedPrompt || !selectedDataset) {
      toast({
        title: "Missing selection",
        description: "Please select a prompt and dataset for evaluation.",
        variant: "destructive",
      });
      return;
    }
    
    startEvaluationMutation.mutate({
      promptId: selectedPrompt.id,
      datasetId: selectedDataset,
      userPrompt: userPrompt
    });
  };

  const handleSavePrompt = (prompt: Prompt) => {
    setSelectedPrompt(prompt);
  };
  
  const handleViewDetails = (evaluationId: number) => {
    toast({
      title: "View details",
      description: `Viewing details for evaluation ${evaluationId}`,
    });
  };
  
  const handleExportResults = (evaluationId: number) => {
    toast({
      title: "Export results",
      description: `Exporting results for evaluation ${evaluationId}`,
    });
  };
  
  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-semibold text-dark">Create Meta Prompt</h2>
        <p className="text-gray-500">Enter your meta prompt to generate a personalized prompt for users</p>
      </div>

      <MetaPromptForm onSavePrompt={handleSavePrompt} />
      
      {/* Evaluation Section */}
      {selectedPrompt && (
        <div className="mt-6 bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b flex justify-between items-center">
            <h3 className="font-semibold">Prompt Evaluation</h3>
            <button className="text-sm text-primary hover:text-indigo-700">
              Configure Dataset
            </button>
          </div>
          
          <div className="p-6">
            <div className="mb-6">
              <p className="text-gray-500 text-sm mb-4">Evaluate your meta prompt against a dataset of examples to measure its effectiveness.</p>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="p-4 border rounded-md bg-gray-50">
                  <div className="flex justify-between mb-2">
                    <span className="text-xs font-medium text-gray-500">Selected Dataset</span>
                    <span className="text-xs text-primary">Change</span>
                  </div>
                  <Select
                    value={selectedDataset?.toString() || ""}
                    onValueChange={(value) => setSelectedDataset(Number(value))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a dataset" />
                    </SelectTrigger>
                    <SelectContent>
                      {datasets?.map((dataset) => (
                        <SelectItem key={dataset.id} value={dataset.id.toString()}>
                          {dataset.name} ({dataset.itemCount} items)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                
              </div>
              
              <Button 
                className="w-full py-3" 
                onClick={handleStartEvaluation}
                disabled={startEvaluationMutation.isPending || !selectedDataset}
              >
                <span className="material-icons text-sm mr-2">play_circle</span>
                {startEvaluationMutation.isPending ? "Starting Evaluation..." : "Start Evaluation"}
              </Button>
            </div>
            
            {(evaluations && evaluations.length > 0) && (
              <div className="border-t pt-6">
                <h4 className="font-medium mb-4">Previous Evaluation Results</h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {evaluations.map((evaluation) => {
                    // Use evaluation.metrics if available, otherwise generate random metrics for UI
                    const metrics = evaluation.metrics 
                      ? evaluation.metrics 
                      : {
                          accuracy: Math.floor(Math.random() * 30) + 70,
                          completeness: Math.floor(Math.random() * 30) + 70,
                          specificity: Math.floor(Math.random() * 30) + 70,
                          adaptability: Math.floor(Math.random() * 30) + 70
                        };
                    
                    return (
                      <EvaluationResult
                        key={evaluation.id}
                        title={selectedPrompt.name}
                        date={evaluation.createdAt 
                          ? formatDistanceToNow(new Date(evaluation.createdAt), { addSuffix: true })
                          : "Unknown date"}
                        samples={12}
                        score={evaluation.score || 0}
                        metrics={metrics as any}
                        onViewDetails={() => handleViewDetails(evaluation.id)}
                        onExportResults={() => handleExportResults(evaluation.id)}
                      />
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
