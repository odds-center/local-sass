# LocalSass HR — 초기 설정 가이드

## 1. 개발 환경 실행

```bash
npm install

# better-sqlite3 Electron용 재빌드 (최초 1회 필요)
npx @electron/rebuild -f -w better-sqlite3

# 실행
npm run dev
```

> Mac에서 rebuild 실패 시: `sudo xcodebuild -license` 후 재시도

---

## 2. 첫 실행 — 초기 설정 마법사

앱을 처음 실행하면 직원이 없는 상태이므로 자동으로 초기 설정 화면(`/setup`)으로 이동합니다.

**Step 1 — 기본 정보**
- 회사 이름 입력
- 관리자 계정 생성 (이름 / 이메일 / 비밀번호)

**Step 2 — Discord 알림 (선택)**
- Discord Webhook URL 입력
- 테스트 메시지 전송으로 연결 확인
- 건너뛰기 가능 (설정 페이지에서 나중에 추가 가능)

**Step 3 — 확인 후 시작**
- 입력 내용 확인
- "시작하기" 클릭 → 자동 로그인 후 대시보드 이동

> 설정 완료 후 직원 관리 페이지에서 팀원 계정을 추가합니다.

---

## 3. Discord Webhook 설정

1. Discord 서버 → 채널 설정 → 연동 → 웹후크 → 새 웹후크
2. URL 복사
3. 초기 설정 Step 2 또는 앱 설정 페이지 → Discord Webhook URL 입력 → 저장 → 테스트 전송

**알림 발송 시점:**
- 새 휴가 신청 (노란색 임베드)
- 휴가 승인 (초록색 임베드)
- 휴가 거절 (빨간색 임베드)

---

## 4. Google Calendar 연결 (선택)

휴가 승인 시 Google Calendar에 이벤트를 자동 생성합니다.

### GCP 프로젝트 설정 (최초 1회)

1. [Google Cloud Console](https://console.cloud.google.com) 접속
2. 새 프로젝트 생성
3. API 및 서비스 → 사용 설정:
   - **Google Calendar API**
4. 사용자 인증 정보 → OAuth 2.0 클라이언트 ID 생성
   - 애플리케이션 유형: **데스크톱 앱**
   - 리디렉션 URI: `http://localhost:19823`
5. Client ID + Client Secret 복사

### 앱에서 연결

1. 설정 → Google Client ID / Secret 입력 → 저장
2. **Google 계정 연결** 버튼 클릭
3. 브라우저에서 Google 계정 로그인 + 권한 허용
4. "연결됨" 표시 확인
5. Google 캘린더 드롭다운에서 사용할 캘린더 선택 → 저장

---

## 5. 기존 HR 데이터 임포트 (Flex 등)

이전 HR 시스템의 데이터를 CSV 파일로 가져올 수 있습니다.

1. 사이드바 → **데이터 임포트** 클릭
2. **↓ CSV 템플릿 다운로드** 버튼 클릭
3. 다운로드된 `hr_import_template.csv` 파일 작성

**CSV 컬럼:**
```
이름, 시작일, 종료일, 항목, 사용일수, 상태, 부여일, 부여시간
```

**발생 행 (연차/월차 부여):**
```
홍길동,,,연차발생,,,2026-01-01,120
```
- 시작일/종료일/사용일수/상태는 비움
- 부여시간: 시간 단위 (120 = 15일)

**휴가 행:**
```
홍길동,2026-03-10,2026-03-10,연차,1,승인완료,,
홍길동,2026-02-13,2026-02-13,연차,0.5,승인완료,,
```
- 상태: `승인완료` | `휴가취소` | `반려`
- 사용일수: 1 = 하루, 0.5 = 반차

4. 작성 완료 후 파일 첨부 → 임포트 시작
5. 직원 이름으로 자동 매칭 (없으면 새 직원으로 생성)
6. 중복 데이터는 자동으로 건너뜀

---

## 6. 팀원 접속 방법

호스트 PC에서 앱이 켜져 있는 상태에서:

- **mDNS**: `http://localsass.local:8888` (같은 와이파이)
- **IP 직접**: 설정 페이지에서 IP 확인 후 `http://192.168.x.x:8888`

팀원은 각자 계정(이메일 + 비밀번호)으로 로그인합니다.
계정은 관리자가 직원 관리 페이지에서 추가합니다.

---

## 7. 빌드 및 배포

```bash
# Mac (.dmg)
npm run build:mac

# Windows (.exe)
npm run build:win

# 결과물
release/
  ├── LocalSass HR-0.1.0.dmg       (Mac)
  └── LocalSass HR Setup 0.1.0.exe  (Windows)
```

호스트로 지정할 PC에 설치 후 앱 실행 → 팀원들은 브라우저로 접속.
