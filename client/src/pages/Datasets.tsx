import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { generatePdfId, uploadPdf, getPdf, getPdfMarkdown, deletePdf } from "@/lib/pdfUtils";
import { formatDistanceToNow } from "date-fns";
import DatasetItemDialog from '@/components/DatasetItemDialog';


type Dataset = {
  id: number;
  name: string;
  description: string;
  userId?: number;
  itemCount: number;
  createdAt?: string;
};

type DatasetItem = {
  id: number;
  datasetId: number;
  inputType: string;
  inputText?: string;
  inputImage?: string;
  inputPdf?: string;
  validResponse: string;
};

type NewDatasetForm = {
  name: string;
  description: string;
};

type NewDatasetItemForm = {
  inputType: string;
  inputText: string;
  inputImage: string;
  inputPdf: string;
  validResponse: string;
};

export default function Datasets() {
  const { toast } = useToast();
  
  // State for dataset list and creation
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newDataset, setNewDataset] = useState<NewDatasetForm>({
    name: "",
    description: "",
  });
  
  // State for dataset details view
  const [selectedDataset, setSelectedDataset] = useState<Dataset | null>(null);
  
  // State for adding/editing dataset items
  const [isAddItemDialogOpen, setIsAddItemDialogOpen] = useState(false);
  const [isEditItemDialogOpen, setIsEditItemDialogOpen] = useState(false);
  const [selectedDatasetItem, setSelectedDatasetItem] = useState<DatasetItem | null>(null);
  const [newDatasetItem, setNewDatasetItem] = useState<NewDatasetItemForm>({
    inputType: "text",
    inputText: "",
    inputImage: "",
    inputPdf: "",
    validResponse: "",
  });
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [uploadedPdf, setUploadedPdf] = useState<string | null>(null);
  
  // Query to fetch all datasets
  const { data: datasets, isLoading } = useQuery({
    queryKey: ['/api/datasets'],
    select: (data: Dataset[]) => data.sort((a, b) => {
      // Sort by created time (latest first) or by name if created time is not available
      if (a.createdAt && b.createdAt) {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
      return a.name.localeCompare(b.name);
    }),
  });
  
  // Query to fetch dataset items for the selected dataset
  const { 
    data: datasetItems, 
    isLoading: itemsLoading,
    refetch: refetchItems,
  } = useQuery({
    queryKey: ['/api/datasets', selectedDataset?.id, 'items'],
    enabled: !!selectedDataset,
    queryFn: async () => {
      if (!selectedDataset) return [];
      const response = await fetch(`/api/datasets/${selectedDataset.id}/items`);
      return response.json();
    },
  });
  
  // Mutation to create a new dataset
  const createDatasetMutation = useMutation({
    mutationFn: (dataset: NewDatasetForm) => apiRequest('POST', '/api/datasets', dataset),
    onSuccess: () => {
      // Reset form and close dialog
      setNewDataset({ name: "", description: "" });
      setIsCreateDialogOpen(false);
      
      // Refetch datasets to include the new one
      queryClient.invalidateQueries({ queryKey: ['/api/datasets'] });
      
      toast({
        title: "Dataset created",
        description: "Your new dataset has been created successfully.",
      });
    },
    onError: (error: any) => {
      console.error("Error creating dataset:", error);
      toast({
        title: "Error creating dataset",
        description: error.message || "There was an error creating your dataset. Please try again.",
        variant: "destructive",
      });
    },
  });
  
  // Mutation to delete a dataset
  const deleteDatasetMutation = useMutation({
    mutationFn: (id: number) => apiRequest('DELETE', `/api/datasets/${id}`),
    onSuccess: () => {
      // Close detail view if the deleted dataset was selected
      if (selectedDataset) {
        setSelectedDataset(null);
      }
      
      // Refetch datasets
      queryClient.invalidateQueries({ queryKey: ['/api/datasets'] });
      
      toast({
        title: "Dataset deleted",
        description: "The dataset has been deleted successfully.",
      });
    },
    onError: (error: any) => {
      console.error("Error deleting dataset:", error);
      toast({
        title: "Error deleting dataset",
        description: error.message || "There was an error deleting the dataset. Please try again.",
        variant: "destructive",
      });
    },
  });
  
  // Mutation to add a dataset item
  const addDatasetItemMutation = useMutation({
    mutationFn: (item: any) => apiRequest('POST', '/api/dataset-items', item),
    onSuccess: () => {
      // Reset form and close dialog
      setNewDatasetItem({
        inputType: "text",
        inputText: "",
        inputImage: "",
        inputPdf: "",
        validResponse: "",
      });
      setUploadedImage(null);
      setUploadedPdf(null);
      setIsAddItemDialogOpen(false);
      
      // Refetch dataset items and update dataset to reflect new item count
      refetchItems();
      queryClient.invalidateQueries({ queryKey: ['/api/datasets'] });
      
      toast({
        title: "Item added",
        description: "The item has been added to the dataset successfully.",
      });
    },
    onError: (error: any) => {
      console.error("Error adding dataset item:", error);
      toast({
        title: "Error adding item",
        description: error.message || "There was an error adding the item. Please try again.",
        variant: "destructive",
      });
    },
  });
  
  // Mutation to update a dataset item
  const updateDatasetItemMutation = useMutation({
    mutationFn: (item: any) => apiRequest('PUT', `/api/dataset-items/${item.id}`, item),
    onSuccess: () => {
      // Reset form and close dialog
      setNewDatasetItem({
        inputType: "text",
        inputText: "",
        inputImage: "",
        inputPdf: "",
        validResponse: "",
      });
      setSelectedDatasetItem(null);
      setUploadedImage(null);
      setUploadedPdf(null);
      setIsEditItemDialogOpen(false);
      
      // Refetch dataset items
      refetchItems();
      
      toast({
        title: "Item updated",
        description: "The dataset item has been updated successfully.",
      });
    },
    onError: (error: any) => {
      console.error("Error updating dataset item:", error);
      toast({
        title: "Error updating item",
        description: error.message || "There was an error updating the item. Please try again.",
        variant: "destructive",
      });
    },
  });
  
  // Mutation to delete a dataset item
  const deleteDatasetItemMutation = useMutation({
    mutationFn: (id: number) => apiRequest('DELETE', `/api/dataset-items/${id}`),
    onSuccess: () => {
      // Refetch dataset items and update dataset to reflect new item count
      refetchItems();
      queryClient.invalidateQueries({ queryKey: ['/api/datasets'] });
      
      toast({
        title: "Item deleted",
        description: "The item has been deleted from the dataset.",
      });
    },
    onError: (error: any) => {
      console.error("Error deleting dataset item:", error);
      toast({
        title: "Error deleting item",
        description: error.message || "There was an error deleting the item. Please try again.",
        variant: "destructive",
      });
    },
  });
  
  const handleCreateDataset = () => {
    if (!newDataset.name) {
      toast({
        title: "Missing name",
        description: "Please provide a name for your dataset.",
        variant: "destructive",
      });
      return;
    }
    
    createDatasetMutation.mutate(newDataset);
  };
  
  const handleAddDatasetItem = () => {
    if (!selectedDataset) {
      toast({
        title: "Error",
        description: "No dataset selected.",
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
        .then((response) => {
          // After successful upload, create the dataset item with the file ID
          const itemToAdd = {
            ...newDatasetItem,
            inputImage: "",
            inputPdf: response.fileId,
            datasetId: selectedDataset.id,
          };
          
          // Show extraction status to the user
          if (response.extractionSuccess) {
            toast({
              title: "PDF processed successfully",
              description: `Text extracted: "${response.textPreview}"`,
              variant: "default"
            });
          } else if (response.extractionError) {
            // Upload succeeded but extraction failed - show warning but continue
            toast({
              title: "PDF uploaded with warning",
              description: `PDF was uploaded, but text extraction had issues: ${response.extractionError}`,
              variant: "destructive"
            });
          }
          
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
    // Simply set the selected dataset
    setSelectedDataset(dataset);
  };
  
  const closeDatasetView = () => {
    setSelectedDataset(null);
  };
  
  const addNewItem = () => {
    // Reset the form data
    setNewDatasetItem({
      inputType: "text",
      inputText: "",
      inputImage: "",
      inputPdf: "",
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
        .then((response) => {
          // After successful upload, update the dataset item with the file ID
          const itemToUpdate = {
            id: selectedDatasetItem.id,
            ...newDatasetItem,
            inputImage: "",
            inputPdf: response.fileId,
            datasetId: selectedDataset.id,
          };
          
          // Show extraction status to the user
          if (response.extractionSuccess) {
            toast({
              title: "PDF processed successfully",
              description: `Text extracted: "${response.textPreview}"`,
              variant: "default"
            });
          } else if (response.extractionError) {
            // Upload succeeded but extraction failed - show warning but continue
            toast({
              title: "PDF uploaded with warning",
              description: `PDF was uploaded, but text extraction had issues: ${response.extractionError}`,
              variant: "destructive"
            });
          }
          
          // Call the update mutation
          updateDatasetItemMutation.mutate(itemToUpdate);
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
      // For image, text, or an existing PDF, update directly
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
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center">
              <Button variant="ghost" size="sm" onClick={closeDatasetView} className="mr-2">
                <span className="material-icons text-sm mr-1">arrow_back</span>
                Back
              </Button>
              <h2 className="text-xl font-semibold">{selectedDataset.name}</h2>
            </div>
            <div className="space-x-2">
              <Button variant="outline" size="sm" onClick={addNewItem}>
                <span className="material-icons text-sm mr-1">add</span>
                Add Item
              </Button>
              <Button variant="destructive" size="sm" onClick={handleDeleteDataset}>
                <span className="material-icons text-sm mr-1">delete</span>
                Delete Dataset
              </Button>
            </div>
          </div>
          
          {selectedDataset.description && (
            <p className="mb-4 text-gray-500">{selectedDataset.description}</p>
          )}
          
          <div className="rounded-md border">
            {itemsLoading ? (
              <div className="p-8 flex justify-center">
                <span className="material-icons animate-spin">refresh</span>
                <span className="ml-2">Loading dataset items...</span>
              </div>
            ) : datasetItems && datasetItems.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[100px]">Type</TableHead>
                    <TableHead>Input</TableHead>
                    <TableHead>Valid Response</TableHead>
                    <TableHead className="w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {datasetItems.map((item: DatasetItem) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <Badge variant="outline">
                          {item.inputType === "text" && "Text"}
                          {item.inputType === "image" && "Image"}
                          {item.inputType === "pdf" && "PDF"}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-[200px]">
                        {item.inputType === "text" && (
                          <div className="line-clamp-2 text-sm">{item.inputText}</div>
                        )}
                        {item.inputType === "image" && item.inputImage && (
                          <div className="h-12 w-12 relative">
                            <img 
                              src={item.inputImage} 
                              alt="Input image" 
                              className="absolute inset-0 h-full w-full object-cover rounded-sm" 
                            />
                          </div>
                        )}
                        {item.inputType === "pdf" && item.inputPdf && (
                          <div className="flex items-center">
                            <span className="material-icons text-red-600 mr-2 text-lg">picture_as_pdf</span>
                            <div className="text-sm">
                              <div className="font-medium">{item.inputPdf}</div>
                              <div className="flex mt-1">
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  className="h-6 px-2 text-xs"
                                  onClick={() => {
                                    // Open PDF in new tab
                                    getPdf(item.inputPdf!)
                                      .then(pdfData => {
                                        // Open the PDF in a new tab
                                        const pdfWindow = window.open();
                                        if (pdfWindow) {
                                          pdfWindow.document.write(`
                                            <iframe width="100%" height="100%" src="${pdfData}"></iframe>
                                          `);
                                        }
                                      })
                                      .catch(error => {
                                        console.error("Error fetching PDF:", error);
                                        toast({
                                          title: "Error",
                                          description: "Failed to retrieve PDF. Please try again.",
                                          variant: "destructive"
                                        });
                                      });
                                  }}
                                >
                                  View PDF
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  className="h-6 px-2 text-xs"
                                  onClick={() => {
                                    // Get markdown content
                                    getPdfMarkdown(item.inputPdf!)
                                      .then(markdown => {
                                        // Open the markdown in a popup
                                        const mdWindow = window.open("", "_blank", "width=800,height=600");
                                        if (mdWindow) {
                                          mdWindow.document.write(`
                                            <html>
                                              <head>
                                                <title>PDF Text</title>
                                                <style>
                                                  body {
                                                    font-family: system-ui, -apple-system, sans-serif;
                                                    padding: 20px;
                                                    line-height: 1.5;
                                                    background: white;
                                                    color: black;
                                                  }
                                                  pre {
                                                    white-space: pre-wrap;
                                                    word-wrap: break-word;
                                                    background: #f5f5f5;
                                                    padding: 15px;
                                                    border-radius: 4px;
                                                    overflow: auto;
                                                  }
                                                </style>
                                              </head>
                                              <body>
                                                <h2>Extracted Text from PDF</h2>
                                                <pre>${markdown}</pre>
                                              </body>
                                            </html>
                                          `);
                                        }
                                      })
                                      .catch(error => {
                                        console.error("Error fetching markdown:", error);
                                        toast({
                                          title: "Error",
                                          description: "Failed to retrieve PDF text. Please try again.",
                                          variant: "destructive"
                                        });
                                      });
                                  }}
                                >
                                  View Markdown
                                </Button>
                              </div>
                            </div>
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="max-w-[300px]">
                        <div className="line-clamp-2 text-sm font-mono">{item.validResponse}</div>
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-1">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8"
                            onClick={() => editDatasetItem(item)}
                          >
                            <span className="material-icons text-sm">edit</span>
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-red-500"
                            onClick={() => handleDeleteItem(item.id)}
                          >
                            <span className="material-icons text-sm">delete</span>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="p-8 text-center">
                <p className="text-gray-500">No items in this dataset yet.</p>
                <Button onClick={addNewItem} variant="outline" size="sm" className="mt-2">
                  <span className="material-icons text-sm mr-1">add</span>
                  Add Item
                </Button>
              </div>
            )}
          </div>
        </div>
      ) : (
        // Dataset list view
        <>
          {isLoading ? (
            <div className="flex justify-center p-8">
              <span className="material-icons animate-spin mr-2">refresh</span>
              <span>Loading datasets...</span>
            </div>
          ) : datasets && datasets.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {datasets.map((dataset: Dataset) => (
                <Card key={dataset.id} className="overflow-hidden">
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                      <CardTitle className="text-lg">{dataset.name}</CardTitle>
                      <div className="flex">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
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
          ) : (
            <div className="text-center p-8 border rounded-lg">
              <p className="text-gray-500 mb-4">No datasets yet. Create one to get started.</p>
              <Button onClick={() => setIsCreateDialogOpen(true)}>
                <span className="material-icons text-sm mr-1">add</span>
                New Dataset
              </Button>
            </div>
          )}
        </>
      )}
      
      {/* Create Dataset Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-[550px]">
          <DialogHeader>
            <DialogTitle>Create Dataset</DialogTitle>
            <DialogDescription>
              Create a new dataset for evaluation.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={newDataset.name}
                onChange={(e) => setNewDataset({ ...newDataset, name: e.target.value })}
                placeholder="Dataset name"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description (optional)</Label>
              <Textarea
                id="description"
                value={newDataset.description}
                onChange={(e) => setNewDataset({ ...newDataset, description: e.target.value })}
                placeholder="Brief description of the dataset"
                rows={3}
              />
            </div>
          </div>
          
          <div className="flex justify-end">
            <Button 
              onClick={handleCreateDataset} 
              disabled={createDatasetMutation.isPending}
            >
              {createDatasetMutation.isPending ? (
                <>
                  <span className="material-icons animate-spin mr-2">refresh</span>
                  Creating...
                </>
              ) : "Create Dataset"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Add Dataset Item Dialog */}
      <DatasetItemDialog
        isOpen={isAddItemDialogOpen}
        onClose={() => setIsAddItemDialogOpen(false)}
        dataset={selectedDataset || undefined}
      />
      
      {/* Edit Dataset Item Dialog */}
      <Dialog open={isEditItemDialogOpen} onOpenChange={setIsEditItemDialogOpen}>
        <DialogContent className="sm:max-w-[550px]">
          <DialogHeader>
            <DialogTitle>Edit Dataset Item</DialogTitle>
            <DialogDescription>
              Update this item in "{selectedDataset?.name}".
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Input Type
              </label>
              <RadioGroup 
                value={newDatasetItem.inputType} 
                onValueChange={(value) => setNewDatasetItem({ ...newDatasetItem, inputType: value })}
                className="flex space-x-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="text" id="edit-input-text" />
                  <Label htmlFor="edit-input-text">Text</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="image" id="edit-input-image" />
                  <Label htmlFor="edit-input-image">Image</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="pdf" id="edit-input-pdf" />
                  <Label htmlFor="edit-input-pdf">PDF</Label>
                </div>
              </RadioGroup>
            </div>
            
            {newDatasetItem.inputType === "text" && (
              <div className="space-y-2">
                <Label htmlFor="edit-inputText">Input Text</Label>
                <Textarea
                  id="edit-inputText"
                  value={newDatasetItem.inputText}
                  onChange={(e) => setNewDatasetItem({ ...newDatasetItem, inputText: e.target.value })}
                  placeholder="Enter the input text..."
                  rows={3}
                />
              </div>
            )}
            
            {newDatasetItem.inputType === "image" && (
              <div className="space-y-2">
                <Label htmlFor="edit-inputImage">Image Upload or URL</Label>
                <div className="border border-dashed border-gray-300 rounded-md p-4">
                  <div className="space-y-2">
                    <Input
                      id="edit-inputImage"
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onload = () => {
                            if (reader.result) {
                              setUploadedImage(reader.result.toString());
                            }
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                    />
                    <p className="text-xs text-gray-500">Or enter an image URL:</p>
                    <Input
                      type="text"
                      value={newDatasetItem.inputImage}
                      onChange={(e) => setNewDatasetItem({ ...newDatasetItem, inputImage: e.target.value })}
                      placeholder="https://example.com/image.jpg"
                    />
                  </div>
                  
                  {uploadedImage && (
                    <div className="mt-4">
                      <p className="text-xs font-medium mb-2">Preview:</p>
                      <img 
                        src={uploadedImage} 
                        alt="Uploaded preview" 
                        className="max-h-40 max-w-full object-contain" 
                      />
                    </div>
                  )}
                </div>
              </div>
            )}
            
            {newDatasetItem.inputType === "pdf" && (
              <div className="space-y-2">
                <Label htmlFor="edit-inputPdf">PDF Upload or ID</Label>
                <div className="border border-dashed border-gray-300 rounded-md p-4">
                  <div className="space-y-2">
                    <Input
                      id="edit-inputPdf"
                      type="file"
                      accept=".pdf"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onload = () => {
                            if (reader.result) {
                              setUploadedPdf(reader.result.toString());
                            }
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                    />
                    <p className="text-xs text-gray-500">Or enter a PDF ID:</p>
                    <Input
                      type="text"
                      value={newDatasetItem.inputPdf}
                      onChange={(e) => setNewDatasetItem({ ...newDatasetItem, inputPdf: e.target.value })}
                      placeholder="pdf_123456789"
                    />
                  </div>
                  
                  {uploadedPdf && (
                    <div className="mt-2">
                      <p className="text-xs font-medium text-green-600">
                        {uploadedPdf === "placeholder" 
                          ? "Using existing PDF" 
                          : "New PDF selected and ready for upload"}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="edit-validResponse">Valid Response</Label>
              <Textarea
                id="edit-validResponse"
                value={newDatasetItem.validResponse}
                onChange={(e) => setNewDatasetItem({ ...newDatasetItem, validResponse: e.target.value })}
                placeholder="Enter the expected valid response for this input..."
                rows={3}
              />
            </div>
          </div>
          
          <div className="flex justify-end">
            <Button 
              onClick={handleUpdateDatasetItem} 
              disabled={updateDatasetItemMutation.isPending}
            >
              {updateDatasetItemMutation.isPending ? (
                <>
                  <span className="material-icons animate-spin mr-2">refresh</span>
                  Updating...
                </>
              ) : "Update Item"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}