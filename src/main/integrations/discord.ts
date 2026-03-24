import { LeaveRequest } from '../../shared/types'
import { getSettings } from '../ipc/settings'

interface DiscordPayload {
  type: 'new_request' | 'approved' | 'rejected'
  request: LeaveRequest
  employeeName: string
  reviewerNote?: string
}

const STATUS_COLORS = {
  new_request: 0xf59e0b, // amber
  approved: 0x22c55e,    // green
  rejected: 0xef4444,    // red
}

const STATUS_LABELS = {
  new_request: '🗓️ 새 휴가 신청',
  approved: '✅ 휴가 승인',
  rejected: '❌ 휴가 거절',
}

export async function sendDiscordNotification(payload: DiscordPayload): Promise<void> {
  const settings = getSettings()
  if (!settings.discord_webhook_url) return

  const embed = {
    title: STATUS_LABELS[payload.type],
    color: STATUS_COLORS[payload.type],
    fields: [
      { name: '직원', value: payload.employeeName, inline: true },
      { name: '휴가 종류', value: payload.request.leave_type_name ?? '-', inline: true },
      { name: '기간', value: `${payload.request.start_date} ~ ${payload.request.end_date}`, inline: false },
      { name: '일수', value: `${payload.request.total_days}일`, inline: true },
    ],
    timestamp: new Date().toISOString(),
  }

  if (payload.request.reason) {
    embed.fields.push({ name: '사유', value: payload.request.reason, inline: false })
  }
  if (payload.reviewerNote) {
    embed.fields.push({ name: '검토 의견', value: payload.reviewerNote, inline: false })
  }

  const response = await fetch(settings.discord_webhook_url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ embeds: [embed] }),
  })

  if (!response.ok) {
    throw new Error(`Discord webhook failed: ${response.status} ${response.statusText}`)
  }
}

export async function testDiscordWebhook(webhookUrl: string): Promise<void> {
  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      content: '✅ HR 연결 테스트 성공!',
    }),
  })

  if (!response.ok) {
    throw new Error(`Discord webhook failed: ${response.status} ${response.statusText}`)
  }
}
