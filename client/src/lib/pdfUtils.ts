/**
 * Utility functions for working with PDF files
 */

/**
 * Generate a unique PDF file ID
 * @returns A unique PDF file ID
 */
export function generatePdfId(): string {
  const timestamp = Date.now().toString(36);
  const randomStr = Math.random().toString(36).substring(2, 10);
  return `pdf-${timestamp}-${randomStr}`;
}

/**
 * Response from PDF upload API
 */
export interface PdfUploadResponse {
  fileId: string;
  textPreview?: string;
  extractionSuccess?: boolean;
  extractionError?: string;
}

/**
 * Upload a PDF file to the server
 * @param pdfData Base64 encoded PDF data
 * @param fileId Optional file ID (if not provided, one will be generated)
 * @returns The PDF upload response including fileId and text extraction status
 */
export async function uploadPdf(pdfData: string, fileId: string = generatePdfId()): Promise<PdfUploadResponse> {
  try {
    const response = await fetch('/api/pdf-upload', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ pdfData, fileId }),
    });

    if (!response.ok) {
      throw new Error(`Failed to upload PDF: ${response.statusText}`);
    }

    const result = await response.json();
    
    // Return the complete response object which includes:
    // - fileId: The ID of the uploaded PDF
    // - textPreview: A preview of the extracted text (if extraction succeeded)
    // - extractionSuccess: Boolean indicating if text extraction succeeded
    // - extractionError: Error message if text extraction failed
    return result;
  } catch (error) {
    console.error('Error uploading PDF:', error);
    throw error;
  }
}

/**
 * Get a PDF file from the server
 * @param fileId The file ID of the PDF to get
 * @returns Base64 encoded PDF data as a data URL
 */
export async function getPdf(fileId: string): Promise<string> {
  try {
    console.log(`Getting PDF with ID: ${fileId} from server`);
    const response = await fetch(`/api/pdf/${fileId}`);
    
    if (!response.ok) {
      throw new Error(`Failed to get PDF: ${response.statusText}`);
    }
    
    const result = await response.json();
    console.log('Received PDF data response:', result);
    
    // Check if we already have a data URI or just base64 data
    if (result.pdfData && result.pdfData.startsWith('data:application/pdf;base64,')) {
      // Already in correct format, return as is
      return result.pdfData;
    } else if (result.pdfData) {
      // Need to add the data URI prefix
      return `data:application/pdf;base64,${result.pdfData}`;
    } else {
      throw new Error('PDF data not found in server response');
    }
  } catch (error) {
    console.error('Error getting PDF:', error);
    throw error;
  }
}

/**
 * Delete a PDF file from the server
 * @param fileId The file ID of the PDF to delete
 */
export async function deletePdf(fileId: string): Promise<void> {
  try {
    const response = await fetch(`/api/pdf/${fileId}`, {
      method: 'DELETE',
    });
    
    if (!response.ok) {
      throw new Error(`Failed to delete PDF: ${response.statusText}`);
    }
  } catch (error) {
    console.error('Error deleting PDF:', error);
    throw error;
  }
}