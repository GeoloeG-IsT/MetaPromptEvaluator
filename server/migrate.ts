import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import pkg from 'pg';
const { Pool } = pkg;
import { eq } from 'drizzle-orm';
import * as schema from '../shared/schema';

// Function to run migrations
async function runMigrations() {
  console.log('Starting database migrations...');
  
  try {
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
    });
    
    const db = drizzle(pool, { schema });
    
    // This will create tables if they don't exist based on the schema
    await migrate(db, { migrationsFolder: './drizzle' });
    
    console.log('Migrations completed successfully');
    
    // Create initial demo user if doesn't exist
    const users = await db.select().from(schema.users).where(eq(schema.users.username, 'demo'));
    
    if (users.length === 0) {
      console.log('Creating demo user...');
      await db.insert(schema.users).values({
        username: 'demo',
        password: 'password', // In a real app, this would be hashed
      });
      console.log('Demo user created');
    }
    
    await pool.end();
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

// Run migrations
runMigrations().catch(console.error);