import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Prompt } from "@shared/schema";
import PromptTable from "@/components/PromptTable";
import MetaPromptDialog from "@/components/MetaPromptDialog";

export default function Dashboard() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  
  const { data: prompts, isLoading: promptsLoading } = useQuery<Prompt[]>({
    queryKey: ["/api/prompts"],
  });
  
  const handleCreateNewPrompt = () => {
    setIsCreateDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h2 className="text-2xl font-semibold text-dark">Meta Prompts</h2>
        <p className="text-gray-500">Manage your meta prompts</p>
      </div>
      
      {/* Meta Prompts Table */}
      <PromptTable 
        prompts={prompts || []} 
        onCreateNew={handleCreateNewPrompt} 
      />
      
      {/* Create Meta Prompt Dialog */}
      <MetaPromptDialog
        isOpen={isCreateDialogOpen}
        onClose={() => setIsCreateDialogOpen(false)}
      />
    </div>
  );
}
