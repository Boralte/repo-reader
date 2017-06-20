const { app, BrowserWindow, globalShortcut} = require('electron')

let mainWindow

app.on('ready', () => {
    
    mainWindow = new BrowserWindow( {
        width:900,
        height: 900
    })

    const path = `file://${__dirname}/index.html`;
    mainWindow.openDevTools()

    mainWindow.loadURL(path)

    mainWindow.on('close', _ => {
        mainWindow = null
    })
})

