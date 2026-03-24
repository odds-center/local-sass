import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import { Check, ArrowRight, ArrowLeft, CheckCircle, XCircle, Rocket } from 'lucide-react'

type Step = 1 | 2 | 3

const inp = 'w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-colors'

export default function Setup() {
  const navigate = useNavigate()
  const [step, setStep] = useState<Step>(1)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const [companyName, setCompanyName] = useState('')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const [discordWebhookUrl, setDiscordWebhookUrl] = useState('')
  const [discordTesting, setDiscordTesting] = useState(false)
  const [discordOk, setDiscordOk] = useState<boolean | null>(null)

  const handleStep1 = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (password !== confirmPassword) { setError('비밀번호가 일치하지 않습니다.'); return }
    if (password.length < 6) { setError('비밀번호는 6자 이상이어야 합니다.'); return }
    setStep(2)
  }

  const testDiscord = async () => {
    if (!discordWebhookUrl) return
    setDiscordTesting(true)
    try {
      const res = await fetch(discordWebhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: '✅ HR 연결 테스트 성공!' }),
      })
      setDiscordOk(res.ok)
    } catch { setDiscordOk(false) } finally { setDiscordTesting(false) }
  }

  const handleFinish = async () => {
    setLoading(true); setError('')
    try {
      const { token } = await api.setup.init({ companyName, name, email, password, discordWebhookUrl: discordWebhookUrl || undefined })
      localStorage.setItem('token', token)
      navigate('/dashboard')
    } catch (e) {
      setError(e instanceof Error ? e.message : '설정 중 오류가 발생했습니다.')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center py-12">
      <div
        className="fixed top-0 left-0 right-0 h-10"
        style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
      />

      <div className="w-full max-w-md px-4">
        <div className="text-center mb-8">
          <div className="inline-flex w-12 h-12 bg-violet-600 rounded-xl items-center justify-center text-white font-bold text-lg mb-4">HR</div>
          <h1 className="text-xl font-bold text-zinc-100">HR</h1>
          <p className="text-sm text-zinc-500 mt-1">초기 설정</p>
        </div>

        {/* Step indicator */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {([1, 2, 3] as Step[]).map((s) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold transition-colors ${
                step === s ? 'bg-violet-600 text-white' :
                step > s ? 'bg-emerald-500 text-white' :
                'bg-zinc-800 text-zinc-500 border border-zinc-700'
              }`}>
                {step > s ? <Check size={12} strokeWidth={3} /> : s}
              </div>
              {s < 3 && <div className={`w-10 h-0.5 ${step > s ? 'bg-emerald-500' : 'bg-zinc-800'}`} />}
            </div>
          ))}
        </div>

        {error && <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm px-4 py-3 rounded-lg mb-4">{error}</div>}

        {step === 1 && (
          <form onSubmit={handleStep1} className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 space-y-4">
            <h2 className="text-sm font-semibold text-zinc-300">Step 1 — 기본 정보</h2>
            <Field label="회사 이름"><input value={companyName} onChange={(e) => setCompanyName(e.target.value)} className={inp} placeholder="우리 회사" /></Field>
            <hr className="border-zinc-800" />
            <p className="text-xs text-zinc-500">관리자 계정</p>
            <Field label="이름 *"><input value={name} onChange={(e) => setName(e.target.value)} className={inp} placeholder="홍길동" required /></Field>
            <Field label="이메일 *"><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inp} placeholder="hong@company.com" required /></Field>
            <Field label="비밀번호 * (6자 이상)"><input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className={inp} placeholder="••••••••" required /></Field>
            <Field label="비밀번호 확인 *"><input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className={inp} placeholder="••••••••" required /></Field>
            <button type="submit" className="btn-primary w-full py-2.5 flex items-center justify-center gap-1.5">다음 <ArrowRight size={15} /></button>
          </form>
        )}

        {step === 2 && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 space-y-4">
            <h2 className="text-sm font-semibold text-zinc-300">Step 2 — Discord 알림 <span className="text-zinc-600 font-normal">(선택)</span></h2>
            <p className="text-xs text-zinc-500">휴가 신청/승인/거절 시 Discord 채널로 알림을 보냅니다.</p>
            <Field label="Webhook URL">
              <input value={discordWebhookUrl} onChange={(e) => { setDiscordWebhookUrl(e.target.value); setDiscordOk(null) }} className={inp} placeholder="https://discord.com/api/webhooks/..." />
            </Field>
            {discordWebhookUrl && (
              <button onClick={testDiscord} disabled={discordTesting} className="text-sm text-violet-400 hover:text-violet-300 disabled:opacity-50 transition-colors">
                {discordTesting ? '전송 중...' : '테스트 메시지 전송'}
              </button>
            )}
            {discordOk === true && <p className="flex items-center gap-1 text-sm text-emerald-400"><CheckCircle size={14} />Discord 연결 성공!</p>}
            {discordOk === false && <p className="flex items-center gap-1 text-sm text-red-400"><XCircle size={14} />연결 실패. URL을 확인해주세요.</p>}
            <div className="flex gap-3 pt-2">
              <button onClick={() => setStep(1)} className="flex-1 btn-ghost flex items-center justify-center gap-1"><ArrowLeft size={15} />이전</button>
              <button onClick={() => setStep(3)} className="flex-1 btn-primary flex items-center justify-center gap-1">{discordWebhookUrl ? '다음' : '건너뛰기'} <ArrowRight size={15} /></button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 space-y-4">
            <h2 className="text-sm font-semibold text-zinc-300">Step 3 — 설정 완료</h2>
            <div className="bg-zinc-800/60 rounded-lg p-4 space-y-2 text-sm border border-zinc-700">
              <Row label="회사" value={companyName || '(미설정)'} />
              <Row label="관리자" value={`${name} (${email})`} />
              <Row label="Discord" value={discordWebhookUrl ? '설정됨' : '(미설정)'} />
            </div>
            <div className="bg-violet-600/10 border border-violet-500/20 rounded-lg p-4 text-xs text-zinc-400 space-y-1">
              <p className="font-medium text-violet-300">시작 후 설정에서 추가 가능:</p>
              <p>• Google Calendar / Gmail 연결</p>
              <p>• 팀원 계정 추가</p>
              <p>• 휴가 종류 수정</p>
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setStep(2)} className="flex-1 btn-ghost flex items-center justify-center gap-1"><ArrowLeft size={15} />이전</button>
              <button onClick={handleFinish} disabled={loading} className="flex-1 btn-primary flex items-center justify-center gap-1.5 disabled:opacity-40">
                {loading ? '설정 중...' : <><Rocket size={15} />시작하기</>}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-zinc-400 mb-1.5">{label}</label>
      {children}
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-zinc-500">{label}</span>
      <span className="font-medium text-zinc-200">{value}</span>
    </div>
  )
}
