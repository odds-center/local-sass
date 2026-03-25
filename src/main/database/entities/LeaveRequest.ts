import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm'

@Entity('leave_requests')
export class LeaveRequestEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ type: 'text' })
  tenant_id: string

  @Column({ type: 'text' })
  employee_id: string

  @Column({ type: 'text' })
  leave_type_id: string

  @Column({ type: 'text' })
  start_date: string

  @Column({ type: 'text' })
  end_date: string

  @Column({ type: 'numeric' })
  total_days: number

  @Column({ type: 'text', default: 'day' })
  leave_unit: string

  @Column({ type: 'numeric', nullable: true })
  leave_hours: number | null

  @Column({ type: 'text', nullable: true })
  start_time: string | null

  @Column({ type: 'text', nullable: true })
  end_time: string | null

  @Column({ type: 'text', nullable: true })
  reason: string | null

  @Column({ type: 'text', default: 'pending' })
  status: string

  @Column({ type: 'text', nullable: true })
  reviewed_by: string | null

  @Column({ type: 'timestamptz', nullable: true })
  reviewed_at: string | null

  @Column({ type: 'text', nullable: true })
  reviewer_note: string | null

  @Column({ type: 'text', nullable: true })
  google_calendar_event_id: string | null

  @CreateDateColumn()
  created_at: Date

  @UpdateDateColumn()
  updated_at: Date
}
