import { db } from '../server/db';
import { prompts, InsertPrompt, datasets, InsertDataset, datasetItems, InsertDatasetItem, users } from '../shared/schema';
import { eq } from 'drizzle-orm';

// Function to seed the database with initial data
async function seedDatabase() {
  console.log('Starting database seeding...');

  try {
    // Check if we already have a demo user
    const existingUsers = await db.select().from(users).where(eq(users.username, 'demo'));
    
    let userId = 1;
    
    // Create a demo user if one doesn't exist
    if (existingUsers.length === 0) {
      console.log('Creating demo user...');
      const [user] = await db.insert(users).values({
        username: 'demo',
        password: 'password' // In a real app, this would be hashed
      }).returning();
      
      userId = user.id;
      console.log('Demo user created with ID:', userId);
    } else {
      userId = existingUsers[0].id;
      console.log('Using existing demo user with ID:', userId);
    }
    
    // Add some sample prompts with simplified schema
    const samplePrompts: InsertPrompt[] = [
      {
        name: 'Meta Prompt for Invoice Analysis',
        metaPrompt: `
          # Meta-Prompt for Generating Data Extraction Prompts

          ## Role:
          You are an expert Prompt Engineering Assistant specializing in creating highly effective data extraction prompts for Large Language Models (LLMs).

          ## Task:
          Your goal is to generate a specific, detailed, and robust data extraction prompt based on the user's prompt. The generated prompt should instruct an LLM to extract information accurately from a given source text or image (like an invoice, report, email, etc.) and format it as specified.

          ## Input:
          You will receive a user request describing the data they want to extract and the desired output format.
          User Prompt: 
          =======
          {{user_prompt}}
          =======

          ## Process:
          1.  **Analyze the User Request:** Identify the specific data fields to be extracted. Pay close attention to names, quantities, totals, dates, structured items (like line items in an invoice), etc.
          2.  **Determine the Output Format:** Understand the required structure (e.g., JSON, plain list, CSV-like text). If JSON, infer or define the schema (keys, nesting, data types - string, number, boolean, array).
          3.  **Construct the Extraction Prompt:** Create a prompt for another LLM that includes the following elements:
              * **Clear Goal:** State that the task is data extraction from a provided text.
              * **Target Fields:** Explicitly list *all* the data fields identified in step 1.
              * **Output Structure Definition:** Clearly describe the required output format.
                  * For JSON: Define the expected keys, nested structures (objects within objects, arrays of objects), and implied data types (e.g., prices should be numbers, names should be strings). Use backticks for key names if helpful.
                  * For other formats: Provide clear instructions on how the data should be presented.
              * **Handling Missing Data:** Instruct the LLM on how to handle cases where a requested piece of data is not found in the source text (e.g., use `null` for JSON values, use "N/A", or omit the field if appropriate for the format). Specify a default preference (e.g., `null` for JSON).
              * **Robustness Instructions:** Encourage the LLM to be robust to variations in wording or layout within the source text but to remain accurate.
              * **Strict Formatting:** Emphasize that the output should *strictly* adhere to the requested format and structure.
              * **Conciseness:** Instruct the LLM to output *only* the extracted data in the specified format, without any introductory text, explanations, or apologies.

          ## Output:
          Generate *only* the data extraction prompt itself. Do not include any explanations about how you generated it or any conversational filler. The output should be ready to be used directly with an LLM and a source text document.`,
        userId
      },
    ];
    
    // Check if we already have prompts
    const existingPrompts = await db.select().from(prompts);
    const count = existingPrompts.length;
    
    if (count === 0) {
      console.log('Adding sample prompts...');
      await db.insert(prompts).values(samplePrompts);
      console.log('Sample prompts added');
    } else {
      console.log('Skipping prompt creation, database already has', count, 'prompts');
    }
    
    // Add a sample dataset
    const existingDatasets = await db.select().from(datasets);
    const datasetCount = existingDatasets.length;
    
    let datasetId = 0;
    
    if (datasetCount === 0) {
      console.log('Adding sample dataset...');
      const sampleDataset: InsertDataset = {
        name: 'Invoice Data Extraction',
        category: 'invoices',
        description: 'A collection of invoices for data extraction evaluation',
        userId
      };
      
      const [dataset] = await db.insert(datasets).values(sampleDataset).returning();
      datasetId = dataset.id;
      console.log('Sample dataset added with ID:', datasetId);
      
      // Add some sample dataset items
      const sampleItems: InsertDatasetItem[] = [
        {
          datasetId,
          inputImage: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb',
          validResponse: 'A serene landscape featuring a mountain with a clear lake in the foreground, surrounded by forest. The image has vibrant colors with blue sky and green trees.'
        },
        {
          datasetId,
          inputImage: 'https://images.unsplash.com/photo-1511884642898-4c92249e20b6',
          validResponse: 'A dramatic mountain landscape with snow-capped peaks against a dark sky. The image has a moody atmosphere with high contrast between the mountains and clouds.'
        },
        {
          datasetId,
          inputImage: 'https://images.unsplash.com/photo-1542202229-7d93c33f5d07',
          validResponse: 'A sunset over an ocean horizon with vibrant orange and red colors reflecting on the water surface. The image captures the tranquil moment when the sun meets the water.'
        }
      ];
      
      console.log('Adding sample dataset items...');
      await db.insert(datasetItems).values(sampleItems);
      console.log('Sample dataset items added');
      
      // Update dataset item count
      await db.update(datasets)
        .set({ itemCount: sampleItems.length })
        .where(eq(datasets.id, datasetId));
    } else {
      console.log('Skipping dataset creation, database already has datasets');
    }
    
    console.log('Database seeding completed successfully!');
  } catch (error) {
    console.error('Error seeding database:', error);
  }
}

// Run the seed function
seedDatabase().catch(console.error);