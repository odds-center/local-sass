# HR — API 레퍼런스

Base URL: `http://localsass.local:8888/api`

🔒 = JWT 필요 (`Authorization: Bearer <token>` 헤더)
(admin) = admin 권한만
(manager) = manager 또는 admin

---

## Setup (인증 불필요)

### `GET /setup/status`
초기 설정 필요 여부 확인.

**Response**
```json
{ "needsSetup": true }
```

### `POST /setup/init`
최초 관리자 계정 생성. 직원이 0명일 때만 허용.

**Body**
```json
{
  "companyName": "우리 회사",
  "name": "홍길동",
  "email": "hong@company.com",
  "password": "password123",
  "discordWebhookUrl": "https://discord.com/api/webhooks/..."
}
```

**Response**
```json
{
  "token": "eyJ...",
  "user": { "id": "...", "name": "홍길동", "email": "...", "role": "admin" }
}
```

---

## Auth

### `POST /auth/login`
로그인. JWT 반환.

**Body**
```json
{ "email": "hong@company.com", "password": "1234" }
```

### `GET /auth/me` 🔒
현재 로그인된 사용자 정보.

---

## Employees 🔒

### `GET /employees`
전체 직원 목록 (활성·비활성 모두 포함).

### `POST /employees` (manager)
직원 추가. `password` 필드 필수. 등록 시 당해 연도 잔여 일수 자동 초기화.

**Body**
```json
{
  "name": "김직원",
  "email": "kim@company.com",
  "department": "개발팀",
  "role": "employee",
  "discord_tag": "kim#1234",
  "password": "initial_password"
}
```

### `PUT /employees/:id` (manager)
직원 수정. `password` 미포함 시 비밀번호 유지.

### `DELETE /employees/:id/deactivate` (manager)
직원 비활성화. `is_active = 0` 소프트 삭제. 데이터 보존, 재활성화 가능.

### `PATCH /employees/:id/activate` (manager)
비활성 직원 재활성화. `is_active = 1`.

### `DELETE /employees/:id` (admin)
직원 완전 삭제. DB에서 영구 제거. **되돌릴 수 없음.**

---

## Leave Requests 🔒

### `GET /leave-requests`
휴가 신청 목록. 쿼리 파라미터로 필터:
- `status`: `pending` | `approved` | `rejected` | `cancelled`
- `employee_id`
- `leave_type_id`
- `year`

### `POST /leave-requests`
새 휴가 신청.

**Body**
```json
{
  "employee_id": "...",
  "leave_type_id": "...",
  "start_date": "2026-04-01",
  "end_date": "2026-04-03",
  "total_days": 3,
  "leave_unit": "day",
  "leave_hours": null,
  "reason": "개인 사유"
}
```

`leave_unit`: `"day"` | `"half_am"` | `"half_pm"` | `"hour"`

### `POST /leave-requests/:id/approve` (manager)
승인. `note` 선택.

**Body** `{ "note": "확인했습니다." }`

### `POST /leave-requests/:id/reject` (manager)
거절. `note` 선택.

### `POST /leave-requests/:id/cancel`
취소. 본인 또는 manager/admin만 가능.

---

## Leave Balances 🔒

### `GET /leave-balances/:year`
연도별 전체 직원 잔여 일수.

### `GET /leave-balances/employee/:employeeId/:year`
특정 직원의 연도별 잔여 일수.

### `PUT /leave-balances/:id` (manager)
잔여 일수 수동 조정. 30분(0.5시간) 단위.

**Body** `{ "allocated_days": 18.5 }`

`allocated_days`는 일수 단위 (예: 18.5 = 18일 4시간).

---

## Leave Types 🔒

### `GET /leave-types`
휴가 종류 목록.

### `POST /leave-types` (admin)
휴가 종류 추가.

**Body**
```json
{
  "name": "특별휴가",
  "default_days": 3,
  "carry_over_max": 0,
  "color": "#8b5cf6"
}
```

### `PUT /leave-types/:id` (admin)
휴가 종류 수정.

---

## Import 🔒 (manager)

### `POST /import`
CSV 텍스트 파싱 후 DB 저장.

**Body**
```json
{
  "csvText": "이름,시작일,...\n홍길동,2026-01-01,...",
  "employeeId": "emp-xxx"
}
```
`employeeId` 생략 시 이름으로 자동 매칭 (없으면 새 직원 생성).

**Response**
```json
{
  "ok": true,
  "importedRequests": 42,
  "importedBalances": 3,
  "skipped": 2,
  "employeeId": "emp-xxx"
}
```

CSV 컬럼 순서:
```
이름, 시작일, 종료일, 항목, 사용일수, 상태, 부여일, 부여시간
```

---

## Settings 🔒 (admin)

### `GET /settings`
현재 설정. `host_ips` 포함 (팀원 접속 주소용).

**Response**
```json
{
  "discord_webhook_url": "https://...",
  "google_client_id": "...",
  "google_client_secret": "***",
  "google_refresh_token": "연결됨",
  "google_calendar_id": "...",
  "app_company_name": "우리 회사",
  "current_user_id": "...",
  "host_ips": ["192.168.1.100"]
}
```

### `PUT /settings`
설정 저장.

### `POST /settings/test-discord`
Discord 웹훅 테스트 메시지 전송.

**Response** `{ "ok": true }`

### `POST /settings/connect-google`
Google OAuth 플로우 시작 (Electron에서 브라우저 열림).

### `GET /settings/calendars`
연결된 Google 캘린더 목록.

**Response** `[{ "id": "primary", "summary": "내 캘린더" }]`
