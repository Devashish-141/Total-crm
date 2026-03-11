-- Alter quotes table to add solar-specific fields
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS system_type TEXT;
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS brand TEXT;
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS capacity TEXT;

-- Update RLS policies if necessary (though they usually cover all columns)
