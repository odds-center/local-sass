import { ChannelConfig } from '../database/entities/Channel'

export interface WebhookMessage {
  /** Plain-text fallback (used by Slack, Teams, Custom) */
  text: string
  /** Discord-specific rich embeds */
  embeds?: unknown[]
}

/**
 * Sends a message to any webhook-compatible messenger.
 * Adapts the payload format based on webhook_type.
 */
export async function sendWebhook(config: ChannelConfig, message: WebhookMessage): Promise<void> {
  if (!config.webhook_url) return

  let body: unknown
  switch (config.webhook_type) {
    case 'slack':
      body = { text: message.text }
      break
    case 'teams':
      body = {
        '@type': 'MessageCard',
        '@context': 'http://schema.org/extensions',
        text: message.text,
      }
      break
    case 'custom':
      body = { text: message.text }
      break
    case 'discord':
    default:
      body = message.embeds ? { embeds: message.embeds } : { content: message.text }
  }

  const res = await fetch(config.webhook_url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    throw new Error(`Webhook failed (${config.webhook_type ?? 'discord'}): ${res.status} ${res.statusText}`)
  }
}

export async function testWebhook(config: ChannelConfig): Promise<void> {
  await sendWebhook(config, { text: '✅ HR 연결 테스트 성공!' })
}
