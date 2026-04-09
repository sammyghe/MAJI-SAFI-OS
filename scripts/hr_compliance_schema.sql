-- Maji Safi OS HR & Compliance Schema Update

-- 1. Create the Users table for Authentication and HR matching
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    role TEXT, -- e.g., 'founder', 'compliance', 'operations', 'investor'
    department TEXT, 
    status TEXT DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
    contract_status TEXT DEFAULT 'Pending Signature', -- 'Active', 'Terminated', 'Pending Signature'
    performance_notes TEXT,
    contract_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Seed an initial founder account so you don't lock yourself out
INSERT INTO users (email, name, role, department, status, contract_status, performance_notes) 
VALUES ('sammy@gmail.com', 'Sammy Founder', 'founder', 'operations', 'approved', 'Active', 'Master system admin')
ON CONFLICT (email) DO NOTHING;

-- 2. Create the Regulatory records table for the Compliance Portal
CREATE TABLE IF NOT EXISTS compliance_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_name TEXT NOT NULL,
    expiry_date DATE NOT NULL,
    file_url TEXT,
    status TEXT DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Seed initial records
INSERT INTO compliance_records (document_name, expiry_date, status) VALUES 
('UNBS Quality Certification', '2026-05-01', 'pending'),
('NEMA Environmental Audit', '2027-01-15', 'active');
