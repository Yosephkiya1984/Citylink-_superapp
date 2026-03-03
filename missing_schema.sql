-- Job Profiles Table (Talent Radar)
CREATE TABLE IF NOT EXISTS job_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    education TEXT,
    experience INTEGER DEFAULT 0,
    skills TEXT[], -- Array of strings
    verified BOOLEAN DEFAULT FALSE,
    trust_score INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Job Postings Table
CREATE TABLE IF NOT EXISTS job_postings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    merchant_id UUID NOT NULL REFERENCES users(id),
    merchant_name TEXT, -- Denormalized
    title TEXT NOT NULL,
    description TEXT,
    requirements TEXT[], -- Array of strings
    salary_range TEXT,
    location TEXT,
    type TEXT, -- 'FULL_TIME', 'PART_TIME', etc.
    status TEXT DEFAULT 'OPEN', -- 'OPEN', 'CLOSED'
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Job Applications Table
CREATE TABLE IF NOT EXISTS job_applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID NOT NULL REFERENCES job_postings(id) ON DELETE CASCADE,
    citizen_id UUID NOT NULL REFERENCES users(id),
    merchant_id UUID NOT NULL REFERENCES users(id), -- Denormalized for easier querying
    merchant_name TEXT, -- Denormalized
    citizen_name TEXT, -- Denormalized
    role TEXT, -- The job title/role applied for
    resume_url TEXT,
    cover_letter TEXT,
    status TEXT DEFAULT 'PENDING', -- 'PENDING', 'REVIEWING', 'ACCEPTED', 'REJECTED'
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Job Consent Requests Table (for background checks/document requests)
CREATE TABLE IF NOT EXISTS job_consent_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    merchant_id UUID NOT NULL REFERENCES users(id),
    citizen_id UUID NOT NULL REFERENCES users(id),
    merchant_name TEXT, -- Denormalized
    requested_docs TEXT[], -- Array of strings e.g. ['police_check', 'id']
    status TEXT DEFAULT 'PENDING', -- 'PENDING', 'APPROVED', 'REJECTED'
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Interviews Table
CREATE TABLE IF NOT EXISTS interviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id UUID REFERENCES job_applications(id) ON DELETE SET NULL, -- Optional link
    merchant_id UUID NOT NULL REFERENCES users(id),
    citizen_id UUID NOT NULL REFERENCES users(id),
    interview_date TIMESTAMPTZ NOT NULL,
    location TEXT,
    notes TEXT,
    status TEXT DEFAULT 'SCHEDULED', -- 'SCHEDULED', 'COMPLETED', 'CANCELLED'
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Traffic Fines Table
CREATE TABLE IF NOT EXISTS traffic_fines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    amount NUMERIC(10, 2) NOT NULL,
    reason TEXT NOT NULL,
    location TEXT,
    status TEXT DEFAULT 'PENDING', -- 'PENDING', 'PAID'
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add missing columns to Ekub Rounds if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ekub_rounds' AND column_name = 'guarantor_1_id') THEN
        ALTER TABLE ekub_rounds ADD COLUMN guarantor_1_id UUID REFERENCES users(id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ekub_rounds' AND column_name = 'guarantor_2_id') THEN
        ALTER TABLE ekub_rounds ADD COLUMN guarantor_2_id UUID REFERENCES users(id);
    END IF;
END $$;

-- Enable RLS
ALTER TABLE job_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_postings ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_consent_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE interviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE traffic_fines ENABLE ROW LEVEL SECURITY;

-- Policies

-- Job Profiles:
CREATE POLICY "View job profiles" ON job_profiles FOR SELECT USING (true);
CREATE POLICY "Users manage own profile" ON job_profiles FOR ALL USING (auth.uid() = user_id);

-- Job Postings:
CREATE POLICY "Public view open jobs" ON job_postings FOR SELECT USING (status = 'OPEN');
CREATE POLICY "Merchants manage own jobs" ON job_postings FOR ALL USING (auth.uid() = merchant_id);

-- Job Applications:
CREATE POLICY "Citizens view own applications" ON job_applications FOR SELECT USING (auth.uid() = citizen_id);
CREATE POLICY "Merchants view applications" ON job_applications FOR SELECT USING (auth.uid() = merchant_id);
CREATE POLICY "Citizens create applications" ON job_applications FOR INSERT WITH CHECK (auth.uid() = citizen_id);
CREATE POLICY "Merchants update application status" ON job_applications FOR UPDATE USING (auth.uid() = merchant_id);

-- Job Consent Requests:
CREATE POLICY "View consent requests" ON job_consent_requests FOR SELECT USING (auth.uid() = merchant_id OR auth.uid() = citizen_id);
CREATE POLICY "Merchants create consent requests" ON job_consent_requests FOR INSERT WITH CHECK (auth.uid() = merchant_id);
CREATE POLICY "Citizens update consent requests" ON job_consent_requests FOR UPDATE USING (auth.uid() = citizen_id);

-- Interviews:
CREATE POLICY "View interviews" ON interviews FOR SELECT USING (auth.uid() = merchant_id OR auth.uid() = citizen_id);
CREATE POLICY "Merchants manage interviews" ON interviews FOR ALL USING (auth.uid() = merchant_id);

-- Traffic Fines:
CREATE POLICY "Users view own fines" ON traffic_fines FOR SELECT USING (auth.uid() = user_id);
-- Assuming an admin or system role creates fines, but for now allow public insert for demo/testing or restrict to service_role
CREATE POLICY "System create fines" ON traffic_fines FOR INSERT WITH CHECK (true); 
