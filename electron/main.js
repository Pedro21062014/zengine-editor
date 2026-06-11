const { app, BrowserWindow } = require('electron')
const path = require('path')

// Suppress security warnings for development
process.env.ELECTRON_DISABLE_SECURITY_WARNINGS = true

let mainWindow

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1600,
    height: 900,
    minWidth: 1024,
    minHeight: 600,
    title: 'ZEngine Editor',
    icon: path.join(__dirname, '..', 'public', 'logo.svg'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
    },
    backgroundColor: '#0f0f1a',
    show: false,
  })

  // In production, load the built Next.js app
  if (process.env.NODE_ENV === 'production') {
    mainWindow.loadFile(path.join(__dirname, '..', 'out', 'index.html'))
  } else {
    mainWindow.loadURL('http://localhost:3000')
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

app.whenReady().then(createWindow)

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})
