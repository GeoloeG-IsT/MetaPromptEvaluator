import * as fs from "fs";
import * as path from "path";
import { promisify } from "util";
import * as https from "https";
import * as http from "http";

// LlamaIndex API endpoints (from https://docs.cloud.llamaindex.ai/API)
const LLAMAINDEX_API_HOST = "api.cloud.llamaindex.ai";
const UPLOAD_FILE_PATH = "/api/v1/parsing/upload";
const JOB_STATUS_PATH = "/api/v1/parsing/job";
const JOB_RESULT_MARKDOWN_PATH = "/api/v1/parsing/job";

// Maximum number of retries and timeout between retries
const MAX_RETRIES = 30;
const RETRY_TIMEOUT_MS = 2000;

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
  outputMarkdownPath: string,
): Promise<string> {
  try {
    console.log(`Parsing PDF to Markdown using LlamaIndex API: ${pdfFilePath}`);

    // Check if we have the API key
    const apiKey = process.env.LLAMAINDEX_API_KEY;
    if (!apiKey) {
      throw new Error("LlamaIndex API key not found in environment variables");
    }

    // Check if file exists
    if (!fs.existsSync(pdfFilePath)) {
      throw new Error(`PDF file not found at path: ${pdfFilePath}`);
    }

    // Read the PDF file
    const fileData = fs.readFileSync(pdfFilePath);
    const fileSize = fileData.length;
    const fileName = path.basename(pdfFilePath);
    console.log(`PDF file read: ${fileName} (${fileSize} bytes)`);

    // Step 1: Upload the file and get job id
    console.log("Step 1: Uploading PDF to LlamaIndex API for parsing...");
    const jobId = await uploadFileToLlamaIndex(apiKey, fileData, fileName);
    console.log(`Job ID received: ${jobId}`);

    // Step 2: Poll for job status until complete
    console.log("Step 2: Polling for job completion...");
    await waitForJobCompletion(apiKey, jobId);
    console.log("Job completed successfully");

    // Step 3: Get the markdown result
    console.log("Step 3: Retrieving markdown result...");
    const markdownContent = await getJobResultMarkdown(apiKey, jobId);
    console.log(
      `Retrieved markdown content (${markdownContent.length} characters)`,
    );

    // Step 4: Save the markdown file
    console.log(`Step 4: Saving markdown to ${outputMarkdownPath}`);
    fs.writeFileSync(outputMarkdownPath, markdownContent);
    console.log("Markdown saved successfully");

    return markdownContent;
  } catch (error: any) {
    console.error("Error parsing PDF to Markdown:", error);
    throw new Error(
      `Failed to parse PDF: ${error?.message || "Unknown error"}`,
    );
  }
}

/**
 * Upload a file to LlamaIndex API
 * This corresponds to the first step of the LlamaIndex parsing workflow
 *
 * @param apiKey The LlamaIndex API key
 * @param fileData The file data as a Buffer
 * @param fileName The name of the file
 * @returns A Promise that resolves to the job id
 */
async function uploadFileToLlamaIndex(
  apiKey: string,
  fileData: Buffer,
  fileName: string,
): Promise<string> {
  return new Promise((resolve, reject) => {
    try {
      // Create a random boundary for the multipart form
      const boundary = `----FormBoundary${Math.random().toString(36).substring(2)}`;

      // Create the multipart form data with the file
      const formParts = [];

      // Add the file part
      formParts.push(
        `--${boundary}\r\n` +
          `Content-Disposition: form-data; name="file"; filename="${fileName}"\r\n` +
          `Content-Type: application/pdf\r\n\r\n`,
      );
      formParts.push(fileData);
      formParts.push("\r\n");

      // Add the closing boundary
      formParts.push(`--${boundary}--\r\n`);

      // Combine all parts into a single buffer
      const postData = Buffer.concat(
        formParts.map((part) =>
          typeof part === "string" ? Buffer.from(part) : part,
        ),
      );

      // Set up the request options
      const options = {
        hostname: LLAMAINDEX_API_HOST,
        port: 443,
        path: UPLOAD_FILE_PATH,
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": `multipart/form-data; boundary=${boundary}`,
          "Content-Length": postData.length,
          Accept: "application/json",
        },
      };

      console.log(
        `Sending upload request to: ${LLAMAINDEX_API_HOST}${UPLOAD_FILE_PATH}`,
      );

      // Make the request
      const req = https.request(options, (res) => {
        let data = "";

        // Handle response data
        res.on("data", (chunk) => {
          data += chunk;
        });

        // Handle request completion
        res.on("end", () => {
          // Check response status
          if (res.statusCode !== 200) {
            console.error(`Upload API error: ${res.statusCode} - ${data}`);
            return reject(
              new Error(
                `Upload API error: ${res.statusCode} - ${res.statusMessage || "API Error"}`,
              ),
            );
          }

          try {
            // Parse the response to get the job id
            const response = JSON.parse(data);

            if (!response.id) {
              console.error("No id in response:", data);
              return reject(new Error("No id in API response"));
            }

            resolve(response.id);
          } catch (parseError: any) {
            console.error("Failed to parse API response:", parseError);
            console.error("Raw response:", data);
            reject(
              new Error(
                `Failed to parse API response: ${parseError?.message || "Unknown error"}`,
              ),
            );
          }
        });
      });

      // Handle request errors
      req.on("error", (error: any) => {
        console.error("Error making upload request:", error);
        reject(
          new Error(
            `Upload request failed: ${error?.message || "Unknown error"}`,
          ),
        );
      });

      // Send the request data
      req.write(postData);
      req.end();
    } catch (error: any) {
      reject(
        new Error(
          `Failed to upload file: ${error?.message || "Unknown error"}`,
        ),
      );
    }
  });
}

/**
 * Check the status of a parsing job
 *
 * @param apiKey The LlamaIndex API key
 * @param jobId The job ID to check
 * @returns A Promise that resolves to the job status
 */
async function getJobStatus(
  apiKey: string,
  jobId: string,
): Promise<{ status: string; progress?: number }> {
  return new Promise((resolve, reject) => {
    try {
      // Set up the request options
      const options = {
        hostname: LLAMAINDEX_API_HOST,
        port: 443,
        path: `${JOB_STATUS_PATH}/${jobId}`,
        method: "GET",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          Accept: "application/json",
        },
      };

      // Make the request
      const req = https.request(options, (res) => {
        let data = "";

        // Handle response data
        res.on("data", (chunk) => {
          data += chunk;
        });

        // Handle request completion
        res.on("end", () => {
          // Check response status
          if (res.statusCode !== 200) {
            console.error(`Job status API error: ${res.statusCode} - ${data}`);
            return reject(
              new Error(
                `Job status API error: ${res.statusCode} - ${res.statusMessage || "API Error"}`,
              ),
            );
          }

          try {
            // Parse the response to get the job status
            const response = JSON.parse(data);

            if (!response.status) {
              console.error("No status in response:", data);
              return reject(new Error("No status in API response"));
            }

            resolve({
              status: response.status,
              progress: response.progress,
            });
          } catch (parseError: any) {
            console.error("Failed to parse API response:", parseError);
            console.error("Raw response:", data);
            reject(
              new Error(
                `Failed to parse API response: ${parseError?.message || "Unknown error"}`,
              ),
            );
          }
        });
      });

      // Handle request errors
      req.on("error", (error: any) => {
        console.error("Error making job status request:", error);
        reject(
          new Error(
            `Job status request failed: ${error?.message || "Unknown error"}`,
          ),
        );
      });

      // End the request
      req.end();
    } catch (error: any) {
      reject(
        new Error(
          `Failed to get job status: ${error?.message || "Unknown error"}`,
        ),
      );
    }
  });
}

/**
 * Wait for a job to complete by polling its status
 *
 * @param apiKey The LlamaIndex API key
 * @param jobId The job ID to check
 * @returns A Promise that resolves when the job is complete
 */
async function waitForJobCompletion(
  apiKey: string,
  jobId: string,
): Promise<void> {
  let retries = 0;

  while (retries < MAX_RETRIES) {
    try {
      const jobStatus = await getJobStatus(apiKey, jobId);

      console.log(
        `Job status: ${jobStatus.status}${jobStatus.progress ? `, progress: ${jobStatus.progress.toFixed(2)}%` : ""}`,
      );

      if (jobStatus.status === "completed") {
        console.log("Job completed successfully");
        return;
      } else if (jobStatus.status === "failed") {
        throw new Error("Job failed");
      } else if (
        jobStatus.status === "in_progress" ||
        jobStatus.status === "pending"
      ) {
        // Wait before checking again
        await new Promise((resolve) => setTimeout(resolve, RETRY_TIMEOUT_MS));
        retries++;
      } else {
        throw new Error(`Unknown job status: ${jobStatus.status}`);
      }
    } catch (error: any) {
      console.error(
        `Error checking job status (attempt ${retries + 1}/${MAX_RETRIES}):`,
        error,
      );
      await new Promise((resolve) => setTimeout(resolve, RETRY_TIMEOUT_MS));
      retries++;
    }
  }

  throw new Error(`Job did not complete after ${MAX_RETRIES} attempts`);
}

/**
 * Get the markdown result of a completed job
 *
 * @param apiKey The LlamaIndex API key
 * @param jobId The completed job ID
 * @returns A Promise that resolves to the markdown content
 */
async function getJobResultMarkdown(
  apiKey: string,
  jobId: string,
): Promise<string> {
  return new Promise((resolve, reject) => {
    try {
      // Set up the request options
      const options = {
        hostname: LLAMAINDEX_API_HOST,
        port: 443,
        path: `${JOB_RESULT_MARKDOWN_PATH}/${jobId}/result/markdown`,
        method: "GET",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          Accept: "text/markdown",
        },
      };

      // Make the request
      const req = https.request(options, (res) => {
        let data = "";

        // Handle response data
        res.on("data", (chunk) => {
          data += chunk;
        });

        // Handle request completion
        res.on("end", () => {
          // Check response status
          if (res.statusCode !== 200) {
            console.error(`Job result API error: ${res.statusCode} - ${data}`);
            return reject(
              new Error(
                `Job result API error: ${res.statusCode} - ${res.statusMessage || "API Error"}`,
              ),
            );
          }

          // The response is the markdown content directly
          resolve(data);
        });
      });

      // Handle request errors
      req.on("error", (error: any) => {
        console.error("Error making job result request:", error);
        reject(
          new Error(
            `Job result request failed: ${error?.message || "Unknown error"}`,
          ),
        );
      });

      // End the request
      req.end();
    } catch (error: any) {
      reject(
        new Error(
          `Failed to get job result: ${error?.message || "Unknown error"}`,
        ),
      );
    }
  });
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
export async function getExistingMarkdownContent(
  markdownPath: string,
): Promise<string> {
  try {
    const readFile = promisify(fs.readFile);
    const content = await readFile(markdownPath, "utf-8");
    return content;
  } catch (error: any) {
    console.error("Error reading existing markdown file:", error);
    throw new Error(
      `Failed to read markdown file: ${error?.message || "Unknown error"}`,
    );
  }
}
