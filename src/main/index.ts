/**
 * @fileoverview Main Process Entry Point
 * Pour plus d'informations sur l'architecture de ce module et du projet,
 * veuillez consulter le dossier /docs/ à la racine du projet.
 */
if (process.env.NODE_ENV !== 'test') {
  require('dotenv').config()
}
import { app, BrowserWindow, shell, nativeTheme } from 'electron'
import { join } from 'path'
import { is } from '@electron-toolkit/utils'
import { Database } from '@main/db/database'
import { registerAllHandlers } from '@main/ipc/index'
import { logger, setLogDirectory } from '@main/utils/logger'
import { checkAllDependencies } from '@main/utils/permissions'

let mainWindow: BrowserWindow | null = null

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1280,
    minHeight: 720,
    show: false,
    autoHideMenuBar: true,
    frame: true,
    backgroundColor: '#0a0e1a',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: true,
    },
    ...(process.platform === 'linux'
      ? { icon: join(__dirname, '../../resources/icons/icon.png') }
      : {}),
  })

  // Force dark title bar
  nativeTheme.themeSource = 'dark'

  mainWindow.on('ready-to-show', () => {
    mainWindow?.show()
    logger.info('Main window ready')
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })

  // Open external URLs in the system browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
    mainWindow.webContents.openDevTools({ mode: 'detach' })
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(async () => {
  // Redirect logs to userData directory now that app path is available
  const userData = app.getPath('userData')
  setLogDirectory(join(userData, 'logs'))

  logger.info(`Black Network ${app.getVersion()} starting — userData: ${userData}`)

  // Setup permissions with sudo-prompt if running on linux
  if (process.platform === 'linux' && process.env.NODE_ENV !== 'test') {
    try {
      const { execSync } = require('child_process')
      let needsSetcap = false
      try {
        const caps = execSync('getcap /usr/bin/dumpcap /usr/bin/nmap', { encoding: 'utf-8' })
        if (!caps.includes('cap_net_raw') || !caps.includes('/usr/bin/dumpcap') || !caps.includes('/usr/bin/nmap')) {
          needsSetcap = true
        }
      } catch (e) {
        needsSetcap = true
      }

      if (needsSetcap) {
        const sudo = require('sudo-prompt')
        const options = {
          name: 'Black Network',
        }
        // Give cap_net_raw and cap_net_admin to nmap and tshark to run without root
        const cmd = 'setcap cap_net_raw,cap_net_admin,cap_dac_override+eip /usr/bin/nmap && setcap cap_net_raw,cap_net_admin+eip /usr/bin/tshark && setcap cap_net_raw,cap_net_admin+eip /usr/bin/dumpcap'
        logger.info('Capabilities missing. Requesting sudo permissions to setcap...')
        sudo.exec(cmd, options, (error: Error | undefined, stdout: string, stderr: string) => {
          if (error) {
            logger.warn(`Sudo prompt failed: ${error}`)
          } else {
            logger.info(`Sudo prompt success. ${stdout} ${stderr}`)
          }
        })
      } else {
        logger.info('Required network capabilities (setcap) are already present.')
      }
    } catch (e) {
      logger.error(`Failed to execute sudo-prompt: ${e}`)
    }
  }

  // Initialize SQLite database
  const db = Database.getInstance()
  db.initialize(join(userData, 'black-network.db'))

  // Register all IPC handlers before the window loads
  registerAllHandlers()

  // Check system dependencies asynchronously (non-blocking)
  checkAllDependencies()
    .then(deps => {
      const missing = deps.filter(d => d.required && !d.available)
      if (missing.length > 0) {
        logger.warn(`Missing required tools: ${missing.map(d => d.name).join(', ')}`)
      } else {
        logger.info('All required tools are available')
      }
    })
    .catch(err => {
      logger.warn(`Dependency check failed: ${err}`)
    })

  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    Database.getInstance().close()
    app.quit()
  }
})

// Security: block navigation to external URLs from the renderer
app.on('web-contents-created', (_event, contents) => {
  contents.on('will-navigate', (event, url) => {
    const isLocalFile = url.startsWith('file://')
    const isLocalDev = url.startsWith('http://localhost')
    if (!isLocalFile && !isLocalDev) {
      logger.warn(`Blocked navigation to: ${url}`)
      event.preventDefault()
    }
  })
})

export { mainWindow }
