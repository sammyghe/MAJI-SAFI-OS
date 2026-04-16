-- Create team_members table with PINs for authentication
CREATE TABLE IF NOT EXISTS team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  role TEXT NOT NULL CHECK (role IN ('founder', 'operator', 'manager')),
  department_slug TEXT,
  departments TEXT[] DEFAULT '{}',
  pin TEXT NOT NULL UNIQUE,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
  location_id TEXT NOT NULL DEFAULT 'buziga',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT fk_location_tm FOREIGN KEY (location_id) REFERENCES locations(id)
);

-- Insert default founders with PINs
INSERT INTO team_members (name, email, role, departments, pin, location_id, status)
VALUES 
  ('Samuel Ghedamu', 'samuel@majisafi.com', 'founder', ARRAY['founder-office', 'finance'], '1234', 'buziga', 'active'),
  ('Amanuel Asmerom Yonas', 'amanuel@majisafi.com', 'founder', ARRAY['founder-office', 'finance'], '5678', 'buziga', 'active'),
  ('Amos Nagirinya', 'amos@majisafi.com', 'operator', ARRAY['production', 'dispatch'], '9012', 'buziga', 'active'),
  ('Rosette Nakalanda', 'rosette@majisafi.com', 'manager', ARRAY['quality', 'compliance'], '3456', 'buziga', 'active')
ON CONFLICT (pin) DO NOTHING;

CREATE INDEX IF NOT EXISTS idx_team_members_pin ON team_members(pin);
CREATE INDEX IF NOT EXISTS idx_team_members_location_status ON team_members(location_id, status);
