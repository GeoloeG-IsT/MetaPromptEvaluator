import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Dataset, DatasetItem } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import { queryClient } from "@/lib/queryClient";

export default function Datasets() {
  const { toast } = useToast();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isAddItemDialogOpen, setIsAddItemDialogOpen] = useState(false);
  const [selectedDataset, setSelectedDataset] = useState<Dataset | null>(null);
  const [newDataset, setNewDataset] = useState({
    name: "",
    description: "",
    category: "Vision",
  });
  const [newDatasetItem, setNewDatasetItem] = useState({
    inputImage: "",
    validResponse: "",
  });
  
  // Fetch datasets
  const { data: datasets, isLoading } = useQuery<Dataset[]>({
    queryKey: ["/api/datasets"],
  });
  
  // Fetch dataset items when a dataset is selected
  const { data: datasetItems, isLoading: itemsLoading } = useQuery<DatasetItem[]>({
    queryKey: ["/api/datasets", selectedDataset?.id, "items"],
    queryFn: async () => {
      if (!selectedDataset?.id) return [];
      const res = await fetch(`/api/datasets/${selectedDataset.id}/items`);
      if (!res.ok) throw new Error("Failed to fetch dataset items");
      return res.json();
    },
    enabled: !!selectedDataset?.id,
  });
  
  // Create dataset mutation
  const createDatasetMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("POST", "/api/datasets", {
        ...data,
        userId: 1 // Hard-coded for demo
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Dataset created",
        description: "The dataset has been created successfully.",
      });
      setIsCreateDialogOpen(false);
      setNewDataset({ name: "", description: "", category: "Vision" });
      queryClient.invalidateQueries({ queryKey: ["/api/datasets"] });
    },
    onError: () => {
      toast({
        title: "Creation failed",
        description: "There was an error creating the dataset. Please try again.",
        variant: "destructive",
      });
    }
  });
  
  // Add dataset item mutation
  const addDatasetItemMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("POST", "/api/dataset-items", data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Item added",
        description: "The item has been added to the dataset successfully.",
      });
      setIsAddItemDialogOpen(false);
      setNewDatasetItem({ inputImage: "", validResponse: "" });
      if (selectedDataset) {
        queryClient.invalidateQueries({ queryKey: ["/api/datasets", selectedDataset.id, "items"] });
        queryClient.invalidateQueries({ queryKey: ["/api/datasets"] });
      }
    },
    onError: () => {
      toast({
        title: "Item addition failed",
        description: "There was an error adding the item to the dataset. Please try again.",
        variant: "destructive",
      });
    }
  });
  
  const handleCreateDataset = () => {
    if (!newDataset.name) {
      toast({
        title: "Missing name",
        description: "Please provide a name for the dataset.",
        variant: "destructive",
      });
      return;
    }
    
    createDatasetMutation.mutate(newDataset);
  };
  
  const handleAddDatasetItem = () => {
    if (!selectedDataset) {
      toast({
        title: "No dataset selected",
        description: "Please select a dataset first.",
        variant: "destructive",
      });
      return;
    }
    
    if (!newDatasetItem.inputImage || !newDatasetItem.validResponse) {
      toast({
        title: "Missing fields",
        description: "Please fill in all fields.",
        variant: "destructive",
      });
      return;
    }
    
    addDatasetItemMutation.mutate({
      ...newDatasetItem,
      datasetId: selectedDataset.id,
    });
  };
  
  const viewDataset = (dataset: Dataset) => {
    setSelectedDataset(dataset);
  };
  
  const closeDatasetView = () => {
    setSelectedDataset(null);
  };
  
  const addNewItem = () => {
    setIsAddItemDialogOpen(true);
  };
  
  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-dark">Datasets</h2>
          <p className="text-gray-500">Manage your evaluation datasets</p>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <span className="material-icons text-sm mr-1">add</span>
          New Dataset
        </Button>
      </div>
      
      {selectedDataset ? (
        // Dataset detail view
        <div>
          <div className="flex items-center mb-4">
            <Button variant="outline" onClick={closeDatasetView} className="mr-2">
              <span className="material-icons text-sm mr-1">arrow_back</span>
              Back
            </Button>
            <h3 className="text-xl font-medium">{selectedDataset.name}</h3>
            <Badge className="ml-2">{selectedDataset.category}</Badge>
          </div>
          
          <Card className="mb-4">
            <CardContent className="pt-6">
              <p className="text-gray-500">{selectedDataset.description}</p>
              <div className="mt-4 flex flex-wrap gap-4 text-sm">
                <div>
                  <span className="font-medium">Items:</span> {selectedDataset.itemCount}
                </div>
                <div>
                  <span className="font-medium">Created:</span> {
                    selectedDataset.createdAt 
                      ? formatDistanceToNow(new Date(selectedDataset.createdAt), { addSuffix: true })
                      : "Unknown"
                  }
                </div>
              </div>
            </CardContent>
          </Card>
          
          <div className="flex justify-between items-center mb-4">
            <h4 className="text-lg font-medium">Dataset Items</h4>
            <Button onClick={addNewItem}>
              <span className="material-icons text-sm mr-1">add</span>
              Add Item
            </Button>
          </div>
          
          {itemsLoading ? (
            <div className="text-center p-8">
              <span className="material-icons animate-spin">refresh</span>
            </div>
          ) : !datasetItems || datasetItems.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <p className="text-gray-500">No items in this dataset. Add some items to get started.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Image</TableHead>
                    <TableHead>Valid Response</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {datasetItems.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.id}</TableCell>
                      <TableCell>
                        <div className="w-16 h-16 bg-gray-100 rounded flex items-center justify-center">
                          <span className="material-icons text-gray-400">image</span>
                        </div>
                      </TableCell>
                      <TableCell className="max-w-md">
                        <div className="truncate">{item.validResponse}</div>
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm">
                          <span className="material-icons text-sm">edit</span>
                        </Button>
                        <Button variant="ghost" size="sm">
                          <span className="material-icons text-sm">delete</span>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      ) : (
        // Dataset list view
        <>
          {isLoading ? (
            <div className="text-center p-8">
              <span className="material-icons animate-spin">refresh</span>
            </div>
          ) : !datasets || datasets.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <p className="text-gray-500">No datasets found. Create a new dataset to get started.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {datasets.map((dataset) => (
                <Card key={dataset.id} className="overflow-hidden hover:shadow-md transition-shadow">
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                      <CardTitle className="text-lg">{dataset.name}</CardTitle>
                      <Badge>{dataset.category}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-500 text-sm line-clamp-2 mb-4">{dataset.description}</p>
                    <div className="flex justify-between items-center">
                      <div className="text-sm">
                        <span className="font-medium">{dataset.itemCount}</span> items
                      </div>
                      <Button variant="outline" size="sm" onClick={() => viewDataset(dataset)}>
                        View Dataset
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      )}
      
      {/* Create Dataset Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Dataset</DialogTitle>
            <DialogDescription>
              Add a new dataset for evaluating your meta prompts.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label htmlFor="name" className="text-sm font-medium">
                Dataset Name
              </label>
              <Input
                id="name"
                value={newDataset.name}
                onChange={(e) => setNewDataset({ ...newDataset, name: e.target.value })}
                placeholder="e.g., Landscape Images"
              />
            </div>
            
            <div className="space-y-2">
              <label htmlFor="category" className="text-sm font-medium">
                Category
              </label>
              <Select 
                value={newDataset.category} 
                onValueChange={(value) => setNewDataset({ ...newDataset, category: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Vision">Vision</SelectItem>
                  <SelectItem value="Text">Text</SelectItem>
                  <SelectItem value="Code">Code</SelectItem>
                  <SelectItem value="Multi-modal">Multi-modal</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <label htmlFor="description" className="text-sm font-medium">
                Description
              </label>
              <Textarea
                id="description"
                value={newDataset.description}
                onChange={(e) => setNewDataset({ ...newDataset, description: e.target.value })}
                placeholder="Describe the purpose and content of this dataset"
                rows={3}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleCreateDataset}
              disabled={createDatasetMutation.isPending || !newDataset.name}
            >
              {createDatasetMutation.isPending ? "Creating..." : "Create Dataset"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Add Dataset Item Dialog */}
      <Dialog open={isAddItemDialogOpen} onOpenChange={setIsAddItemDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Dataset Item</DialogTitle>
            <DialogDescription>
              Add a new item to the "{selectedDataset?.name}" dataset.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label htmlFor="inputImage" className="text-sm font-medium">
                Input Image URL
              </label>
              <Input
                id="inputImage"
                value={newDatasetItem.inputImage}
                onChange={(e) => setNewDatasetItem({ ...newDatasetItem, inputImage: e.target.value })}
                placeholder="e.g., https://example.com/image.jpg"
              />
            </div>
            
            <div className="space-y-2">
              <label htmlFor="validResponse" className="text-sm font-medium">
                Valid Response
              </label>
              <Textarea
                id="validResponse"
                value={newDatasetItem.validResponse}
                onChange={(e) => setNewDatasetItem({ ...newDatasetItem, validResponse: e.target.value })}
                placeholder="The expected valid response for this input"
                rows={4}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddItemDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleAddDatasetItem}
              disabled={
                addDatasetItemMutation.isPending || 
                !newDatasetItem.inputImage || 
                !newDatasetItem.validResponse
              }
            >
              {addDatasetItemMutation.isPending ? "Adding..." : "Add Item"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
