-- 근로기준법 기준 추가 휴가 종류
INSERT OR IGNORE INTO leave_types (id, name, default_days, carry_over_max, color) VALUES
  ('lt-maternity',  '출산휴가',      90, 0, '#ec4899'),
  ('lt-paternity',  '배우자출산휴가', 10, 0, '#3b82f6'),
  ('lt-parental',   '육아휴직',      365, 0, '#10b981'),
  ('lt-official',   '공가',          0, 0, '#6b7280'),
  ('lt-menstrual',  '생리휴가',      1, 0, '#f472b6');

-- 기존 경조사 default_days 업데이트
UPDATE leave_types SET default_days = 5 WHERE id = 'lt-personal';
