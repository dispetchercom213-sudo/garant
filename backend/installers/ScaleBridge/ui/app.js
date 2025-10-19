// Используем contextBridge API

// Глобальное состояние
let config = {};
let weightUpdateInterval = null;

// Инициализация при загрузке
document.addEventListener('DOMContentLoaded', async () => {
  await loadConfig();
  setupEventListeners();
  startWeightUpdates();
  await loadComPorts();
  await loadLocalIp();
});

// Загрузка конфигурации
async function loadConfig() {
  try {
    config = await window.electronAPI.getConfig();
    populateForm();
  } catch (error) {
    showNotification('Ошибка загрузки конфигурации: ' + error.message, 'error');
  }
}

// Заполнение формы данными
function populateForm() {
  document.getElementById('comPort').value = config.comPort || 'COM3';
  document.getElementById('baudRate').value = config.baudRate || 9600;
  document.getElementById('dataBits').value = config.dataBits || 8;
  document.getElementById('parity').value = config.parity || 'none';
  document.getElementById('stopBits').value = config.stopBits || 1;
  
  document.getElementById('cameraType').value = config.cameraType || 'usb';
  document.getElementById('photosRetentionDays').value = config.photosRetentionDays || 30;
  
  // Загрузка выбранных USB камер
  const cameraDevices = config.cameraDevices || [0];
  for (let i = 0; i <= 4; i++) {
    const checkbox = document.getElementById(`camera${i}`);
    if (checkbox) {
      checkbox.checked = cameraDevices.includes(i);
    }
  }
  
  // Загрузка RTSP камер
  const rtspUrls = config.rtspUrls || [];
  loadRtspCameras(rtspUrls);
  
  document.getElementById('backendUrl').value = config.backendUrl || 'http://localhost:4000';
  document.getElementById('apiKey').value = config.apiKey || '';
  document.getElementById('backendSync').checked = config.backendSync !== false;
  
  document.getElementById('autoStart').checked = config.autoStart !== false;
  document.getElementById('language').value = config.language || 'ru';

  // Показать/скрыть RTSP URL
  toggleRtspUrl();
}

// Загрузка IP адреса
async function loadLocalIp() {
  try {
    const ipInfo = await window.electronAPI.getIp();
    if (ipInfo) {
      document.getElementById('localIp').textContent = ipInfo.ip;
      document.getElementById('appIp').textContent = ipInfo.ip;
      document.getElementById('apiUrl').textContent = ipInfo.url;
      
      // Добавляем обработчик клика для копирования
      const ipContainer = document.getElementById('ipContainer');
      ipContainer.onclick = () => {
        copyToClipboard(ipInfo.ip);
        showNotification(`IP адрес ${ipInfo.ip} скопирован в буфер обмена!`, 'success');
      };
      
      console.log('IP адрес загружен:', ipInfo.ip, ipInfo.url);
    }
  } catch (error) {
    console.error('Ошибка загрузки IP:', error);
    document.getElementById('localIp').textContent = 'Ошибка';
    document.getElementById('appIp').textContent = 'Ошибка';
  }
}

// Копирование в буфер обмена
function copyToClipboard(text) {
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand('copy');
  document.body.removeChild(textarea);
}

// Получение выбранных камер
function getSelectedCameras() {
  const selected = [];
  for (let i = 0; i <= 4; i++) {
    const checkbox = document.getElementById(`camera${i}`);
    if (checkbox && checkbox.checked) {
      selected.push(i);
    }
  }
  return selected.length > 0 ? selected : [0]; // По умолчанию камера 0
}

// Управление RTSP камерами
let rtspCameraIndex = 0;

window.addRtspCamera = function() {
  const container = document.getElementById('rtspCamerasList');
  const index = rtspCameraIndex++;
  
  const cameraDiv = document.createElement('div');
  cameraDiv.className = 'rtsp-camera-item';
  cameraDiv.id = `rtspCamera${index}`;
  cameraDiv.style.cssText = 'margin-bottom: 10px; padding: 10px; border: 1px solid #e9ecef; border-radius: 6px; background: #f8f9fa;';
  
  cameraDiv.innerHTML = `
    <div style="display: flex; align-items: center; gap: 10px;">
      <label style="flex: 0 0 80px;">📹 Камера ${index + 1}:</label>
      <input type="text" 
             class="rtsp-url-input" 
             data-index="${index}"
             placeholder="rtsp://admin:password@192.168.1.100:554/stream"
             style="flex: 1; padding: 8px; border: 1px solid #ced4da; border-radius: 4px;">
      <button type="button" 
              class="btn btn-danger btn-small" 
              onclick="removeRtspCamera(${index})"
              style="flex: 0 0 auto;">
        ❌
      </button>
    </div>
  `;
  
  container.appendChild(cameraDiv);
}

window.removeRtspCamera = function(index) {
  const camera = document.getElementById(`rtspCamera${index}`);
  if (camera) {
    camera.remove();
  }
}

function getRtspCameras() {
  const inputs = document.querySelectorAll('.rtsp-url-input');
  const urls = [];
  inputs.forEach(input => {
    const url = input.value.trim();
    if (url) {
      urls.push(url);
    }
  });
  return urls;
}

function loadRtspCameras(urls) {
  const container = document.getElementById('rtspCamerasList');
  container.innerHTML = '';
  rtspCameraIndex = 0;
  
  if (!urls || urls.length === 0) {
    addRtspCamera();
    return;
  }
  
  urls.forEach(url => {
    addRtspCamera();
    const inputs = document.querySelectorAll('.rtsp-url-input');
    const lastInput = inputs[inputs.length - 1];
    if (lastInput) {
      lastInput.value = url;
    }
  });
}

// Заполнение RTSP шаблонов
window.fillRtspTemplate = function(manufacturer) {
  const templates = {
    hikvision: 'rtsp://admin:password@192.168.1.100:554/Streaming/Channels/101',
    dahua: 'rtsp://admin:password@192.168.1.100:554/cam/realmonitor?channel=1&subtype=0',
    tplink: 'rtsp://admin:password@192.168.1.100:554/stream1',
    axis: 'rtsp://admin:password@192.168.1.100:554/axis-media/media.amp',
    generic: 'rtsp://admin:password@192.168.1.100:554/stream'
  };
  
  const url = templates[manufacturer];
  if (url) {
    // Заполняем последнее поле
    const inputs = document.querySelectorAll('.rtsp-url-input');
    if (inputs.length > 0) {
      const lastInput = inputs[inputs.length - 1];
      lastInput.value = url;
      showNotification(`Шаблон ${manufacturer.toUpperCase()} загружен. Замените IP, логин и пароль.`, 'success');
    } else {
      addRtspCamera();
      setTimeout(() => {
        const inputs = document.querySelectorAll('.rtsp-url-input');
        if (inputs.length > 0) {
          inputs[0].value = url;
        }
      }, 100);
    }
  }
}

// Загрузка списка COM-портов
async function loadComPorts() {
  try {
    const ports = await window.electronAPI.getPorts();
    const select = document.getElementById('comPort');
    
    // Очищаем список
    select.innerHTML = '';
    
    // Всегда добавляем стандартные порты
    for (let i = 1; i <= 20; i++) {
      const option = document.createElement('option');
      option.value = `COM${i}`;
      option.textContent = `COM${i} - (Стандартные порты)`;
      select.appendChild(option);
    }
    
    // Добавляем найденные порты (если есть)
    if (ports && ports.length > 0) {
      ports.forEach(port => {
        // Проверяем, есть ли уже такой порт
        const existingOption = Array.from(select.options).find(opt => opt.value === port.path);
        if (existingOption) {
          // Обновляем существующий порт
          existingOption.textContent = `${port.path} - ${port.manufacturer || 'Обнаружен'}`;
        } else {
          // Добавляем новый порт
          const option = document.createElement('option');
          option.value = port.path;
          option.textContent = `${port.path} - ${port.manufacturer || 'Обнаружен'}`;
          select.appendChild(option);
        }
      });
    }
    
    // Устанавливаем текущий порт
    if (config.comPort) {
      select.value = config.comPort;
    }
  } catch (error) {
    console.error('Ошибка загрузки портов:', error);
  }
}

// Настройка обработчиков событий
function setupEventListeners() {
  // Переключение вкладок
  document.querySelectorAll('.tab-button').forEach(button => {
    button.addEventListener('click', () => {
      const tabName = button.dataset.tab;
      switchTab(tabName);
    });
  });

  // Сохранение конфигурации
  document.getElementById('saveConfig').addEventListener('click', saveConfig);

  // Обновление списка портов
  document.getElementById('refreshPorts').addEventListener('click', loadComPorts);

  // Переподключение весов
  document.getElementById('reconnectScale').addEventListener('click', reconnectScale);

  // Тест камеры
  document.getElementById('testCamera').addEventListener('click', testCamera);

  // Тест соединения
  document.getElementById('testConnection').addEventListener('click', testConnection);

  // Копирование API ключа
  document.getElementById('copyApiKey').addEventListener('click', copyApiKey);

  // Показать/скрыть RTSP URL при изменении типа камеры
  document.getElementById('cameraType').addEventListener('change', toggleRtspUrl);
}

// Переключение вкладок
function switchTab(tabName) {
  // Убираем активный класс со всех вкладок
  document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
  document.querySelectorAll('.tab-panel').forEach(panel => panel.classList.remove('active'));

  // Добавляем активный класс к выбранной вкладке
  document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
  document.getElementById(`${tabName}-tab`).classList.add('active');
}

// Показать/скрыть RTSP URL и USB камеру
function toggleRtspUrl() {
  const cameraType = document.getElementById('cameraType').value;
  const rtspGroup = document.getElementById('rtspUrlGroup');
  const usbGroup = document.getElementById('usbCameraGroup');
  
  if (cameraType === 'rtsp') {
    rtspGroup.style.display = 'block';
    usbGroup.style.display = 'none';
  } else {
    rtspGroup.style.display = 'none';
    usbGroup.style.display = 'block';
  }
}

// Сохранение конфигурации
async function saveConfig() {
  try {
    const newConfig = {
      comPort: document.getElementById('comPort').value,
      baudRate: parseInt(document.getElementById('baudRate').value),
      dataBits: parseInt(document.getElementById('dataBits').value),
      parity: document.getElementById('parity').value,
      stopBits: parseInt(document.getElementById('stopBits').value),
      
      cameraType: document.getElementById('cameraType').value,
      cameraDevices: getSelectedCameras(),
      rtspUrls: getRtspCameras(),
      photosRetentionDays: parseInt(document.getElementById('photosRetentionDays').value),
      
      backendUrl: document.getElementById('backendUrl').value,
      apiKey: document.getElementById('apiKey').value,
      backendSync: document.getElementById('backendSync').checked,
      
      autoStart: document.getElementById('autoStart').checked,
      language: document.getElementById('language').value
    };

    const result = await window.electronAPI.saveConfig(newConfig);
    
    if (result.success) {
      showNotification('✓ Настройки успешно сохранены!', 'success');
      config = { ...config, ...newConfig };
    } else {
      showNotification('Ошибка сохранения: ' + result.error, 'error');
    }
  } catch (error) {
    showNotification('Ошибка: ' + error.message, 'error');
  }
}

// Переподключение весов
async function reconnectScale() {
  try {
    await window.electronAPI.reconnectScale();
    showNotification('Переподключение к весам инициировано', 'success');
  } catch (error) {
    showNotification('Ошибка переподключения: ' + error.message, 'error');
  }
}

// Тест камеры
async function testCamera() {
  const resultDiv = document.getElementById('cameraTestResult');
  resultDiv.textContent = 'Выполняется тестовый снимок...';
  resultDiv.className = 'test-result';
  resultDiv.style.display = 'block';

  try {
    const result = await window.electronAPI.testCamera();
    
    if (result.success) {
      resultDiv.textContent = `✓ Снимок успешно сохранён: ${result.photoPath}`;
      resultDiv.className = 'test-result success';
    } else {
      resultDiv.textContent = `✗ Ошибка: ${result.error}`;
      resultDiv.className = 'test-result error';
    }
  } catch (error) {
    resultDiv.textContent = `✗ Ошибка: ${error.message}`;
    resultDiv.className = 'test-result error';
  }
}

// Тест соединения с backend
async function testConnection() {
  const resultDiv = document.getElementById('connectionTestResult');
  const url = document.getElementById('backendUrl').value;
  const apiKey = document.getElementById('apiKey').value;

  resultDiv.textContent = 'Проверка соединения...';
  resultDiv.className = 'test-result';
  resultDiv.style.display = 'block';

  try {
    const result = await window.electronAPI.testBackend({ url, apiKey });
    
    if (result.success) {
      resultDiv.textContent = `✓ Соединение успешно! Backend доступен.`;
      resultDiv.className = 'test-result success';
    } else {
      resultDiv.textContent = `✗ Ошибка соединения: ${result.error}`;
      resultDiv.className = 'test-result error';
    }
  } catch (error) {
    resultDiv.textContent = `✗ Ошибка: ${error.message}`;
    resultDiv.className = 'test-result error';
  }
}

// Копирование API ключа
function copyApiKey() {
  const apiKeyInput = document.getElementById('apiKey');
  apiKeyInput.select();
  document.execCommand('copy');
  showNotification('API ключ скопирован в буфер обмена', 'success');
}

// Обновление отображения веса
async function updateWeight() {
  try {
    const weightData = await window.electronAPI.getWeight();
    
    // Обновляем вес
    document.getElementById('currentWeight').textContent = `${weightData.weight} ${weightData.unit}`;
    
    // Обновляем статус
    const statusEl = document.getElementById('scaleStatus');
    if (weightData.connected) {
      statusEl.textContent = 'Подключено';
      statusEl.className = 'status-value connected';
    } else {
      statusEl.textContent = 'Отключено';
      statusEl.className = 'status-value disconnected';
    }
  } catch (error) {
    console.error('Ошибка обновления веса:', error);
  }
}

// Запуск периодического обновления веса
function startWeightUpdates() {
  updateWeight(); // Первое обновление сразу
  
  // Обновление каждую секунду
  weightUpdateInterval = setInterval(updateWeight, 1000);
}

// Показ уведомления
function showNotification(message, type = 'success') {
  const notification = document.getElementById('notification');
  notification.textContent = message;
  notification.className = `notification ${type} show`;
  
  // Скрываем через 5 секунд
  setTimeout(() => {
    notification.classList.remove('show');
  }, 5000);
}

// Обработка уведомлений от главного процесса
ipcRenderer.on('notification', (event, message) => {
  showNotification(message, 'success');
});

// Очистка при закрытии
window.addEventListener('beforeunload', () => {
  if (weightUpdateInterval) {
    clearInterval(weightUpdateInterval);
  }
});
