-- 근로기준법 / 남녀고용평등법 / 병역법 등 법정 휴가 전체 추가
-- default_days = 0 → 일수 제한 없음 (연차 이외 잔여 일수 미차감)

-- ── 근로기준법 제74조: 유산·사산휴가 ──────────────────────────
INSERT OR IGNORE INTO leave_types (id, name, default_days, carry_over_max, color) VALUES
  ('lt-miscarriage-5',  '유산·사산휴가 (11주 이하, 5일)',   0, 0, '#fb923c'),
  ('lt-miscarriage-10', '유산·사산휴가 (12~15주, 10일)',   0, 0, '#fb923c'),
  ('lt-miscarriage-30', '유산·사산휴가 (16~21주, 30일)',   0, 0, '#f97316'),
  ('lt-miscarriage-60', '유산·사산휴가 (22~27주, 60일)',   0, 0, '#ea580c'),
  ('lt-miscarriage-90', '유산·사산휴가 (28주 이상, 90일)', 0, 0, '#c2410c');

-- ── 남녀고용평등법 제18조의3: 난임치료휴가 ──────────────────────
INSERT OR IGNORE INTO leave_types (id, name, default_days, carry_over_max, color) VALUES
  ('lt-fertility',  '난임치료휴가 (연 3일)', 0, 0, '#e879f9');

-- ── 남녀고용평등법 제22조의2: 가족돌봄휴직 ──────────────────────
INSERT OR IGNORE INTO leave_types (id, name, default_days, carry_over_max, color) VALUES
  ('lt-family-leave', '가족돌봄휴직 (연 90일)', 0, 0, '#2dd4bf');

-- ── 경조사 추가 항목 ────────────────────────────────────────────
INSERT OR IGNORE INTO leave_types (id, name, default_days, carry_over_max, color) VALUES
  ('lt-death-grandp',   '사망 (조부모/외조부모)',       2, 0, '#9ca3af'),
  ('lt-death-inlaw',    '사망 (배우자 부모)',           3, 0, '#6b7280'),
  ('lt-death-sibling2', '사망 (배우자 형제자매)',       1, 0, '#a8a29e'),
  ('lt-child-enter',    '자녀 입학',                   1, 0, '#60a5fa'),
  ('lt-move',           '본인 이사',                   1, 0, '#38bdf8');

-- ── 병역법: 예비군/민방위 세분화 ────────────────────────────────
INSERT OR IGNORE INTO leave_types (id, name, default_days, carry_over_max, color) VALUES
  ('lt-reserve2',  '예비군 훈련',     0, 0, '#818cf8'),
  ('lt-civil-def', '민방위 훈련',     0, 0, '#a5b4fc'),
  ('lt-military2', '현역 입대/소집',  0, 0, '#4f46e5');

-- ── 산업재해보상보험법 ────────────────────────────────────────────
INSERT OR IGNORE INTO leave_types (id, name, default_days, carry_over_max, color) VALUES
  ('lt-work-injury', '산업재해 (업무상 부상/질병)', 0, 0, '#f43f5e');

-- ── 기타 법정/관행 ────────────────────────────────────────────────
INSERT OR IGNORE INTO leave_types (id, name, default_days, carry_over_max, color) VALUES
  ('lt-special-govt', '공무상 공가 (소환·증언)',     0, 0, '#94a3b8'),
  ('lt-blood',        '헌혈 휴가',                   0, 0, '#f87171'),
  ('lt-education',    '직무교육 훈련',                0, 0, '#38bdf8'),
  ('lt-sabbatical',   '안식 휴가',                   0, 0, '#a78bfa');
