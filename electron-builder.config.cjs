const owner = process.env.GH_RELEASE_OWNER || process.env.SCIENCE_GH_OWNER;
const repo = process.env.GH_RELEASE_REPO || process.env.SCIENCE_GH_REPO;

/** @type {import('electron-builder').Configuration} */
const config = {
  appId: 'com.science.helpdesk',
  executableName: 'science-desktop',
  productName: '과학정보부 업무포털',
  directories: {
    output: 'dist-electron',
    buildResources: 'build',
  },
  files: [
    'dist/**/*',
    'build/icon.ico',
    'electron-main.cjs',
    'package.json',
  ],
  npmRebuild: false,
  win: {
    target: [
      {
        target: 'nsis',
        arch: ['x64'],
      },
    ],
    icon: 'build/icon.ico',
  },
  nsis: {
    oneClick: false,
    allowToChangeInstallationDirectory: true,
    createDesktopShortcut: true,
    createStartMenuShortcut: true,
    shortcutName: '과학정보부 업무포털',
    installerIcon: 'build/icon.ico',
    uninstallerIcon: 'build/icon.ico',
    installerHeaderIcon: 'build/icon.ico',
  },
};

if (owner && repo) {
  config.publish = [
    {
      provider: 'github',
      owner,
      repo,
      releaseType: 'release',
    },
  ];
}

module.exports = config;
