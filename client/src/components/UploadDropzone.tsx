import React, { useState, useCallback } from 'react';
import { Input } from '@/components/ui/input';

interface UploadDropzoneProps {
  accept: string;
  maxSize?: number; // In MB
  onUpload: (file: File) => void;
  disabled?: boolean;
}

export default function UploadDropzone({
  accept,
  maxSize = 5,
  onUpload,
  disabled = false
}: UploadDropzoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (disabled) return;
    setIsDragging(true);
  }, [disabled]);
  
  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);
  
  const validateFile = useCallback((file: File): boolean => {
    // Check file type
    if (!file.type.match(accept.replace(/\*/g, '.*'))) {
      setErrorMessage(`Invalid file type. Please upload ${accept} files.`);
      return false;
    }
    
    // Check file size
    if (file.size > maxSize * 1024 * 1024) {
      setErrorMessage(`File is too large. Maximum size is ${maxSize}MB.`);
      return false;
    }
    
    setErrorMessage(null);
    return true;
  }, [accept, maxSize]);
  
  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (disabled) return;
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length === 0) return;
    
    const file = files[0]; // Only process the first file
    if (validateFile(file)) {
      onUpload(file);
    }
  }, [disabled, validateFile, onUpload]);
  
  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (disabled) return;
    
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    const file = files[0]; // Only process the first file
    if (validateFile(file)) {
      onUpload(file);
    }
  }, [disabled, validateFile, onUpload]);
  
  return (
    <div 
      className={`relative flex flex-col items-center justify-center w-full h-32 p-4 border-2 border-dashed rounded-md transition-colors ${
        isDragging 
          ? 'border-primary bg-primary/10' 
          : 'border-gray-300 bg-gray-50/50 hover:bg-gray-50'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className="flex flex-col items-center justify-center text-center">
        <span className="material-icons text-3xl text-gray-400 mb-2">
          {accept.includes('image') ? 'image' : 'description'}
        </span>
        <p className="text-sm font-medium text-gray-700">
          Drag and drop or click to upload
        </p>
        <p className="text-xs text-gray-500 mt-1">
          {accept.includes('image') ? 'PNG, JPG, GIF up to ' : 'PDF files up to '}
          {maxSize}MB
        </p>
        {errorMessage && (
          <p className="text-xs text-red-500 mt-2">{errorMessage}</p>
        )}
      </div>
      <Input
        type="file"
        accept={accept}
        onChange={handleFileChange}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        disabled={disabled}
      />
    </div>
  );
}