import { LeaveRequest } from '../../shared/types'
import { ChannelConfig } from '../database/entities/Channel'
import { sendWebhook } from './webhook'

export type NotificationType = 'new_request' | 'approved' | 'rejected'

const STATUS_COLORS: Record<NotificationType, number> = {
  new_request: 0xf59e0b,
  approved: 0x22c55e,
  rejected: 0xef4444,
}

const STATUS_LABELS: Record<NotificationType, string> = {
  new_request: '🗓️ 새 휴가 신청',
  approved: '✅ 휴가 승인',
  rejected: '❌ 휴가 거절',
}

export async function sendLeaveNotification(
  config: ChannelConfig,
  type: NotificationType,
  request: LeaveRequest,
  employeeName: string,
  reviewerNote?: string,
): Promise<void> {
  if (!config.webhook_url) return

  const fields = [
    { name: '직원', value: employeeName, inline: true },
    { name: '휴가 종류', value: request.leave_type_name ?? '-', inline: true },
    { name: '기간', value: `${request.start_date} ~ ${request.end_date}`, inline: false },
    { name: '일수', value: `${request.total_days}일`, inline: true },
  ]
  if (request.reason) fields.push({ name: '사유', value: request.reason, inline: false })
  if (reviewerNote) fields.push({ name: '검토 의견', value: reviewerNote, inline: false })

  const lines = [
    STATUS_LABELS[type],
    `직원: ${employeeName} | ${request.leave_type_name ?? '-'}`,
    `기간: ${request.start_date} ~ ${request.end_date} (${request.total_days}일)`,
    ...(request.reason ? [`사유: ${request.reason}`] : []),
    ...(reviewerNote ? [`검토 의견: ${reviewerNote}`] : []),
  ]

  await sendWebhook(config, {
    text: lines.join('\n'),
    embeds: [{ title: STATUS_LABELS[type], color: STATUS_COLORS[type], fields, timestamp: new Date().toISOString() }],
  })
}

export async function testDiscordWebhook(webhookUrl: string): Promise<void> {
  const res = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content: '✅ HR 연결 테스트 성공!' }),
  })
  if (!res.ok) throw new Error(`Webhook failed: ${res.status} ${res.statusText}`)
}
