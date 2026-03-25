import 'dotenv/config'
import 'reflect-metadata'
import { app, BrowserWindow, shell } from 'electron'
import { initDb } from './database/db'
import { startServer, PORT } from './server'

let mainWindow: BrowserWindow | null = null

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      // No preload needed — renderer uses fetch() only
    },
  })

  // Dev: Vite HMR (5173), Prod: Express (8888)
  const isDev = !app.isPackaged
  mainWindow.loadURL(isDev ? 'http://localhost:5173' : `http://localhost:${PORT}`)

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })
}

app.whenReady().then(async () => {
  await initDb()
  await startServer()
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
