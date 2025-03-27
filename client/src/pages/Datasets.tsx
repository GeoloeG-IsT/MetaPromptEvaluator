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
                  {datasetItems.map((item: DatasetItem) => (
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
                          <div className="space-y-2">
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
                              <span className="text-xs text-blue-500">(Click to view PDF)</span>
                            </div>
                            
                            {/* Button to toggle markdown visibility */}
                            <div className="flex justify-end">
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  
                                  // Show loading toast
                                  toast({
                                    title: "Loading markdown",
                                    description: "Retrieving PDF content..."
                                  });
                                  
                                  try {
                                    // Directly get markdown content and open in popup
                                    const markdownContent = await getPdfMarkdown(item.inputPdf || '');
                                    
                                    if (!markdownContent) {
                                      toast({
                                        title: "Error",
                                        description: "No markdown content available for this PDF",
                                        variant: "destructive"
                                      });
                                      return;
                                    }
                                    
                                    // Create a new window for the popup
                                    const popupWindow = window.open('', '_blank', 'width=800,height=600');
                                    
                                    if (!popupWindow) {
                                      toast({
                                        title: 'Popup Blocked',
                                        description: 'Please allow popups to view the markdown content',
                                        variant: 'destructive',
                                      });
                                      return;
                                    }
                                    
                                    // Write HTML content to the popup window
                                    popupWindow.document.write(`
                                      <!DOCTYPE html>
                                      <html>
                                      <head>
                                        <title>Markdown Content: ${item.inputPdf}</title>
                                        <style>
                                          body {
                                            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
                                            padding: 20px;
                                            margin: 0;
                                            background-color: white;
                                            color: black;
                                            line-height: 1.5;
                                          }
                                          .container {
                                            max-width: 800px;
                                            margin: 0 auto;
                                          }
                                          header {
                                            display: flex;
                                            justify-content: space-between;
                                            align-items: center;
                                            margin-bottom: 20px;
                                            padding-bottom: 10px;
                                            border-bottom: 1px solid #eaeaea;
                                          }
                                          h1 {
                                            font-size: 20px;
                                            margin: 0;
                                          }
                                          .content {
                                            background-color: white;
                                            padding: 15px;
                                            border-radius: 6px;
                                            white-space: pre-wrap;
                                            overflow-wrap: break-word;
                                            overflow-y: auto;
                                          }
                                          .btn {
                                            padding: 8px 16px;
                                            background-color: #f1f5f9;
                                            border: 1px solid #e2e8f0;
                                            border-radius: 4px;
                                            cursor: pointer;
                                            font-size: 14px;
                                          }
                                          .btn:hover {
                                            background-color: #e2e8f0;
                                          }
                                        </style>
                                      </head>
                                      <body>
                                        <div class="container">
                                          <header>
                                            <h1>Markdown Content: ${item.inputPdf} <span style="font-size: 12px; color: #888;">(Extracted from PDF)</span></h1>
                                            <button class="btn" onclick="window.print()">
                                              Print
                                            </button>
                                          </header>
                                          <div class="content">${markdownContent}</div>
                                        </div>
                                      </body>
                                      </html>
                                    `);
                                    
                                    // Close the document to finish loading
                                    popupWindow.document.close();
                                  } catch (error) {
                                    console.error("Error fetching markdown:", error);
                                    toast({
                                      title: "Error",
                                      description: "Failed to load markdown content",
                                      variant: "destructive"
                                    });
                                  }
                                }}
                              >
                                <span className="material-icons text-xs mr-1">open_in_new</span>
                                View Markdown
                              </Button>
                            </div>

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
              {datasets.map((dataset: Dataset) => (
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
                placeholder="e.g., Landscape Image Classification"
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
                placeholder="Describe the purpose of this dataset..."
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
      <Dialog open={isAddItemDialogOpen} onOpenChange={setIsAddItemDialogOpen}>
        <DialogContent className="sm:max-w-[550px]">
          <DialogHeader>
            <DialogTitle>Add Dataset Item</DialogTitle>
            <DialogDescription>
              Add a new item to "{selectedDataset?.name}".
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
                  <RadioGroupItem value="text" id="input-text" />
                  <Label htmlFor="input-text">Text</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="image" id="input-image" />
                  <Label htmlFor="input-image">Image</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="pdf" id="input-pdf" />
                  <Label htmlFor="input-pdf">PDF</Label>
                </div>
              </RadioGroup>
            </div>
            
            {/* Conditional input based on type */}
            {newDatasetItem.inputType === "text" && (
              <div className="space-y-2">
                <label htmlFor="inputText" className="text-sm font-medium">
                  Input Text
                </label>
                <Textarea
                  id="inputText"
                  value={newDatasetItem.inputText}
                  onChange={(e) => setNewDatasetItem({ ...newDatasetItem, inputText: e.target.value })}
                  placeholder="Enter text input..."
                  rows={4}
                />
              </div>
            )}
            
            {newDatasetItem.inputType === "image" && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="imageUrl" className="text-sm font-medium">
                    Image URL
                  </label>
                  <Input
                    id="imageUrl"
                    value={newDatasetItem.inputImage}
                    onChange={(e) => setNewDatasetItem({ ...newDatasetItem, inputImage: e.target.value })}
                    placeholder="https://example.com/image.jpg"
                    disabled={!!uploadedImage}
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
                          toast({
                            title: "Image uploaded",
                            description: "Image has been uploaded."
                          });
                        }
                      };
                      reader.readAsDataURL(files[0]);
                    } else {
                      toast({
                        title: "Invalid file",
                        description: "Please upload an image file.",
                        variant: "destructive"
                      });
                    }
                  }}
                >
                  <input
                    type="file"
                    id="imageUpload"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const files = e.target.files;
                      if (files && files.length > 0) {
                        const reader = new FileReader();
                        reader.onload = (event) => {
                          if (event.target?.result) {
                            setUploadedImage(event.target.result as string);
                            toast({
                              title: "Image uploaded",
                              description: "Image has been uploaded."
                            });
                          }
                        };
                        reader.readAsDataURL(files[0]);
                      }
                    }}
                  />
                  
                  {uploadedImage ? (
                    <div className="flex flex-col items-center justify-center gap-2">
                      <img 
                        src={uploadedImage} 
                        alt="Uploaded" 
                        className="max-h-32 object-contain"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setUploadedImage(null);
                          setNewDatasetItem({ ...newDatasetItem, inputImage: "" });
                        }}
                      >
                        Remove
                      </Button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center gap-2">
                      <span className="material-icons text-4xl text-gray-400">image</span>
                      <p>Drag & drop an image here or click to browse</p>
                      <p className="text-xs text-gray-500">Supports JPEG, PNG, GIF, etc.</p>
                    </div>
                  )}
                </div>
              </div>
            )}
            
            {newDatasetItem.inputType === "pdf" && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="pdfId" className="text-sm font-medium">
                    PDF ID
                  </label>
                  <Input
                    id="pdfId"
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
                          
                          // Save the file ID (name without extension) to the form state
                          const fileName = files[0].name;
                          const fileId = fileName.replace('.pdf', '');
                          setNewDatasetItem({ ...newDatasetItem, inputPdf: fileId });
                        }
                      };
                      reader.readAsDataURL(files[0]);
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
              </div>
            )}
            
            <div className="space-y-2">
              <label htmlFor="validResponse" className="text-sm font-medium">
                Valid Response
              </label>
              <Textarea
                id="validResponse"
                value={newDatasetItem.validResponse}
                onChange={(e) => setNewDatasetItem({ ...newDatasetItem, validResponse: e.target.value })}
                placeholder="Enter the expected valid response for this input..."
                rows={3}
              />
            </div>
          </div>
          
          <div className="flex justify-end">
            <Button 
              onClick={handleAddDatasetItem} 
              disabled={addDatasetItemMutation.isPending}
            >
              {addDatasetItemMutation.isPending ? (
                <>
                  <span className="material-icons animate-spin mr-2">refresh</span>
                  Adding...
                </>
              ) : "Add Item"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      
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
            
            {/* Conditional input based on type */}
            {newDatasetItem.inputType === "text" && (
              <div className="space-y-2">
                <label htmlFor="edit-inputText" className="text-sm font-medium">
                  Input Text
                </label>
                <Textarea
                  id="edit-inputText"
                  value={newDatasetItem.inputText}
                  onChange={(e) => setNewDatasetItem({ ...newDatasetItem, inputText: e.target.value })}
                  placeholder="Enter text input..."
                  rows={4}
                />
              </div>
            )}
            
            {newDatasetItem.inputType === "image" && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="edit-imageUrl" className="text-sm font-medium">
                    Image URL
                  </label>
                  <Input
                    id="edit-imageUrl"
                    value={newDatasetItem.inputImage}
                    onChange={(e) => setNewDatasetItem({ ...newDatasetItem, inputImage: e.target.value })}
                    placeholder="https://example.com/image.jpg"
                    disabled={!!uploadedImage}
                  />
                </div>
                
                <div 
                  className="border-2 border-dashed rounded-md p-6 text-center cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => document.getElementById('edit-imageUpload')?.click()}
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
                          toast({
                            title: "Image uploaded",
                            description: "Image has been uploaded."
                          });
                        }
                      };
                      reader.readAsDataURL(files[0]);
                    } else {
                      toast({
                        title: "Invalid file",
                        description: "Please upload an image file.",
                        variant: "destructive"
                      });
                    }
                  }}
                >
                  <input
                    type="file"
                    id="edit-imageUpload"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const files = e.target.files;
                      if (files && files.length > 0) {
                        const reader = new FileReader();
                        reader.onload = (event) => {
                          if (event.target?.result) {
                            setUploadedImage(event.target.result as string);
                            toast({
                              title: "Image uploaded",
                              description: "Image has been uploaded."
                            });
                          }
                        };
                        reader.readAsDataURL(files[0]);
                      }
                    }}
                  />
                  
                  {uploadedImage ? (
                    <div className="flex flex-col items-center justify-center gap-2">
                      <img 
                        src={uploadedImage} 
                        alt="Uploaded" 
                        className="max-h-32 object-contain"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setUploadedImage(null);
                          setNewDatasetItem({ ...newDatasetItem, inputImage: "" });
                        }}
                      >
                        Remove
                      </Button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center gap-2">
                      <span className="material-icons text-4xl text-gray-400">image</span>
                      <p>Drag & drop an image here or click to browse</p>
                      <p className="text-xs text-gray-500">Supports JPEG, PNG, GIF, etc.</p>
                    </div>
                  )}
                </div>
              </div>
            )}
            
            {newDatasetItem.inputType === "pdf" && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="edit-pdfId" className="text-sm font-medium">
                    PDF ID
                  </label>
                  <Input
                    id="edit-pdfId"
                    value={newDatasetItem.inputPdf}
                    onChange={(e) => setNewDatasetItem({ ...newDatasetItem, inputPdf: e.target.value })}
                    placeholder="e.g., document-id-123"
                    disabled={!!uploadedPdf}
                  />
                </div>
                
                <div 
                  className="border-2 border-dashed rounded-md p-6 text-center cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => document.getElementById('edit-pdfUpload')?.click()}
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
                          
                          // Save the file ID (name without extension) to the form state
                          const fileName = files[0].name;
                          const fileId = fileName.replace('.pdf', '');
                          setNewDatasetItem({ ...newDatasetItem, inputPdf: fileId });
                        }
                      };
                      reader.readAsDataURL(files[0]);
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
                    id="edit-pdfUpload"
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
                      {uploadedPdf === "placeholder" ? (
                        <>
                          <span className="material-icons text-4xl text-blue-500">description</span>
                          <p className="text-sm">Using existing PDF</p>
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
                        </>
                      ) : (
                        <>
                          <span className="material-icons text-4xl text-green-500">description</span>
                          <p className="text-sm">New PDF uploaded successfully</p>
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
                        </>
                      )}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center gap-2">
                      <span className="material-icons text-4xl text-gray-400">upload_file</span>
                      <p>Drag & drop a PDF file here or click to browse</p>
                      <p className="text-xs text-gray-500">Supports PDF files only</p>
                    </div>
                  )}
                </div>
              </div>
            )}
            
            <div className="space-y-2">
              <label htmlFor="edit-validResponse" className="text-sm font-medium">
                Valid Response
              </label>
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