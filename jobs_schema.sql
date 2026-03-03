-- Job Profiles Table (Talent Radar)
CREATE TABLE IF NOT EXISTS job_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    education TEXT,
    experience INTEGER DEFAULT 0,
    skills TEXT[], -- Array of strings
    work_history JSONB DEFAULT '[]'::jsonb,
    education_details JSONB DEFAULT '[]'::jsonb,
    certifications JSONB DEFAULT '[]'::jsonb,
    resume_url TEXT,
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

-- Enable RLS
ALTER TABLE job_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_postings ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_consent_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE interviews ENABLE ROW LEVEL SECURITY;

-- Policies

-- Job Profiles:
-- Publicly viewable (or at least by merchants)
CREATE POLICY "View job profiles" ON job_profiles FOR SELECT USING (true);
-- Users can manage their own profile
CREATE POLICY "Users manage own profile" ON job_profiles FOR ALL USING (auth.uid() = user_id);

-- Job Postings:
-- Everyone can view open jobs
CREATE POLICY "Public view open jobs" ON job_postings FOR SELECT USING (status = 'OPEN');
-- Merchants can view/manage their own jobs
CREATE POLICY "Merchants manage own jobs" ON job_postings FOR ALL USING (auth.uid() = merchant_id);

-- Job Applications:
-- Citizens can view their own applications
CREATE POLICY "Citizens view own applications" ON job_applications FOR SELECT USING (auth.uid() = citizen_id);
-- Merchants can view applications for their jobs (via merchant_id)
CREATE POLICY "Merchants view applications" ON job_applications FOR SELECT USING (auth.uid() = merchant_id);
-- Citizens can create applications
CREATE POLICY "Citizens create applications" ON job_applications FOR INSERT WITH CHECK (auth.uid() = citizen_id);
-- Merchants can update status
CREATE POLICY "Merchants update application status" ON job_applications FOR UPDATE USING (auth.uid() = merchant_id);

-- Job Consent Requests:
-- Viewable by both parties
CREATE POLICY "View consent requests" ON job_consent_requests FOR SELECT USING (auth.uid() = merchant_id OR auth.uid() = citizen_id);
-- Merchants can create requests
CREATE POLICY "Merchants create consent requests" ON job_consent_requests FOR INSERT WITH CHECK (auth.uid() = merchant_id);
-- Citizens can update status (approve/reject)
CREATE POLICY "Citizens update consent requests" ON job_consent_requests FOR UPDATE USING (auth.uid() = citizen_id);

-- Interviews:
-- Viewable by both parties
CREATE POLICY "View interviews" ON interviews FOR SELECT USING (auth.uid() = merchant_id OR auth.uid() = citizen_id);
-- Merchants can create/update interviews
CREATE POLICY "Merchants manage interviews" ON interviews FOR ALL USING (auth.uid() = merchant_id);
