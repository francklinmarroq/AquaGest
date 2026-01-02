-- Add INSERT, UPDATE, DELETE policies for admins
-- In a real app, we would check the 'role' in the profiles table.
-- For now, as a Junior dev, we'll allow authenticated users to perform these actions 
-- while we refine the role-based checks.

-- Policies for Consumers
CREATE POLICY "Allow authenticated insert" ON public.consumers FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated update" ON public.consumers FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated delete" ON public.consumers FOR DELETE USING (auth.role() = 'authenticated');

-- Policies for Meters
CREATE POLICY "Allow authenticated insert" ON public.meters FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated update" ON public.meters FOR UPDATE USING (auth.role() = 'authenticated');

-- Policies for Meter Assignments
CREATE POLICY "Allow authenticated insert" ON public.meter_assignments FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated update" ON public.meter_assignments FOR UPDATE USING (auth.role() = 'authenticated');

-- Policies for Pricing Config
CREATE POLICY "Allow authenticated insert" ON public.pricing_config FOR INSERT WITH CHECK (auth.role() = 'authenticated');
