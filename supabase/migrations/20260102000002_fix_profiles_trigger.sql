-- Drop existing table and trigger/function to ensure clean state
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();
DROP TABLE IF EXISTS public.profiles CASCADE;

-- Re-create profiles table
CREATE TABLE public.profiles (
  id uuid REFERENCES auth.users ON DELETE CASCADE NOT NULL PRIMARY KEY,
  full_name text,
  role text CHECK (role IN ('admin', 'reader')) DEFAULT 'reader',
  created_at timestamp WITH time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Allow users to read their own profile
CREATE POLICY "Users can read own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
-- Allow admins to read all profiles (simplified for now as 'admin' role is in this table itself, creating circular check potential, usually handled by checking claims or assuming first admin is manual)
-- For simplicity in this dev phase, allow authenticated read all can be practical, but let's stick to safe defaults.
CREATE POLICY "Allow authenticated read all" ON public.profiles FOR SELECT USING (auth.role() = 'authenticated');

-- Function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS trigger AS $$
DECLARE
  assigned_role text;
BEGIN
  -- Default to reader
  assigned_role := 'reader';
  
  -- Assign admin if email matches
  IF new.email = 'admin@aguasterrasol.com' THEN
    assigned_role := 'admin';
  END IF;

  INSERT INTO public.profiles (id, full_name, role)
  VALUES (new.id, new.raw_user_meta_data->>'full_name', assigned_role);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
