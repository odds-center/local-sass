# HR — 사내 휴가 관리 시스템 프로젝트 문서

> 버전 0.1.0 · 라이선스 MIT · 최종 갱신 2026-03-24

---

## 목차

1. [프로젝트 개요](#1-프로젝트-개요)
2. [기술 스택](#2-기술-스택)
3. [전체 아키텍처](#3-전체-아키텍처)
4. [DB 스키마](#4-db-스키마)
5. [휴가 종류 목록 (42종)](#5-휴가-종류-목록-42종)
6. [휴가 단위](#6-휴가-단위)
7. [API 엔드포인트 목록](#7-api-엔드포인트-목록)
8. [라우팅 구조 (화면 목록)](#8-라우팅-구조-화면-목록)
9. [실행 방법](#9-실행-방법)
10. [주요 기능 목록](#10-주요-기능-목록)

---

## 1. 프로젝트 개요

**HR**은 Electron 기반의 오프라인 우선(offline-first) **사내 휴가 관리 애플리케이션**이다.
별도 클라우드 서버 없이 사내 PC 한 대에 설치하면 로컬 네트워크 안의 모든 구성원이 브라우저로 접속해 휴가를 신청·승인·조회할 수 있다.

| 항목 | 내용 |
|---|---|
| 패키지 이름 | `local-sass` |
| 앱 이름 | HR |
| 버전 | 0.1.0 |
| 실행 포트 | **8888** |
| mDNS 주소 | `http://localsass.local:8888` |
| 라이선스 | MIT |

### 핵심 특징

- **완전 로컬**: SQLite 데이터베이스를 단일 파일로 관리하며 외부 클라우드 의존 없음
- **멀티 유저**: JWT 인증 기반으로 employee / manager / admin 3단계 권한 구분
- **외부 연동**: Discord Webhook 알림, Google Calendar 이벤트 자동 생성/삭제
- **근로기준법 준수**: 대한민국 근로기준법·남녀고용평등법·병역법 기준 42종 휴가 유형 기본 탑재
- **유연한 휴가 단위**: 종일 / 오전반차 / 오후반차 / 시간단위(30분 단위)
- **정밀한 수치 연산**: 잔여 일수·시간 계산에 `bignumber.js` 사용 (부동소수점 오차 방지)

---

## 2. 기술 스택

### 런타임 & 프레임워크

| 분류 | 기술 | 버전 |
|---|---|---|
| 데스크톱 쉘 | [Electron](https://www.electronjs.org/) | ^31.0.2 |
| UI 프레임워크 | [React](https://react.dev/) | ^18.3.1 |
| 라우팅 | [React Router DOM](https://reactrouter.com/) | ^6.23.1 |
| API 서버 | [Express](https://expressjs.com/) | ^5.2.1 |
| DB | [better-sqlite3](https://github.com/WiseLibs/better-sqlite3) | ^12.8.0 |
| 빌드 도구 | [Vite](https://vitejs.dev/) | ^5.3.1 |
| 언어 | TypeScript | ^5.4.5 |

### 주요 라이브러리

| 분류 | 라이브러리 | 용도 |
|---|---|---|
| 인증 | `jsonwebtoken` ^9.0.3 | JWT 토큰 발급·검증 |
| 인증 | `bcryptjs` ^3.0.3 | 비밀번호 해싱 |
| 유효성 검사 | `zod` ^3.23.8 | 입력값 스키마 검증 |
| 폼 관리 | `react-hook-form` ^7.51.5 | 폼 상태 관리 |
| 폼 관리 | `@hookform/resolvers` ^3.6.0 | Zod 연동 |
| 날짜 | `date-fns` ^3.6.0 | 날짜 계산·포맷 |
| 날짜 UI | `react-day-picker` ^9.14.0 | 캘린더 피커 |
| 수치 연산 | `bignumber.js` | 부동소수점 정밀 연산 (잔여 일수/시간 변환) |
| 아이콘 | `lucide-react` ^1.0.1 | UI 아이콘 |
| 스타일 | Tailwind CSS ^3.4.4 | 유틸리티 CSS |
| 서비스 검색 | `bonjour-service` ^1.3.0 | mDNS 광고 |
| 설정 저장 | `electron-store` ^8.2.0 | 앱 설정 영속화 |
| Google 연동 | `googleapis` ^140.0.1 | Calendar API |
| 유틸 | `uuid` ^10.0.0 | PK 생성 |
| 빌드 패키징 | `electron-builder` ^24.13.3 | macOS/Windows 배포 |

---

## 3. 전체 아키텍처

```
┌─────────────────────────────────────────────────────────────┐
│                      Electron Process                       │
│                                                             │
│  ┌──────────────────────┐   ┌───────────────────────────┐  │
│  │   Main Process       │   │   Renderer Process        │  │
│  │   (Node.js)          │   │   (Chromium)              │  │
│  │                      │   │                           │  │
│  │  index.ts            │   │  React 18 SPA             │  │
│  │  ├─ initDb()         │   │  ├─ HashRouter             │  │
│  │  ├─ startServer()    │   │  ├─ fetch() → REST API    │  │
│  │  └─ createWindow()   │   │  └─ Tailwind CSS UI       │  │
│  │                      │   │                           │  │
│  │  Express Server :8888│   │                           │  │
│  │  ├─ /api/setup       │   │                           │  │
│  │  ├─ /api/auth        │   │                           │  │
│  │  ├─ /api/employees   │   │                           │  │
│  │  ├─ /api/leave-*     │◄──┤   HTTP fetch()            │  │
│  │  ├─ /api/settings    │   │                           │  │
│  │  └─ /api/import      │   │                           │  │
│  │                      │   │                           │  │
│  │  SQLite (DB)         │   │                           │  │
│  │  better-sqlite3      │   │                           │  │
│  └──────────────────────┘   └───────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
          │                              │
          ▼                              ▼
   외부 연동                        로컬 네트워크 접속
   ├─ Discord Webhook               브라우저로 직접 접속
   └─ Google Calendar API           http://localsass.local:8888
```

### 프로세스 구성

#### Electron Main Process (`src/main/index.ts`)

앱 진입점. 다음 순서로 초기화된다.

1. `initDb()` — SQLite DB 파일을 열고 마이그레이션 SQL을 순서대로 실행
2. `await startServer()` — Express HTTP 서버를 `0.0.0.0:8888`에 바인딩 (Promise 기반, 완료 대기)
3. `createWindow()` — Chromium 창 생성 (개발: `localhost:5173`, 프로덕션: `localhost:8888`)

창 설정:
- 기본 크기: 1280×800, 최소: 900×600
- macOS: `hiddenInset` 타이틀바 스타일 (트래픽 라이트 버튼 공간 확보)
- `contextIsolation: true`, `nodeIntegration: false` (보안)
- preload 스크립트 없음 — renderer는 `fetch()`만 사용
- DevTools 자동 열기 없음

#### Express API 서버 (`src/main/server.ts`)

- 포트: **8888**, 바인딩: `0.0.0.0` (전체 네트워크 인터페이스)
- `/api/setup`, `/api/auth` — 인증 불필요 (공개 엔드포인트)
- 그 외 `/api/*` — JWT `requireAuth` 미들웨어 적용
- 프로덕션 빌드 시 `dist/` 폴더의 React 정적 파일 서빙
- SPA fallback: `/api`로 시작하지 않는 모든 경로에 `index.html` 반환

#### React Renderer (`src/renderer/App.tsx`)

- `HashRouter` 사용 (Electron file:// 호환)
- `SetupGuard` 컴포넌트가 최초 접속 시 직원 수를 확인하여 초기 설정 화면으로 리다이렉트
- `ProtectedRoute`로 미로그인 사용자를 `/login`으로 리다이렉트
- `localStorage`에 JWT 토큰 저장

---

## 4. DB 스키마

SQLite 단일 파일 DB. 마이그레이션은 `src/main/database/migrations/` 폴더의 SQL 파일을 번호 순서대로 실행한다.

### 마이그레이션 파일 목록

| 파일 | 내용 |
|---|---|
| `001_initial.sql` | 테이블 4개 초기 생성 |
| `002_seed_leave_types.sql` | 근로기준법 기준 42종 휴가 유형 기본 데이터 삽입 |
| `003_auth.sql` | `employees` 테이블에 `password_hash` 컬럼 추가 |
| `004_leave_unit.sql` | `leave_requests` 테이블에 `leave_unit`, `leave_hours` 컬럼 추가 |
| `005_more_leave_types.sql` | 기존 DB에 추가 휴가 유형 보완 삽입 |
| `006_expanded_leave_types.sql` | 병가·경조사·출산육아·공가 등 대폭 확장 |
| `007_full_leave_types.sql` | 유산·사산·난임·가족돌봄·경조사 세분화 등 최종 완성 |

---

### 테이블: `employees` (직원)

| 컬럼 | 타입 | 제약 | 설명 |
|---|---|---|---|
| `id` | TEXT | PK | UUID v4 |
| `name` | TEXT | NOT NULL | 직원 이름 |
| `email` | TEXT | NOT NULL, UNIQUE | 로그인 이메일 |
| `department` | TEXT | nullable | 부서명 |
| `role` | TEXT | NOT NULL, DEFAULT `'employee'` | 권한: `employee` / `manager` / `admin` |
| `discord_tag` | TEXT | nullable | Discord 사용자 태그 |
| `is_active` | INTEGER | NOT NULL, DEFAULT `1` | 활성 여부 (1=활성, 0=비활성) |
| `created_at` | TEXT | NOT NULL | ISO 8601 생성 일시 |
| `password_hash` | TEXT | nullable | bcrypt 해시 (migration 003) |

---

### 테이블: `leave_types` (휴가 유형)

| 컬럼 | 타입 | 제약 | 설명 |
|---|---|---|---|
| `id` | TEXT | PK | 예: `lt-annual`, `lt-sick-cert` |
| `name` | TEXT | NOT NULL | 휴가 유형명 (예: 연차, 병가) |
| `default_days` | INTEGER | NOT NULL | 기본 부여 일수 (0 = 일수 제한 없음) |
| `carry_over_max` | INTEGER | NOT NULL, DEFAULT `0` | 이월 가능 최대 일수 |
| `color` | TEXT | NOT NULL, DEFAULT `'#3b82f6'` | UI 표시 색상 (hex) |

---

### 테이블: `leave_balances` (휴가 잔여 일수)

| 컬럼 | 타입 | 제약 | 설명 |
|---|---|---|---|
| `id` | TEXT | PK | UUID v4 |
| `employee_id` | TEXT | NOT NULL, FK → employees | 직원 참조 |
| `leave_type_id` | TEXT | NOT NULL, FK → leave_types | 휴가 유형 참조 |
| `year` | INTEGER | NOT NULL | 연도 (예: 2026) |
| `allocated_days` | REAL | NOT NULL | 부여된 일수 |
| `used_days` | REAL | NOT NULL, DEFAULT `0` | 사용한 일수 |
| _(UNIQUE)_ | — | (employee_id, leave_type_id, year) | 직원+유형+연도 조합 유일 |

---

### 테이블: `leave_requests` (휴가 신청)

| 컬럼 | 타입 | 제약 | 설명 |
|---|---|---|---|
| `id` | TEXT | PK | UUID v4 |
| `employee_id` | TEXT | NOT NULL, FK → employees | 신청자 |
| `leave_type_id` | TEXT | NOT NULL, FK → leave_types | 휴가 유형 |
| `start_date` | TEXT | NOT NULL | 시작일 (YYYY-MM-DD) |
| `end_date` | TEXT | NOT NULL | 종료일 (YYYY-MM-DD) |
| `total_days` | REAL | NOT NULL | 총 사용 일수 (반차=0.5, 시간단위=분수) |
| `leave_unit` | TEXT | NOT NULL, DEFAULT `'day'` | 휴가 단위 (migration 004) |
| `leave_hours` | REAL | nullable | 시간단위일 때 사용 시간 수 (migration 004) |
| `reason` | TEXT | nullable | 신청 사유 |
| `status` | TEXT | NOT NULL, DEFAULT `'pending'` | `pending` / `approved` / `rejected` / `cancelled` |
| `reviewed_by` | TEXT | nullable, FK → employees | 승인/거절한 관리자 |
| `reviewed_at` | TEXT | nullable | 검토 일시 |
| `reviewer_note` | TEXT | nullable | 관리자 코멘트 |
| `google_calendar_event_id` | TEXT | nullable | Google Calendar 이벤트 ID |
| `created_at` | TEXT | NOT NULL | 생성 일시 |
| `updated_at` | TEXT | NOT NULL | 수정 일시 |

---

## 5. 휴가 종류 목록 (42종)

근로기준법·남녀고용평등법·병역법 기준으로 초기 설치 시 자동으로 삽입되는 42종 휴가 유형 목록이다.
`default_days = 0`은 법정 일수 제한 없음 또는 상황별로 다름을 의미한다.

> **병가·경조사** 항목은 잔여 일수 대시보드에 표시되지 않음 (`default_days = 0`이므로 allocated_days = 0 필터링).

### 연차

| ID | 명칭 | 기본 일수 | 이월 한도 | 법적 근거 |
|---|---|---|---|---|
| `lt-annual` | 연차 | 15일 | 5일 | 근로기준법 제60조 |

### 병가 / 의료

| ID | 명칭 | 기본 일수 | 이월 한도 | 비고 |
|---|---|---|---|---|
| `lt-sick-no-cert` | 병가 (무증빙) | 제한 없음 | 0 | 증빙 서류 불필요 |
| `lt-sick-cert` | 병가 (입원·진단서) | 제한 없음 | 0 | 진단서·입원확인서 필요 |
| `lt-medical` | 건강검진 | 제한 없음 | 0 | |
| `lt-work-injury` | 산업재해 (업무상 부상·질병) | 제한 없음 | 0 | 산업재해보상보험법 |
| `lt-blood` | 헌혈 휴가 | 제한 없음 | 0 | |

### 출산·육아

| ID | 명칭 | 기본 일수 | 이월 한도 | 법적 근거 |
|---|---|---|---|---|
| `lt-maternity-b` | 출산전후휴가 (90일) | 90일 | 0 | 근로기준법 제74조 |
| `lt-paternity-b` | 배우자출산휴가 (10일) | 10일 | 0 | 남녀고용평등법 제18조의2 |
| `lt-parental-b` | 육아휴직 (최대 1년) | 365일 | 0 | 남녀고용평등법 제19조 |
| `lt-childcare` | 육아기 근로시간 단축 | 제한 없음 | 0 | 남녀고용평등법 제19조의2 |
| `lt-family-care` | 가족돌봄휴가 (연 10일) | 10일 | 0 | 남녀고용평등법 제22조의2 |
| `lt-family-leave` | 가족돌봄휴직 (연 90일) | 제한 없음 | 0 | 남녀고용평등법 제22조의2 |
| `lt-fertility` | 난임치료휴가 (연 3일) | 제한 없음 | 0 | 남녀고용평등법 제18조의3 |

### 유산·사산

| ID | 명칭 | 임신 주수 | 법정 일수 | 법적 근거 |
|---|---|---|---|---|
| `lt-miscarriage-5` | 유산·사산 (11주 이하) | ~11주 | 5일 | 근로기준법 제74조 |
| `lt-miscarriage-10` | 유산·사산 (12~15주) | 12~15주 | 10일 | 근로기준법 제74조 |
| `lt-miscarriage-30` | 유산·사산 (16~21주) | 16~21주 | 30일 | 근로기준법 제74조 |
| `lt-miscarriage-60` | 유산·사산 (22~27주) | 22~27주 | 60일 | 근로기준법 제74조 |
| `lt-miscarriage-90` | 유산·사산 (28주 이상) | 28주 이상 | 90일 | 근로기준법 제74조 |

### 생리휴가

| ID | 명칭 | 기본 일수 | 법적 근거 |
|---|---|---|---|
| `lt-menstrual-b` | 생리휴가 | 제한 없음 | 근로기준법 제73조 |

### 경조사 — 결혼

| ID | 명칭 | 기본 일수 |
|---|---|---|
| `lt-marry-self` | 결혼 (본인, 5일) | 5일 |
| `lt-marry-child` | 결혼 (자녀, 1일) | 1일 |

### 경조사 — 사망 (조의)

| ID | 명칭 | 기본 일수 |
|---|---|---|
| `lt-death-parents` | 사망 (부모·배우자, 5일) | 5일 |
| `lt-death-inlaw` | 사망 (배우자 부모, 3일) | 3일 |
| `lt-death-child` | 사망 (자녀, 3일) | 3일 |
| `lt-death-grandp` | 사망 (조부모·외조부모, 2일) | 2일 |
| `lt-death-sibling` | 사망 (형제자매, 1일) | 1일 |
| `lt-death-sibling2` | 사망 (배우자 형제자매, 1일) | 1일 |

### 경조사 — 기타

| ID | 명칭 | 기본 일수 |
|---|---|---|
| `lt-birth` | 자녀 출산 | 제한 없음 |
| `lt-child-enter` | 자녀 입학 | 1일 |
| `lt-move` | 본인 이사 | 1일 |
| `lt-personal` | 경조사 (기타) | 제한 없음 |

### 공가·법정

| ID | 명칭 | 기본 일수 | 법적 근거 |
|---|---|---|---|
| `lt-military2` | 현역 입대·소집 | 제한 없음 | 병역법 |
| `lt-reserve2` | 예비군 훈련 | 제한 없음 | 예비군법 |
| `lt-civil-def` | 민방위 훈련 | 제한 없음 | 민방위기본법 |
| `lt-vote` | 선거 투표 | 제한 없음 | 공직선거법 |
| `lt-jury` | 배심원·증인 출석 | 제한 없음 | 국민참여재판법 |
| `lt-special-govt` | 공무상 공가 (소환·증언) | 제한 없음 | |
| `lt-disaster` | 재난·재해 | 제한 없음 | 재난및안전관리기본법 |

### 기타

| ID | 명칭 | 기본 일수 |
|---|---|---|
| `lt-education` | 직무교육·훈련 | 제한 없음 |
| `lt-sabbatical` | 안식 휴가 | 제한 없음 |
| `lt-unpaid` | 무급휴가 | 제한 없음 |

> **총계: 42종**

---

## 6. 휴가 단위

`leave_unit` 필드로 단위를 지정한다. `leave_hours`는 `hour` 단위 선택 시에만 사용된다.

| `leave_unit` 값 | 한국어 명칭 | `total_days` 계산 | `leave_hours` |
|---|---|---|---|
| `day` | 종일 | 영업일 수 (정수) | null |
| `half_am` | 오전반차 | 0.5 | null |
| `half_pm` | 오후반차 | 0.5 | null |
| `hour` | 시간단위 | 사용시간 ÷ 8 | 0.5~8 (30분 단위) |

**유효성 규칙** (`leaveRequestSchema`):

```typescript
leave_unit: z.enum(['day', 'half_am', 'half_pm', 'hour']).default('day')
leave_hours: z.number().min(0.5).max(8).optional()
```

- 시간단위 최소 30분(0.5시간), 최대 8시간
- `leave_hours`는 `leave_unit === 'hour'`일 때만 의미 있음

### 잔여 일수 수치 연산 (`LeaveBalances.tsx`)

모든 시간↔일수 변환은 `bignumber.js`를 사용하여 부동소수점 누적 오차를 방지한다.

| 함수 | 설명 |
|---|---|
| `daysToHours(days)` | 일수 → 시간 (×8, 소수점 1자리) |
| `hoursToDays(hours)` | 시간 → 일수 (÷8, 소수점 3자리) |
| `formatDays(days)` | "X일 Y시간" 포맷 출력 |
| `adjustHours(current, delta)` | ±0.5h / ±4h 빠른 조정 (0 미만 방지) |

HOUR_OPTIONS: 0.5h 단위 선택지를 `BigNumber(i).multipliedBy(0.5)`로 생성하여 `0.1 + 0.2` 류의 오차 없음.

---

## 7. API 엔드포인트 목록

모든 엔드포인트는 `http://localhost:8888` 기반이다.
`[인증 불필요]` 표시가 없는 엔드포인트는 요청 헤더에 `Authorization: Bearer <JWT>` 필요.
`[admin]`, `[admin|manager]`는 해당 역할만 접근 가능.

### 초기 설정 (`/api/setup`) — 인증 불필요

| 메서드 | 경로 | 설명 |
|---|---|---|
| `GET` | `/api/setup/status` | 초기 설정 필요 여부 반환 (`{ needsSetup: boolean }`) |
| `POST` | `/api/setup/init` | 최초 관리자 계정 생성 및 앱 설정 초기화 (직원 0명일 때만 허용) |

### 인증 (`/api/auth`)

| 메서드 | 경로 | 권한 | 설명 |
|---|---|---|---|
| `POST` | `/api/auth/login` | 인증 불필요 | 이메일+비밀번호로 로그인, JWT 반환 |
| `GET` | `/api/auth/me` | 로그인 필요 | 현재 로그인 사용자 정보 반환 |

### 직원 (`/api/employees`)

| 메서드 | 경로 | 권한 | 설명 |
|---|---|---|---|
| `GET` | `/api/employees` | 로그인 필요 | 전체 직원 목록 조회 (활성·비활성 모두 포함) |
| `POST` | `/api/employees` | admin, manager | 직원 생성 (비밀번호 해시 저장, 당해 연도 잔여 일수 초기화) |
| `PUT` | `/api/employees/:id` | admin, manager | 직원 정보 수정 (비밀번호 변경 포함) |
| `DELETE` | `/api/employees/:id/deactivate` | admin, manager | 직원 비활성화 (`is_active = 0`, 데이터 유지) |
| `PATCH` | `/api/employees/:id/activate` | admin, manager | 직원 재활성화 (`is_active = 1`) |
| `DELETE` | `/api/employees/:id` | admin | 직원 완전 삭제 (DB에서 제거, 되돌릴 수 없음) |

### 휴가 신청 (`/api/leave-requests`)

| 메서드 | 경로 | 권한 | 설명 |
|---|---|---|---|
| `GET` | `/api/leave-requests` | 로그인 필요 | 휴가 신청 목록 조회 (쿼리: `status`, `employee_id`, `leave_type_id`, `year`) |
| `POST` | `/api/leave-requests` | 로그인 필요 | 휴가 신청 생성 + Discord 알림 전송 |
| `POST` | `/api/leave-requests/:id/approve` | admin, manager | 승인 (잔여 일수 차감 + Google Calendar 이벤트 생성 + Discord 알림) |
| `POST` | `/api/leave-requests/:id/reject` | admin, manager | 거절 + Discord 알림 |
| `POST` | `/api/leave-requests/:id/cancel` | 본인 또는 admin/manager | 취소 (승인 상태면 잔여 일수 복구 + Google Calendar 이벤트 삭제) |

### 휴가 잔여 일수 (`/api/leave-balances`)

| 메서드 | 경로 | 권한 | 설명 |
|---|---|---|---|
| `GET` | `/api/leave-balances/:year` | 로그인 필요 | 특정 연도의 전체 잔여 일수 목록 |
| `GET` | `/api/leave-balances/employee/:employeeId/:year` | 로그인 필요 | 특정 직원의 특정 연도 잔여 일수 |
| `PUT` | `/api/leave-balances/:id` | admin, manager | 잔여 일수 수동 조정 |

### 휴가 유형 (`/api/leave-types`)

| 메서드 | 경로 | 권한 | 설명 |
|---|---|---|---|
| `GET` | `/api/leave-types` | 로그인 필요 | 전체 휴가 유형 목록 |
| `POST` | `/api/leave-types` | admin | 새 휴가 유형 생성 |
| `PUT` | `/api/leave-types/:id` | admin | 휴가 유형 수정 |

### 앱 설정 (`/api/settings`)

| 메서드 | 경로 | 권한 | 설명 |
|---|---|---|---|
| `GET` | `/api/settings` | admin | 설정 조회 (민감 값 마스킹 처리, 로컬 IP 목록 포함) |
| `PUT` | `/api/settings` | admin | 설정 저장 |
| `POST` | `/api/settings/test-discord` | admin | Discord Webhook 연결 테스트 |
| `POST` | `/api/settings/connect-google` | admin | Google OAuth 인증 시작 |
| `GET` | `/api/settings/calendars` | admin | 연결된 Google 계정의 캘린더 목록 조회 |

### 데이터 가져오기 (`/api/import`)

| 메서드 | 경로 | 권한 | 설명 |
|---|---|---|---|
| `GET` | `/api/import/template` | 로그인 필요 | CSV 가져오기 템플릿 파일 다운로드 (BOM 포함 UTF-8) |
| `POST` | `/api/import` | admin, manager | CSV 텍스트 파싱 후 직원·잔여일수·신청 내역 일괄 등록 |

---

## 8. 라우팅 구조 (화면 목록)

React Router DOM v6 `HashRouter` 기반. 보호된 경로는 `ProtectedRoute`로 감싸져 있다.

```
/                   → SetupGuard (초기 설정 여부 확인 후 리다이렉트)
/setup              → Setup        초기 설정 화면 (최초 1회, 인증 불필요)
/login              → Login        로그인 화면 (인증 불필요)

── [ProtectedRoute + Layout] ──────────────────────────────────
/dashboard          → Dashboard       대시보드 (대기 중인 신청 수 + 팀 달력)
/employees          → Employees       직원 목록 및 관리
/leave-requests     → LeaveRequests   휴가 신청 목록
/leave-requests/new → NewLeaveRequest 새 휴가 신청 폼
/leave-requests/:id → LeaveDetail     휴가 신청 상세 / 승인·거절
/leave-balances     → LeaveBalances   휴가 잔여 일수 관리
/settings           → Settings        앱 설정 (Discord, Google Calendar)
/import             → Import          외부 데이터 CSV 가져오기
```

### 화면별 설명

| 화면 | 경로 | 주요 기능 |
|---|---|---|
| 초기 설정 | `/setup` | 회사명·관리자 계정 설정, Discord Webhook URL 입력, 최초 1회만 접근 가능 |
| 로그인 | `/login` | 이메일+비밀번호 로그인, JWT 발급 |
| 대시보드 | `/dashboard` | 대기 중인 신청 수 카드, 팀 휴가 달력, 최근 신청 내역 목록 |
| 직원 관리 | `/employees` | 직원 등록·수정·비활성화·활성화·완전삭제, 부서·역할·Discord 태그 관리 |
| 휴가 신청 목록 | `/leave-requests` | 상태·직원·유형·연도 필터링, 목록 조회 |
| 새 휴가 신청 | `/leave-requests/new` | 휴가 유형·기간·단위·사유 입력 폼 |
| 휴가 상세 | `/leave-requests/:id` | 상세 정보 조회, 관리자 승인/거절/코멘트 입력 |
| 잔여 일수 | `/leave-balances` | 연도별 직원 전체 잔여 일수 조회, 30분 단위 수동 조정 |
| 설정 | `/settings` | Discord Webhook 설정 및 테스트, Google OAuth 연동, 캘린더 선택, 호스트 IP 표시 |
| 데이터 가져오기 | `/import` | CSV 템플릿 다운로드, CSV 붙여넣기 후 일괄 등록 |

---

## 9. 실행 방법

### 사전 요구사항

- Node.js 20 LTS 이상
- npm 10 이상

### 패키지 설치

```bash
npm install
```

### 개발 모드 실행

```bash
npm run dev
```

내부적으로 다음 순서로 실행된다:

1. `tsc -p tsconfig.electron.json` — Electron 메인 프로세스 TypeScript 컴파일
2. `cp -r src/main/database/migrations dist-electron/main/database/` — SQL 마이그레이션 파일 복사
3. `npm run dev:vite` — Vite 개발 서버 (`http://localhost:5173`)
4. `npm run dev:electron` — `localhost:5173` 응답 대기 후 Electron 앱 실행

> **주의**: 백엔드(Main Process) 코드 변경 시 반드시 `npm run dev`를 재시작해야 반영된다. Vite HMR은 Renderer(React)에만 적용된다.

### 프로덕션 빌드

```bash
# 전체 플랫폼 (현재 플랫폼 기준)
npm run build

# macOS 전용
npm run build:mac

# Windows 전용
npm run build:win
```

빌드 결과물은 `dist/` (React 번들) 및 `dist-electron/` (Electron 메인 프로세스)에 생성된다.

### 타입 검사

```bash
npm run typecheck
```

### 최초 설치 흐름

1. 앱 실행
2. 직원 수 = 0 감지 → `/setup` 화면으로 자동 이동
3. 회사명, 관리자 이름·이메일·비밀번호, Discord Webhook URL 입력 후 저장
4. 자동 로그인 후 대시보드로 이동

---

## 10. 주요 기능 목록

### 인증 및 권한 관리

- bcrypt 기반 비밀번호 해싱 (saltRounds=10)
- JWT 토큰 발급 (만료: 24시간)
- 3단계 역할 기반 접근 제어 (RBAC)
  - `employee`: 본인 신청 조회·생성·취소
  - `manager`: 직원 등록·수정·비활성화·활성화, 승인·거절, 잔여 일수 조정, CSV 가져오기
  - `admin`: 모든 기능 + 설정 관리 + 휴가 유형 관리 + 직원 완전 삭제

### 직원 관리

- 직원 등록·수정
- **비활성화**: `is_active = 0` 소프트 삭제 (데이터 보존, 재활성화 가능)
- **활성화**: 비활성 직원을 `is_active = 1`로 복구
- **완전 삭제**: DB에서 영구 제거 (admin 전용, 확인 다이얼로그 표시)
- 부서, 역할, Discord 태그 관리
- 직원 등록 시 당해 연도 잔여 일수 자동 초기화

### 휴가 신청 워크플로우

- 4가지 단위(종일/오전반차/오후반차/시간단위)로 신청
- 상태 흐름: `pending` → `approved` / `rejected` / `cancelled`
- 승인 시 잔여 일수 자동 차감, 취소 시 자동 복구
- 상태별·직원별·유형별·연도별 필터링

### 휴가 잔여 일수 관리

- 연도별 전체 직원 잔여 일수 한눈에 조회
- **30분(0.5시간) 단위** 수동 조정 (드롭다운 + ±0.5h / ±4h 빠른 버튼)
- 부여·사용·잔여 일수를 "X일 Y시간 (Zh)" 포맷으로 표시
- `bignumber.js`로 부동소수점 오차 없이 계산
- 병가·경조사 등 `default_days = 0` 항목은 대시보드에 미표시

### 대시보드

- 대기 중인 휴가 신청 수 카드
- 팀 휴가 달력 (월별 그리드, 승인/대기 색상 구분)
- 최근 신청 내역 목록 (최대 8건)

### 휴가 유형 관리

- 42종 법정 휴가 유형 기본 탑재
- 커스텀 휴가 유형 추가·수정 가능
- 유형별 기본 일수, 이월 한도, 색상 설정

### Discord 연동

- 휴가 신청·승인·거절 시 Discord Webhook으로 실시간 알림
- 설정 화면에서 Webhook URL 설정 및 테스트 가능

### Google Calendar 연동

- OAuth 2.0 인증
- 휴가 승인 시 Google Calendar에 이벤트 자동 생성
- 휴가 취소 시 Google Calendar 이벤트 자동 삭제
- 연결된 캘린더 목록에서 대상 캘린더 선택 가능

### 로컬 네트워크 접근

- `0.0.0.0:8888` 바인딩으로 같은 네트워크 내 모든 기기에서 접근
- Bonjour(mDNS)로 `http://localsass.local:8888` 자동 광고
- 설정 화면에서 호스트 IP 주소 확인 가능

### 데이터 가져오기 (Import)

- CSV 템플릿 다운로드 제공 (Excel UTF-8 호환 BOM 포함)
- CSV 파싱 후 직원·잔여 일수·휴가 신청 내역 일괄 등록
- 중복 레코드 자동 감지 및 건너뜀
- 존재하지 않는 직원·휴가 유형 자동 생성

### 입력 유효성 검사

Zod 스키마를 공유 코드(`src/shared/schemas.ts`)로 관리하여 프론트엔드와 백엔드가 동일한 검증 규칙 사용:

- 직원: 이름 필수, 이메일 형식, 역할 enum
- 휴가 신청: 날짜 형식(YYYY-MM-DD), 단위 enum, 시간 범위(0.5~8)
- 설정: URL 형식, hex 색상 코드

---

*이 문서는 `src/` 소스 코드를 기반으로 작성되었습니다. · 최종 갱신 2026-03-24*
