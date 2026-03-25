CREATE TABLE IF NOT EXISTS scrums (
  id TEXT PRIMARY KEY,
  employee_id TEXT NOT NULL,
  date TEXT NOT NULL,
  items TEXT NOT NULL DEFAULT '[]',
  sent_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (employee_id) REFERENCES employees(id)
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_scrums_employee_date ON scrums(employee_id, date);
