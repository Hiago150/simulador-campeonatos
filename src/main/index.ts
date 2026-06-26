import { app, BrowserWindow, ipcMain, dialog, shell } from 'electron'
import { join } from 'path'
import { writeFile, readFile } from 'node:fs/promises'

let mainWindow: BrowserWindow | null = null

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1320,
    height: 860,
    minWidth: 1024,
    minHeight: 680,
    show: false,
    backgroundColor: '#0a0a0b',
    autoHideMenuBar: true,
    titleBarStyle: 'hidden',
    titleBarOverlay: {
      color: '#0a0a0b',
      symbolColor: '#ff6464',
      height: 40
    },
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow?.show()
  })

  // Abrir links externos no navegador padrão, não dentro do app
  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// ----- IPC: salvar / carregar campeonatos em JSON -----

ipcMain.handle(
  'tournament:save',
  async (_evt, payload: { json: string; suggestedName?: string }) => {
    const { canceled, filePath } = await dialog.showSaveDialog(mainWindow!, {
      title: 'Salvar campeonato',
      defaultPath: payload.suggestedName ?? 'campeonato.json',
      filters: [{ name: 'Campeonato (JSON)', extensions: ['json'] }]
    })
    if (canceled || !filePath) return { ok: false, canceled: true }
    await writeFile(filePath, payload.json, 'utf-8')
    return { ok: true, path: filePath }
  }
)

ipcMain.handle('tournament:load', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow!, {
    title: 'Abrir campeonato',
    properties: ['openFile'],
    filters: [{ name: 'Campeonato (JSON)', extensions: ['json'] }]
  })
  if (canceled || filePaths.length === 0) return { ok: false, canceled: true }
  const data = await readFile(filePaths[0], 'utf-8')
  return { ok: true, data, path: filePaths[0] }
})

app.whenReady().then(() => {
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
