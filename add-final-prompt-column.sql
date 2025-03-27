-- Add the finalPrompt column to the evaluations table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM information_schema.columns 
                 WHERE table_name='evaluations' AND column_name='final_prompt') THEN
        ALTER TABLE evaluations ADD COLUMN final_prompt TEXT;
    END IF;
END $$;