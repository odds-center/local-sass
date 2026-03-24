-- 근로기준법 기준 휴가 종류 대폭 확장
-- default_days = 0 → 일수 제한 없음 (별도 차감 없이 사용)

-- 기존 경조사를 세분화
UPDATE leave_types SET name = '경조사 (기타)', default_days = 0 WHERE id = 'lt-personal';

-- 결혼/가족
INSERT OR IGNORE INTO leave_types (id, name, default_days, carry_over_max, color) VALUES
  ('lt-marry-self',    '결혼 (본인)',         5, 0, '#f59e0b'),
  ('lt-marry-child',   '결혼 (자녀)',         1, 0, '#fbbf24'),
  ('lt-birth',         '출산 (배우자/본인)',   0, 0, '#ec4899'),
  ('lt-death-parents', '사망 (부모/배우자)',   5, 0, '#6b7280'),
  ('lt-death-child',   '사망 (자녀)',         3, 0, '#78716c'),
  ('lt-death-sibling', '사망 (형제자매)',      1, 0, '#a8a29e');

-- 병가/의료
INSERT OR IGNORE INTO leave_types (id, name, default_days, carry_over_max, color) VALUES
  ('lt-sick-no-cert',  '병가 (무증빙)',       0, 0, '#ef4444'),
  ('lt-sick-cert',     '병가 (입원/진단서)',  0, 0, '#dc2626'),
  ('lt-medical',       '건강검진',           0, 0, '#f87171');

-- 출산/육아 (근로기준법 제74조, 남녀고용평등법)
INSERT OR IGNORE INTO leave_types (id, name, default_days, carry_over_max, color) VALUES
  ('lt-maternity-b',   '출산전후휴가 (90일)', 90, 0, '#f472b6'),
  ('lt-paternity-b',   '배우자출산휴가 (10일)', 10, 0, '#3b82f6'),
  ('lt-parental-b',    '육아휴직 (최대 1년)', 365, 0, '#10b981'),
  ('lt-childcare',     '육아기 단축근무',     0, 0, '#6ee7b7'),
  ('lt-family-care',   '가족돌봄휴가',        10, 0, '#34d399');

-- 공가/법정 (근로기준법 제10조)
INSERT OR IGNORE INTO leave_types (id, name, default_days, carry_over_max, color) VALUES
  ('lt-military',      '군복무 소집',         0, 0, '#6366f1'),
  ('lt-reserve',       '예비군/민방위 훈련', 0, 0, '#818cf8'),
  ('lt-jury',          '배심원/증인 출석',    0, 0, '#a5b4fc'),
  ('lt-vote',          '선거 투표',           0, 0, '#7c3aed'),
  ('lt-disaster',      '재난·재해',           0, 0, '#d97706');

-- 기타
INSERT OR IGNORE INTO leave_types (id, name, default_days, carry_over_max, color) VALUES
  ('lt-menstrual-b',   '생리휴가',            0, 0, '#f472b6'),
  ('lt-unpaid',        '무급휴가',            0, 0, '#52525b');
