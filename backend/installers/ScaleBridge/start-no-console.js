// Скрипт для запуска Electron без консоли
const { spawn } = require('child_process');
const path = require('path');

const electronPath = require('electron');

// Запуск Electron без окна консоли
const child = spawn(electronPath, ['.'], {
  detached: true,
  stdio: 'ignore',
  windowsHide: true
});

child.unref();

console.log('ScaleBridge запущен в фоновом режиме');
process.exit(0);













