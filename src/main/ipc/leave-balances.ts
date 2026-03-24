import { IpcMain } from 'electron'
import {
  listLeaveBalancesByYear,
  getLeaveBalancesByEmployee,
  adjustLeaveBalance,
} from '../database/queries/leave-balances'

export function registerLeaveBalanceHandlers(ipcMain: IpcMain): void {
  ipcMain.handle('leaveBalances:listByYear', (_event, year) => listLeaveBalancesByYear(year))
  ipcMain.handle('leaveBalances:getByEmployee', (_event, employeeId, year) =>
    getLeaveBalancesByEmployee(employeeId, year)
  )
  ipcMain.handle('leaveBalances:adjust', (_event, id, allocatedDays) =>
    adjustLeaveBalance(id, allocatedDays)
  )
}
