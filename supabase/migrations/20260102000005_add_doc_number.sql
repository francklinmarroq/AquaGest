-- Add Identity Document Number to Consumers table
ALTER TABLE public.consumers ADD COLUMN doc_number text;
