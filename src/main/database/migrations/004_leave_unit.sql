ALTER TABLE leave_requests ADD COLUMN leave_unit TEXT NOT NULL DEFAULT 'day';
ALTER TABLE leave_requests ADD COLUMN leave_hours REAL;
