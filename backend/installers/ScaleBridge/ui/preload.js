const { contextBridge, ipcRenderer } = require('electron');

// Безопасный API для рендерера
contextBridge.exposeInMainWorld('electronAPI', {
  // API для работы с конфигурацией
  getConfig: () => ipcRenderer.invoke('get-config'),
  saveConfig: (config) => ipcRenderer.invoke('save-config', config),
  getIp: () => ipcRenderer.invoke('get-ip'),
  
  // API для работы с весами
  getWeight: () => ipcRenderer.invoke('get-weight'),
  getPorts: () => ipcRenderer.invoke('get-ports'),
  reconnectScale: () => ipcRenderer.invoke('reconnect-scale'),
  
  // API для работы с камерой
  testCamera: () => ipcRenderer.invoke('test-camera'),
  
  // API для работы с backend
  testBackend: (data) => ipcRenderer.invoke('test-connection', data),
  
  // Уведомления
  showNotification: (message, type) => ipcRenderer.invoke('show-notification', { message, type })
});

