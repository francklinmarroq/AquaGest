-- Initial pricing configuration
INSERT INTO public.pricing_config (
  water_base_price,
  water_included_m3,
  water_extra_m3_price,
  sewage_fixed_price,
  effective_from
) VALUES (
  25.00,  -- Q25.00 base (ejemplo)
  20,     -- 20 m3 included
  2.50,   -- Q2.50 per extra m3
  15.00,  -- Q15.00 fixed sewage
  NOW()
);

-- Mock Consumers
INSERT INTO public.consumers (full_name, address, phone, email) 
VALUES 
('Juan Pérez', 'Calle 1, Casa 10', '5555-0001', 'juan@example.com'),
('María López', 'Calle 2, Casa 20', '5555-0002', 'maria@example.com');

-- Mock Meters
INSERT INTO public.meters (serial_number, initial_reading)
VALUES 
('MET-001', 0),
('MET-002', 150);

-- Assign Meters
INSERT INTO public.meter_assignments (consumer_id, meter_id)
SELECT c.id, m.id 
FROM public.consumers c, public.meters m 
WHERE c.full_name = 'Juan Pérez' AND m.serial_number = 'MET-001';

INSERT INTO public.meter_assignments (consumer_id, meter_id)
SELECT c.id, m.id 
FROM public.consumers c, public.meters m 
WHERE c.full_name = 'María López' AND m.serial_number = 'MET-002';
