/**
 * HR 데이터 임포트 CSV 파서
 *
 * ─────────────────────────────────────────────────
 * 템플릿 CSV 컬럼 (0-based):
 *   [0] 이름        직원 이름
 *   [1] 시작일      YYYY-MM-DD  (휴가 행만)
 *   [2] 종료일      YYYY-MM-DD  (휴가 행만)
 *   [3] 항목        휴가 종류명 또는 "연차발생" / "월차발생"
 *   [4] 사용일수    숫자 (1, 0.5 …)  (휴가 행만)
 *   [5] 상태        승인완료 | 휴가취소 | 반려  (휴가 행만)
 *   [6] 부여일      YYYY-MM-DD  (발생 행만)
 *   [7] 부여시간    숫자(시간)   (발생 행만, 8h = 1일)
 *
 * ─────────────────────────────────────────────────
 * 행 종류:
 *   발생 행  — [3](항목)이 "발생"으로 끝남 ("연차발생", "월차발생")
 *              → leave_balances.allocated_days 업데이트
 *              → 부여시간 ÷ 8 = allocated_days
 *
 *   휴가 행  — 나머지 모든 행
 *              → leave_requests 생성
 *              → status = "approved" 이면 used_days 차감
 *
 * ─────────────────────────────────────────────────
 * 상태 매핑:
 *   "승인완료" → "approved"
 *   "휴가취소" → "cancelled"
 *   "반려"    → "rejected"
 *   (그 외)   → "approved"
 *
 * leave_unit 결정:
 *   사용일수 ≤ 0.5  → "half_am"
 *   사용일수 ≥ 1    → "day"
 *
 * ─────────────────────────────────────────────────
 * 예시 CSV:
 *   이름,시작일,종료일,항목,사용일수,상태,부여일,부여시간
 *   홍길동,,,연차발생,,,2026-01-01,120
 *   홍길동,2026-03-10,2026-03-10,연차,1,승인완료,,
 *   홍길동,2026-02-13,2026-02-13,연차,0.5,승인완료,,
 *   홍길동,2026-01-20,2026-01-20,연차,1,휴가취소,,
 */

import { LeaveUnit, LeaveStatus } from '../../shared/types'

export interface ParsedBalanceRow {
  kind: 'balance'
  employeeName: string
  leaveTypeName: string  // "연차발생" → "연차"
  grantDate: string      // YYYY-MM-DD
  allocatedDays: number  // 부여시간 ÷ 8
}

export interface ParsedRequestRow {
  kind: 'request'
  employeeName: string
  leaveTypeName: string
  startDate: string      // YYYY-MM-DD
  endDate: string        // YYYY-MM-DD
  totalDays: number
  leaveUnit: LeaveUnit
  leaveHours: number
  status: LeaveStatus
}

export type ParsedRow = ParsedBalanceRow | ParsedRequestRow

export interface ParseResult {
  rows: ParsedRow[]
  skippedLines: number
}

function parseStatus(raw: string): 'approved' | 'cancelled' | 'rejected' {
  if (raw === '휴가취소') return 'cancelled'
  if (raw === '반려') return 'rejected'
  return 'approved'
}

/**
 * CSV 텍스트(콤마 구분)를 파싱하여 구조화된 행 배열을 반환합니다.
 * 헤더 행과 빈 행은 자동으로 무시합니다.
 */
export function parseCsvTemplate(csvText: string): ParseResult {
  const rows: ParsedRow[] = []
  let skippedLines = 0

  const lines = csvText.split('\n')

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) continue

    const cols = trimmed.split(',').map((c) => c.trim())
    if (cols.length < 4) { skippedLines++; continue }

    const name = cols[0]
    if (!name || name === '이름') continue  // header

    const typeName = cols[3] ?? ''

    // ── 발생 행 ──────────────────────────────────────
    if (typeName.endsWith('발생')) {
      const grantDate = cols[6] ?? ''
      const grantHoursRaw = cols[7] ?? ''
      if (!grantDate || !grantHoursRaw) { skippedLines++; continue }

      const grantHours = parseFloat(grantHoursRaw) || 0
      if (grantHours <= 0) { skippedLines++; continue }

      rows.push({
        kind: 'balance',
        employeeName: name,
        leaveTypeName: typeName.replace('발생', '').trim() || '연차',
        grantDate,
        allocatedDays: grantHours / 8,
      })
      continue
    }

    // ── 휴가 행 ──────────────────────────────────────
    const startDate = cols[1] ?? ''
    const endDate = cols[2] ?? ''
    if (!startDate || !endDate) { skippedLines++; continue }

    const totalDays = parseFloat(cols[4] ?? '') || 0
    if (totalDays <= 0) { skippedLines++; continue }

    const leaveUnit: LeaveUnit = totalDays <= 0.5 ? 'half_am' : 'day'

    rows.push({
      kind: 'request',
      employeeName: name,
      leaveTypeName: typeName,
      startDate,
      endDate,
      totalDays,
      leaveUnit,
      leaveHours: totalDays * 8,
      status: parseStatus(cols[5] ?? ''),
    })
  }

  return { rows, skippedLines }
}

/** 다운로드용 CSV 템플릿 문자열을 반환합니다. */
export function getCsvTemplate(): string {
  const header = '이름,시작일,종료일,항목,사용일수,상태,부여일,부여시간'
  const examples = [
    '# 아래 예시를 참고하여 작성하세요. # 으로 시작하는 줄은 무시됩니다.',
    '# [발생 행] 연차/월차 부여 — 시작일/종료일/사용일수/상태는 비워두세요.',
    '홍길동,,,연차발생,,,2026-01-01,120',
    '# [휴가 행] 부여일/부여시간은 비워두세요.',
    '홍길동,2026-03-10,2026-03-10,연차,1,승인완료,,',
    '홍길동,2026-02-13,2026-02-13,연차,0.5,승인완료,,',
    '홍길동,2026-01-20,2026-01-20,연차,1,휴가취소,,',
    '# 상태값: 승인완료 | 휴가취소 | 반려',
    '# 사용일수: 1일=1  반차=0.5',
    '# 부여시간: 시간 단위 (1일=8, 반차=4)',
  ]
  return [header, ...examples].join('\n')
}
