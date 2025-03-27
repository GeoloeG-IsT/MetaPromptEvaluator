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
 * Upload a PDF file to the server
 * @param pdfData Base64 encoded PDF data
 * @param fileId Optional file ID (if not provided, one will be generated)
 * @returns The file ID of the uploaded PDF
 */
export async function uploadPdf(pdfData: string, fileId: string = generatePdfId()): Promise<string> {
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
    return result.fileId;
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
    const response = await fetch(`/api/pdf/${fileId}`);
    
    if (!response.ok) {
      throw new Error(`Failed to get PDF: ${response.statusText}`);
    }
    
    const result = await response.json();
    return `data:application/pdf;base64,${result.pdfData}`;
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