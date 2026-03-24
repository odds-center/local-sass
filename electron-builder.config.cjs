/** @type {import('electron-builder').Configuration} */
module.exports = {
  appId: 'com.local-sass.app',
  productName: 'HR',
  directories: {
    output: 'release',
  },
  files: [
    'dist/**/*',
    'dist-electron/**/*',
  ],
  mac: {
    target: [{ target: 'dmg', arch: ['x64', 'arm64'] }],
  },
  win: {
    target: [{ target: 'nsis', arch: ['x64'] }],
  },
  nsis: {
    oneClick: false,
    allowToChangeInstallationDirectory: true,
  },
  npmRebuild: true,
  extraMetadata: {
    main: 'dist-electron/main/index.js',
  },
}
