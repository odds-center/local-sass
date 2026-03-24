import { contextBridge, ipcRenderer } from 'electron'
import { Api } from '../shared/types'

const api: Api = {
  employees: {
    list: () => ipcRenderer.invoke('employees:list'),
    create: (data) => ipcRenderer.invoke('employees:create', data),
    update: (id, data) => ipcRenderer.invoke('employees:update', id, data),
    deactivate: (id) => ipcRenderer.invoke('employees:deactivate', id),
    activate: (id) => ipcRenderer.invoke('employees:activate', id),
    delete: (id) => ipcRenderer.invoke('employees:delete', id),
  },
  leaveRequests: {
    list: (filters) => ipcRenderer.invoke('leaveRequests:list', filters),
    create: (data) => ipcRenderer.invoke('leaveRequests:create', data),
    approve: (id, reviewerId, note) => ipcRenderer.invoke('leaveRequests:approve', id, reviewerId, note),
    reject: (id, reviewerId, note) => ipcRenderer.invoke('leaveRequests:reject', id, reviewerId, note),
    cancel: (id) => ipcRenderer.invoke('leaveRequests:cancel', id),
  },
  leaveBalances: {
    listByYear: (year) => ipcRenderer.invoke('leaveBalances:listByYear', year),
    getByEmployee: (employeeId, year) => ipcRenderer.invoke('leaveBalances:getByEmployee', employeeId, year),
    adjust: (id, allocatedDays) => ipcRenderer.invoke('leaveBalances:adjust', id, allocatedDays),
  },
  leaveTypes: {
    list: () => ipcRenderer.invoke('leaveTypes:list'),
    create: (data) => ipcRenderer.invoke('leaveTypes:create', data),
    update: (id, data) => ipcRenderer.invoke('leaveTypes:update', id, data),
  },
  settings: {
    get: () => ipcRenderer.invoke('settings:get'),
    set: (data) => ipcRenderer.invoke('settings:set', data),
    testDiscord: () => ipcRenderer.invoke('settings:testDiscord'),
    connectGoogle: () => ipcRenderer.invoke('settings:connectGoogle'),
    listCalendars: () => ipcRenderer.invoke('settings:listCalendars'),
  },
}

contextBridge.exposeInMainWorld('api', api)
