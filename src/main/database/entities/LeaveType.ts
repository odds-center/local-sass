import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm'

@Entity('leave_types')
export class LeaveTypeEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ type: 'text' })
  tenant_id: string

  @Column({ type: 'text' })
  name: string

  @Column({ type: 'int', default: 15 })
  default_days: number

  @Column({ type: 'int', default: 0 })
  carry_over_max: number

  @Column({ type: 'text', default: '#8b5cf6' })
  color: string
}
