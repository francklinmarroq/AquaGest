-- Create a table for public profiles
CREATE TABLE public.profiles (
  id uuid REFERENCES auth.users ON DELETE CASCADE NOT NULL PRIMARY KEY,
  full_name text,
  role text CHECK (role IN ('admin', 'reader')) DEFAULT 'reader',
  created_at timestamp WITH time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Consumers table
CREATE TABLE public.consumers (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  full_name text NOT NULL,
  address text,
  phone text,
  email text,
  created_at timestamp WITH time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Meters table
CREATE TABLE public.meters (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  serial_number text UNIQUE NOT NULL,
  initial_reading numeric DEFAULT 0 NOT NULL,
  created_at timestamp WITH time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Meter assignments (Consumer <-> Meter)
CREATE TABLE public.meter_assignments (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  consumer_id uuid REFERENCES public.consumers(id) ON DELETE CASCADE NOT NULL,
  meter_id uuid REFERENCES public.meters(id) ON DELETE CASCADE NOT NULL,
  assigned_at timestamp WITH time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  unassigned_at timestamp WITH time zone,
  is_active boolean GENERATED ALWAYS AS (unassigned_at IS NULL) STORED
);

-- Pricing configuration with history
CREATE TABLE public.pricing_config (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  water_base_price numeric NOT NULL,
  water_included_m3 numeric NOT NULL,
  water_extra_m3_price numeric NOT NULL,
  sewage_fixed_price numeric NOT NULL,
  effective_from timestamp WITH time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  created_at timestamp WITH time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- App settings (e.g. 30 days average toggle)
CREATE TABLE public.app_settings (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  key text UNIQUE NOT NULL,
  value jsonb NOT NULL,
  updated_at timestamp WITH time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Insert default setting for average logic
INSERT INTO public.app_settings (key, value) VALUES ('use_30_day_average', 'true'::jsonb);

-- Meter readings
CREATE TABLE public.meter_readings (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  meter_id uuid REFERENCES public.meters(id) NOT NULL,
  consumer_id uuid REFERENCES public.consumers(id) NOT NULL,
  reading_value numeric NOT NULL,
  photo_path text, -- Path in storage
  reading_date date DEFAULT CURRENT_DATE NOT NULL,
  created_by uuid REFERENCES public.profiles(id),
  status text CHECK (status IN ('pending', 'approved', 'rejected')) DEFAULT 'pending',
  approved_at timestamp WITH time zone,
  approved_by uuid REFERENCES public.profiles(id),
  created_at timestamp WITH time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Extra charges (for meter changes, etc.)
CREATE TABLE public.extra_charges (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  consumer_id uuid REFERENCES public.consumers(id) NOT NULL,
  description text NOT NULL,
  amount numeric NOT NULL,
  created_at timestamp WITH time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  status text CHECK (status IN ('pending', 'paid')) DEFAULT 'pending'
);

-- Billing notices
CREATE TABLE public.billing_notices (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  reading_id uuid REFERENCES public.meter_readings(id), -- Nullable for manual bills
  consumer_id uuid REFERENCES public.consumers(id) NOT NULL,
  reading_previous numeric,
  reading_current numeric,
  total_m3 numeric,
  water_base_amount numeric NOT NULL,
  water_extra_amount numeric DEFAULT 0,
  sewage_amount numeric NOT NULL,
  extra_charges_amount numeric DEFAULT 0,
  total_amount numeric NOT NULL,
  due_date date NOT NULL,
  status text CHECK (status IN ('pending', 'paid')) DEFAULT 'pending',
  created_at timestamp WITH time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Payments
CREATE TABLE public.payments (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  billing_notice_id uuid REFERENCES public.billing_notices(id) NOT NULL,
  amount_paid numeric NOT NULL,
  payment_date timestamp WITH time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  payment_method text,
  receipt_number text UNIQUE,
  created_at timestamp WITH time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Simple RLS Policies (for now allow all authenticated for simplicity in dev, except profiles)
ALTER TABLE public.consumers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meter_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pricing_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meter_readings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.extra_charges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_notices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read everything
CREATE POLICY "Allow authenticated read all" ON public.consumers FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated read all" ON public.meters FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated read all" ON public.meter_assignments FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated read all" ON public.pricing_config FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated read all" ON public.app_settings FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated read all" ON public.meter_readings FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated read all" ON public.extra_charges FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated read all" ON public.billing_notices FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated read all" ON public.payments FOR SELECT USING (auth.role() = 'authenticated');

-- Policies for specific roles would go here (Admin vs Reader)
-- For now, let's keep it simple for the Junior dev role.

-- Storage configuration is typically done in Supabase UI or via CLI
-- We will need a 'meter-photos' bucket.
