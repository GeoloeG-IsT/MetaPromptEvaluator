-- Add input_pdf column to dataset_items table
ALTER TABLE dataset_items ADD COLUMN IF NOT EXISTS input_pdf TEXT;