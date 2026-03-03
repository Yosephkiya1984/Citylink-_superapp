-- Create a custom type for user roles
CREATE TYPE user_role AS ENUM ('citizen', 'merchant', 'minister');

-- Create a custom type for KYC and merchant statuses
CREATE TYPE verification_status AS ENUM ('NONE', 'PENDING', 'VERIFIED', 'REJECTED');
CREATE TYPE merchant_approval_status AS ENUM ('NONE', 'PENDING', 'APPROVED', 'REJECTED');

-- Users Table: Stores core user information
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone TEXT UNIQUE NOT NULL,
    role user_role NOT NULL DEFAULT 'citizen',
    name TEXT,
    balance NUMERIC(12, 2) DEFAULT 1000.00, -- Welcome bonus
    registration_complete BOOLEAN DEFAULT FALSE,
    kyc_status verification_status DEFAULT 'NONE',
    id_number TEXT, -- National ID or TIN for merchants
    merchant_status merchant_approval_status DEFAULT 'NONE',
    merchant_name TEXT,
    merchant_type TEXT, -- e.g., 'Retail', 'Food Service'
    business_license TEXT,
    tin_number TEXT, -- Taxpayer Identification Number
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Products Table: For the marketplace
CREATE TABLE marketplace_products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    merchant_id UUID NOT NULL REFERENCES users(id),
    name TEXT NOT NULL,
    description TEXT,
    price NUMERIC(10, 2) NOT NULL,
    image_url TEXT,
    category TEXT,
    stock INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create custom types for Order and Escrow statuses
CREATE TYPE order_status AS ENUM ('PENDING', 'PAID', 'SHIPPED', 'DELIVERED', 'COMPLETED', 'DISPUTED', 'CANCELLED');
CREATE TYPE escrow_status AS ENUM ('FUNDED', 'RELEASED', 'REFUNDED', 'DISPUTED');

-- Orders Table: Manages marketplace transactions with escrow
CREATE TABLE marketplace_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    buyer_id UUID NOT NULL REFERENCES users(id),
    product_id UUID NOT NULL REFERENCES marketplace_products(id),
    quantity INT NOT NULL,
    total_amount NUMERIC(12, 2) NOT NULL,
    status order_status DEFAULT 'PENDING',
    escrow_status escrow_status,
    tracking_number TEXT,
    confirmation_code TEXT,
    dispute_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ekubs Table: Community savings groups
CREATE TABLE ekubs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    creator_id UUID NOT NULL REFERENCES users(id),
    contribution_amount NUMERIC(10, 2) NOT NULL,
    frequency TEXT NOT NULL, -- e.g., 'WEEKLY', 'MONTHLY'
    max_members INT NOT NULL,
    status TEXT DEFAULT 'FORMING', -- 'FORMING', 'ACTIVE', 'COMPLETED'
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ekub Members Junction Table
CREATE TABLE ekub_members (
    ekub_id UUID NOT NULL REFERENCES ekubs(id),
    user_id UUID NOT NULL REFERENCES users(id),
    join_date TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (ekub_id, user_id)
);

-- City Reports Table: For civic issue tracking
CREATE TABLE city_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reporter_id UUID NOT NULL REFERENCES users(id),
    category TEXT NOT NULL,
    description TEXT NOT NULL,
    location TEXT,
    image_url TEXT,
    status TEXT DEFAULT 'SUBMITTED', -- 'SUBMITTED', 'IN_REVIEW', 'RESOLVED'
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Transactions Table: For tracking payments and transfers
CREATE TABLE transactions (
    id TEXT PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id),
    merchant_id UUID NOT NULL REFERENCES users(id),
    amount NUMERIC(12, 2) NOT NULL,
    type TEXT NOT NULL,
    status TEXT NOT NULL,
    description TEXT,
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- Services Table: For city services
CREATE TABLE services (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    description TEXT,
    icon TEXT,
    price NUMERIC(10, 2) DEFAULT 0
);

-- Logs Table: For system logging
CREATE TABLE logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message TEXT NOT NULL,
    type TEXT NOT NULL,
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security for all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketplace_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketplace_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE ekubs ENABLE ROW LEVEL SECURITY;
ALTER TABLE ekub_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE ekub_rounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE city_reports ENABLE ROW LEVEL SECURITY;

-- Add policies for data access (examples)
-- Users can see their own profile
CREATE POLICY "Users can view their own data." ON users
    FOR SELECT USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update their own data." ON users
    FOR UPDATE USING (auth.uid() = id);

-- Authenticated users can see all active products
CREATE POLICY "Authenticated users can view products." ON marketplace_products
    FOR SELECT TO authenticated
    USING (is_active = TRUE);

-- Merchants can manage their own products
CREATE POLICY "Merchants can manage their own products." ON marketplace_products
    FOR ALL USING (auth.uid() = merchant_id);

-- Users can view their own transactions
CREATE POLICY "Users can view their own transactions." ON transactions
    FOR SELECT USING (auth.uid() = user_id OR auth.uid() = merchant_id);

-- Users can insert their own transactions (e.g., for self-initiated payments)
CREATE POLICY "Users can insert their own transactions." ON transactions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- NOTE: More specific policies for orders, ekubs, etc., would be needed for a full production app.

-- RPC Functions for Atomic Operations

-- Function to handle a payment atomically
CREATE OR REPLACE FUNCTION handle_payment(
    p_user_id UUID,
    p_merchant_id UUID,
    p_amount NUMERIC,
    p_tx_id TEXT,
    p_description TEXT
) RETURNS void AS $$
BEGIN
    -- Deduct from user
    UPDATE users SET balance = balance - p_amount WHERE id = p_user_id;
    
    -- Add to merchant
    UPDATE users SET balance = balance + p_amount WHERE id = p_merchant_id;
    
    -- Insert transaction record
    INSERT INTO transactions (id, user_id, merchant_id, amount, type, status, description)
    VALUES (p_tx_id, p_user_id, p_merchant_id, p_amount, 'PAYMENT', 'COMPLETED', p_description);
END;
$$ LANGUAGE plpgsql;

-- Function to increment a user's balance
CREATE OR REPLACE FUNCTION increment_balance(
    p_user_id UUID,
    p_amount NUMERIC
) RETURNS void AS $$
BEGIN
    UPDATE users SET balance = balance + p_amount WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql;

-- Ekub Rounds Table: Tracks the progress of each Ekub
CREATE TABLE ekub_rounds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ekub_id UUID NOT NULL REFERENCES ekubs(id),
    round_number INT NOT NULL,
    winner_id UUID REFERENCES users(id), -- Null until selected
    payout_date TIMESTAMPTZ,
    status TEXT DEFAULT 'PENDING_CONTRIBUTIONS', -- 'PENDING_CONTRIBUTIONS', 'READY_FOR_PAYOUT', 'COMPLETED'
    total_collected NUMERIC(12, 2) DEFAULT 0,
    escrow_released BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (ekub_id, round_number)
);

-- Ekub Contribution Function
CREATE OR REPLACE FUNCTION handle_ekub_contribution(
    p_user_id UUID,
    p_ekub_id UUID,
    p_amount NUMERIC
) RETURNS void AS $$
DECLARE
    v_ekub_member_exists BOOLEAN;
BEGIN
    -- Check if the user is a member of the ekub
    SELECT EXISTS (SELECT 1 FROM ekub_members WHERE ekub_id = p_ekub_id AND user_id = p_user_id) INTO v_ekub_member_exists;

    IF NOT v_ekub_member_exists THEN
        RAISE EXCEPTION 'User is not a member of this Ekub.';
    END IF;

    -- Deduct contribution from user's balance
    UPDATE users SET balance = balance - p_amount WHERE id = p_user_id;

    -- Add contribution to ekub's escrow balance
    UPDATE ekubs SET escrow_balance = escrow_balance + p_amount WHERE id = p_ekub_id;

    -- Update total collected for the current round
    UPDATE ekub_rounds
    SET total_collected = total_collected + p_amount
    WHERE ekub_id = p_ekub_id AND status = 'PENDING_CONTRIBUTIONS';
END;
$$ LANGUAGE plpgsql;

-- Ekub Payout Function
CREATE OR REPLACE FUNCTION handle_ekub_payout(
    p_ekub_id UUID,
    p_winner_id UUID,
    p_amount NUMERIC
) RETURNS void AS $$
BEGIN
    -- Deduct from ekub's escrow balance
    UPDATE ekubs SET escrow_balance = escrow_balance - p_amount WHERE id = p_ekub_id;

    -- Add to winner's balance
    UPDATE users SET balance = balance + p_amount WHERE id = p_winner_id;
END;
$$ LANGUAGE plpgsql;
