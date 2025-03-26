import { db } from "../server/db";
import { sql } from "drizzle-orm";

async function updateDatasetItemsTable() {
  console.log("Updating dataset_items table schema...");

  try {
    // Check if input_type column exists
    const checkColumnResult = await db.execute(sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'dataset_items' AND column_name = 'input_type'
    `);

    if (checkColumnResult.rows.length === 0) {
      // Add the new columns
      await db.execute(sql`
        ALTER TABLE dataset_items
        ADD COLUMN input_type TEXT NOT NULL DEFAULT 'image',
        ADD COLUMN input_text TEXT,
        ALTER COLUMN input_image DROP NOT NULL
      `);
      console.log("Successfully added new columns to dataset_items table");
    } else {
      console.log("Columns already exist, no changes needed");
    }

    // Update existing rows to have the appropriate input_type
    await db.execute(sql`
      UPDATE dataset_items
      SET input_type = 'image'
      WHERE input_type IS NULL OR input_type = ''
    `);
    console.log("Updated existing rows with correct input_type values");

    return true;
  } catch (error) {
    console.error("Error updating dataset_items table:", error);
    return false;
  }
}

async function main() {
  const success = await updateDatasetItemsTable();
  if (success) {
    console.log("Migration completed successfully");
  } else {
    console.error("Migration failed");
    process.exit(1);
  }
  process.exit(0);
}

main();