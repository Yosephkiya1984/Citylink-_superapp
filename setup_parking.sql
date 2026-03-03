
-- Drop tables if they exist to reset schema and fix RLS/FK issues
DROP TABLE IF EXISTS public.parking_sessions;
DROP TABLE IF EXISTS public.parking_spots;
DROP TABLE IF EXISTS public.parking_lots;

-- Create tables with references to public.users (since server.ts uses users table for merchants)
CREATE TABLE public.parking_lots (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  merchant_id uuid NOT NULL, -- References public.users(id)
  name text NOT NULL,
  address text NOT NULL,
  total_spots integer NOT NULL DEFAULT 0,
  base_rate numeric NOT NULL DEFAULT 0.00,
  additional_rate numeric DEFAULT 0.00,
  daily_max numeric DEFAULT 0.00,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT parking_lots_pkey PRIMARY KEY (id),
  CONSTRAINT parking_lots_merchant_id_fkey FOREIGN KEY (merchant_id) REFERENCES public.users(id)
);

CREATE TABLE public.parking_spots (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  lot_id uuid NOT NULL,
  spot_number text NOT NULL,
  status text NOT NULL DEFAULT 'AVAILABLE',
  occupied_by uuid,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT parking_spots_pkey PRIMARY KEY (id),
  CONSTRAINT parking_spots_lot_id_fkey FOREIGN KEY (lot_id) REFERENCES public.parking_lots(id) ON DELETE CASCADE,
  CONSTRAINT parking_spots_occupied_by_fkey FOREIGN KEY (occupied_by) REFERENCES public.users(id)
);

CREATE TABLE public.parking_sessions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  spot_id uuid NOT NULL,
  start_time timestamp with time zone DEFAULT now(),
  end_time timestamp with time zone,
  total_cost numeric,
  status text NOT NULL DEFAULT 'ACTIVE',
  payment_status text DEFAULT 'PENDING',
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT parking_sessions_pkey PRIMARY KEY (id),
  CONSTRAINT parking_sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id),
  CONSTRAINT parking_sessions_spot_id_fkey FOREIGN KEY (spot_id) REFERENCES public.parking_spots(id)
);

-- Enable RLS
ALTER TABLE public.parking_lots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parking_spots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parking_sessions ENABLE ROW LEVEL SECURITY;

-- Policies
-- Lots: Public read, Merchant insert/update
CREATE POLICY "Public read lots" ON public.parking_lots FOR SELECT USING (true);
CREATE POLICY "Merchant insert lots" ON public.parking_lots FOR INSERT WITH CHECK (true);
CREATE POLICY "Merchant update lots" ON public.parking_lots FOR UPDATE USING (true);

-- Spots: Public read, Public update (for status changes)
CREATE POLICY "Public read spots" ON public.parking_spots FOR SELECT USING (true);
CREATE POLICY "Public insert spots" ON public.parking_spots FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update spots" ON public.parking_spots FOR UPDATE USING (true);

-- Sessions: Public read, Public insert, Public update
CREATE POLICY "Public read sessions" ON public.parking_sessions FOR SELECT USING (true);
CREATE POLICY "Public insert sessions" ON public.parking_sessions FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update sessions" ON public.parking_sessions FOR UPDATE USING (true);
