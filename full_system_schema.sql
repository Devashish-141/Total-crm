-- TN Solar Solution - Full System Schema Migration
-- Defines roles, projects, workflow states, and financial tracking

-- 1. ROLE-BASED ACCESS CONTROL (RBAC)
CREATE TYPE user_role AS ENUM (
  'Admin', 
  'Sales Executive', 
  'Surveyor', 
  'Manager', 
  'Accounts', 
  'MNRE Executive', 
  'Loan Executive', 
  'Procurement Team', 
  'Logistics', 
  'Installer', 
  'Net Meter Executive', 
  'Post Sales Support', 
  'Coordinator'
);

CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  full_name TEXT,
  role user_role DEFAULT 'Sales Executive' NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. ENHANCED PROJECT HUB
-- Current 'jobs' table is more of a generic service record. 
-- We'll transition to 'projects' for the full solar workflow.
CREATE TABLE IF NOT EXISTS public.projects (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  project_number SERIAL,
  customer_id UUID REFERENCES public.customers(id),
  lead_id UUID REFERENCES public.leads(id),
  title TEXT NOT NULL,
  system_size_kw DECIMAL(10, 2),
  total_price DECIMAL(10, 2),
  status TEXT DEFAULT 'Survey Pending',
  current_stage TEXT DEFAULT 'Site Visit',
  assigned_sales_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  is_archived BOOLEAN DEFAULT FALSE,
  aadhaar_url TEXT,
  pan_url TEXT,
  eb_bill_url TEXT
);

-- 3. SITE VISITS & SURVEYS
CREATE TABLE IF NOT EXISTS public.site_surveys (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  surveyor_id UUID REFERENCES auth.users(id),
  start_location_gps POINT,
  end_location_gps POINT,
  start_time TIMESTAMPTZ,
  end_time TIMESTAMPTZ,
  rooftop_photo_urls TEXT[],
  eb_bill_photo_url TEXT,
  shadow_video_url TEXT,
  structure_measurements JSONB,
  customer_signature_url TEXT,
  status TEXT DEFAULT 'Draft',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. MNRE & LOAN MANAGEMENT
CREATE TABLE IF NOT EXISTS public.mnre_applications (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  application_number TEXT,
  acknowledgement_url TEXT,
  status TEXT CHECK (status IN ('Applied', 'Query Raised', 'Approved')) DEFAULT 'Applied',
  assigned_executive_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.loans (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  bank_name TEXT,
  loan_amount DECIMAL(10, 2),
  disbursed_amount DECIMAL(10, 2) DEFAULT 0,
  sanction_letter_url TEXT,
  status TEXT CHECK (status IN ('Applied', 'Under Process', 'Approved', 'Rejected')) DEFAULT 'Applied',
  assigned_executive_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. PAYMENT & FINANCIAL CONTROL
CREATE TABLE IF NOT EXISTS public.project_payments (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  payment_type TEXT CHECK (payment_type IN ('80% Advance', '20% Final', 'Other')),
  required_amount DECIMAL(10, 2),
  received_amount DECIMAL(10, 2) DEFAULT 0,
  is_verified BOOLEAN DEFAULT FALSE,
  verified_by UUID REFERENCES auth.users(id),
  verified_at TIMESTAMPTZ,
  proof_url TEXT,
  status TEXT CHECK (status IN ('Pending', 'Partial', 'Completed')) DEFAULT 'Pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. PROCUREMENT & LOGISTICS
CREATE TABLE IF NOT EXISTS public.procurement (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  bom_details JSONB,
  is_stock_confirmed BOOLEAN DEFAULT FALSE,
  dispatch_date DATE,
  transport_details TEXT,
  status TEXT DEFAULT 'BOM Pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. INSTALLATION & NET METERING
CREATE TABLE IF NOT EXISTS public.installations (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  installation_date DATE,
  team_details TEXT,
  photo_urls TEXT[],
  panel_serial_numbers TEXT[],
  inverter_serial_number TEXT,
  status TEXT DEFAULT 'Scheduled',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.net_metering (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  eb_application_number TEXT,
  status TEXT CHECK (status IN ('Submitted', 'Inspection Done', 'Approved', 'Installed')) DEFAULT 'Submitted',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. QUOTES & DOCUMENTATION (Added for Solar Workflow)
CREATE TABLE IF NOT EXISTS public.quotes (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  quote_number TEXT UNIQUE,
  customer_id UUID REFERENCES public.customers(id),
  lead_id UUID REFERENCES public.leads(id),
  description TEXT,
  date_issued DATE DEFAULT CURRENT_DATE,
  valid_until DATE,
  subtotal DECIMAL(10, 2),
  vat_amount DECIMAL(10, 2),
  total_amount DECIMAL(10, 2),
  status TEXT DEFAULT 'draft',
  notes TEXT,
  system_type TEXT,
  brand TEXT,
  capacity TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. EXPENSE & PROFIT TRACKING
CREATE TABLE IF NOT EXISTS public.project_expenses (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  category TEXT CHECK (category IN ('Material', 'Labour', 'Transport', 'Commission', 'Marketing', 'Other')),
  amount DECIMAL(10, 2),
  description TEXT,
  recorded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. AUDIT LOGS
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  entity_type TEXT, -- 'Project', 'Payment', etc.
  entity_id UUID,
  action TEXT, -- 'UPDATE_STATUS', 'VERIFY_PAYMENT'
  changes JSONB,
  performed_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. ENABLE RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_surveys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mnre_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.procurement ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.installations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.net_metering ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- DEFAULT POLICIES (TO BE REFINED IN RBAC PHASE)
CREATE POLICY "Profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Authenticated users can view projects" ON public.projects FOR SELECT TO authenticated USING (true);
