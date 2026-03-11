-- Add document fields to projects table
ALTER TABLE projects ADD COLUMN IF NOT EXISTS aadhaar_url TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS pan_url TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS eb_bill_url TEXT;

-- Indexing for performance
CREATE INDEX IF NOT EXISTS idx_projects_customer_id ON projects(customer_id);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
