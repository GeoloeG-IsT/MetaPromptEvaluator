import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Dataset, DatasetItem } from '@shared/schema';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import UploadDropzone from './UploadDropzone';

interface DatasetItemDialogProps {
  isOpen: boolean;
  onClose: () => void;
  dataset?: {
    id: number;
    name: string;
    description: string | null;
    userId: number | null;
    itemCount: number | null;
    createdAt: Date | string | null;
  };
}

export default function DatasetItemDialog({
  isOpen,
  onClose,
  dataset
}: DatasetItemDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Input type state
  const [inputType, setInputType] = useState<string>('text');
  
  // Text input state
  const [inputText, setInputText] = useState<string>('');
  
  // Image input state
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageData, setImageData] = useState<string | null>(null);
  
  // PDF input state
  const [pdfName, setPdfName] = useState<string | null>(null);
  const [pdfData, setPdfData] = useState<string | null>(null);
  const [pdfId, setPdfId] = useState<string | null>(null);
  
  // Valid response state
  const [validResponse, setValidResponse] = useState<string>('');
  
  // Loading state
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Clear state when dialog closes
  useEffect(() => {
    if (!isOpen) {
      setInputType('text');
      setInputText('');
      setImagePreview(null);
      setImageData(null);
      setPdfName(null);
      setPdfData(null);
      setPdfId(null);
      setValidResponse('');
      setIsSubmitting(false);
    }
  }, [isOpen]);
  
  // Handle file uploads
  const handleFileUpload = (file: File, type: 'image' | 'pdf') => {
    const reader = new FileReader();
    
    reader.onload = () => {
      const result = reader.result as string;
      
      if (type === 'image') {
        setImagePreview(result);
        setImageData(result);
      } else {
        setPdfName(file.name);
        setPdfData(result);
      }
    };
    
    reader.readAsDataURL(file);
  };
  
  // Upload PDF to server and get fileId
  const uploadPdfMutation = useMutation({
    mutationFn: async (pdfData: string) => {
      // Extract the base64 data from the data URL
      const base64Data = pdfData.split(',')[1];
      
      return await apiRequest('POST', '/api/pdf-upload', {
        fileData: base64Data,
        fileName: pdfName
      });
    },
    onSuccess: (response: any) => {
      console.log('PDF uploaded successfully:', response);
      setPdfId(response.fileId);
      
      // Show success toast
      toast({
        title: 'PDF uploaded',
        description: `The PDF "${response.originalFileName}" has been uploaded successfully`
      });
      
      // Continue with dataset item creation
      createDatasetItemMutation.mutate({
        datasetId: dataset?.id as number,
        inputType: 'pdf',
        inputText: '',
        inputImage: '',
        inputPdf: response.fileId,
        validResponse
      });
    },
    onError: (error) => {
      console.error('Error uploading PDF:', error);
      setIsSubmitting(false);
      
      toast({
        title: 'Upload failed',
        description: 'There was an error uploading the PDF. Please try again.',
        variant: 'destructive'
      });
    }
  });
  
  // Create dataset item mutation
  const createDatasetItemMutation = useMutation({
    mutationFn: async (data: any) => {
      console.log('Creating dataset item with data:', data);
      return await apiRequest('POST', '/api/dataset-items', data);
    },
    onSuccess: (response) => {
      console.log('Dataset item created successfully:', response);
      setIsSubmitting(false);
      
      // Show success toast
      toast({
        title: 'Item added',
        description: 'The dataset item has been added successfully'
      });
      
      // Refresh dataset items
      queryClient.invalidateQueries({queryKey: [`/api/datasets/${dataset?.id}/items`]});
      queryClient.invalidateQueries({queryKey: ['/api/datasets']});
      
      // Close dialog
      onClose();
    },
    onError: (error) => {
      console.error('Error creating dataset item:', error);
      setIsSubmitting(false);
      
      toast({
        title: 'Error',
        description: 'There was an error adding the dataset item',
        variant: 'destructive'
      });
    }
  });
  
  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!dataset) {
      toast({
        title: 'Error',
        description: 'No dataset selected',
        variant: 'destructive'
      });
      return;
    }
    
    if (!validResponse) {
      toast({
        title: 'Error',
        description: 'Please provide a valid response',
        variant: 'destructive'
      });
      return;
    }
    
    // Immediately set the submitting state to show the spinner
    setIsSubmitting(true);
    
    try {
      // Handle different input types
      if (inputType === 'text') {
        if (!inputText) {
          toast({
            title: 'Error',
            description: 'Please provide input text',
            variant: 'destructive'
          });
          setIsSubmitting(false);
          return;
        }
        
        // Create text dataset item
        createDatasetItemMutation.mutate({
          datasetId: dataset.id,
          inputType: 'text',
          inputText,
          inputImage: '',
          inputPdf: '',
          validResponse
        });
        
      } else if (inputType === 'image') {
        if (!imageData) {
          toast({
            title: 'Error',
            description: 'Please upload an image',
            variant: 'destructive'
          });
          setIsSubmitting(false);
          return;
        }
        
        // Create image dataset item
        createDatasetItemMutation.mutate({
          datasetId: dataset.id,
          inputType: 'image',
          inputText: '',
          inputImage: imageData,
          inputPdf: '',
          validResponse
        });
        
      } else if (inputType === 'pdf') {
        if (!pdfData) {
          toast({
            title: 'Error',
            description: 'Please upload a PDF',
            variant: 'destructive'
          });
          setIsSubmitting(false);
          return;
        }
        
        if (pdfId) {
          // If we already have a PDF ID, create the dataset item
          createDatasetItemMutation.mutate({
            datasetId: dataset.id,
            inputType: 'pdf',
            inputText: '',
            inputImage: '',
            inputPdf: pdfId,
            validResponse
          });
        } else {
          // Upload PDF first
          uploadPdfMutation.mutate(pdfData);
        }
      }
    } catch (error) {
      console.error('Error adding dataset item:', error);
      setIsSubmitting(false);
      
      toast({
        title: 'Error',
        description: 'There was an error adding the dataset item',
        variant: 'destructive'
      });
    }
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Add Dataset Item to {dataset?.name || 'Dataset'}</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          {/* Input type selection */}
          <div className="space-y-2">
            <Label htmlFor="inputType">Input Type</Label>
            <Select
              value={inputType}
              onValueChange={setInputType}
              disabled={isSubmitting}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select input type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="text">Text</SelectItem>
                <SelectItem value="image">Image</SelectItem>
                <SelectItem value="pdf">PDF</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {/* Input content */}
          <div className="space-y-2">
            <Label>Input Content</Label>
            
            {inputType === 'text' && (
              <Textarea
                placeholder="Enter input text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                className="min-h-[200px]"
                disabled={isSubmitting}
              />
            )}
            
            {inputType === 'image' && (
              <div className="border rounded-md p-4">
                <UploadDropzone
                  accept="image/*"
                  maxSize={5}
                  onUpload={(file) => handleFileUpload(file, 'image')}
                  disabled={isSubmitting}
                />
                
                {imagePreview && (
                  <div className="mt-4 flex justify-center">
                    <img
                      src={imagePreview}
                      alt="Preview"
                      className="max-h-[300px] max-w-full object-contain"
                    />
                  </div>
                )}
              </div>
            )}
            
            {inputType === 'pdf' && (
              <div className="border rounded-md p-4">
                <UploadDropzone
                  accept=".pdf"
                  maxSize={10}
                  onUpload={(file) => handleFileUpload(file, 'pdf')}
                  disabled={isSubmitting}
                />
                
                {pdfName && (
                  <div className="mt-4 flex items-center">
                    <span className="material-icons text-red-600 mr-2">picture_as_pdf</span>
                    <span className="text-sm">{pdfName}</span>
                  </div>
                )}
                
                {pdfId && (
                  <div className="mt-2 flex items-center">
                    <span className="material-icons text-green-600 mr-2">check_circle</span>
                    <span className="text-sm">PDF uploaded and processed (ID: {pdfId})</span>
                  </div>
                )}
              </div>
            )}
          </div>
          
          {/* Valid response */}
          <div className="space-y-2">
            <Label htmlFor="validResponse">Valid Response</Label>
            <Textarea
              id="validResponse"
              placeholder="Enter the expected valid response for this input"
              value={validResponse}
              onChange={(e) => setValidResponse(e.target.value)}
              className="min-h-[200px]"
              disabled={isSubmitting}
            />
            <p className="text-xs text-muted-foreground">
              The valid response is what the LLM should generate for this input.
              For structured data, use JSON format.
            </p>
          </div>
          
          <DialogFooter className="pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <span className="material-icons animate-spin mr-2">refresh</span>
                  Adding...
                </>
              ) : (
                'Add Item'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}