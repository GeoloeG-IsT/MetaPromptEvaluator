import { Request, Response } from 'express';
import https from 'https';
import { storage } from './storage';
import { InsertDataset, InsertDatasetItem } from '@shared/schema';

// Types for Airtable response
interface AirtableRecord {
  id: string;
  fields: {
    [key: string]: any;
  };
}

interface AirtableResponse {
  records: AirtableRecord[];
}

/**
 * Extract text from PDF content
 * This is a simplified version that doesn't actually extract text
 * In a real implementation, you would use a library like pdf-parse or pdfjs-dist
 */
async function extractTextFromPdf(pdfUrl: string): Promise<string> {
  try {
    // Fetch the PDF file
    const pdfData = await fetchPdfBinary(pdfUrl);
    
    // For demo purposes, we're just returning a placeholder
    // In real implementation, you would use a PDF parser library
    return `[PDF Text extracted from ${pdfUrl}. This is a placeholder for the actual text that would be extracted from the PDF.]`;
  } catch (error: any) {
    console.error('Error extracting text from PDF:', error);
    return `[Failed to extract text from PDF: ${error.message || 'Unknown error'}]`;
  }
}

/**
 * Fetch binary content from a URL
 */
function fetchPdfBinary(url: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    https.get(url, (response) => {
      // Handle redirects
      if (response.statusCode === 302 || response.statusCode === 301) {
        const redirectUrl = response.headers.location;
        if (!redirectUrl) {
          reject(new Error('Redirect URL is missing'));
          return;
        }
        
        fetchPdfBinary(redirectUrl)
          .then(resolve)
          .catch(reject);
        return;
      }
      
      if (response.statusCode !== 200) {
        reject(new Error(`Failed to fetch PDF: ${response.statusCode}`));
        return;
      }
      
      const chunks: Buffer[] = [];
      response.on('data', (chunk) => chunks.push(chunk));
      response.on('end', () => resolve(Buffer.concat(chunks)));
      response.on('error', reject);
    }).on('error', reject);
  });
}

/**
 * Fetch data from Airtable API
 */
async function fetchAirtableData(airtableUrl: string): Promise<AirtableResponse> {
  return new Promise((resolve, reject) => {
    // Extract base ID and table name from URL
    const urlParts = airtableUrl.split('/');
    const baseId = urlParts[urlParts.indexOf('airtable.com') + 1];
    const tableName = urlParts[urlParts.length - 1];
    
    const apiUrl = `https://api.airtable.com/v0/${baseId}/${tableName}`;
    
    // Here you would use an API key from environment variables
    // For now, we'll simulate a response
    
    // In a real implementation, you would make a fetch request:
    // const response = await fetch(apiUrl, {
    //   headers: {
    //     'Authorization': `Bearer ${process.env.AIRTABLE_API_KEY}`
    //   }
    // });

    // Simulate response for demo
    const mockResponse: AirtableResponse = {
      records: [
        {
          id: 'rec1',
          fields: {
            'File ID': 'FILE001',
            'Expected Output': 'This document describes a senior case study.',
            'PDF': [{ url: 'https://example.com/file1.pdf' }]
          }
        },
        {
          id: 'rec2',
          fields: {
            'File ID': 'FILE002',
            'Expected Output': 'The patient shows improved recovery rates.',
            'PDF': [{ url: 'https://example.com/file2.pdf' }]
          }
        },
        {
          id: 'rec3',
          fields: {
            'File ID': 'FILE003',
            'Expected Output': 'Analysis indicates positive treatment outcomes.',
            'PDF': [{ url: 'https://example.com/file3.pdf' }]
          }
        }
      ]
    };
    
    resolve(mockResponse);
  });
}

export async function importFromAirtable(req: Request, res: Response) {
  try {
    const { airtableUrl } = req.body;
    
    if (!airtableUrl) {
      return res.status(400).json({ message: "Airtable URL is required" });
    }
    
    console.log(`Importing data from Airtable: ${airtableUrl}`);
    
    // Fetch data from Airtable
    const airtableData = await fetchAirtableData(airtableUrl);
    
    if (!airtableData || !airtableData.records || airtableData.records.length === 0) {
      return res.status(404).json({ message: "No records found in Airtable" });
    }
    
    // Create a new dataset
    const datasetName = "Senior Case Study Data"; // You could extract this from the Airtable name
    const newDataset: InsertDataset = {
      name: datasetName,
      category: "imported", // Required field
      description: `Imported from Airtable on ${new Date().toISOString()}`,
      userId: 1 // Default user for demo
    };
    
    const dataset = await storage.createDataset(newDataset);
    
    console.log(`Created dataset: ${dataset.name} (ID: ${dataset.id})`);
    
    // Process each record and add it to the dataset
    const processingResults = [];
    
    for (const record of airtableData.records) {
      try {
        const fileId = record.fields['File ID'];
        const expectedOutput = record.fields['Expected Output'];
        const pdfUrl = record.fields['PDF']?.[0]?.url;
        
        if (!expectedOutput) {
          processingResults.push({
            recordId: record.id,
            status: 'error',
            message: 'Missing expected output'
          });
          continue;
        }
        
        if (!pdfUrl) {
          processingResults.push({
            recordId: record.id,
            status: 'error',
            message: 'Missing PDF URL'
          });
          continue;
        }
        
        // Extract text from PDF
        const extractedText = await extractTextFromPdf(pdfUrl);
        
        // Create dataset item
        const newItem: InsertDatasetItem = {
          datasetId: dataset.id,
          inputType: 'text',
          inputText: extractedText,
          validResponse: expectedOutput,
          fileId: fileId || record.id
        };
        
        const item = await storage.createDatasetItem(newItem);
        
        processingResults.push({
          recordId: record.id,
          status: 'success',
          datasetItemId: item.id
        });
      } catch (error: any) {
        console.error(`Error processing record ${record.id}:`, error);
        processingResults.push({
          recordId: record.id,
          status: 'error',
          message: error.message || 'Unknown error'
        });
      }
    }
    
    // Update the dataset with the final item count
    const successCount = processingResults.filter(r => r.status === 'success').length;
    
    return res.json({
      dataset: {
        id: dataset.id,
        name: dataset.name,
        itemCount: successCount
      },
      results: processingResults
    });
  } catch (error: any) {
    console.error('Error importing from Airtable:', error);
    return res.status(500).json({ 
      message: "Failed to import from Airtable", 
      error: error.message || 'Unknown error'
    });
  }
}