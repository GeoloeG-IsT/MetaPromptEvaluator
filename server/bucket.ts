import fs from 'fs';
import path from 'path';
import { promisify } from 'util';
import { mkdir } from 'fs/promises';

// Define the bucket name for PDF storage
const BUCKET_NAME = 'MetaPromptEvaluatorBucket';

/**
 * A class that implements local storage for files
 * Emulates a cloud storage bucket but stores files locally
 */
class LocalBucketStorage {
  private bucketPath: string;

  /**
   * Create a new local bucket storage
   * @param bucketName The name of the bucket
   */
  constructor(bucketName: string) {
    // Create storage directory in the project root
    this.bucketPath = path.join('.', bucketName);
    
    // Create the directory if it doesn't exist
    if (!fs.existsSync(this.bucketPath)) {
      mkdir(this.bucketPath, { recursive: true })
        .then(() => console.log(`Created bucket storage at ${this.bucketPath}`))
        .catch((err) => console.error(`Failed to create bucket storage: ${err}`));
    }
  }

  /**
   * Upload a PDF file to the bucket
   * @param fileData Base64 encoded file data
   * @param fileId Unique identifier for the file (file name without extension)
   * @returns The file ID
   */
  async uploadPdf(fileData: string, fileId: string): Promise<string> {
    try {
      const writeFile = promisify(fs.writeFile);
      
      // Remove data URI scheme if present
      const base64Data = fileData.replace(/^data:application\/pdf;base64,/, '');
      
      // Convert base64 to buffer
      const buffer = Buffer.from(base64Data, 'base64');
      
      // Write to file
      const filePath = path.join(this.bucketPath, `${fileId}.pdf`);
      await writeFile(filePath, buffer);
      
      return fileId;
    } catch (error: any) {
      console.error('Error uploading PDF to bucket:', error);
      throw new Error(`Failed to upload PDF: ${error?.message || 'Unknown error'}`);
    }
  }

  /**
   * Get a PDF file from the bucket
   * @param fileId The file ID
   * @returns Base64 encoded file data
   */
  async getPdf(fileId: string): Promise<string> {
    try {
      const readFile = promisify(fs.readFile);
      const filePath = path.join(this.bucketPath, `${fileId}.pdf`);
      
      // Check if the file exists
      if (!fs.existsSync(filePath)) {
        throw new Error(`PDF file not found: ${fileId}`);
      }
      
      // Read the file
      const data = await readFile(filePath);
      
      // Convert to base64
      const base64Data = data.toString('base64');
      
      // Return with proper data URI format
      return `data:application/pdf;base64,${base64Data}`;
    } catch (error: any) {
      console.error('Error retrieving PDF from bucket:', error);
      throw new Error(`Failed to retrieve PDF: ${error?.message || 'Unknown error'}`);
    }
  }

  /**
   * Delete a PDF file from the bucket
   * @param fileId The file ID
   */
  async deletePdf(fileId: string): Promise<void> {
    try {
      const unlink = promisify(fs.unlink);
      const filePath = path.join(this.bucketPath, `${fileId}.pdf`);
      
      // Check if the file exists
      if (!fs.existsSync(filePath)) {
        return; // If file doesn't exist, consider the deletion successful
      }
      
      // Delete the file
      await unlink(filePath);
    } catch (error: any) {
      console.error('Error deleting PDF from bucket:', error);
      throw new Error(`Failed to delete PDF: ${error?.message || 'Unknown error'}`);
    }
  }
}

// Create a singleton instance of the bucket storage
export const bucketStorage = new LocalBucketStorage(BUCKET_NAME);