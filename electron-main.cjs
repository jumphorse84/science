const { app, BrowserWindow, shell, ipcMain, Notification } = require('electron');
const { autoUpdater } = require('electron-updater');
const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');

const APP_ID = 'com.science.helpdesk';
const APP_RUNTIME_NAME = 'science-desktop';
const APP_TITLE = '과학정보부 업무포털';
const USER_DATA_PATH = path.join(app.getPath('appData'), APP_RUNTIME_NAME);
const RELEASE_OWNER = process.env.GH_RELEASE_OWNER || process.env.SCIENCE_GH_OWNER || 'jumphorse84';
const RELEASE_REPO = process.env.GH_RELEASE_REPO || process.env.SCIENCE_GH_REPO || 'science';

app.setAppUserModelId(APP_ID);
app.setName(APP_RUNTIME_NAME);
app.setPath('userData', USER_DATA_PATH);
app.setPath('sessionData', path.join(USER_DATA_PATH, 'Session Data'));

const gotTheLock = app.requestSingleInstanceLock();
const devServerUrl = process.env.ELECTRON_RENDERER_URL || 'http://127.0.0.1:3000';

let mainWindow;
let updateErrorShown = false;

function hasUpdateConfig() {
  if (!app.isPackaged) return false;
  return fs.existsSync(path.join(process.resourcesPath, 'app-update.yml'));
}

function sendUpdaterStatus(payload) {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  mainWindow.webContents.send('updater:status', payload);
}

function normalizeReleaseNotes(releaseNotes) {
  if (!releaseNotes) return [];
  if (typeof releaseNotes === 'string') {
    return releaseNotes
      .split(/\r?\n/)
      .map((line) => line.replace(/^[-*]\s*/, '').trim())
      .filter(Boolean);
  }

  if (Array.isArray(releaseNotes)) {
    return releaseNotes
      .flatMap((item) => normalizeReleaseNotes(item.note || item.releaseNotes || item))
      .filter(Boolean);
  }

  return [];
}

async function fetchReleaseNotesFromGitHub(version) {
  const tags = [`v${version}`, version];

  for (const tag of tags) {
    try {
      const response = await fetch(`https://api.github.com/repos/${RELEASE_OWNER}/${RELEASE_REPO}/releases/tags/${encodeURIComponent(tag)}`, {
        headers: { Accept: 'application/vnd.github+json' },
      });
      if (!response.ok) continue;

      const payload = await response.json();
      const fromBody = normalizeReleaseNotes(payload?.body || '');
      if (fromBody.length > 0) return fromBody;
    } catch (error) {
      console.warn('[auto-update] failed to fetch release notes from GitHub:', error);
    }
  }

  return [];
}

function wireAutoUpdater() {
  if (!hasUpdateConfig()) {
    console.log('[auto-update] app-update.yml not found. Skipping update check.');
    return;
  }

  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = false;
  autoUpdater.autoRunAppAfterInstall = true;

  autoUpdater.on('checking-for-update', () => {
    sendUpdaterStatus({ status: 'checking' });
  });

  autoUpdater.on('update-available', async (info) => {
    let notes = normalizeReleaseNotes(info.releaseNotes);
    if (notes.length === 0) notes = await fetchReleaseNotesFromGitHub(info.version);

    sendUpdaterStatus({
      status: 'available',
      version: info.version,
      releaseName: info.releaseName || `v${info.version}`,
      releaseDate: info.releaseDate || '',
      notes,
    });
  });

  autoUpdater.on('update-not-available', () => {
    sendUpdaterStatus({ status: 'not-available' });
  });

  autoUpdater.on('download-progress', (progress) => {
    sendUpdaterStatus({
      status: 'downloading',
      percent: progress.percent || 0,
      bytesPerSecond: progress.bytesPerSecond || 0,
      transferred: progress.transferred || 0,
      total: progress.total || 0,
    });
  });

  autoUpdater.on('update-downloaded', async (event) => {
    let notes = normalizeReleaseNotes(event.releaseNotes);
    if (notes.length === 0) notes = await fetchReleaseNotesFromGitHub(event.version);

    sendUpdaterStatus({
      status: 'downloaded',
      version: event.version,
      releaseName: event.releaseName || `v${event.version}`,
      releaseDate: event.releaseDate || '',
      notes,
    });
  });

  autoUpdater.on('error', (error) => {
    console.error('[auto-update] error:', error);
    if (updateErrorShown) return;
    updateErrorShown = true;

    sendUpdaterStatus({
      status: 'error',
      message: '업데이트를 확인하거나 다운로드하는 중 문제가 발생했습니다.',
      detail: error?.message || '네트워크 상태 또는 배포 설정을 확인해 주세요.',
    });
  });

  ipcMain.handle('updater:check', async () => {
    if (!hasUpdateConfig()) return { ok: false, reason: 'disabled' };
    updateErrorShown = false;
    await autoUpdater.checkForUpdates();
    return { ok: true };
  });

  ipcMain.handle('updater:download', async () => {
    if (!hasUpdateConfig()) return { ok: false, reason: 'disabled' };
    await autoUpdater.downloadUpdate();
    return { ok: true };
  });

  ipcMain.handle('updater:restart', async () => {
    if (!hasUpdateConfig()) return { ok: false, reason: 'disabled' };
    // Silent install + rerun app after apply.
    autoUpdater.quitAndInstall(true, true);
    return { ok: true };
  });

  ipcMain.handle('desktop:notify', async (_event, payload = {}) => {
    try {
      const title = payload.title || '과학정보부 업무포털';
      const body = payload.body || '';

      const toast = new Notification({
        title,
        body,
        icon: path.join(__dirname, 'build', 'icon.ico'),
        silent: false,
      });
      toast.show();
      return { ok: true };
    } catch (error) {
      console.error('[desktop] notification failed:', error);
      return { ok: false };
    }
  });

  ipcMain.handle('desktop:flash', async (_event, enabled) => {
    if (!mainWindow || mainWindow.isDestroyed()) return { ok: false };
    mainWindow.flashFrame(Boolean(enabled));
    return { ok: true };
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
      preload: path.join(__dirname, 'electron-preload.cjs'),
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
