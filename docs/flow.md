# LocalSass HR — 주요 플로우

## 1. 앱 시작 플로우 (호스트)

```
Electron 앱 실행
  ↓
initDb()
  ├── SQLite 연결 (app.getPath('userData')/app.db)
  └── 마이그레이션 실행 (001~005)
  ↓
startServer()
  ├── Express 서버 :8888 시작
  └── mDNS 광고: localsass.local:8888
  ↓
BrowserWindow 생성
  ├── 개발: http://localhost:5173 (Vite)
  └── 프로덕션: http://localhost:8888 (Express)
  ↓
React 앱 로드 → SetupGuard 실행
  ├── GET /api/setup/status
  ├── needsSetup: true  → /setup (초기 설정 마법사)
  └── needsSetup: false → 로그인 여부에 따라 /dashboard 또는 /login
```

---

## 2. 초기 설정 마법사 플로우 (최초 1회)

```
/setup 페이지 (직원이 0명일 때만 진입 가능)
  ↓
Step 1: 회사 이름 + 관리자 계정 (이름, 이메일, 비밀번호)
  ↓
Step 2: Discord Webhook URL 입력 (선택)
  ├── 테스트 메시지 전송 가능
  └── 건너뛰기 가능
  ↓
Step 3: 입력 내용 확인 → 시작하기
  ↓
POST /api/setup/init
  ├── 직원 수 > 0이면 403 (보안)
  ├── 관리자 계정 생성 (bcrypt 해시)
  ├── 현재 연도 잔여 일수 초기화
  └── 설정 저장 (회사명, Discord URL)
  ↓
JWT 발급 → localStorage 저장 → /dashboard 이동
```

---

## 3. 로그인 플로우

```
사용자: 이메일 + 비밀번호 입력
  ↓
POST /api/auth/login
  ↓
DB에서 email로 직원 조회
  ├── 없음 또는 is_active=0 → 401
  └── 있음 → bcrypt.compare(password, hash)
        ├── 불일치 → 401
        └── 일치 → JWT 생성 (24시간)
  ↓
JWT를 localStorage에 저장 → /dashboard 이동
```

이후 모든 API 요청: `Authorization: Bearer <token>` 헤더 포함

---

## 4. 휴가 신청 플로우

```
직원: 새 휴가 신청 폼 작성
  ├── 직원 선택 (기본값: 현재 로그인 사용자)
  ├── 휴가 종류 선택 (일 / 반차 / 시간 단위)
  ├── 날짜 선택 → 영업일 자동 계산 (date-fns)
  └── 잔여 일수 실시간 미리보기
  ↓
POST /api/leave-requests
  ↓
DB: leave_requests 생성 (status='pending')
  ↓
[비동기] Discord Webhook POST
  └── 임베드: 노란색, "🗓️ 새 휴가 신청"
```

---

## 5. 휴가 승인 플로우

```
매니저/관리자: 휴가 상세 → 승인 버튼
  ↓
POST /api/leave-requests/:id/approve { note }
  ↓
권한 체크: role = manager | admin
  ↓
SQLite 트랜잭션 (atomic)
  ├── leave_balances.used_days += total_days
  └── leave_requests.status = 'approved'
  ↓
[비동기] Google Calendar 이벤트 생성
  ├── 이벤트 ID → leave_requests.google_calendar_event_id 저장
  └── 실패해도 승인 자체는 유지
  ↓
[비동기] Discord Webhook POST
  └── 임베드: 초록색, "✅ 휴가 승인"
```

---

## 6. 휴가 거절 플로우

```
POST /api/leave-requests/:id/reject { note }
  ↓
권한 체크: role = manager | admin
  ↓
leave_requests.status = 'rejected'
  ↓
[비동기] Discord Webhook: 빨간색, "❌ 휴가 거절"
```

---

## 7. 휴가 취소 플로우

```
신청자 본인 또는 manager/admin: 취소 버튼
  ↓
POST /api/leave-requests/:id/cancel
  ↓
권한 체크: 본인 또는 manager/admin
  ↓
SQLite 트랜잭션
  ├── (승인 상태였다면) leave_balances.used_days -= total_days
  └── leave_requests.status = 'cancelled'
  ↓
(Google Calendar 이벤트가 있다면) 삭제
  └── google_calendar_event_id → calendar.events.delete()
```

---

## 8. CSV 임포트 플로우 (기존 HR 데이터 이전)

```
관리자: 데이터 임포트 페이지
  ↓
GET /api/import/template
  └── hr_import_template.csv 다운로드 (BOM 포함, Excel 호환)
  ↓
CSV 작성 (또는 Flex HR 데이터를 템플릿 형식으로 변환)
  ↓
파일 첨부 (드래그&드롭 또는 클릭)
  └── FileReader로 텍스트 읽기 → 행 수 미리보기
  ↓
POST /api/import { csvText, employeeId? }
  ↓
flexHrParser.parseCsvTemplate(csvText)
  ├── 발생 행 ("연차발생", "월차발생")
  │     └── upsertLeaveBalance (부여시간 ÷ 8 = allocated_days)
  └── 휴가 행 (일반 신청)
        ├── 없는 휴가 종류 자동 생성 (회색)
        ├── 중복 체크 → 이미 있으면 skip
        ├── leave_requests INSERT (status 직접 지정)
        └── approved → deductLeaveBalance
  ↓
결과: 임포트 건수 / 잔여일수 업데이트 건수 / 건너뜀 수 표시
```

---

## 9. Google OAuth 연결 플로우 (최초 1회)

```
관리자: 설정 → Google 계정 연결 버튼
  ↓
POST /api/settings/connect-google
  ↓
Electron main process:
  ├── 임시 HTTP 서버 :19823 시작
  ├── OAuth URL 생성 (scope: calendar.events)
  └── shell.openExternal(authUrl) → 시스템 브라우저 열림
  ↓
사용자: 브라우저에서 Google 계정으로 로그인
  ↓
Google → http://localhost:19823?code=xxx 리디렉션
  ↓
임시 서버가 code 수신 → access_token + refresh_token 교환
  ↓
refresh_token → electron-store 저장
임시 서버 종료
  ↓
이후 Calendar API 호출 시 refresh_token으로 자동 갱신
```

---

## 10. 인증 흐름 (API 요청)

```
클라이언트 (브라우저/Electron)
  ↓
fetch('/api/...', { headers: { Authorization: 'Bearer <JWT>' } })
  ↓
Express requireAuth 미들웨어
  ├── 헤더 없음 → 401
  ├── 토큰 만료 → 401 → 클라이언트 localStorage 삭제 → /#/login 리디렉션
  └── 유효 → req.user = { id, email, role } → next()
  ↓
라우트 핸들러 실행
```

---

## 11. mDNS 네트워크 발견

```
호스트 앱 시작 시
  └── bonjour.publish({ name: 'HR', type: 'http', port: 8888, host: 'localsass.local' })

팀원 브라우저
  └── http://localsass.local:8888 입력
      → OS가 mDNS로 네트워크 스캔
      → 호스트 PC IP 자동 발견
      → HTTP 연결
```

> Windows에서 mDNS가 안 될 경우 `http://192.168.x.x:8888` (설정 페이지에서 IP 확인)

---

## 역할(Role) 권한 정리

| 기능 | employee | manager | admin |
|---|---|---|---|
| 본인 휴가 신청 | ✅ | ✅ | ✅ |
| 본인 신청 취소 | ✅ | ✅ | ✅ |
| 타인 신청 조회 | ✅ | ✅ | ✅ |
| 타인 신청 승인/거절 | ❌ | ✅ | ✅ |
| 직원 추가/수정 | ❌ | ✅ | ✅ |
| 직원 비활성화 | ❌ | ❌ | ✅ |
| 잔여 일수 조정 | ❌ | ✅ | ✅ |
| 데이터 임포트 | ❌ | ✅ | ✅ |
| 설정 페이지 | ❌ | ❌ | ✅ |
