import { db } from '../server/db';
import pkg from 'pg';
const { Pool } = pkg;
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import * as schema from '../shared/schema';

async function updatePromptTable() {
  console.log('Updating table structure...');
  
  try {
    // Connect directly to Postgres to alter the table
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL
    });
    
    const client = await pool.connect();
    
    try {
      // Start transaction
      await client.query('BEGIN');
      
      // Check if columns exist before dropping them
      const { rows } = await client.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'prompts' 
        AND table_schema = 'public'
      `);
      
      const columnNames = rows.map(row => row.column_name);
      
      // Drop columns that should be removed
      const columnsToRemove = [
        'category',
        'initial_prompt',
        'complexity',
        'tone',
        'tags'
      ];
      
      for (const column of columnsToRemove) {
        if (columnNames.includes(column)) {
          console.log(`Dropping column: ${column}`);
          await client.query(`ALTER TABLE prompts DROP COLUMN IF EXISTS ${column}`);
        }
      }
      
      // Make meta_prompt NOT NULL
      if (columnNames.includes('meta_prompt')) {
        console.log('Making meta_prompt NOT NULL');
        // First, update any NULL values
        await client.query(`
          UPDATE prompts 
          SET meta_prompt = 'No meta prompt provided' 
          WHERE meta_prompt IS NULL
        `);
        
        // Then alter the column
        await client.query(`
          ALTER TABLE prompts 
          ALTER COLUMN meta_prompt SET NOT NULL
        `);
      }
      
      // Commit transaction
      await client.query('COMMIT');
      console.log('Table structure updated successfully');
      
    } catch (err) {
      await client.query('ROLLBACK');
      console.error('Error updating table structure:', err);
      throw err;
    } finally {
      client.release();
    }
    
    await pool.end();
    
  } catch (error) {
    console.error('Database error:', error);
  }
}

async function main() {
  console.log('Updating schema and migrating database...');
  await updatePromptTable();
  console.log('Schema update completed');
}

main().catch(console.error);