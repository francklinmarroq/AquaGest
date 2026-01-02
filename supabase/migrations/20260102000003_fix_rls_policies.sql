-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
DROP POLICY IF EXISTS "Allow authenticated read all" ON public.profiles;

-- Create more permissive policies for development/debugging
-- 1. Read: Allow ANY authenticated user to read ALL profiles (needed for admin checks and general access)
CREATE POLICY "Enable read access for authenticated users"
ON public.profiles FOR SELECT TO authenticated USING (true);

-- 2. Update: Allow users to update their own profile
CREATE POLICY "Enable update for users based on id"
ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

-- 3. Insert: Handled by trigger, but just in case
CREATE POLICY "Enable insert for authenticated users"
ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
