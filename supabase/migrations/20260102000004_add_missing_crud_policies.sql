-- Add missing policies for meter_readings
CREATE POLICY "Allow authenticated insert" ON public.meter_readings FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated update" ON public.meter_readings FOR UPDATE USING (auth.role() = 'authenticated');
-- DELETE usually restricted, maybe allow for now
CREATE POLICY "Allow authenticated delete" ON public.meter_readings FOR DELETE USING (auth.role() = 'authenticated');

-- Add missing policies for extra_charges
CREATE POLICY "Allow authenticated insert" ON public.extra_charges FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated update" ON public.extra_charges FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated delete" ON public.extra_charges FOR DELETE USING (auth.role() = 'authenticated');

-- Add missing policies for billing_notices
CREATE POLICY "Allow authenticated insert" ON public.billing_notices FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated update" ON public.billing_notices FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated delete" ON public.billing_notices FOR DELETE USING (auth.role() = 'authenticated');

-- Add missing policies for payments
CREATE POLICY "Allow authenticated insert" ON public.payments FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated update" ON public.payments FOR UPDATE USING (auth.role() = 'authenticated');

-- Add missing policies for app_settings
CREATE POLICY "Allow authenticated insert" ON public.app_settings FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated update" ON public.app_settings FOR UPDATE USING (auth.role() = 'authenticated');

-- STORAGE POLICIES
-- We need to ensure the bucket 'meter-photos' exists and has policies.
-- Inserting into storage.buckets if not exists (Note: usually done via API, but can be done in SQL if extensions enabled or permissions allow)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('meter-photos', 'meter-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Storage object policies
CREATE POLICY "Give users access to own folder 1ok12a_0" ON storage.objects FOR SELECT TO public USING (bucket_id = 'meter-photos');
CREATE POLICY "Give users access to own folder 1ok12a_1" ON storage.objects FOR INSERT TO public WITH CHECK (bucket_id = 'meter-photos');
CREATE POLICY "Give users access to own folder 1ok12a_2" ON storage.objects FOR UPDATE TO public USING (bucket_id = 'meter-photos');
CREATE POLICY "Give users access to own folder 1ok12a_3" ON storage.objects FOR DELETE TO public USING (bucket_id = 'meter-photos');
