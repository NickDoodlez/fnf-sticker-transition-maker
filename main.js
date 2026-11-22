const { app, BrowserWindow, ipcMain, dialog, shell, Menu } = require('electron');
const path = require('path');
const fs = require('fs');
const { createLibrary } = require('./lib/library');
const { createExporter } = require('./lib/exporter');

const baseDir = app.isPackaged ? process.env.PORTABLE_EXECUTABLE_DIR || path.dirname(process.execPath) : __dirname;
const iconPath = app.isPackaged ? path.join(process.resourcesPath, 'icon.ico') : path.join(__dirname, 'assets', 'icon.ico');
const library = createLibrary(baseDir);

function ffmpegPath() {
  if (app.isPackaged) return path.join(process.resourcesPath, process.platform === 'win32' ? 'ffmpeg.exe' : 'ffmpeg');
  try {
    return require('ffmpeg-static');
  } catch {
    return null;
  }
}

const exporter = createExporter(ffmpegPath);
let win = null;

function createWindow() {
  win = new BrowserWindow({
    width: 1400,
    height: 880,
    minWidth: 1100,
    minHeight: 700,
    backgroundColor: '#1b1b20',
    title: 'FNF Sticker Transition Maker',
    icon: iconPath,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      backgroundThrottling: false,
      autoplayPolicy: 'no-user-gesture-required'
    }
  });
  win.loadFile(path.join(__dirname, 'renderer', 'index.html'));
  win.on('closed', () => {
    win = null;
  });
}

ipcMain.handle('scan', () => library.scan());

ipcMain.handle('read-file', async (_, file) => {
  if (!library.isAllowed(file)) throw new Error('E_NOT_ALLOWED');
  return fs.promises.readFile(file);
});

ipcMain.handle('open-folder', (_, kind) => shell.openPath(kind === 'sounds' ? library.soundsDir : library.packsDir));

ipcMain.handle('reveal', (_, target) => {
  try {
    if (fs.statSync(target).isDirectory()) return shell.openPath(target);
    shell.showItemInFolder(target);
  } catch {}
  return '';
});

ipcMain.handle('pick-image', async (_, options) => {
  const { title, filterName } = options || {};
  const result = await dialog.showOpenDialog(win, {
    title: title || 'Image',
    properties: ['openFile'],
    filters: [{ name: filterName || 'Images', extensions: ['png', 'jpg', 'jpeg', 'webp', 'bmp'] }]
  });
  if (result.canceled || !result.filePaths[0]) return null;
  const file = result.filePaths[0];
  return { name: path.basename(file), data: await fs.promises.readFile(file) };
});

ipcMain.handle('export-choose', async (_, { format, name, title }) => {
  if (format === 'png') {
    const result = await dialog.showOpenDialog(win, {
      title: title || 'PNG',
      properties: ['openDirectory', 'createDirectory']
    });
    if (result.canceled || !result.filePaths[0]) return null;
    return path.join(result.filePaths[0], name);
  }
  const result = await dialog.showSaveDialog(win, {
    title: title || format.toUpperCase(),
    defaultPath: path.join(app.getPath('videos'), `${name}.${format}`),
    filters: [{ name: format.toUpperCase(), extensions: [format] }]
  });
  return result.canceled || !result.filePath ? null : result.filePath;
});

ipcMain.handle('export-start', (_, options) => exporter.start(options));
ipcMain.handle('export-frame', (_, data) => exporter.frame(data));
ipcMain.handle('export-finish', () => exporter.finish());
ipcMain.handle('export-cancel', () => exporter.cancel());

app.whenReady().then(() => {
  Menu.setApplicationMenu(null);
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('before-quit', () => {
  exporter.cancel();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
