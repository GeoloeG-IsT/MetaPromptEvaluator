import { useState } from 'react';
import { Prompt } from '@shared/schema';
import { formatDistanceToNow } from 'date-fns';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import MetaPromptDialog from './MetaPromptDialog';
import EvaluationDialog from './EvaluationDialog';

interface PromptTableProps {
  prompts: Prompt[];
  onCreateNew: () => void;
  onEvaluate?: (prompt: Prompt) => void;
}

// Category badges removed as requested

export default function PromptTable({ prompts, onCreateNew, onEvaluate }: PromptTableProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Dialog states
  const [selectedPrompt, setSelectedPrompt] = useState<Prompt | undefined>(undefined);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isEvaluateDialogOpen, setIsEvaluateDialogOpen] = useState(false);

  // Delete prompt mutation
  const deletePromptMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest('DELETE', `/api/prompts/${id}`);
      return response;
    },
    onSuccess: () => {
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({queryKey: ['/api/prompts']});
      queryClient.invalidateQueries({queryKey: ['/api/dashboard/recent']});
      queryClient.invalidateQueries({queryKey: ['/api/dashboard/stats']});
      
      toast({
        title: 'Meta prompt deleted',
        description: 'The meta prompt has been deleted successfully.',
      });
      
      setIsDeleteDialogOpen(false);
    },
    onError: () => {
      toast({
        title: 'Delete failed',
        description: 'There was an error deleting the meta prompt. Please try again.',
        variant: 'destructive',
      });
    },
  });

  const handleEdit = (prompt: Prompt) => {
    setSelectedPrompt(prompt);
    setIsEditDialogOpen(true);
  };

  const handleDelete = (prompt: Prompt) => {
    setSelectedPrompt(prompt);
    setIsDeleteDialogOpen(true);
  };

  const handleEvaluate = (prompt: Prompt) => {
    if (onEvaluate) {
      // Use the prop function if provided (from Dashboard)
      onEvaluate(prompt);
    } else {
      // Use the local dialog otherwise
      setSelectedPrompt(prompt);
      setIsEvaluateDialogOpen(true);
    }
  };

  const confirmDelete = () => {
    if (selectedPrompt) {
      deletePromptMutation.mutate(selectedPrompt.id);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="px-6 py-4 border-b flex justify-between items-center">
        <h3 className="font-semibold">Meta Prompts</h3>
        <Button size="sm" onClick={onCreateNew}>
          <span className="material-icons text-sm mr-1">add</span>
          New Meta Prompt
        </Button>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {prompts.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-6 py-4 text-center text-gray-500">
                  No meta prompts found. Create one to get started.
                </td>
              </tr>
            ) : (
              prompts.map((prompt) => (
                <tr key={prompt.id}>
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-dark">{prompt.name}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {prompt.createdAt
                      ? formatDistanceToNow(new Date(prompt.createdAt), { addSuffix: true })
                      : 'Unknown'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-green-600 hover:text-green-800 mr-1"
                      onClick={() => handleEvaluate(prompt)}
                      title="Evaluate prompt"
                    >
                      <span className="material-icons text-sm">assessment</span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-slate-600 hover:text-slate-900"
                      onClick={() => handleEdit(prompt)}
                      title="Edit prompt"
                    >
                      <span className="material-icons text-sm">edit</span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-500 hover:text-red-700"
                      onClick={() => handleDelete(prompt)}
                      title="Delete prompt"
                    >
                      <span className="material-icons text-sm">delete</span>
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Edit Meta Prompt Dialog */}
      <MetaPromptDialog
        isOpen={isEditDialogOpen}
        onClose={() => setIsEditDialogOpen(false)}
        existingPrompt={selectedPrompt}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the meta prompt.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDelete}
              className="bg-red-500 hover:bg-red-600"
            >
              {deletePromptMutation.isPending ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Evaluate Dialog */}
      {selectedPrompt && (
        <EvaluationDialog
          isOpen={isEvaluateDialogOpen}
          onClose={() => setIsEvaluateDialogOpen(false)}
          prompt={selectedPrompt}
        />
      )}
    </div>
  );
}