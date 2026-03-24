CREATE TABLE IF NOT EXISTS employees (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  email       TEXT NOT NULL UNIQUE,
  department  TEXT,
  role        TEXT NOT NULL DEFAULT 'employee',
  discord_tag TEXT,
  is_active   INTEGER NOT NULL DEFAULT 1,
  created_at  TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS leave_types (
  id             TEXT PRIMARY KEY,
  name           TEXT NOT NULL,
  default_days   INTEGER NOT NULL,
  carry_over_max INTEGER NOT NULL DEFAULT 0,
  color          TEXT NOT NULL DEFAULT '#3b82f6'
);

CREATE TABLE IF NOT EXISTS leave_balances (
  id             TEXT PRIMARY KEY,
  employee_id    TEXT NOT NULL REFERENCES employees(id),
  leave_type_id  TEXT NOT NULL REFERENCES leave_types(id),
  year           INTEGER NOT NULL,
  allocated_days REAL NOT NULL,
  used_days      REAL NOT NULL DEFAULT 0,
  UNIQUE(employee_id, leave_type_id, year)
);

CREATE TABLE IF NOT EXISTS leave_requests (
  id                       TEXT PRIMARY KEY,
  employee_id              TEXT NOT NULL REFERENCES employees(id),
  leave_type_id            TEXT NOT NULL REFERENCES leave_types(id),
  start_date               TEXT NOT NULL,
  end_date                 TEXT NOT NULL,
  total_days               REAL NOT NULL,
  reason                   TEXT,
  status                   TEXT NOT NULL DEFAULT 'pending',
  reviewed_by              TEXT REFERENCES employees(id),
  reviewed_at              TEXT,
  reviewer_note            TEXT,
  google_calendar_event_id TEXT,
  created_at               TEXT NOT NULL,
  updated_at               TEXT NOT NULL
);
