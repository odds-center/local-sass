import { Entity, PrimaryGeneratedColumn, Column, Unique } from 'typeorm'

@Entity('leave_balances')
@Unique(['employee_id', 'leave_type_id', 'year'])
export class LeaveBalanceEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ type: 'text' })
  tenant_id: string

  @Column({ type: 'text' })
  employee_id: string

  @Column({ type: 'text' })
  leave_type_id: string

  @Column({ type: 'int' })
  year: number

  @Column({ type: 'numeric', default: 0 })
  allocated_days: number

  @Column({ type: 'numeric', default: 0 })
  used_days: number
}
