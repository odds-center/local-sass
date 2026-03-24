# LocalSass HR — 아키텍처 설계

## 개요

비싼 HR SaaS(Flex 등)를 대체하기 위한 사내 전용 로컬 휴가 관리 시스템.
Discord + Google Calendar 연동. 서버 없이 사무실 내 PC 한 대로 운영.

---

## 전체 구조

```
[호스트 PC] — Electron 앱 (항상 켜둔 한 대)
  ├── Express HTTP 서버 :8888
  │     ├── /api/*       REST API (JWT 인증)
  │     └── /*           React 정적 파일 서빙
  ├── SQLite DB           단일 소스 (로컬 저장)
  └── mDNS 광고          localsass.local:8888 으로 네트워크에 공개

[팀원 PC / Mac / 폰]
  └── 브라우저 → http://localsass.local:8888
                  (또는 IP 직접: http://192.168.x.x:8888)
      Electron 설치 불필요
```

---

## 기술 스택

| 영역 | 기술 | 이유 |
|---|---|---|
| 앱 쉘 | Electron | Mac + Windows 크로스플랫폼 |
| HTTP 서버 | Express 5 | REST API + 정적 파일 서빙 |
| DB | SQLite (better-sqlite3) | 단일 파일, 서버 불필요, 동기 API |
| 설정 저장 | electron-store | OAuth 토큰, Webhook URL 등 |
| 프론트엔드 | React 18 + Vite + TypeScript | |
| 스타일 | Tailwind CSS (다크테마: zinc + violet) | |
| 폼 | react-hook-form + zod | |
| 날짜 | date-fns | |
| 인증 | JWT (jsonwebtoken) + bcryptjs | |
| 네트워크 발견 | bonjour-service (mDNS) | localsass.local 자동 광고 |
| Google 연동 | googleapis | Calendar OAuth |
| Discord | fetch (내장) | Webhook POST |
| 패키징 | electron-builder | .dmg / .exe |

---

## 폴더 구조

```
local-sass/
├── src/
│   ├── main/                        Electron 메인 프로세스 (Node.js)
│   │   ├── index.ts                 앱 진입점, BrowserWindow, Express 시작
│   │   ├── server.ts                Express 앱 생성, 라우트 등록, mDNS 광고
│   │   ├── middleware/
│   │   │   └── auth.ts              JWT 검증 미들웨어, requireRole()
│   │   ├── routes/                  HTTP API 라우트
│   │   │   ├── setup.ts             초기 설정 (인증 불필요)
│   │   │   ├── auth.ts              로그인, /me
│   │   │   ├── employees.ts         직원 CRUD
│   │   │   ├── leave-requests.ts    휴가 신청 워크플로우
│   │   │   ├── leave-balances.ts    잔여 일수 조회/조정
│   │   │   ├── leave-types.ts       휴가 종류 관리
│   │   │   ├── settings.ts          앱 설정, Google OAuth, Discord 테스트
│   │   │   └── import.ts            CSV 임포트, 템플릿 다운로드
│   │   ├── ipc/
│   │   │   └── settings.ts          electron-store 래퍼 (getSettings, saveSettings)
│   │   ├── utils/
│   │   │   └── flexHrParser.ts      CSV 파서 (Flex HR 임포트용)
│   │   ├── database/
│   │   │   ├── db.ts                SQLite 연결, 마이그레이션 실행
│   │   │   ├── migrations/          SQL 마이그레이션 파일 (001~005)
│   │   │   └── queries/             DB 쿼리 함수
│   │   └── integrations/
│   │       ├── discord.ts           Webhook POST
│   │       └── google-calendar.ts   OAuth, 이벤트 생성/삭제
│   ├── renderer/                    React 앱 (브라우저/Electron 동일)
│   │   ├── lib/
│   │   │   └── api.ts               fetch 래퍼 (JWT 포함)
│   │   ├── pages/                   8개 페이지
│   │   │   ├── Setup.tsx            초기 설정 마법사 (3단계)
│   │   │   ├── Login.tsx
│   │   │   ├── Dashboard.tsx
│   │   │   ├── Employees.tsx
│   │   │   ├── LeaveRequests.tsx
│   │   │   ├── NewLeaveRequest.tsx
│   │   │   ├── LeaveDetail.tsx
│   │   │   ├── LeaveBalances.tsx
│   │   │   ├── Settings.tsx
│   │   │   └── Import.tsx           CSV 파일 업로드 임포트
│   │   └── components/
│   │       ├── ui.tsx               공통 UI 컴포넌트 (Button, Field, Card 등)
│   │       ├── Layout.tsx
│   │       ├── Sidebar.tsx
│   │       ├── Modal.tsx
│   │       ├── ConfirmDialog.tsx
│   │       ├── LeaveStatusBadge.tsx
│   │       ├── Calendar.tsx
│   │       └── DatePicker.tsx
│   └── shared/
│       ├── types.ts                 TypeScript 공유 인터페이스
│       └── schemas.ts               Zod 검증 스키마
├── docs/                            설계 문서
├── dist/                            Vite 빌드 결과 (gitignore)
├── dist-electron/                   TypeScript 컴파일 결과 (gitignore)
└── release/                         electron-builder 패키지 결과 (gitignore)
```

---

## 데이터 저장 위치

| 종류 | 위치 |
|---|---|
| SQLite DB | Mac: `~/Library/Application Support/local-sass/app.db` |
| | Windows: `%APPDATA%\local-sass\app.db` |
| 설정 (electron-store) | Mac: `~/Library/Application Support/local-sass/settings.json` |
| | Windows: `%APPDATA%\local-sass\settings.json` |

---

## DB 마이그레이션

| 파일 | 내용 |
|---|---|
| `001_initial.sql` | employees, leave_types, leave_balances, leave_requests 테이블 생성 |
| `002_seed_leave_types.sql` | 연차(15d), 병가(10d), 경조사(3d) 기본 데이터 |
| `003_auth.sql` | `employees.password_hash` 컬럼 추가 |
| `004_leave_unit.sql` | `leave_requests.leave_unit`, `leave_requests.leave_hours` 컬럼 추가 |
| `005_more_leave_types.sql` | 출산휴가, 배우자출산휴가, 육아휴직, 공가, 생리휴가 추가 |

---

## 개발 모드 vs 프로덕션

| | 개발 (`npm run dev`) | 프로덕션 (`npm run build`) |
|---|---|---|
| Electron 로드 URL | `http://localhost:5173` (Vite HMR) | `http://localhost:8888` (Express) |
| API 경로 | Vite가 `/api` → Express 8888 프록시 | Express가 직접 처리 |
| 정적 파일 | Vite dev server | Express가 `dist/` 서빙 |

---

## 공통 UI 컴포넌트 (`src/renderer/components/ui.tsx`)

모든 페이지에서 일관된 스타일을 위해 사용:

| export | 설명 |
|---|---|
| `inp`, `inpSm` | input 스타일 문자열 (Tailwind) |
| `PageHeader` | 페이지 제목 + 액션 버튼 영역 |
| `Card`, `CardTitle` | 카드 레이아웃 |
| `Field` | 폼 필드 (label + input 래퍼) |
| `Button` | variant (primary/secondary/danger/ghost), size (sm/md) |
| `ErrorAlert`, `SuccessAlert`, `InfoAlert`, `Toast` | 피드백 메시지 |
| `Table`, `Th`, `Td` | 테이블 |
