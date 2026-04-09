const { app, BrowserWindow, shell, dialog } = require('electron');
const { autoUpdater } = require('electron-updater');
const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');

const APP_ID = 'com.science.helpdesk';
const APP_RUNTIME_NAME = 'science-desktop';
const APP_TITLE = '과학정보부 업무포털';
const USER_DATA_PATH = path.join(app.getPath('appData'), APP_RUNTIME_NAME);

app.setAppUserModelId(APP_ID);
app.setName(APP_RUNTIME_NAME);
app.setPath('userData', USER_DATA_PATH);
app.setPath('sessionData', path.join(USER_DATA_PATH, 'Session Data'));

const gotTheLock = app.requestSingleInstanceLock();
const devServerUrl = process.env.ELECTRON_RENDERER_URL || 'http://127.0.0.1:3000';

let mainWindow;
let updateErrorShown = false;
let updatePromptOpen = false;

function hasUpdateConfig() {
  if (!app.isPackaged) return false;
  return fs.existsSync(path.join(process.resourcesPath, 'app-update.yml'));
}

async function showSingleUpdateDialog(options) {
  if (updatePromptOpen) return { response: 1 };
  updatePromptOpen = true;

  try {
    const targetWindow = mainWindow && !mainWindow.isDestroyed() ? mainWindow : null;
    return await dialog.showMessageBox(targetWindow, options);
  } finally {
    updatePromptOpen = false;
  }
}

function wireAutoUpdater() {
  if (!hasUpdateConfig()) {
    console.log('[auto-update] app-update.yml not found. Skipping update check.');
    return;
  }

  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on('update-available', async (info) => {
    const result = await showSingleUpdateDialog({
      type: 'info',
      title: '업데이트 확인',
      message: `새 버전 ${info.version} 이(가) 있습니다.`,
      detail: '지금 다운로드하고 설치 준비를 진행할까요?',
      buttons: ['다운로드', '나중에'],
      defaultId: 0,
      cancelId: 1,
    });

    if (result.response === 0) {
      autoUpdater.downloadUpdate().catch((error) => {
        console.error('[auto-update] download failed:', error);
      });
    }
  });

  autoUpdater.on('update-downloaded', async () => {
    const result = await showSingleUpdateDialog({
      type: 'info',
      title: '업데이트 준비 완료',
      message: '업데이트 다운로드가 완료되었습니다.',
      detail: '지금 앱을 다시 시작하면 새 버전이 설치됩니다.',
      buttons: ['지금 재시작', '나중에'],
      defaultId: 0,
      cancelId: 1,
    });

    if (result.response === 0) {
      autoUpdater.quitAndInstall();
    }
  });

  autoUpdater.on('error', async (error) => {
    console.error('[auto-update] error:', error);
    if (updateErrorShown) return;
    updateErrorShown = true;

    await showSingleUpdateDialog({
      type: 'warning',
      title: '업데이트 확인 실패',
      message: '업데이트를 확인하지 못했습니다.',
      detail: '네트워크 상태 또는 배포 설정을 확인한 뒤 다시 실행해 주세요.',
      buttons: ['확인'],
      defaultId: 0,
    });
  });

  setTimeout(() => {
    autoUpdater.checkForUpdates().catch((error) => {
      console.error('[auto-update] check failed:', error);
    });
  }, 5000);
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 850,
    minWidth: 1024,
    minHeight: 720,
    title: APP_TITLE,
    icon: path.join(__dirname, 'build', 'icon.ico'),
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  const rendererUrl = app.isPackaged
    ? pathToFileURL(path.join(__dirname, 'dist', 'index.html')).toString()
    : devServerUrl;

  mainWindow.loadURL(rendererUrl);

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.webContents.on('will-navigate', (event, url) => {
    const isLocalAppUrl = app.isPackaged
      ? url.startsWith('file://')
      : url.startsWith(devServerUrl);

    if (!isLocalAppUrl) {
      event.preventDefault();
      shell.openExternal(url);
    }
  });
}

if (!gotTheLock) {
  app.quit();
} else {
  app.whenReady().then(() => {
    createWindow();
    wireAutoUpdater();
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });

  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
  });
}
