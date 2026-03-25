import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Unique } from 'typeorm'
import { ScrumItem } from '../../../shared/types'

@Entity('scrums')
@Unique(['employee_id', 'date'])
export class ScrumEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ type: 'text' })
  tenant_id: string

  @Column({ type: 'text' })
  employee_id: string

  @Column({ type: 'text' })
  date: string

  @Column({ type: 'jsonb', default: [] })
  items: ScrumItem[]

  @Column({ type: 'timestamptz', nullable: true })
  sent_at: string | null

  @CreateDateColumn()
  created_at: Date

  @UpdateDateColumn()
  updated_at: Date
}
