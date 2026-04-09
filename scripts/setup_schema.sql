-- Run this in the Supabase SQL Editor to prepare for the new architecture

-- Add department column if missing
DO $$
BEGIN
  IF NOT EXISTS(SELECT * FROM information_schema.columns 
                WHERE table_name='maji_projects' and column_name='department') THEN
    ALTER TABLE public.maji_projects ADD COLUMN department text DEFAULT 'Operations';
  END IF;
END $$;

-- Create tables for each department's logs if they do not exist
CREATE TABLE IF NOT EXISTS public.maji_quality_logs (
    id serial primary key,
    created_at timestamp with time zone default now(),
    date date not null,
    test_type text,
    status text,
    logged_by text
);

CREATE TABLE IF NOT EXISTS public.maji_clients (
    id serial primary key,
    created_at timestamp with time zone default now(),
    date date not null,
    client_name text,
    jars_sold int,
    revenue_ugx numeric,
    logged_by text
);

CREATE TABLE IF NOT EXISTS public.maji_inventory (
    id serial primary key,
    created_at timestamp with time zone default now(),
    date date not null,
    item_name text,
    quantity_used int,
    quantity_remaining int,
    logged_by text
);

CREATE TABLE IF NOT EXISTS public.maji_compliance (
    id serial primary key,
    created_at timestamp with time zone default now(),
    date date not null,
    check_type text,
    status text,
    notes text,
    logged_by text
);

-- Note: Operations and Finance will both use maji_daily_logs.
