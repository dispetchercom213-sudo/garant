import { useState, useEffect } from 'react';
import { Container, Title, Card, Button, Stack, Select, Text, Box, Group, Badge } from '@mantine/core';
import { IconScale, IconCheck, IconArrowRight, IconArrowLeft } from '@tabler/icons-react';
import { invoicesApi, scaleApi, warehousesApi, vehiclesApi, counterpartiesApi, companiesApi, materialsApi, driversApi, driverWeighingHistoryApi } from '../services/api';
import { notifications } from '@mantine/notifications';
import { useAuthStore } from '../stores/authStore';
import styles from '../styles/MyInvoicesDriverPage.module.css';

interface WizardData {
  vehicleId?: string;
  supplierId?: string;
  companyId?: string;
  materialId?: string;
  warehouseId?: string;
  grossWeight?: number;
  tareWeight?: number;
  netWeight?: number;
  invoiceId?: number;
  invoiceNumber?: string;
}

type Step = 'vehicle' | 'supplier' | 'company' | 'material' | 'warehouse' | 'brutto' | 'unload' | 'tara' | 'complete';

export default function DriverWeighingWizard() {
  const { user } = useAuthStore();
  const [currentStep, setCurrentStep] = useState<Step>('vehicle');
  const [wizardData, setWizardData] = useState<WizardData>({});
  const [loading, setLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);
  const [dataLoaded, setDataLoaded] = useState(false); // Флаг для предотвращения повторной загрузки
  const [driverInfo, setDriverInfo] = useState<any>(null); // Информация о водителе
  const [liveWeight, setLiveWeight] = useState<number | null>(null);
  const [scaleConnected, setScaleConnected] = useState(false);

  // Справочники
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [companies, setCompanies] = useState<any[]>([]);
  const [materials, setMaterials] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);

  // Загрузка справочников
  useEffect(() => {
    if (!dataLoaded) {
      loadReferenceData();
    }
  }, [dataLoaded]);

  // Получение текущего веса для шагов brutto и tara
  useEffect(() => {
    if ((currentStep === 'brutto' || currentStep === 'tara') && wizardData.warehouseId) {
      const warehouse = warehouses.find((w) => w.id.toString() === wizardData.warehouseId);
      if (!warehouse || !warehouse.scaleIpAddress) return;

      const fetchWeight = async () => {
        try {
          // Используем бэкенд как прокси для избежания CORS ошибок
          const response = await scaleApi.getCurrentWeight(warehouse.id);
          const data = response.data || response;
          // ScaleBridge API может возвращать weight, unit, stable или weight, connected
          const weight = data.weight ?? 0;
          const connected = data.connected !== undefined ? !!data.connected : (data.stable !== undefined ? true : true);
          setLiveWeight(weight);
          setScaleConnected(connected);
        } catch (err) {
          console.error('Ошибка получения веса:', err);
          setScaleConnected(false);
        }
      };

      // Запускаем сразу
      fetchWeight();
      
      // И повторяем каждые 2 секунды
      const interval = setInterval(fetchWeight, 2000);
      
      return () => clearInterval(interval);
    } else {
      setLiveWeight(null);
      setScaleConnected(false);
    }
  }, [currentStep, wizardData.warehouseId, warehouses]);

  const loadReferenceData = async () => {
    try {
      setDataLoading(true);
      
      // Водитель загружает свой транспорт и все справочники (только на просмотр)
      // Загружаем информацию о водителе отдельно, чтобы не ломать остальные загрузки при ошибке
      const [vehiclesRes, suppliersRes, companiesRes, materialsRes, warehousesRes] = await Promise.all([
        vehiclesApi.getMy(), // Только свой транспорт
        counterpartiesApi.getAll(),
        companiesApi.getAll(),
        materialsApi.getAll(),
        warehousesApi.getAll(),
      ]);
      
      // Загружаем информацию о водителе отдельно с обработкой ошибок
      let driverRes = null;
      try {
        driverRes = await driversApi.getMe();
      } catch (driverError: any) {
        console.warn('⚠️ Не удалось загрузить информацию о водителе:', driverError);
        if (driverError.response?.status === 404) {
          notifications.show({
            title: 'Предупреждение',
            message: 'Профиль водителя не найден. Обратитесь к администратору для создания профиля.',
            color: 'yellow',
          });
        }
      }

      // Извлекаем массивы из ответов API - проверяем разные возможные структуры
      const vehiclesData = Array.isArray(vehiclesRes.data) 
        ? vehiclesRes.data 
        : Array.isArray(vehiclesRes.data?.data) 
          ? vehiclesRes.data.data 
          : Array.isArray(vehiclesRes.data?.items)
            ? vehiclesRes.data.items
            : [];
      
      console.log('🚗 Транспорт водителя:', vehiclesData);
      console.log('🚗 Детали транспорта:', vehiclesData.map((v: any) => ({ 
        id: v?.id, 
        licensePlate: v?.licensePlate,
        hasId: !!v?.id,
        hasPlate: !!v?.licensePlate,
        rawObject: v
      })));
            
      const suppliersData = Array.isArray(suppliersRes.data) 
        ? suppliersRes.data 
        : Array.isArray(suppliersRes.data?.data) 
          ? suppliersRes.data.data 
          : Array.isArray(suppliersRes.data?.items)
            ? suppliersRes.data.items
            : [];
            
      const companiesData = Array.isArray(companiesRes.data) 
        ? companiesRes.data 
        : Array.isArray(companiesRes.data?.data) 
          ? companiesRes.data.data 
          : Array.isArray(companiesRes.data?.items)
            ? companiesRes.data.items
            : [];
            
      const materialsData = Array.isArray(materialsRes.data) 
        ? materialsRes.data 
        : Array.isArray(materialsRes.data?.data) 
          ? materialsRes.data.data 
          : Array.isArray(materialsRes.data?.items)
            ? materialsRes.data.items
            : [];
            
      const warehousesData = Array.isArray(warehousesRes.data) 
        ? warehousesRes.data 
        : Array.isArray(warehousesRes.data?.data) 
          ? warehousesRes.data.data 
          : Array.isArray(warehousesRes.data?.items)
            ? warehousesRes.data.items
            : [];

      // Проверяем, что данные загрузились
      if (vehiclesData.length === 0 && suppliersData.length === 0 && companiesData.length === 0) {
        console.warn('⚠️ Нет данных для отображения');
        notifications.show({
          title: 'Предупреждение',
          message: 'Не удалось загрузить справочники. Проверьте подключение к серверу.',
          color: 'yellow',
        });
      }

      setVehicles(vehiclesData);
      
      // Фильтруем поставщиков (LEGAL контрагенты)
      const filteredSuppliers = suppliersData.filter((c: any) => c.kind === 'LEGAL');
      
      setSuppliers(filteredSuppliers);
      setCompanies(companiesData);
      setMaterials(materialsData);
      
      // Фильтруем склады с весами
      const filteredWarehouses = warehousesData.filter((w: any) => w.hasScales);
      
      setWarehouses(filteredWarehouses);
      
      // Сохраняем информацию о водителе (может быть null если профиль не создан)
      if (driverRes?.data) {
        setDriverInfo(driverRes.data);
      }
      
      setDataLoaded(true); // Помечаем что данные загружены
    } catch (error: any) {
      console.error('❌ Ошибка загрузки справочников:', error);
      notifications.show({
        title: 'Ошибка',
        message: 'Не удалось загрузить справочники',
        color: 'red',
      });
      setDataLoaded(true); // Даже при ошибке не повторяем загрузку
    } finally {
      setDataLoading(false);
    }
  };

  const handleNext = () => {
    const steps: Step[] = ['vehicle', 'supplier', 'company', 'material', 'warehouse', 'brutto', 'unload', 'tara', 'complete'];
    const currentIndex = steps.indexOf(currentStep);
    if (currentIndex < steps.length - 1) {
      setCurrentStep(steps[currentIndex + 1]);
    }
  };

  const handleBack = () => {
    const steps: Step[] = ['vehicle', 'supplier', 'company', 'material', 'warehouse', 'brutto', 'unload', 'tara', 'complete'];
    const currentIndex = steps.indexOf(currentStep);
    if (currentIndex > 0) {
      setCurrentStep(steps[currentIndex - 1]);
    }
  };

  const handleWeighBrutto = async () => {
    const warehouse = warehouses.find((w) => w.id.toString() === wizardData.warehouseId);
    if (!warehouse) return;

    try {
      setLoading(true);
      const response = await scaleApi.weigh(warehouse.id, { action: 'brutto' });

      if (response.data && response.data.weight !== undefined) {
        setWizardData({
          ...wizardData,
          grossWeight: response.data.weight,
        });

        notifications.show({
          title: '✅ Вес зафиксирован',
          message: `БРУТТО: ${response.data.weight} кг`,
          color: 'green',
        });

        handleNext(); // Переходим к следующему шагу
      }
    } catch (error: any) {
      notifications.show({
        title: 'Ошибка',
        message: error.response?.data?.message || 'Не удалось зафиксировать вес',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleWeighTara = async () => {
    const warehouse = warehouses.find((w) => w.id.toString() === wizardData.warehouseId);
    if (!warehouse) return;

    try {
      setLoading(true);
      const response = await scaleApi.weigh(warehouse.id, { action: 'tara' });

      if (response.data && response.data.weight !== undefined) {
        const tareWeight = response.data.weight;
        const netWeight = (wizardData.grossWeight || 0) - tareWeight;

        setWizardData({
          ...wizardData,
          tareWeight,
          netWeight,
        });

        notifications.show({
          title: '✅ Вес зафиксирован',
          message: `ТАРА: ${tareWeight} кг, НЕТТО: ${netWeight.toFixed(1)} кг`,
          color: 'green',
        });

        handleNext(); // Переходим к сохранению
      }
    } catch (error: any) {
      notifications.show({
        title: 'Ошибка',
        message: error.response?.data?.message || 'Не удалось зафиксировать вес',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!wizardData.warehouseId || !wizardData.grossWeight || !wizardData.tareWeight) {
      notifications.show({
        title: 'Ошибка',
        message: 'Не все обязательные поля заполнены',
        color: 'red',
      });
      return;
    }

    try {
      setLoading(true);

      const invoiceData: any = {
        type: 'INCOME',
        warehouseId: parseInt(wizardData.warehouseId),
        grossWeightKg: wizardData.grossWeight,
        tareWeightKg: wizardData.tareWeight,
        netWeightKg: wizardData.netWeight,
        grossWeightAt: new Date().toISOString(),
        tareWeightAt: new Date().toISOString(),
      };
      
      // Добавляем текущего водителя
      if (driverInfo?.id) {
        invoiceData.driverId = driverInfo.id;
      } else if (user?.id) {
        // Fallback на user.id если driverInfo не загружен
        invoiceData.driverId = user.id;
      }
      
      // Опциональные поля
      if (wizardData.vehicleId) {
        invoiceData.vehicleId = parseInt(wizardData.vehicleId);
      }
      if (wizardData.supplierId) {
        invoiceData.supplierId = parseInt(wizardData.supplierId);
        invoiceData.customerId = parseInt(wizardData.supplierId);
      }
      if (wizardData.companyId) {
        invoiceData.companyId = parseInt(wizardData.companyId);
      }
      if (wizardData.materialId) {
        invoiceData.materialId = parseInt(wizardData.materialId);
      }

      console.log('💾 Отправляем накладную:', invoiceData);
      const response = await invoicesApi.create(invoiceData);
      console.log('✅ Ответ от сервера:', response.data);

      // Сохраняем историю взвешивания
      try {
        const weighingHistoryData = {
          warehouseId: parseInt(wizardData.warehouseId),
          vehicleId: wizardData.vehicleId ? parseInt(wizardData.vehicleId) : undefined,
          supplierId: wizardData.supplierId ? parseInt(wizardData.supplierId) : undefined,
          companyId: wizardData.companyId ? parseInt(wizardData.companyId) : undefined,
          materialId: wizardData.materialId ? parseInt(wizardData.materialId) : undefined,
          grossWeightKg: wizardData.grossWeight,
          tareWeightKg: wizardData.tareWeight,
          netWeightKg: wizardData.netWeight,
          grossWeightAt: new Date().toISOString(),
          tareWeightAt: new Date().toISOString(),
          invoiceId: response.data.id,
        };

        console.log('📝 Сохраняем историю взвешивания:', weighingHistoryData);
        await driverWeighingHistoryApi.create(weighingHistoryData);
        console.log('✅ История взвешивания сохранена!');
      } catch (historyError) {
        console.error('❌ Ошибка сохранения истории взвешивания:', historyError);
        // Не показываем ошибку пользователю, так как накладная уже сохранена
      }

      setWizardData({
        ...wizardData,
        invoiceId: response.data.id,
        invoiceNumber: response.data.invoiceNumber,
      });

      notifications.show({
        title: '✅ Накладная сохранена!',
        message: `Номер накладной: ${response.data.invoiceNumber}`,
        color: 'green',
      });

      // Обновляем состояние для показа номера накладной в финальном экране
      setCurrentStep('complete');
    } catch (error: any) {
      console.error('❌ Ошибка сохранения накладной:', error);
      console.error('📋 Детали ошибки:', error.response?.data);
      
      notifications.show({
        title: 'Ошибка',
        message: error.response?.data?.message || 'Не удалось сохранить накладную',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleStartNew = () => {
    setWizardData({
      vehicleId: '',
      supplierId: '',
      companyId: '',
      materialId: '',
      warehouseId: '',
    });
    setCurrentStep('vehicle');
  };

  const renderStep = () => {
    switch (currentStep) {
      case 'vehicle':
        return (
          <Stack gap="md">
            <Text size="xl" fw={700} ta="center">🚚 Ваш транспорт</Text>
            {!vehicles || vehicles.length === 0 ? (
              <Text size="md" c="red" ta="center">
                У вас нет привязанного транспорта
              </Text>
            ) : (
              <Select
                size="xl"
                data={(vehicles || [])
                  .filter((v) => v && v.id && v.plate)
                  .map((v) => ({ 
                    value: v.id.toString(), 
                    label: v.plate 
                  }))}
                value={wizardData.vehicleId ?? null}
                onChange={(value) => setWizardData({ ...wizardData, vehicleId: value || undefined })}
                placeholder="Выберите автомобиль"
                searchable
                clearable
                nothingFoundMessage="Транспорт не найден"
              />
            )}
            <Button
              size="xl"
              fullWidth
              rightSection={<IconArrowRight size={24} />}
              onClick={handleNext}
              disabled={!wizardData.vehicleId}
            >
              Далее
            </Button>
          </Stack>
        );

      case 'supplier':
        return (
          <Stack gap="md">
            <Text size="xl" fw={700} ta="center">📦 От кого?</Text>
            <Text size="sm" c="dimmed" ta="center">Выберите поставщика</Text>
            <Select
              size="xl"
              data={(suppliers || [])
                .filter((s) => s && s.id && s.name)
                .map((s) => ({ 
                  value: s.id.toString(), 
                  label: s.name 
                }))}
              value={wizardData.supplierId ?? null}
              onChange={(value) => setWizardData({ ...wizardData, supplierId: value || undefined })}
              placeholder="Выберите поставщика"
              searchable
              clearable
            />
            <Group grow>
              <Button size="lg" variant="outline" leftSection={<IconArrowLeft />} onClick={handleBack}>
                Назад
              </Button>
              <Button size="lg" rightSection={<IconArrowRight />} onClick={handleNext} disabled={!wizardData.supplierId}>
                Далее
              </Button>
            </Group>
          </Stack>
        );

      case 'company':
        return (
          <Stack gap="md">
            <Text size="xl" fw={700} ta="center">🏢 Для кого?</Text>
            <Text size="sm" c="dimmed" ta="center">Выберите компанию</Text>
            <Select
              size="xl"
              data={(companies || [])
                .filter((c) => c && c.id && c.name)
                .map((c) => ({ 
                  value: c.id.toString(), 
                  label: c.name 
                }))}
              value={wizardData.companyId ?? null}
              onChange={(value) => setWizardData({ ...wizardData, companyId: value || undefined })}
              placeholder="Выберите компанию"
              searchable
              clearable
            />
            <Group grow>
              <Button size="lg" variant="outline" leftSection={<IconArrowLeft />} onClick={handleBack}>
                Назад
              </Button>
              <Button size="lg" rightSection={<IconArrowRight />} onClick={handleNext} disabled={!wizardData.companyId}>
                Далее
              </Button>
            </Group>
          </Stack>
        );

      case 'material':
        return (
          <Stack gap="md">
            <Text size="xl" fw={700} ta="center">📦 Наименование груза</Text>
            <Select
              size="xl"
              data={(materials || [])
                .filter((m) => m && m.id && m.name)
                .map((m) => ({ 
                  value: m.id.toString(), 
                  label: m.name 
                }))}
              value={wizardData.materialId ?? null}
              onChange={(value) => setWizardData({ ...wizardData, materialId: value || undefined })}
              placeholder="Выберите материал"
              searchable
              clearable
            />
            <Group grow>
              <Button size="lg" variant="outline" leftSection={<IconArrowLeft />} onClick={handleBack}>
                Назад
              </Button>
              <Button size="lg" rightSection={<IconArrowRight />} onClick={handleNext} disabled={!wizardData.materialId}>
                Далее
              </Button>
            </Group>
          </Stack>
        );

      case 'warehouse':
        return (
          <Stack gap="md">
            <Text size="xl" fw={700} ta="center">🏭 Склад</Text>
            <Select
              size="xl"
              data={(warehouses || [])
                .filter((w) => w && w.id && w.name)
                .map((w) => ({ 
                  value: w.id.toString(), 
                  label: w.name 
                }))}
              value={wizardData.warehouseId ?? null}
              onChange={(value) => setWizardData({ ...wizardData, warehouseId: value || undefined })}
              placeholder="Выберите склад"
              searchable
              clearable
            />
            <Group grow>
              <Button size="lg" variant="outline" leftSection={<IconArrowLeft />} onClick={handleBack}>
                Назад
              </Button>
              <Button size="lg" rightSection={<IconArrowRight />} onClick={handleNext} disabled={!wizardData.warehouseId}>
                Далее
              </Button>
            </Group>
          </Stack>
        );

      case 'brutto':
        return (
          <Stack gap="md">
            <Text size="xl" fw={700} ta="center">⚖️ Взвешивание БРУТТО</Text>
            <Text size="md" ta="center" c="dimmed">
              Заезжайте на весы с грузом
            </Text>
            
            {/* Текущий вес */}
            {!wizardData.grossWeight && (
              <Box p="md" style={{ backgroundColor: scaleConnected ? '#e7f5ff' : '#fff3cd', borderRadius: 8 }}>
                <Text size="sm" c="dimmed" ta="center">
                  {scaleConnected ? '⚖️ Текущий вес:' : '⚠️ Весы не подключены'}
                </Text>
                <Text size="3xl" fw={900} ta="center" c={scaleConnected ? 'blue' : 'orange'}>
                  {liveWeight !== null ? `${liveWeight.toFixed(1)} кг` : '-- кг'}
                </Text>
              </Box>
            )}

            {wizardData.grossWeight && (
              <Box p="md" style={{ backgroundColor: '#e7f5ff', borderRadius: 8 }}>
                <Text size="sm" c="dimmed" ta="center">Вес зафиксирован:</Text>
                <Text size="3xl" fw={900} ta="center" c="blue">
                  {wizardData.grossWeight} кг
                </Text>
              </Box>
            )}
            <Button
              size="xl"
              fullWidth
              color="blue"
              leftSection={<IconScale size={24} />}
              onClick={handleWeighBrutto}
              loading={loading}
              disabled={!!wizardData.grossWeight}
            >
              {wizardData.grossWeight ? '✓ Вес зафиксирован' : 'ЗАФИКСИРОВАТЬ БРУТТО'}
            </Button>
          </Stack>
        );

      case 'unload':
        return (
          <Stack gap="md">
            <Text size="xl" fw={700} ta="center">🚛 Разгрузка</Text>
            <Box p="xl" style={{ backgroundColor: '#fff3bf', borderRadius: 8 }}>
              <Text size="lg" ta="center" fw={600} mb="md">
                ⚠️ Езжайте выгружайтесь!
              </Text>
              <Text size="md" ta="center" c="dimmed">
                После возвращения на весы пустым нажмите "Далее"
              </Text>
            </Box>
            <Box p="md" style={{ backgroundColor: '#e7f5ff', borderRadius: 8 }}>
              <Text size="sm" c="dimmed" ta="center">БРУТТО:</Text>
              <Text size="2xl" fw={700} ta="center" c="blue">
                {wizardData.grossWeight} кг
              </Text>
            </Box>
            <Button
              size="xl"
              fullWidth
              color="orange"
              rightSection={<IconArrowRight size={24} />}
              onClick={handleNext}
            >
              Далее (вернулся пустым)
            </Button>
          </Stack>
        );

      case 'tara':
        return (
          <Stack gap="md">
            <Text size="xl" fw={700} ta="center">⚖️ Взвешивание ТАРА</Text>
            <Text size="md" ta="center" c="dimmed">
              Заезжайте на весы пустым
            </Text>
            
            {/* Текущий вес */}
            {!wizardData.tareWeight && (
              <Box p="md" style={{ backgroundColor: scaleConnected ? '#e7f5ff' : '#fff3cd', borderRadius: 8 }}>
                <Text size="sm" c="dimmed" ta="center">
                  {scaleConnected ? '⚖️ Текущий вес:' : '⚠️ Весы не подключены'}
                </Text>
                <Text size="3xl" fw={900} ta="center" c={scaleConnected ? 'blue' : 'orange'}>
                  {liveWeight !== null ? `${liveWeight.toFixed(1)} кг` : '-- кг'}
                </Text>
              </Box>
            )}

            {wizardData.tareWeight && (
              <Box p="md" style={{ backgroundColor: '#fff3bf', borderRadius: 8 }}>
                <Group grow>
                  <Box>
                    <Text size="xs" c="dimmed" ta="center">БРУТТО:</Text>
                    <Text size="lg" fw={700} ta="center">{wizardData.grossWeight} кг</Text>
                  </Box>
                  <Box>
                    <Text size="xs" c="dimmed" ta="center">ТАРА:</Text>
                    <Text size="lg" fw={700} ta="center" c="orange">{wizardData.tareWeight} кг</Text>
                  </Box>
                  <Box>
                    <Text size="xs" c="dimmed" ta="center">НЕТТО:</Text>
                    <Text size="lg" fw={700} ta="center" c="green">{wizardData.netWeight?.toFixed(1)} кг</Text>
                  </Box>
                </Group>
              </Box>
            )}
            <Button
              size="xl"
              fullWidth
              color="orange"
              leftSection={<IconScale size={24} />}
              onClick={handleWeighTara}
              loading={loading}
              disabled={!!wizardData.tareWeight}
            >
              {wizardData.tareWeight ? '✓ Вес зафиксирован' : 'ЗАФИКСИРОВАТЬ ТАРА'}
            </Button>
            {wizardData.tareWeight && (
              <Button
                size="xl"
                fullWidth
                color="green"
                leftSection={<IconCheck size={24} />}
                onClick={handleNext}
                loading={loading}
              >
                СОХРАНИТЬ
              </Button>
            )}
          </Stack>
        );

      case 'complete':
        return (
          <Stack gap="md">
            {wizardData.invoiceNumber ? (
              // После сохранения - показываем номер накладной
              <>
                <Box ta="center">
                  <IconCheck size={80} color="green" />
                </Box>
                <Text size="xl" fw={700} ta="center" c="green">
                  ✅ Накладная сохранена!
                </Text>
                <Card shadow="sm" padding="lg" radius="md" style={{ backgroundColor: '#f0f9ff' }}>
                  <Stack gap="xs">
                    <Text size="sm" c="dimmed" ta="center">Номер накладной:</Text>
                    <Text size="2xl" fw={900} ta="center" c="blue">
                      {wizardData.invoiceNumber}
                    </Text>
                    <Box mt="md">
                      <Group grow>
                        <Box>
                          <Text size="xs" c="dimmed">БРУТТО:</Text>
                          <Text size="lg" fw={700}>{wizardData.grossWeight} кг</Text>
                        </Box>
                        <Box>
                          <Text size="xs" c="dimmed">ТАРА:</Text>
                          <Text size="lg" fw={700}>{wizardData.tareWeight} кг</Text>
                        </Box>
                        <Box>
                          <Text size="xs" c="dimmed">НЕТТО:</Text>
                          <Text size="lg" fw={700} c="green">{wizardData.netWeight?.toFixed(1)} кг</Text>
                        </Box>
                      </Group>
                    </Box>
                  </Stack>
                </Card>
                <Box p="md" style={{ backgroundColor: '#d0f4de', borderRadius: 8 }}>
                  <Text size="lg" ta="center" fw={600}>
                    🎉 Удачи на дороге!
                  </Text>
                </Box>
                <Button
                  size="xl"
                  fullWidth
                  color="blue"
                  onClick={handleStartNew}
                >
                  Начать новое взвешивание
                </Button>
              </>
            ) : (
              // До сохранения - показываем кнопку сохранения
              <>
                <Box ta="center">
                  <IconCheck size={80} color="blue" />
                </Box>
                <Text size="xl" fw={700} ta="center" c="blue">
                  Готово к сохранению
                </Text>
                <Card shadow="sm" padding="lg" radius="md" style={{ backgroundColor: '#f0f9ff' }}>
                  <Stack gap="xs">
                    <Text size="sm" c="dimmed" ta="center">Результаты взвешивания:</Text>
                    <Box mt="md">
                      <Group grow>
                        <Box>
                          <Text size="xs" c="dimmed">БРУТТО:</Text>
                          <Text size="lg" fw={700}>{wizardData.grossWeight} кг</Text>
                        </Box>
                        <Box>
                          <Text size="xs" c="dimmed">ТАРА:</Text>
                          <Text size="lg" fw={700}>{wizardData.tareWeight} кг</Text>
                        </Box>
                        <Box>
                          <Text size="xs" c="dimmed">НЕТТО:</Text>
                          <Text size="lg" fw={700} c="green">{wizardData.netWeight?.toFixed(1)} кг</Text>
                        </Box>
                      </Group>
                    </Box>
                  </Stack>
                </Card>
                <Button
                  size="xl"
                  fullWidth
                  color="green"
                  leftSection={<IconCheck size={24} />}
                  onClick={handleSave}
                  loading={loading}
                >
                  Сохранить в базу
                </Button>
                <Button
                  size="xl"
                  fullWidth
                  color="blue"
                  onClick={handleStartNew}
                >
                  Начать новое взвешивание
                </Button>
              </>
            )}
          </Stack>
        );

      default:
        return null;
    }
  };

  const getStepNumber = () => {
    const steps: Step[] = ['vehicle', 'supplier', 'company', 'material', 'warehouse', 'brutto', 'unload', 'tara', 'complete'];
    return steps.indexOf(currentStep) + 1;
  };

  if (dataLoading) {
    return (
      <Container size="sm" className={styles.container}>
        <Title order={2} className={styles.title} mb="md">⚖️ Взвешивание</Title>
        <Card shadow="md" padding="xl" radius="md">
          <Text size="lg" ta="center">Загрузка данных...</Text>
        </Card>
      </Container>
    );
  }


  return (
    <Container size="sm" className={styles.container}>
      <Title order={2} className={styles.title} mb="md">⚖️ Взвешивание</Title>
      
      {currentStep !== 'complete' && (
        <Group justify="center" mb="lg">
          <Badge size="xl" color="blue" variant="filled">
            Шаг {getStepNumber()} из 9
          </Badge>
        </Group>
      )}

      <Card shadow="md" padding="xl" radius="md">
        {renderStep()}
      </Card>
    </Container>
  );
}

