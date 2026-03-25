import 'reflect-metadata'
import { DataSource } from 'typeorm'
import { types as pgTypes } from 'pg'
import { TenantEntity } from './entities/Tenant'
import { ChannelEntity } from './entities/Channel'
import { EmployeeEntity } from './entities/Employee'
import { LeaveTypeEntity } from './entities/LeaveType'
import { LeaveBalanceEntity } from './entities/LeaveBalance'
import { LeaveRequestEntity } from './entities/LeaveRequest'
import { ScrumEntity } from './entities/Scrum'

// Ensure pg returns dates as strings and numerics as floats
pgTypes.setTypeParser(pgTypes.builtins.DATE, (v: string) => v)
pgTypes.setTypeParser(pgTypes.builtins.TIMESTAMP, (v: string) => v)
pgTypes.setTypeParser(pgTypes.builtins.TIMESTAMPTZ, (v: string) => v)
pgTypes.setTypeParser(pgTypes.builtins.NUMERIC, (v: string) => parseFloat(v))

export const AppDataSource = new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  entities: [
    TenantEntity,
    ChannelEntity,
    EmployeeEntity,
    LeaveTypeEntity,
    LeaveBalanceEntity,
    LeaveRequestEntity,
    ScrumEntity,
  ],
  synchronize: true,
  logging: false,
})
