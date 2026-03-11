-- ============================================================
--  CRM PORTAL — Full Schema for Supabase SQL Editor
--  Paste this entire script into your Supabase SQL Editor
--  and click "Run" to set up all CRM tables.
-- ============================================================

-- ─── 0. Extensions ──────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── 1. PROFILES (User roles) ───────────────────────────────
CREATE TABLE IF NOT EXISTS public.profiles (
  id          UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  full_name   TEXT,
  role        TEXT DEFAULT 'Sales Executive' NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-create profile on new signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
    'Admin'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ─── 2. CRM CONTACTS ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.crm_contacts (
  id            UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  first_name    TEXT,
  last_name     TEXT,
  email         TEXT,
  phone         TEXT,
  company_id    UUID,
  job_title     TEXT,
  lead_status   TEXT DEFAULT 'New'
                  CHECK (lead_status IN ('New','Contacted','Qualified','Lost','Customer')),
  source        TEXT,
  owner_id      UUID REFERENCES auth.users(id),
  notes         TEXT,
  tags          TEXT[],
  custom_fields JSONB DEFAULT '{}',
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ─── 3. CRM COMPANIES ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.crm_companies (
  id            UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name          TEXT NOT NULL,
  industry      TEXT,
  website       TEXT,
  phone         TEXT,
  email         TEXT,
  address       TEXT,
  city          TEXT,
  country       TEXT,
  employee_count INTEGER,
  annual_revenue DECIMAL(15,2),
  owner_id      UUID REFERENCES auth.users(id),
  notes         TEXT,
  tags          TEXT[],
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Add foreign key for company on contacts after both tables exist
ALTER TABLE public.crm_contacts
  ADD CONSTRAINT fk_crm_contacts_company
  FOREIGN KEY (company_id) REFERENCES public.crm_companies(id)
  ON DELETE SET NULL
  NOT VALID;

-- ─── 4. CRM DEALS ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.crm_deals (
  id            UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  title         TEXT NOT NULL,
  contact_id    UUID REFERENCES public.crm_contacts(id) ON DELETE SET NULL,
  company_id    UUID REFERENCES public.crm_companies(id) ON DELETE SET NULL,
  stage         TEXT DEFAULT 'Prospecting'
                  CHECK (stage IN ('Prospecting','Qualification','Proposal Sent','Negotiation','Closed Won','Closed Lost')),
  value         DECIMAL(15,2) DEFAULT 0,
  currency      TEXT DEFAULT 'INR',
  expected_close DATE,
  probability   INTEGER DEFAULT 0 CHECK (probability BETWEEN 0 AND 100),
  owner_id      UUID REFERENCES auth.users(id),
  notes         TEXT,
  tags          TEXT[],
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ─── 5. CRM TICKETS ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.crm_tickets (
  id            UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  subject       TEXT NOT NULL,
  description   TEXT,
  contact_id    UUID REFERENCES public.crm_contacts(id) ON DELETE SET NULL,
  company_id    UUID REFERENCES public.crm_companies(id) ON DELETE SET NULL,
  status        TEXT DEFAULT 'Open'
                  CHECK (status IN ('Open','In Progress','Waiting','Resolved','Closed')),
  priority      TEXT DEFAULT 'Medium'
                  CHECK (priority IN ('Low','Medium','High','Urgent')),
  category      TEXT,
  assigned_to   UUID REFERENCES auth.users(id),
  resolved_at   TIMESTAMPTZ,
  notes         TEXT,
  tags          TEXT[],
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ─── 6. CRM ORDERS ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.crm_orders (
  id            UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  order_number  TEXT UNIQUE,
  contact_id    UUID REFERENCES public.crm_contacts(id) ON DELETE SET NULL,
  company_id    UUID REFERENCES public.crm_companies(id) ON DELETE SET NULL,
  deal_id       UUID REFERENCES public.crm_deals(id) ON DELETE SET NULL,
  status        TEXT DEFAULT 'Pending'
                  CHECK (status IN ('Pending','Processing','Shipped','Delivered','Cancelled','Refunded')),
  total_amount  DECIMAL(15,2) DEFAULT 0,
  currency      TEXT DEFAULT 'INR',
  items         JSONB DEFAULT '[]',
  notes         TEXT,
  ordered_at    TIMESTAMPTZ DEFAULT NOW(),
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ─── 7. CRM TASKS ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.crm_tasks (
  id            UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  title         TEXT NOT NULL,
  description   TEXT,
  task_type     TEXT DEFAULT 'Follow-up'
                  CHECK (task_type IN ('Follow-up','Call','Email','Meeting','Demo','Other')),
  status        TEXT DEFAULT 'Pending'
                  CHECK (status IN ('Pending','In Progress','Completed','Cancelled')),
  priority      TEXT DEFAULT 'Medium'
                  CHECK (priority IN ('Low','Medium','High')),
  due_date      TIMESTAMPTZ,
  contact_id    UUID REFERENCES public.crm_contacts(id) ON DELETE SET NULL,
  deal_id       UUID REFERENCES public.crm_deals(id) ON DELETE SET NULL,
  assigned_to   UUID REFERENCES auth.users(id),
  created_by    UUID REFERENCES auth.users(id),
  completed_at  TIMESTAMPTZ,
  notes         TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ─── 8. CRM CALLS ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.crm_calls (
  id            UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  contact_id    UUID REFERENCES public.crm_contacts(id) ON DELETE SET NULL,
  contact_name  TEXT,
  call_type     TEXT DEFAULT 'Outbound'
                  CHECK (call_type IN ('Outbound','Inbound','Missed')),
  status        TEXT DEFAULT 'Completed'
                  CHECK (status IN ('Scheduled','In Progress','Completed','Missed','No Answer')),
  duration_sec  INTEGER DEFAULT 0,
  outcome       TEXT,
  notes         TEXT,
  scheduled_at  TIMESTAMPTZ,
  called_by     UUID REFERENCES auth.users(id),
  recording_url TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ─── 9. CRM INBOX (Messages/Conversations) ──────────────────
CREATE TABLE IF NOT EXISTS public.crm_inbox (
  id            UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  contact_id    UUID REFERENCES public.crm_contacts(id) ON DELETE SET NULL,
  contact_name  TEXT,
  channel       TEXT DEFAULT 'Email'
                  CHECK (channel IN ('Email','WhatsApp','SMS','Chat','Phone')),
  direction     TEXT DEFAULT 'Inbound'
                  CHECK (direction IN ('Inbound','Outbound')),
  subject       TEXT,
  body          TEXT,
  status        TEXT DEFAULT 'Unread'
                  CHECK (status IN ('Unread','Read','Replied','Archived')),
  assigned_to   UUID REFERENCES auth.users(id),
  is_starred    BOOLEAN DEFAULT FALSE,
  sent_at       TIMESTAMPTZ DEFAULT NOW(),
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ─── 10. CRM MESSAGE TEMPLATES ──────────────────────────────
CREATE TABLE IF NOT EXISTS public.crm_message_templates (
  id            UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name          TEXT NOT NULL,
  category      TEXT DEFAULT 'General'
                  CHECK (category IN ('General','Follow-up','Proposal','Introduction','Thank You','Reminder','Other')),
  channel       TEXT DEFAULT 'Email'
                  CHECK (channel IN ('Email','WhatsApp','SMS','Chat')),
  subject       TEXT,
  body          TEXT NOT NULL,
  variables     TEXT[],
  is_active     BOOLEAN DEFAULT TRUE,
  sent_count    INTEGER DEFAULT 0,
  created_by    UUID REFERENCES auth.users(id),
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ─── 11. CRM SNIPPETS ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.crm_snippets (
  id            UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name          TEXT NOT NULL,
  shortcut      TEXT UNIQUE,
  content       TEXT NOT NULL,
  category      TEXT DEFAULT 'General',
  is_shared     BOOLEAN DEFAULT TRUE,
  created_by    UUID REFERENCES auth.users(id),
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ─── 12. CRM SEGMENTS ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.crm_segments (
  id            UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name          TEXT NOT NULL,
  description   TEXT,
  filters       JSONB DEFAULT '{}',
  contact_count INTEGER DEFAULT 0,
  is_dynamic    BOOLEAN DEFAULT TRUE,
  created_by    UUID REFERENCES auth.users(id),
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ─── 13. CRM ACTIVITIES (Audit trail) ───────────────────────
CREATE TABLE IF NOT EXISTS public.crm_activities (
  id            UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  entity_type   TEXT NOT NULL, -- 'contact', 'deal', 'ticket', etc.
  entity_id     UUID NOT NULL,
  action        TEXT NOT NULL, -- 'created', 'updated', 'stage_changed', etc.
  description   TEXT,
  old_value     JSONB,
  new_value     JSONB,
  performed_by  UUID REFERENCES auth.users(id),
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ─── 14. ENABLE ROW LEVEL SECURITY ──────────────────────────
ALTER TABLE public.profiles              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_contacts          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_companies         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_deals             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_tickets           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_orders            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_tasks             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_calls             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_inbox             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_message_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_snippets          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_segments          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_activities        ENABLE ROW LEVEL SECURITY;

-- ─── 15. RLS POLICIES (Authenticated users get full access) ─
-- Profiles
CREATE POLICY "profiles_select" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "profiles_insert" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

-- CRM Contacts
CREATE POLICY "crm_contacts_all" ON public.crm_contacts FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- CRM Companies
CREATE POLICY "crm_companies_all" ON public.crm_companies FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- CRM Deals
CREATE POLICY "crm_deals_all" ON public.crm_deals FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- CRM Tickets
CREATE POLICY "crm_tickets_all" ON public.crm_tickets FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- CRM Orders
CREATE POLICY "crm_orders_all" ON public.crm_orders FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- CRM Tasks
CREATE POLICY "crm_tasks_all" ON public.crm_tasks FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- CRM Calls
CREATE POLICY "crm_calls_all" ON public.crm_calls FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- CRM Inbox
CREATE POLICY "crm_inbox_all" ON public.crm_inbox FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- CRM Message Templates
CREATE POLICY "crm_templates_all" ON public.crm_message_templates FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- CRM Snippets
CREATE POLICY "crm_snippets_all" ON public.crm_snippets FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- CRM Segments
CREATE POLICY "crm_segments_all" ON public.crm_segments FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- CRM Activities
CREATE POLICY "crm_activities_all" ON public.crm_activities FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ─── 16. INDEXES (Performance) ──────────────────────────────
CREATE INDEX IF NOT EXISTS idx_crm_contacts_email      ON public.crm_contacts(email);
CREATE INDEX IF NOT EXISTS idx_crm_contacts_company    ON public.crm_contacts(company_id);
CREATE INDEX IF NOT EXISTS idx_crm_deals_stage         ON public.crm_deals(stage);
CREATE INDEX IF NOT EXISTS idx_crm_deals_contact       ON public.crm_deals(contact_id);
CREATE INDEX IF NOT EXISTS idx_crm_tickets_status      ON public.crm_tickets(status);
CREATE INDEX IF NOT EXISTS idx_crm_tasks_due           ON public.crm_tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_crm_tasks_status        ON public.crm_tasks(status);
CREATE INDEX IF NOT EXISTS idx_crm_calls_contact       ON public.crm_calls(contact_id);
CREATE INDEX IF NOT EXISTS idx_crm_inbox_status        ON public.crm_inbox(status);
CREATE INDEX IF NOT EXISTS idx_crm_activities_entity   ON public.crm_activities(entity_type, entity_id);

-- ─── 17. AUTO-UPDATE updated_at ─────────────────────────────
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'profiles','crm_contacts','crm_companies','crm_deals',
    'crm_tickets','crm_orders','crm_tasks','crm_calls',
    'crm_inbox','crm_message_templates','crm_snippets','crm_segments'
  ] LOOP
    EXECUTE format(
      'DROP TRIGGER IF EXISTS trg_set_updated_at ON public.%I;
       CREATE TRIGGER trg_set_updated_at
         BEFORE UPDATE ON public.%I
         FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();',
      tbl, tbl
    );
  END LOOP;
END $$;

-- ============================================================
--  ✅ Schema complete! All CRM tables are ready.
--  Tables created:
--    profiles, crm_contacts, crm_companies, crm_deals,
--    crm_tickets, crm_orders, crm_tasks, crm_calls,
--    crm_inbox, crm_message_templates, crm_snippets,
--    crm_segments, crm_activities
-- ============================================================
