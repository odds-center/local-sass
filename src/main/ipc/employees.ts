import { IpcMain } from 'electron'
import {
  listEmployees,
  createEmployee,
  updateEmployee,
  deactivateEmployee,
} from '../database/queries/employees'
import { initBalancesForEmployee } from '../database/queries/leave-balances'

export function registerEmployeeHandlers(ipcMain: IpcMain): void {
  ipcMain.handle('employees:list', () => listEmployees())

  ipcMain.handle('employees:create', (_event, data) => {
    const employee = createEmployee(data)
    // Auto-create leave balances for current year
    initBalancesForEmployee(employee.id, new Date().getFullYear())
    return employee
  })

  ipcMain.handle('employees:update', (_event, id, data) => updateEmployee(id, data))

  ipcMain.handle('employees:deactivate', (_event, id) => deactivateEmployee(id))
}
