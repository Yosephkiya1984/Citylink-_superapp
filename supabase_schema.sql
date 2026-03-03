-- Parking Lots Table
CREATE TABLE IF NOT EXISTS parking_lots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  merchant_id UUID REFERENCES users(id) NOT NULL,
  name TEXT NOT NULL,
  address TEXT,
  capacity INTEGER DEFAULT 0,
  total_spots INTEGER DEFAULT 0,
  base_rate NUMERIC DEFAULT 0,
  additional_rate NUMERIC DEFAULT 0,
  daily_max NUMERIC DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Parking Spots Table
CREATE TABLE IF NOT EXISTS parking_spots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lot_id UUID REFERENCES parking_lots(id) ON DELETE CASCADE NOT NULL,
  spot_number INTEGER NOT NULL,
  status TEXT DEFAULT 'AVAILABLE', -- 'AVAILABLE', 'OCCUPIED'
  occupied_by UUID REFERENCES users(id),
  check_in_time TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Parking Sessions Table
CREATE TABLE IF NOT EXISTS parking_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) NOT NULL,
  spot_id UUID REFERENCES parking_spots(id) NOT NULL,
  start_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  end_time TIMESTAMP WITH TIME ZONE,
  total_cost NUMERIC,
  status TEXT DEFAULT 'ACTIVE', -- 'ACTIVE', 'COMPLETED'
  payment_status TEXT DEFAULT 'PENDING',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE parking_lots ENABLE ROW LEVEL SECURITY;
ALTER TABLE parking_spots ENABLE ROW LEVEL SECURITY;
ALTER TABLE parking_sessions ENABLE ROW LEVEL SECURITY;

-- Policies for Parking Lots
CREATE POLICY "Public lots are viewable by everyone" 
ON parking_lots FOR SELECT USING (true);

CREATE POLICY "Merchants can insert their own lots" 
ON parking_lots FOR INSERT WITH CHECK (auth.uid() = merchant_id OR auth.role() = 'anon' OR auth.role() = 'service_role');

CREATE POLICY "Merchants can update their own lots" 
ON parking_lots FOR UPDATE USING (auth.uid() = merchant_id OR auth.role() = 'anon' OR auth.role() = 'service_role');

-- Policies for Parking Spots
CREATE POLICY "Public spots are viewable by everyone" 
ON parking_spots FOR SELECT USING (true);

CREATE POLICY "Merchants can manage spots in their lots" 
ON parking_spots FOR ALL USING (
  EXISTS (
    SELECT 1 FROM parking_lots 
    WHERE parking_lots.id = parking_spots.lot_id 
    AND (parking_lots.merchant_id = auth.uid() OR auth.role() = 'anon' OR auth.role() = 'service_role')
  )
);

-- Policies for Parking Sessions
CREATE POLICY "Users can view their own sessions" 
ON parking_sessions FOR SELECT USING (auth.uid() = user_id OR auth.role() = 'anon' OR auth.role() = 'service_role');

CREATE POLICY "Merchants can view sessions for their lots" 
ON parking_sessions FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM parking_spots
    JOIN parking_lots ON parking_spots.lot_id = parking_lots.id
    WHERE parking_spots.id = parking_sessions.spot_id
    AND (parking_lots.merchant_id = auth.uid() OR auth.role() = 'anon' OR auth.role() = 'service_role')
  )
);

CREATE POLICY "Users can insert their own sessions" 
ON parking_sessions FOR INSERT WITH CHECK (auth.uid() = user_id OR auth.role() = 'anon' OR auth.role() = 'service_role');

CREATE POLICY "Users can update their own sessions" 
ON parking_sessions FOR UPDATE USING (auth.uid() = user_id OR auth.role() = 'anon' OR auth.role() = 'service_role');
