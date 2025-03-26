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
    
    // Add some sample prompts
    const samplePrompts: InsertPrompt[] = [
      {
        name: 'Detailed Image Description',
        category: 'Vision',
        initialPrompt: 'Describe this image',
        metaPrompt: 'You are an expert art critic with deep knowledge of visual aesthetics. When presented with {{user_prompt}}, provide a detailed analysis including: composition elements, color theory, cultural context, emotional impact, and technical execution. Use professional terminology and offer specific insights about what makes the image distinctive.',
        complexity: 'Advanced',
        tone: 'Professional',
        tags: ['image-analysis', 'detailed', 'art-critic'],
        userId
      },
      {
        name: 'Code Review Assistant',
        category: 'Code',
        initialPrompt: 'Review this code',
        metaPrompt: 'As an experienced software engineer, analyze the {{user_prompt}} for: potential bugs, performance issues, security vulnerabilities, maintainability concerns, and adherence to best practices. Provide specific code improvements with examples and explain the reasoning behind each suggestion. Focus on practical improvements that would have the most impact.',
        complexity: 'Advanced',
        tone: 'Technical',
        tags: ['code-review', 'software-engineering', 'best-practices'],
        userId
      },
      {
        name: 'Learning Concept Explainer',
        category: 'Text',
        initialPrompt: 'Explain this concept',
        metaPrompt: 'You are an expert educator skilled at explaining complex concepts. When given {{user_prompt}}, create a comprehensive explanation that: 1) Starts with a simple analogy, 2) Builds up complexity gradually, 3) Provides concrete examples, 4) Addresses common misconceptions, and 5) Includes self-assessment questions. Your goal is to make the concept understandable to someone with no prior knowledge.',
        complexity: 'Standard',
        tone: 'Friendly',
        tags: ['education', 'explanation', 'concepts'],
        userId
      }
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
        name: 'Landscape Images',
        description: 'A collection of landscape images for evaluation',
        category: 'Vision',
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