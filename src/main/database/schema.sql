-- ============================================================
-- LocalSass HR — PostgreSQL Schema (multi-tenant)
-- ============================================================

-- Migrations tracker
CREATE TABLE IF NOT EXISTS _migrations (
  id SERIAL PRIMARY KEY,
  filename TEXT NOT NULL UNIQUE,
  run_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Tenants (companies) ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS tenants (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                 TEXT NOT NULL,
  slug                 TEXT UNIQUE NOT NULL,
  google_client_id     TEXT NOT NULL DEFAULT '',
  google_client_secret TEXT NOT NULL DEFAULT '',
  google_refresh_token TEXT NOT NULL DEFAULT '',
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Channels (feature modules per tenant) ───────────────────
-- type: 'leave_management' | 'scrum'
-- config examples:
--   leave_management: { "discord_webhook_url": "...", "google_calendar_id": "..." }
--   scrum:            { "discord_webhook_url": "..." }
CREATE TABLE IF NOT EXISTS channels (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id  UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  type       TEXT NOT NULL,
  config     JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Employees ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS employees (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  email         TEXT NOT NULL,
  department    TEXT,
  role          TEXT NOT NULL DEFAULT 'employee',
  discord_tag   TEXT,
  is_active     INTEGER NOT NULL DEFAULT 1,
  password_hash TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(tenant_id, email)
);

-- ── Leave types ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS leave_types (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name           TEXT NOT NULL,
  default_days   INTEGER NOT NULL DEFAULT 15,
  carry_over_max INTEGER NOT NULL DEFAULT 0,
  color          TEXT NOT NULL DEFAULT '#8b5cf6'
);

-- ── Leave balances ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS leave_balances (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  employee_id    UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  leave_type_id  UUID NOT NULL REFERENCES leave_types(id) ON DELETE CASCADE,
  year           INTEGER NOT NULL,
  allocated_days NUMERIC NOT NULL DEFAULT 0,
  used_days      NUMERIC NOT NULL DEFAULT 0,
  UNIQUE(employee_id, leave_type_id, year)
);

-- ── Leave requests ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS leave_requests (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  employee_id              UUID NOT NULL REFERENCES employees(id),
  leave_type_id            UUID NOT NULL REFERENCES leave_types(id),
  start_date               TEXT NOT NULL,
  end_date                 TEXT NOT NULL,
  total_days               NUMERIC NOT NULL,
  leave_unit               TEXT NOT NULL DEFAULT 'day',
  leave_hours              NUMERIC,
  start_time               TEXT,
  end_time                 TEXT,
  reason                   TEXT,
  status                   TEXT NOT NULL DEFAULT 'pending',
  reviewed_by              UUID REFERENCES employees(id),
  reviewed_at              TIMESTAMPTZ,
  reviewer_note            TEXT,
  google_calendar_event_id TEXT,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Scrums ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS scrums (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  date        TEXT NOT NULL,
  items       JSONB NOT NULL DEFAULT '[]',
  sent_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(employee_id, date)
);

-- ── Indexes ──────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_employees_tenant        ON employees(tenant_id);
CREATE INDEX IF NOT EXISTS idx_leave_requests_tenant   ON leave_requests(tenant_id);
CREATE INDEX IF NOT EXISTS idx_leave_requests_employee ON leave_requests(employee_id);
CREATE INDEX IF NOT EXISTS idx_leave_balances_tenant   ON leave_balances(tenant_id);
CREATE INDEX IF NOT EXISTS idx_scrums_tenant           ON scrums(tenant_id);
CREATE INDEX IF NOT EXISTS idx_scrums_employee_date    ON scrums(employee_id, date);
CREATE INDEX IF NOT EXISTS idx_channels_tenant         ON channels(tenant_id);
