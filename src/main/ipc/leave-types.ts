import { IpcMain } from 'electron'
import { listLeaveTypes, createLeaveType, updateLeaveType } from '../database/queries/leave-types'

export function registerLeaveTypeHandlers(ipcMain: IpcMain): void {
  ipcMain.handle('leaveTypes:list', () => listLeaveTypes())
  ipcMain.handle('leaveTypes:create', (_event, data) => createLeaveType(data))
  ipcMain.handle('leaveTypes:update', (_event, id, data) => updateLeaveType(id, data))
}
