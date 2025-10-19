import { useState } from 'react';
import { Modal, TextInput, Button, Group, Stack, Text, Alert, Select, ActionIcon, Tooltip, Checkbox } from '@mantine/core';
import { IconScale, IconSearch, IconPlugConnected, IconCopy, IconCheck, IconX, IconAlertCircle, IconCamera } from '@tabler/icons-react';
import { api } from '../services/api';
import { useNotifications } from '../hooks/useNotifications';

interface ScaleBridgeDevice {
  ip: string;
  url: string;
  weight: number;
}

interface ScaleSettingsModalProps {
  opened: boolean;
  onClose: () => void;
  warehouseId: number | null;
  onSuccess?: () => void;
}

export function ScaleSettingsModal({ opened, onClose, warehouseId, onSuccess }: ScaleSettingsModalProps) {
  const [scaleIp, setScaleIp] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [comPort, setComPort] = useState('COM3');
  const [hasCamera, setHasCamera] = useState(false);
  const [loading, setLoading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [devices, setDevices] = useState<ScaleBridgeDevice[]>([]);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string; weight?: number } | null>(null);
  const [copied, setCopied] = useState(false);
  
  const { success, error } = useNotifications();

  // Поиск ScaleBridge устройств в сети
  const handleScan = async () => {
    setScanning(true);
    setDevices([]);
    try {
      const subnet = scaleIp.split('.').slice(0, 3).join('.') || '192.168.1';
      const response = await api.get<ScaleBridgeDevice[]>(`/scale/discover?subnet=${subnet}`);
      setDevices(response.data);
      
      if (response.data.length === 0) {
        error('ScaleBridge устройства не найдены в сети');
      } else {
        success(`Найдено устройств: ${response.data.length}`);
      }
    } catch (err) {
      error('Ошибка при поиске устройств');
    } finally {
      setScanning(false);
    }
  };

  // Выбор устройства из списка найденных
  const handleSelectDevice = (device: ScaleBridgeDevice) => {
    setScaleIp(device.ip);
    setDevices([]);
    success(`Выбрано устройство: ${device.ip}`);
  };

  // Тест соединения с ScaleBridge
  const handleTestConnection = async () => {
    if (!scaleIp || !apiKey) {
      error('Введите IP адрес и получите API ключ');
      return;
    }

    if (!warehouseId) {
      error('Не выбран склад');
      return;
    }

    setLoading(true);
    setTestResult(null);
    try {
      const response = await api.post<{ success: boolean; message: string; weight?: number }>(
        `/scale/${warehouseId}/test-connection`,
        { scaleIp, apiKey }
      );
      
      setTestResult(response.data);
      success('Соединение успешно установлено!');
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err.response?.data?.message || 'Ошибка подключения к ScaleBridge',
      });
      error('Не удалось подключиться к ScaleBridge');
    } finally {
      setLoading(false);
    }
  };

  // Настроить весы для склада
  const handleConfigure = async () => {
    if (!scaleIp || !apiKey) {
      error('Введите IP адрес и API ключ перед настройкой');
      return;
    }

    if (!warehouseId) {
      error('Не выбран склад');
      return;
    }

    setLoading(true);
    try {
      console.log('🔧 Сохраняем настройки весов для склада:', warehouseId);
      console.log('📊 Данные для сохранения:', {
        hasScales: true,
        scaleIpAddress: scaleIp,
        scaleApiKey: apiKey,
        scaleComPort: comPort,
        scaleStatus: 'connected',
        hasCamera: hasCamera,
      });
      
      // Обновляем warehouse с настройками весов
      const response = await api.patch(`/warehouses/${warehouseId}`, {
        hasScales: true,
        scaleIpAddress: scaleIp,
        scaleApiKey: apiKey,
        scaleComPort: comPort,
        scaleStatus: 'connected',
        hasCamera: hasCamera,
      });
      
      console.log('✅ Ответ от сервера:', response.data);
      
      if (hasCamera) {
        success('Весы успешно настроены! 📸 Фото будут сохраняться');
      } else {
        success('Весы успешно настроены! ⚠️ Работа без камеры');
      }
      
      onSuccess?.();
      onClose();
    } catch (err: any) {
      console.error('💥 Ошибка при сохранении настроек весов:', err);
      console.error('📋 Детали ошибки:', err.response?.data);
      error(err.response?.data?.message || 'Ошибка при настройке весов');
    } finally {
      setLoading(false);
    }
  };

  // Копировать API ключ
  const handleCopyApiKey = () => {
    navigator.clipboard.writeText(apiKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    success('API ключ скопирован');
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={
        <Group gap="sm">
          <IconScale size={24} />
          <Text fw={600}>Настройка весов ScaleBridge</Text>
        </Group>
      }
      size="lg"
    >
      <Stack gap="md">
        {/* Инструкция */}
        <Alert color="blue" icon={<IconAlertCircle size={20} />}>
          <Text size="sm">
            1. Откройте ScaleBridge на компьютере с весами
            <br />
            2. Скопируйте IP адрес из верхней панели приложения
            <br />
            3. Откройте config.json в папке ScaleBridge и скопируйте API ключ
            <br />
            4. Вставьте IP адрес и API ключ ниже
          </Text>
        </Alert>

        {/* IP адрес */}
        <TextInput
          label="IP адрес ScaleBridge"
          placeholder="192.168.1.100"
          value={scaleIp}
          onChange={(e) => setScaleIp(e.currentTarget.value)}
          rightSection={
            <Tooltip label="Поиск в сети">
              <ActionIcon onClick={handleScan} loading={scanning} variant="subtle">
                <IconSearch size={18} />
              </ActionIcon>
            </Tooltip>
          }
          description="Откройте ScaleBridge и нажмите на IP адрес в верхней панели для копирования"
        />

        {/* Кнопка поиска */}
        <Button
          leftSection={<IconSearch size={18} />}
          onClick={handleScan}
          loading={scanning}
          variant="light"
        >
          Найти ScaleBridge в сети
        </Button>

        {/* Список найденных устройств */}
        {devices.length > 0 && (
          <Stack gap="xs">
            <Text size="sm" fw={500}>Найденные устройства:</Text>
            {devices.map((device) => (
              <Group key={device.ip} justify="space-between" p="sm" style={{ border: '1px solid #dee2e6', borderRadius: '4px' }}>
                <Stack gap={4}>
                  <Text size="sm" fw={500}>🖥️ {device.ip}:5055</Text>
                  <Text size="xs" c="dimmed">📊 Вес: {typeof device.weight === 'number' ? device.weight : 0} кг</Text>
                </Stack>
                <Button size="xs" onClick={() => handleSelectDevice(device)}>
                  Выбрать
                </Button>
              </Group>
            ))}
          </Stack>
        )}

        {/* COM-порт */}
        <Select
          label="COM-порт"
          placeholder="Выберите порт"
          value={comPort}
          onChange={(value) => setComPort(value || 'COM3')}
          data={[
            { value: 'COM1', label: 'COM1' },
            { value: 'COM2', label: 'COM2' },
            { value: 'COM3', label: 'COM3' },
            { value: 'COM4', label: 'COM4' },
            { value: 'COM5', label: 'COM5' },
            { value: 'COM6', label: 'COM6' },
          ]}
          description="COM-порт, к которому подключены весы"
        />

        {/* Камера */}
        <Checkbox
          label={
            <Group gap="xs">
              <IconCamera size={18} />
              <Text size="sm">Камера подключена (делать фото при взвешивании)</Text>
            </Group>
          }
          checked={hasCamera}
          onChange={(event) => setHasCamera(event.currentTarget.checked)}
          description="Если камера НЕ подключена, система будет работать БЕЗ фото"
        />

        {/* API ключ - ручной ввод */}
        <TextInput
          label="API ключ ScaleBridge"
          placeholder="eb3af4b0-8faf-4308-94d7-f0a6abab50ee"
          value={apiKey}
          onChange={(e) => setApiKey(e.currentTarget.value)}
          rightSection={
            apiKey ? (
              <Tooltip label={copied ? 'Скопировано!' : 'Копировать'}>
                <ActionIcon onClick={handleCopyApiKey} variant="subtle" color={copied ? 'green' : 'blue'}>
                  {copied ? <IconCheck size={18} /> : <IconCopy size={18} />}
                </ActionIcon>
              </Tooltip>
            ) : null
          }
          description={
            <>
              Найдите API ключ в файле config.json ScaleBridge
              <br />
              Путь: C:\Program Files (x86)\BetonAPP\ScaleBridge\config.json
            </>
          }
        />

        {scaleIp && apiKey && (
          <Text size="xs" c="dimmed">
            📡 URL: http://{scaleIp}:5055
          </Text>
        )}

        {/* Тест соединения */}
        {apiKey && (
          <Button
            leftSection={<IconPlugConnected size={18} />}
            onClick={handleTestConnection}
            loading={loading}
            variant="light"
          >
            Тест соединения
          </Button>
        )}

        {/* Результат теста */}
        {testResult && (
          <Alert
            color={testResult.success ? 'green' : 'red'}
            icon={testResult.success ? <IconCheck size={20} /> : <IconX size={20} />}
          >
            <Stack gap="xs">
              <Text size="sm">{testResult.message}</Text>
              {testResult.weight !== undefined && typeof testResult.weight === 'number' && (
                <Text size="sm" fw={500}>
                  Текущий вес: {testResult.weight} кг
                </Text>
              )}
            </Stack>
          </Alert>
        )}

        {/* Кнопки действий */}
        <Group justify="flex-end" mt="md">
          <Button variant="light" onClick={onClose}>
            Отмена
          </Button>
          <Button
            onClick={handleConfigure}
            loading={loading}
            disabled={!apiKey || !scaleIp}
          >
            Сохранить настройки
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}

