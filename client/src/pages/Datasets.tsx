import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Dataset, DatasetItem } from "@shared/schema";
import { uploadPdf, getPdf, generatePdfId } from "@/lib/pdfUtils";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatDistanceToNow } from "date-fns";
import { queryClient } from "@/lib/queryClient";

export default function Datasets() {
  const { toast } = useToast();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isAddItemDialogOpen, setIsAddItemDialogOpen] = useState(false);
  const [isEditItemDialogOpen, setIsEditItemDialogOpen] = useState(false);
  const [selectedDataset, setSelectedDataset] = useState<Dataset | null>(null);
  const [selectedDatasetItem, setSelectedDatasetItem] = useState<DatasetItem | null>(null);
  const [newDataset, setNewDataset] = useState({
    name: "",
    description: "",
  });
  const [newDatasetItem, setNewDatasetItem] = useState({
    inputType: "text", // Can be "text", "image", or "pdf"
    inputText: "",
    inputImage: "",
    inputPdf: "",
    validResponse: "",
  });
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [uploadedPdf, setUploadedPdf] = useState<string | null>(null);
  
  // Handle clipboard paste for images
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (!isAddItemDialogOpen || newDatasetItem.inputType !== 'image') return;
      
      const items = e.clipboardData?.items;
      if (!items) return;
      
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const blob = items[i].getAsFile();
          if (blob) {
            const reader = new FileReader();
            reader.onload = (event) => {
              if (event.target?.result) {
                setUploadedImage(event.target.result as string);
                toast({
                  title: "Image pasted",
                  description: "Image from clipboard has been added."
                });
              }
            };
            reader.readAsDataURL(blob);
            break;
          }
        }
      }
    };
    
    document.addEventListener('paste', handlePaste);
    return () => {
      document.removeEventListener('paste', handlePaste);
    };
  }, [isAddItemDialogOpen, newDatasetItem.inputType]);
  
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
      setNewDataset({ name: "", description: "" });
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
      setNewDatasetItem({
        inputType: "text",
        inputText: "",
        inputImage: "",
        inputPdf: "",
        validResponse: "",
      });
      setUploadedImage(null);
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
  
  // Update dataset item mutation
  const updateDatasetItemMutation = useMutation({
    mutationFn: async (data: {
      id: number;
      inputType: string;
      inputText?: string;
      inputImage?: string | null;
      inputPdf?: string | null;
      validResponse: string;
      datasetId?: number;
    }) => {
      console.log("Updating dataset item:", data);
      // Use the new PUT endpoint for updating dataset items
      const response = await apiRequest("PUT", `/api/dataset-items/${data.id}`, {
        ...data,
        datasetId: selectedDataset?.id
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Item updated",
        description: "The dataset item has been updated successfully."
      });
      setIsEditItemDialogOpen(false);
      setSelectedDatasetItem(null);
      setNewDatasetItem({
        inputType: "text",
        inputPdf: "",
        inputText: "",
        inputImage: "",
        validResponse: "",
      });
      setUploadedImage(null);
      if (selectedDataset) {
        queryClient.invalidateQueries({ queryKey: ["/api/datasets", selectedDataset.id, "items"] });
        queryClient.invalidateQueries({ queryKey: ["/api/datasets"] });
      }
    },
    onError: (error) => {
      console.error("Error updating dataset item:", error);
      toast({
        title: "Update failed",
        description: "There was an error updating the dataset item. Please try again.",
        variant: "destructive"
      });
    }
  });
  
  // Delete dataset item mutation
  const deleteDatasetItemMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/dataset-items/${id}`);
    },
    onSuccess: () => {
      toast({
        title: "Item deleted",
        description: "The item has been removed from the dataset successfully.",
      });
      if (selectedDataset) {
        queryClient.invalidateQueries({ queryKey: ["/api/datasets", selectedDataset.id, "items"] });
        queryClient.invalidateQueries({ queryKey: ["/api/datasets"] });
      }
    },
    onError: () => {
      toast({
        title: "Deletion failed",
        description: "There was an error removing the item from the dataset. Please try again.",
        variant: "destructive",
      });
    }
  });
  
  // Delete dataset mutation
  const deleteDatasetMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/datasets/${id}`);
    },
    onSuccess: () => {
      toast({
        title: "Dataset deleted",
        description: "The dataset and all its items have been deleted successfully.",
      });
      closeDatasetView(); // Go back to dataset list
      queryClient.invalidateQueries({ queryKey: ["/api/datasets"] });
    },
    onError: () => {
      toast({
        title: "Deletion failed",
        description: "There was an error deleting the dataset. Please try again.",
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
    
    // Check for required fields based on input type
    if (newDatasetItem.inputType === "text" && !newDatasetItem.inputText) {
      toast({
        title: "Missing input text",
        description: "Please provide input text.",
        variant: "destructive",
      });
      return;
    }
    
    if (newDatasetItem.inputType === "image" && !newDatasetItem.inputImage && !uploadedImage) {
      toast({
        title: "Missing image",
        description: "Please provide an image URL or upload an image.",
        variant: "destructive",
      });
      return;
    }
    
    if (newDatasetItem.inputType === "pdf" && !newDatasetItem.inputPdf && !uploadedPdf) {
      toast({
        title: "Missing PDF",
        description: "Please provide a PDF ID or upload a PDF file.",
        variant: "destructive",
      });
      return;
    }
    
    if (!newDatasetItem.validResponse) {
      toast({
        title: "Missing valid response",
        description: "Please provide the expected valid response.",
        variant: "destructive",
      });
      return;
    }
    
    // If we have an uploaded image or PDF, handle the upload and then add the item
    if (newDatasetItem.inputType === "pdf" && uploadedPdf) {
      // Generate a PDF ID if one doesn't exist
      const pdfId = newDatasetItem.inputPdf || generatePdfId();
      
      // First upload the PDF to the bucket
      uploadPdf(uploadedPdf, pdfId)
        .then((fileId) => {
          // After successful upload, create the dataset item with the file ID
          const itemToAdd = {
            ...newDatasetItem,
            inputImage: "",
            inputPdf: fileId,
            datasetId: selectedDataset.id,
          };
          
          addDatasetItemMutation.mutate(itemToAdd);
        })
        .catch((error) => {
          console.error("PDF upload error:", error);
          toast({
            title: "PDF upload failed",
            description: "There was an error uploading the PDF. Please try again.",
            variant: "destructive"
          });
        });
    } else {
      // For image or text inputs, add directly
      const itemToAdd = {
        ...newDatasetItem,
        inputImage: newDatasetItem.inputType === "image" ? (uploadedImage || newDatasetItem.inputImage) : "",
        inputPdf: newDatasetItem.inputType === "pdf" ? (newDatasetItem.inputPdf || "") : "",
        datasetId: selectedDataset.id,
      };
      
      addDatasetItemMutation.mutate(itemToAdd);
    }
  };
  
  const viewDataset = (dataset: Dataset) => {
    setSelectedDataset(dataset);
  };
  
  const closeDatasetView = () => {
    setSelectedDataset(null);
  };
  
  const addNewItem = () => {
    // Reset the form data
    setNewDatasetItem({
      inputType: "text",
      inputPdf: "",
      inputText: "",
      inputImage: "",
      validResponse: "",
    });
    setUploadedImage(null);
    setUploadedPdf(null);
    setIsAddItemDialogOpen(true);
  };
  
  const editDatasetItem = (item: DatasetItem) => {
    // Set the selected item
    setSelectedDatasetItem(item);
    
    // Set the form data with the current values
    setNewDatasetItem({
      inputType: item.inputType || "text",
      inputText: item.inputText || "",
      inputImage: item.inputImage || "",
      inputPdf: item.inputPdf || "",
      validResponse: item.validResponse || "",
    });
    
    // If there's an image, set it as uploaded image
    if (item.inputImage) {
      setUploadedImage(item.inputImage);
    } else {
      setUploadedImage(null);
    }
    
    // If there's a PDF, set it as uploaded PDF
    if (item.inputPdf) {
      // We don't have the actual file content, just set a placeholder
      setUploadedPdf("placeholder"); // This indicates we have a PDF without the actual content
    } else {
      setUploadedPdf(null);
    }
    
    // Open the edit dialog (which uses the same form)
    setIsEditItemDialogOpen(true);
  };
  
  const handleUpdateDatasetItem = () => {
    if (!selectedDatasetItem || !selectedDataset) {
      toast({
        title: "Error",
        description: "No item selected for editing.",
        variant: "destructive",
      });
      return;
    }
    
    // Check for required fields based on input type
    if (newDatasetItem.inputType === "text" && !newDatasetItem.inputText) {
      toast({
        title: "Missing input text",
        description: "Please provide input text.",
        variant: "destructive",
      });
      return;
    }
    
    if (newDatasetItem.inputType === "image" && !newDatasetItem.inputImage && !uploadedImage) {
      toast({
        title: "Missing image",
        description: "Please provide an image URL or upload an image.",
        variant: "destructive",
      });
      return;
    }
    if (newDatasetItem.inputType === "pdf" && !newDatasetItem.inputPdf && !uploadedPdf) {
      toast({
        title: "Missing PDF",
        description: "Please provide a PDF ID or upload a PDF file.",
        variant: "destructive",
      });
      return;
    }
    
    if (!newDatasetItem.validResponse) {
      toast({
        title: "Missing valid response",
        description: "Please provide the expected valid response.",
        variant: "destructive",
      });
      return;
    }
    
    // If we have a newly uploaded PDF, handle the upload before updating the item
    if (newDatasetItem.inputType === "pdf" && uploadedPdf && uploadedPdf !== "placeholder") {
      // Generate a PDF ID if one doesn't exist or use the existing one
      const pdfId = newDatasetItem.inputPdf || generatePdfId();
      
      // First upload the PDF to the bucket
      uploadPdf(uploadedPdf, pdfId)
        .then((fileId) => {
          // After successful upload, update the dataset item with the file ID
          const itemToUpdate = {
            id: selectedDatasetItem.id,
            ...newDatasetItem,
            inputImage: "",
            inputPdf: fileId,
            datasetId: selectedDataset.id,
          };
          
          // Call the update mutation
          updateDatasetItemMutation.mutate(itemToUpdate);
        })
        .catch((error: any) => {
          console.error("PDF upload error:", error);
          toast({
            title: "PDF upload failed",
            description: "There was an error uploading the PDF. Please try again.",
            variant: "destructive"
          });
        });
    } else {
      // For image, text, or unchanged PDF inputs, update directly
      const itemToUpdate = {
        id: selectedDatasetItem.id,
        ...newDatasetItem,
        inputImage: newDatasetItem.inputType === "image" ? (uploadedImage || newDatasetItem.inputImage) : "",
        inputPdf: newDatasetItem.inputType === "pdf" ? (newDatasetItem.inputPdf || "") : "",
        datasetId: selectedDataset.id,
      };
      
      // Call the update mutation
      updateDatasetItemMutation.mutate(itemToUpdate);
    }
  };
  
  const handleDeleteItem = (id: number) => {
    if (confirm('Are you sure you want to delete this item? This action cannot be undone.')) {
      deleteDatasetItemMutation.mutate(id);
    }
  };
  
  const handleDeleteDataset = () => {
    if (!selectedDataset) return;
    
    if (confirm(`Are you sure you want to delete "${selectedDataset.name}" dataset? This will permanently delete the dataset and all its items. This action cannot be undone.`)) {
      deleteDatasetMutation.mutate(selectedDataset.id);
    }
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
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <Button variant="outline" onClick={closeDatasetView} className="mr-2">
                <span className="material-icons text-sm mr-1">arrow_back</span>
                Back
              </Button>
              <h3 className="text-xl font-medium">{selectedDataset.name}</h3>
            </div>
            <Button 
              variant="destructive"
              onClick={handleDeleteDataset}
              disabled={deleteDatasetMutation.isPending}
            >
              <span className="material-icons text-sm mr-1">
                {deleteDatasetMutation.isPending ? 'hourglass_empty' : 'delete'}
              </span>
              Delete Dataset
            </Button>
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
                    <TableHead>Type</TableHead>
                    <TableHead>Input</TableHead>
                    <TableHead>Valid Response</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {datasetItems.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <Badge 
                          variant={
                            item.inputType === 'text' 
                              ? 'outline' 
                              : item.inputType === 'image'
                                ? 'secondary'
                                : 'default'
                          }
                        >
                          {item.inputType === 'text' 
                            ? 'Text' 
                            : item.inputType === 'image'
                              ? 'Image'
                              : 'PDF'
                          }
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {item.inputType === 'text' ? (
                          <div className="max-w-md p-2 bg-gray-50 rounded text-sm overflow-hidden">
                            <div className="line-clamp-2">{item.inputText}</div>
                          </div>
                        ) : item.inputType === 'image' ? (
                          <div className="w-16 h-16 bg-gray-100 rounded flex items-center justify-center overflow-hidden">
                            <img 
                              src={item.inputImage || ''} 
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
                        ) : item.inputType === 'pdf' && item.inputPdf ? (
                          <div 
                            className="p-2 bg-gray-50 rounded text-sm flex items-center gap-2 cursor-pointer hover:bg-gray-100"
                            onClick={() => {
                              // When clicked, try to get the PDF content and open in a new tab
                              toast({
                                title: "Loading PDF",
                                description: "Retrieving PDF document..."
                              });
                              
                              if (item.inputPdf) {
                                getPdf(item.inputPdf).then(pdfData => {
                                  // Create a new window/tab with the PDF content
                                  const pdfWindow = window.open();
                                  if (pdfWindow) {
                                    pdfWindow.document.write(`
                                      <iframe 
                                        width="100%" 
                                        height="100%" 
                                        src="${pdfData}" 
                                        style="border: none; position: absolute; top: 0; left: 0; right: 0; bottom: 0;"
                                      ></iframe>
                                    `);
                                  } else {
                                    toast({
                                      title: "Popup blocked",
                                      description: "Please allow popups to view PDF documents",
                                      variant: "destructive"
                                    });
                                  }
                                }).catch(error => {
                                  console.error("Error loading PDF:", error);
                                  toast({
                                    title: "PDF Error",
                                    description: "Failed to load PDF document",
                                    variant: "destructive"
                                  });
                                });
                              }
                            }}
                          >
                            <span className="material-icons text-red-500">picture_as_pdf</span>
                            <span className="font-medium truncate">{item.inputPdf}</span>
                            <span className="text-xs text-blue-500">(Click to view)</span>
                          </div>
                        ) : (
                          <div className="w-16 h-16 bg-gray-100 rounded flex items-center justify-center">
                            <span className="material-icons text-gray-400">help_outline</span>
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="max-w-md">
                        <div className="truncate">{item.validResponse}</div>
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-1">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => editDatasetItem(item)}
                          >
                            <span className="material-icons text-sm">edit</span>
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => handleDeleteItem(item.id)}
                            disabled={deleteDatasetItemMutation.isPending}
                          >
                            <span className="material-icons text-sm">
                              {deleteDatasetItemMutation.isPending ? 'hourglass_empty' : 'delete'}
                            </span>
                          </Button>
                        </div>
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
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm(`Are you sure you want to delete "${dataset.name}" dataset? This will permanently delete the dataset and all its items. This action cannot be undone.`)) {
                              deleteDatasetMutation.mutate(dataset.id);
                            }
                          }}
                          disabled={deleteDatasetMutation.isPending}
                        >
                          <span className="material-icons text-sm">
                            {deleteDatasetMutation.isPending ? 'hourglass_empty' : 'delete'}
                          </span>
                        </Button>
                      </div>
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
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add Dataset Item</DialogTitle>
            <DialogDescription>
              Add a new item to the "{selectedDataset?.name}" dataset.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <Tabs 
              defaultValue="text" 
              value={newDatasetItem.inputType}
              onValueChange={(value) => setNewDatasetItem({ ...newDatasetItem, inputType: value })}
            >
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="text">Text Input</TabsTrigger>
                <TabsTrigger value="image">Image Input</TabsTrigger>
                <TabsTrigger value="pdf">PDF Input</TabsTrigger>
              </TabsList>
              
              <TabsContent value="text" className="pt-4">
                <div className="space-y-2">
                  <label htmlFor="inputText" className="text-sm font-medium">
                    Input Text
                  </label>
                  <Textarea
                    id="inputText"
                    value={newDatasetItem.inputText}
                    onChange={(e) => setNewDatasetItem({ ...newDatasetItem, inputText: e.target.value })}
                    placeholder="Enter the input text to test with"
                    rows={3}
                  />
                </div>
              </TabsContent>
              
              <TabsContent value="image" className="pt-4 space-y-4">
                <div className="space-y-2">
                  <label htmlFor="inputImage" className="text-sm font-medium">
                    Image URL
                  </label>
                  <Input
                    id="inputImage"
                    value={newDatasetItem.inputImage}
                    onChange={(e) => setNewDatasetItem({ ...newDatasetItem, inputImage: e.target.value })}
                    placeholder="e.g., https://example.com/image.jpg"
                  />
                </div>
                
                <div 
                  className="border-2 border-dashed rounded-md p-6 text-center cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => document.getElementById('imageUpload')?.click()}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    e.currentTarget.classList.add('border-blue-500');
                  }}
                  onDragLeave={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    e.currentTarget.classList.remove('border-blue-500');
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    e.currentTarget.classList.remove('border-blue-500');
                    
                    const files = e.dataTransfer.files;
                    if (files.length > 0 && files[0].type.startsWith('image/')) {
                      const reader = new FileReader();
                      reader.onload = (event) => {
                        if (event.target?.result) {
                          setUploadedImage(event.target.result as string);
                        }
                      };
                      reader.readAsDataURL(files[0]);
                    }
                  }}
                >
                  <input 
                    type="file" 
                    id="imageUpload" 
                    className="hidden" 
                    accept="image/*"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        const reader = new FileReader();
                        reader.onload = (event) => {
                          if (event.target?.result) {
                            setUploadedImage(event.target.result as string);
                          }
                        };
                        reader.readAsDataURL(e.target.files[0]);
                      }
                    }} 
                  />
                  
                  {uploadedImage ? (
                    <div className="relative">
                      <img 
                        src={uploadedImage} 
                        alt="Uploaded" 
                        className="max-h-48 mx-auto"
                        onError={() => {
                          toast({
                            title: "Image load error",
                            description: "Could not load the image. Please try another.",
                            variant: "destructive",
                          });
                          setUploadedImage(null);
                        }}
                      />
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="absolute top-2 right-2 h-8 w-8 p-0 rounded-full bg-white/80"
                        onClick={(e) => {
                          e.stopPropagation();
                          setUploadedImage(null);
                        }}
                      >
                        <span className="material-icons text-sm">close</span>
                      </Button>
                    </div>
                  ) : (
                    <>
                      <span className="material-icons text-3xl text-gray-400">photo</span>
                      <p className="mt-2 text-sm text-gray-500">
                        Drag & drop an image here, or click to select
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        You can also paste images directly from your clipboard
                      </p>
                    </>
                  )}
                </div>
              </TabsContent>
              
              <TabsContent value="pdf" className="pt-4 space-y-4">
                <div className="space-y-2">
                  <label htmlFor="inputPdf" className="text-sm font-medium">
                    PDF File
                  </label>
                  <Input
                    id="inputPdf"
                    value={newDatasetItem.inputPdf}
                    onChange={(e) => setNewDatasetItem({ ...newDatasetItem, inputPdf: e.target.value })}
                    placeholder="e.g., document-id-123"
                    disabled={!!uploadedPdf}
                  />
                </div>
                
                <div 
                  className="border-2 border-dashed rounded-md p-6 text-center cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => document.getElementById('pdfUpload')?.click()}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    e.currentTarget.classList.add('border-blue-500');
                  }}
                  onDragLeave={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    e.currentTarget.classList.remove('border-blue-500');
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    e.currentTarget.classList.remove('border-blue-500');
                    
                    const files = e.dataTransfer.files;
                    if (files.length > 0 && files[0].type === 'application/pdf') {
                      const reader = new FileReader();
                      reader.onload = (event) => {
                        if (event.target?.result) {
                          setUploadedPdf(event.target.result as string);
                          toast({
                            title: "PDF uploaded",
                            description: "PDF file has been uploaded."
                          });
                        }
                      };
                      reader.readAsDataURL(files[0]);

                      // Save the file ID (name without extension) to the form state
                      const fileName = files[0].name;
                      const fileId = fileName.replace('.pdf', '');
                      setNewDatasetItem({ ...newDatasetItem, inputPdf: fileId });
                    } else {
                      toast({
                        title: "Invalid file",
                        description: "Please upload a PDF file.",
                        variant: "destructive"
                      });
                    }
                  }}
                >
                  <input
                    type="file"
                    id="pdfUpload"
                    accept="application/pdf"
                    className="hidden"
                    onChange={(e) => {
                      const files = e.target.files;
                      if (files && files.length > 0) {
                        const reader = new FileReader();
                        reader.onload = (event) => {
                          if (event.target?.result) {
                            setUploadedPdf(event.target.result as string);
                            toast({
                              title: "PDF uploaded",
                              description: "PDF file has been uploaded."
                            });
                          }
                        };
                        reader.readAsDataURL(files[0]);
                        
                        // Save the file ID (name without extension) to the form state
                        const fileName = files[0].name;
                        const fileId = fileName.replace('.pdf', '');
                        setNewDatasetItem({ ...newDatasetItem, inputPdf: fileId });
                      }
                    }}
                  />
                  
                  {uploadedPdf ? (
                    <div className="flex flex-col items-center justify-center gap-2">
                      <span className="material-icons text-4xl text-green-500">description</span>
                      <p className="text-sm">PDF uploaded successfully</p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setUploadedPdf(null);
                          setNewDatasetItem({ ...newDatasetItem, inputPdf: "" });
                        }}
                      >
                        Remove
                      </Button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center gap-2">
                      <span className="material-icons text-4xl text-gray-400">upload_file</span>
                      <p>Drag & drop a PDF file here or click to browse</p>
                      <p className="text-xs text-gray-500">Supports PDF files only</p>
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>
            
            <div className="space-y-2 pt-4">
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
                (newDatasetItem.inputType === "text" && !newDatasetItem.inputText) ||
                (newDatasetItem.inputType === "image" && !newDatasetItem.inputImage && !uploadedImage) ||
                (newDatasetItem.inputType === "pdf" && !newDatasetItem.inputPdf && !uploadedPdf) ||
                !newDatasetItem.validResponse
              }
            >
              {addDatasetItemMutation.isPending ? "Adding..." : "Add Item"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Edit Dataset Item Dialog */}
      <Dialog open={isEditItemDialogOpen} onOpenChange={setIsEditItemDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Dataset Item</DialogTitle>
            <DialogDescription>
              Edit the item in the "{selectedDataset?.name}" dataset.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <Tabs 
              defaultValue="text" 
              value={newDatasetItem.inputType}
              onValueChange={(value) => setNewDatasetItem({ ...newDatasetItem, inputType: value })}
            >
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="text">Text Input</TabsTrigger>
                <TabsTrigger value="image">Image Input</TabsTrigger>
                <TabsTrigger value="pdf">PDF Input</TabsTrigger>
              </TabsList>
              
              <TabsContent value="text" className="pt-4">
                <div className="space-y-2">
                  <label htmlFor="editInputText" className="text-sm font-medium">
                    Input Text
                  </label>
                  <Textarea
                    id="editInputText"
                    value={newDatasetItem.inputText}
                    onChange={(e) => setNewDatasetItem({ ...newDatasetItem, inputText: e.target.value })}
                    placeholder="Enter the input text to test with"
                    rows={3}
                  />
                </div>
              </TabsContent>
              
              <TabsContent value="image" className="pt-4 space-y-4">
                <div className="space-y-2">
                  <label htmlFor="editInputImage" className="text-sm font-medium">
                    Image URL
                  </label>
                  <Input
                    id="editInputImage"
                    value={newDatasetItem.inputImage}
                    onChange={(e) => setNewDatasetItem({ ...newDatasetItem, inputImage: e.target.value })}
                    placeholder="e.g., https://example.com/image.jpg"
                  />
                </div>
                
                <div 
                  className="border-2 border-dashed rounded-md p-6 text-center cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => document.getElementById('editImageUpload')?.click()}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    e.currentTarget.classList.add('border-blue-500');
                  }}
                  onDragLeave={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    e.currentTarget.classList.remove('border-blue-500');
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    e.currentTarget.classList.remove('border-blue-500');
                    
                    const files = e.dataTransfer.files;
                    if (files.length > 0 && files[0].type.startsWith('image/')) {
                      const reader = new FileReader();
                      reader.onload = (event) => {
                        if (event.target?.result) {
                          setUploadedImage(event.target.result as string);
                        }
                      };
                      reader.readAsDataURL(files[0]);
                    }
                  }}
                >
                  <input 
                    type="file" 
                    id="editImageUpload" 
                    className="hidden" 
                    accept="image/*"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        const reader = new FileReader();
                        reader.onload = (event) => {
                          if (event.target?.result) {
                            setUploadedImage(event.target.result as string);
                          }
                        };
                        reader.readAsDataURL(e.target.files[0]);
                      }
                    }} 
                  />
                  
                  {uploadedImage ? (
                    <div className="relative">
                      <img 
                        src={uploadedImage} 
                        alt="Uploaded" 
                        className="max-h-48 mx-auto"
                        onError={() => {
                          toast({
                            title: "Image load error",
                            description: "Could not load the image. Please try another.",
                            variant: "destructive",
                          });
                          setUploadedImage(null);
                        }}
                      />
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="absolute top-2 right-2 h-8 w-8 p-0 rounded-full bg-white/80"
                        onClick={(e) => {
                          e.stopPropagation();
                          setUploadedImage(null);
                        }}
                      >
                        <span className="material-icons text-sm">close</span>
                      </Button>
                    </div>
                  ) : (
                    <>
                      <span className="material-icons text-3xl text-gray-400">photo</span>
                      <p className="mt-2 text-sm text-gray-500">
                        Drag & drop an image here, or click to select
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        You can also paste images directly from your clipboard
                      </p>
                    </>
                  )}
                </div>
              </TabsContent>
              
              <TabsContent value="pdf" className="pt-4 space-y-4">
                <div className="space-y-2">
                  <label htmlFor="editInputPdf" className="text-sm font-medium">
                    PDF File
                  </label>
                  <Input
                    id="editInputPdf"
                    value={newDatasetItem.inputPdf}
                    onChange={(e) => setNewDatasetItem({ ...newDatasetItem, inputPdf: e.target.value })}
                    placeholder="e.g., document-id-123"
                    disabled={!!uploadedPdf}
                  />
                </div>
                
                <div 
                  className="border-2 border-dashed rounded-md p-6 text-center cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => document.getElementById('editPdfUpload')?.click()}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    e.currentTarget.classList.add('border-blue-500');
                  }}
                  onDragLeave={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    e.currentTarget.classList.remove('border-blue-500');
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    e.currentTarget.classList.remove('border-blue-500');
                    
                    const files = e.dataTransfer.files;
                    if (files.length > 0 && files[0].type === 'application/pdf') {
                      const reader = new FileReader();
                      reader.onload = (event) => {
                        if (event.target?.result) {
                          setUploadedPdf(event.target.result as string);
                          toast({
                            title: "PDF uploaded",
                            description: "PDF file has been uploaded."
                          });
                        }
                      };
                      reader.readAsDataURL(files[0]);

                      // Save the file ID (name without extension) to the form state
                      const fileName = files[0].name;
                      const fileId = fileName.replace('.pdf', '');
                      setNewDatasetItem({ ...newDatasetItem, inputPdf: fileId });
                    } else {
                      toast({
                        title: "Invalid file",
                        description: "Please upload a PDF file.",
                        variant: "destructive"
                      });
                    }
                  }}
                >
                  <input
                    type="file"
                    id="editPdfUpload"
                    accept="application/pdf"
                    className="hidden"
                    onChange={(e) => {
                      const files = e.target.files;
                      if (files && files.length > 0) {
                        const reader = new FileReader();
                        reader.onload = (event) => {
                          if (event.target?.result) {
                            setUploadedPdf(event.target.result as string);
                            toast({
                              title: "PDF uploaded",
                              description: "PDF file has been uploaded."
                            });
                          }
                        };
                        reader.readAsDataURL(files[0]);
                        
                        // Save the file ID (name without extension) to the form state
                        const fileName = files[0].name;
                        const fileId = fileName.replace('.pdf', '');
                        setNewDatasetItem({ ...newDatasetItem, inputPdf: fileId });
                      }
                    }}
                  />
                  
                  {uploadedPdf ? (
                    <div className="flex flex-col items-center justify-center gap-2">
                      <span className="material-icons text-4xl text-green-500">description</span>
                      <p className="text-sm">PDF uploaded successfully</p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setUploadedPdf(null);
                          setNewDatasetItem({ ...newDatasetItem, inputPdf: "" });
                        }}
                      >
                        Remove
                      </Button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center gap-2">
                      <span className="material-icons text-4xl text-gray-400">upload_file</span>
                      <p>Drag & drop a PDF file here or click to browse</p>
                      <p className="text-xs text-gray-500">Supports PDF files only</p>
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>
            
            <div className="space-y-2 pt-4">
              <label htmlFor="editValidResponse" className="text-sm font-medium">
                Valid Response
              </label>
              <Textarea
                id="editValidResponse"
                value={newDatasetItem.validResponse}
                onChange={(e) => setNewDatasetItem({ ...newDatasetItem, validResponse: e.target.value })}
                placeholder="The expected valid response for this input"
                rows={4}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditItemDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleUpdateDatasetItem}
              disabled={
                updateDatasetItemMutation.isPending || 
                (newDatasetItem.inputType === "text" && !newDatasetItem.inputText) ||
                (newDatasetItem.inputType === "image" && !newDatasetItem.inputImage && !uploadedImage) ||
                (newDatasetItem.inputType === "pdf" && !newDatasetItem.inputPdf && !uploadedPdf) ||
                !newDatasetItem.validResponse
              }
            >
              {updateDatasetItemMutation.isPending ? "Updating..." : "Update Item"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
