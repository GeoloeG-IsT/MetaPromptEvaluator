import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';
import * as https from 'https';
import * as http from 'http';
import { Readable } from 'stream';

// LlamaParse API endpoint
const LLAMAPARSE_API_URL = 'https://api.cloud.llamaindex.ai/api/llamaparse';
const LLAMAPARSE_HOST = 'api.cloud.llamaindex.ai';
const LLAMAPARSE_PATH = '/api/llamaparse';

/**
 * Parse a PDF file using LlamaIndex Cloud's LlamaParse service
 * This converts the PDF into Markdown format with enhanced text extraction
 * 
 * @param pdfFilePath Path to the PDF file to parse
 * @param outputMarkdownPath Path where the output markdown file should be saved
 * @returns The parsed markdown content
 */
export async function parsePdfToMarkdown(
  pdfFilePath: string, 
  outputMarkdownPath: string
): Promise<string> {
  try {
    console.log(`Parsing PDF to Markdown using LlamaParse: ${pdfFilePath}`);
    
    // Check if we have the API key
    const apiKey = process.env.LLAMAINDEX_API_KEY;
    if (!apiKey) {
      throw new Error('LlamaIndex API key not found in environment variables');
    }
    
    // Check if file exists
    if (!fs.existsSync(pdfFilePath)) {
      throw new Error(`PDF file not found at path: ${pdfFilePath}`);
    }
    
    // Read the PDF file
    const fileData = fs.readFileSync(pdfFilePath);
    const fileSize = fileData.length;
    const fileName = path.basename(pdfFilePath);
    
    return new Promise((resolve, reject) => {
      try {
        console.log(`Uploading PDF file: ${fileName} (${fileSize} bytes)`);
        
        // Create a random boundary for the multipart form
        const boundary = `----FormBoundary${Math.random().toString(36).substring(2)}`;
        
        // Create the multipart form data manually
        const postData = createMultipartForm(boundary, fileData, fileName);
        
        // Set up the request options
        const options = {
          hostname: LLAMAPARSE_HOST,
          port: 443,
          path: LLAMAPARSE_PATH,
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': `multipart/form-data; boundary=${boundary}`,
            'Content-Length': postData.length
          }
        };
        
        console.log(`Sending request to LlamaParse API: ${LLAMAPARSE_HOST}${LLAMAPARSE_PATH}`);
        
        // Make the request
        const req = https.request(options, (res) => {
          let data = '';
          
          // Handle response data
          res.on('data', (chunk) => {
            data += chunk;
          });
          
          // Handle request completion
          res.on('end', () => {
            // Check response status
            if (res.statusCode !== 200) {
              console.error(`LlamaParse API error: ${res.statusCode} - ${data}`);
              return reject(new Error(`LlamaParse API error: ${res.statusCode} - ${res.statusMessage}`));
            }
            
            try {
              // Parse the response
              const result = JSON.parse(data);
              console.log(`Successfully parsed PDF to Markdown, response received`);
              
              const markdownContent = result.markdown || '';
              console.log(`Markdown length: ${markdownContent.length} characters`);
              
              // Save the markdown to file
              fs.writeFileSync(outputMarkdownPath, markdownContent);
              console.log(`Saved markdown content to: ${outputMarkdownPath}`);
              
              resolve(markdownContent);
            } catch (parseError) {
              reject(new Error(`Failed to parse API response: ${parseError.message}`));
            }
          });
        });
        
        // Handle request errors
        req.on('error', (error) => {
          console.error('Error making request to LlamaParse API:', error);
          reject(new Error(`Request to LlamaParse API failed: ${error.message}`));
        });
        
        // Send the request data
        req.write(postData);
        req.end();
        
      } catch (error) {
        reject(new Error(`Failed to make API request: ${error.message}`));
      }
    });
    
  } catch (error: any) {
    console.error('Error parsing PDF to Markdown:', error);
    throw new Error(`Failed to parse PDF: ${error?.message || 'Unknown error'}`);
  }
}

/**
 * Create a multipart form with the PDF file
 * 
 * @param boundary The boundary string for the multipart form
 * @param fileData The PDF file data
 * @param fileName The name of the PDF file
 * @returns The multipart form data as a Buffer
 */
function createMultipartForm(boundary: string, fileData: Buffer, fileName: string): Buffer {
  // Create form parts
  const formParts = [];
  
  // Add the file part
  formParts.push(
    `--${boundary}\r\n` +
    `Content-Disposition: form-data; name="file"; filename="${fileName}"\r\n` +
    `Content-Type: application/pdf\r\n\r\n`
  );
  formParts.push(fileData);
  formParts.push('\r\n');
  
  // Add the result_type part
  formParts.push(
    `--${boundary}\r\n` +
    `Content-Disposition: form-data; name="result_type"\r\n\r\n` +
    `markdown\r\n`
  );
  
  // Add the closing boundary
  formParts.push(`--${boundary}--\r\n`);
  
  // Combine all parts into a single buffer
  return Buffer.concat(
    formParts.map(part => typeof part === 'string' ? Buffer.from(part) : part)
  );
}

/**
 * Check if a PDF has already been parsed to markdown
 * 
 * @param markdownPath Path to check for existing markdown file
 * @returns true if the markdown file exists
 */
export function isPdfAlreadyParsed(markdownPath: string): boolean {
  return fs.existsSync(markdownPath);
}

/**
 * Get the markdown content for a PDF that was already parsed
 * 
 * @param markdownPath Path to the markdown file
 * @returns The markdown content
 */
export async function getExistingMarkdownContent(markdownPath: string): Promise<string> {
  try {
    const readFile = promisify(fs.readFile);
    const content = await readFile(markdownPath, 'utf-8');
    return content;
  } catch (error: any) {
    console.error('Error reading existing markdown file:', error);
    throw new Error(`Failed to read markdown file: ${error?.message || 'Unknown error'}`);
  }
}