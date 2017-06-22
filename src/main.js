const {app, BrowserWindow} = require('electron')

let mainWindow

app.on('ready', () => {
  mainWindow = new BrowserWindow({
    width: 900,
    height: 900,
    minWidth: 550,
    minHeight: 650
  })

  const path = `file://${__dirname}/index.html`
  mainWindow.openDevTools()
  mainWindow.loadURL(path)
  mainWindow.on('close', _ => {
    mainWindow = null
  })
})
