-- PostgreSQL-style schema for AlvVaz travel agency foundation.
-- TODO: Convert into migrations when a real database is wired.

CREATE TABLE IF NOT EXISTS clients (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  contact TEXT NOT NULL,
  tags TEXT[] NOT NULL DEFAULT '{}',
  notes TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'new',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS magazine_issues (
  id UUID PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS magazine_items (
  id UUID PRIMARY KEY,
  issue_id UUID NOT NULL REFERENCES magazine_issues(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('PDF', 'IMAGE')),
  title TEXT NOT NULL DEFAULT '',
  file_url TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS trips (
  id UUID PRIMARY KEY,
  client_name TEXT NOT NULL DEFAULT '',
  destination TEXT NOT NULL,
  hotel TEXT NOT NULL DEFAULT '',
  supplier TEXT NOT NULL DEFAULT '',
  organizer TEXT NOT NULL DEFAULT '',
  passenger_count INT NOT NULL DEFAULT 0,
  departure_date DATE,
  return_date DATE,
  status TEXT NOT NULL DEFAULT 'pending',
  notes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS trip_travelers (
  id UUID PRIMARY KEY,
  trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT NOT NULL DEFAULT '',
  contract TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
