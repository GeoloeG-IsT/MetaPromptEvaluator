import { schema } from '@shared/schema';
import { drizzle } from 'drizzle-orm/node-postgres';
import pkg from 'pg';
const { Pool } = pkg;
import { migrate } from 'drizzle-orm/node-postgres/migrator';

async function main() {
  console.log('Starting database migration...');
  
  try {
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
    });
    
    const db = drizzle(pool, { schema });
    
    // Run migrations
    await migrate(db, { migrationsFolder: 'drizzle' });
    
    console.log('Migration complete!');
    await pool.end();
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

main();