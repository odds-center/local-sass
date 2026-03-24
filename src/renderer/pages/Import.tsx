import { useEffect, useRef, useState } from 'react'
import { api } from '../lib/api'
import { Employee } from '../../shared/types'
import {
  PageHeader, Card, CardTitle, Field, Button,
  ErrorAlert, SuccessAlert, InfoAlert, inp,
} from '../components/ui'
import { Download } from 'lucide-react'

type Result = {
  ok: boolean
  importedRequests: number
  importedBalances: number
  skipped: number
}

export default function Import() {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [employeeId, setEmployeeId] = useState('')
  const [csvText, setCsvText] = useState('')
  const [fileName, setFileName] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<Result | null>(null)
  const [error, setError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    api.employees.list().then(setEmployees).catch(() => {})
  }, [])

  const rowCount = csvText
    .split('\n')
    .filter((l) => {
      const trimmed = l.trim()
      if (!trimmed || trimmed.startsWith('#')) return false
      const first = trimmed.split(',')[0].trim()
      return first && first !== '이름'
    }).length

  const handleFile = (file: File) => {
    setFileName(file.name)
    setResult(null)
    setError('')
    const reader = new FileReader()
    reader.onload = (e) => setCsvText((e.target?.result as string) ?? '')
    reader.readAsText(file, 'utf-8')
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file?.name.endsWith('.csv')) handleFile(file)
  }

  const handleImport = async () => {
    if (!csvText.trim()) return
    setLoading(true)
    setError('')
    setResult(null)
    try {
      const res = await api.import.upload(csvText, employeeId || undefined)
      setResult(res)
      setCsvText('')
      setFileName('')
    } catch (e) {
      setError(e instanceof Error ? e.message : '임포트 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      <PageHeader
        title="데이터 임포트"
        subtitle="CSV 템플릿을 다운로드해서 작성한 뒤 업로드하세요."
        action={
          <Button
            variant="secondary"
            size="sm"
            onClick={() => api.import.downloadTemplate().catch(() => {})}
          >
            <Download size={14} className="inline mr-1" />CSV 템플릿 다운로드
          </Button>
        }
      />

      <InfoAlert>
        <p className="font-medium text-violet-200">CSV 컬럼 순서</p>
        <p className="font-mono text-xs mt-1">이름, 시작일, 종료일, 항목, 사용일수, 상태, 부여일, 부여시간</p>
        <p className="text-xs text-violet-400 mt-1">
          발생 행: 이름, , , 연차발생, , , 2026-01-01, 120 &nbsp;|&nbsp;
          날짜: YYYY-MM-DD &nbsp;|&nbsp; 상태: 승인완료 / 휴가취소 / 반려
        </p>
      </InfoAlert>

      <Card>
        <CardTitle>임포트 설정</CardTitle>
        <div className="space-y-4">
          <Field label="직원 연결" hint="(선택 — 비워두면 이름으로 자동 매칭)">
            <select
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value)}
              className={inp}
            >
              <option value="">이름으로 자동 매칭</option>
              {employees.map((e) => (
                <option key={e.id} value={e.id}>{e.name} ({e.email})</option>
              ))}
            </select>
          </Field>

          <Field label="CSV 파일 첨부">
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) handleFile(file)
              }}
            />
            <div
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              className={`
                cursor-pointer border-2 border-dashed rounded-xl px-6 py-8 text-center transition-colors
                ${csvText
                  ? 'border-violet-500/50 bg-violet-500/5'
                  : 'border-zinc-700 hover:border-zinc-500 hover:bg-zinc-800/50'
                }
              `}
            >
              {csvText ? (
                <div className="space-y-1">
                  <p className="text-sm font-medium text-violet-300">{fileName}</p>
                  <p className="text-xs text-zinc-400">{rowCount}개 행 감지됨 · 클릭하여 변경</p>
                </div>
              ) : (
                <div className="space-y-1">
                  <p className="text-zinc-400 text-sm">클릭하거나 CSV 파일을 여기에 드래그하세요</p>
                  <p className="text-zinc-600 text-xs">.csv 파일만 지원</p>
                </div>
              )}
            </div>
          </Field>
        </div>
      </Card>

      <ErrorAlert message={error} />

      {result && (
        <SuccessAlert>
          <p className="font-semibold text-emerald-200">임포트 완료</p>
          <p>휴가 신청 기록: <strong>{result.importedRequests}건</strong></p>
          <p>잔여 일수 업데이트: <strong>{result.importedBalances}건</strong></p>
          {result.skipped > 0 && (
            <p className="text-zinc-400">건너뜀 (중복 또는 파싱 불가): {result.skipped}건</p>
          )}
        </SuccessAlert>
      )}

      <Button
        onClick={handleImport}
        disabled={loading || rowCount === 0}
        className="w-full py-2.5"
      >
        {loading ? '임포트 중...' : rowCount > 0 ? `${rowCount}개 행 임포트` : 'CSV 파일을 먼저 선택하세요'}
      </Button>
    </div>
  )
}
