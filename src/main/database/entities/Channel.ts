import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm'

export type ChannelType = 'leave_management' | 'scrum'
export type WebhookType = 'discord' | 'slack' | 'teams' | 'custom'

export interface ChannelConfig {
  webhook_url?: string
  webhook_type?: WebhookType
  google_calendar_id?: string
}

@Entity('channels')
export class ChannelEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ type: 'text' })
  tenant_id: string

  @Column({ type: 'text' })
  name: string

  @Column({ type: 'text' })
  type: ChannelType

  @Column({ type: 'jsonb', default: {} })
  config: ChannelConfig

  @CreateDateColumn()
  created_at: Date

  @UpdateDateColumn()
  updated_at: Date
}
