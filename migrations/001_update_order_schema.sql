-- Add DISPUTED to escrow_status enum if it doesn't exist
ALTER TYPE escrow_status ADD VALUE IF NOT EXISTS 'DISPUTED';

-- Add columns to marketplace_orders if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'marketplace_orders' AND column_name = 'tracking_number') THEN
        ALTER TABLE marketplace_orders ADD COLUMN tracking_number TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'marketplace_orders' AND column_name = 'confirmation_code') THEN
        ALTER TABLE marketplace_orders ADD COLUMN confirmation_code TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'marketplace_orders' AND column_name = 'dispute_reason') THEN
        ALTER TABLE marketplace_orders ADD COLUMN dispute_reason TEXT;
    END IF;
END $$;
