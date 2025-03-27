import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";

interface AirtableImportDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AirtableImportDialog({
  isOpen,
  onClose,
}: AirtableImportDialogProps) {
  const { toast } = useToast();
  const [airtableUrl, setAirtableUrl] = useState("");

  const importMutation = useMutation({
    mutationFn: async (url: string) => {
      const response = await apiRequest("POST", "/api/import/airtable", {
        airtableUrl: url,
      });
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Import successful",
        description: `Imported ${data.dataset.itemCount} items into dataset "${data.dataset.name}"`,
      });
      // Invalidate datasets cache to refresh the list
      queryClient.invalidateQueries({ queryKey: ["/api/datasets"] });
      onClose();
    },
    onError: (error: Error) => {
      toast({
        title: "Import failed",
        description: error.message || "There was an error importing from Airtable",
        variant: "destructive",
      });
    },
  });

  const handleImport = () => {
    if (!airtableUrl) {
      toast({
        title: "URL required",
        description: "Please enter an Airtable URL",
        variant: "destructive",
      });
      return;
    }

    importMutation.mutate(airtableUrl);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="text-xl">Import from Airtable</DialogTitle>
          <DialogDescription>
            Enter the URL of an Airtable containing PDF files with File ID and Expected Output columns.
            The text will be extracted from the PDFs and added as dataset items.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="airtable-url">Airtable URL</Label>
            <Input
              id="airtable-url"
              placeholder="https://airtable.com/your-base/your-table"
              value={airtableUrl}
              onChange={(e) => setAirtableUrl(e.target.value)}
            />
            <p className="text-sm text-gray-500">
              The Airtable should contain columns for File ID, Expected Output, and PDF files.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={importMutation.isPending}>
            Cancel
          </Button>
          <Button 
            onClick={handleImport} 
            disabled={importMutation.isPending || !airtableUrl}
          >
            {importMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Importing...
              </>
            ) : (
              "Import"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}