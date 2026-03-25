import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm'

@Entity('tenants')
export class TenantEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ type: 'text' })
  name: string

  @Column({ type: 'text', unique: true })
  slug: string

  @Column({ type: 'text', default: '' })
  google_client_id: string

  @Column({ type: 'text', default: '' })
  google_client_secret: string

  @Column({ type: 'text', default: '' })
  google_refresh_token: string

  @Column({ type: 'text', default: '' })
  google_calendar_id: string

  @Column({ type: 'text', default: '' })
  app_company_name: string

  @CreateDateColumn()
  created_at: Date
}
