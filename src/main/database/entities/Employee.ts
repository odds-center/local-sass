import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Unique } from 'typeorm'

@Entity('employees')
@Unique(['tenant_id', 'email'])
export class EmployeeEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ type: 'text' })
  tenant_id: string

  @Column({ type: 'text' })
  name: string

  @Column({ type: 'text' })
  email: string

  @Column({ type: 'text', nullable: true })
  department: string | null

  @Column({ type: 'text', default: 'employee' })
  role: string

  @Column({ type: 'text', nullable: true })
  discord_tag: string | null

  @Column({ type: 'int', default: 1 })
  is_active: number

  @Column({ type: 'text', nullable: true })
  password_hash: string | null

  @CreateDateColumn()
  created_at: Date
}
