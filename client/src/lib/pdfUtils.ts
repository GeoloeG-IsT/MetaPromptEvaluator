/**
 * Utility functions for handling PDF files
 */

/**
 * Upload a PDF file to the server
 * @param pdfData Base64 encoded PDF data
 * @param fileId Unique identifier for the file
 * @returns The file ID of the uploaded PDF
 */
export async function uploadPdf(pdfData: string, fileId: string): Promise<string> {
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
  } catch (error: any) {
    console.error('Error uploading PDF:', error);
    throw new Error(`PDF upload failed: ${error.message}`);
  }
}

/**
 * Get a PDF file from the server
 * @param fileId The file ID
 * @returns Base64 encoded PDF data
 */
export async function getPdf(fileId: string): Promise<string> {
  try {
    const response = await fetch(`/api/pdf/${fileId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to retrieve PDF: ${response.statusText}`);
    }

    const result = await response.json();
    return result.pdfData;
  } catch (error: any) {
    console.error('Error retrieving PDF:', error);
    throw new Error(`PDF retrieval failed: ${error.message}`);
  }
}

/**
 * Generate a unique file ID for a PDF file
 * @returns A unique file ID
 */
export function generatePdfId(): string {
  return `pdf-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
}