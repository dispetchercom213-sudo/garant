import React, { useState, useEffect } from 'react';
import { DataTable, type Column } from '../components/ui/data-table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '../components/ui/alert-dialog';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Checkbox } from '../components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { SelectWithQuickAdd } from '../components/SelectWithQuickAdd';
import { invoicesApi, ordersApi, counterpartiesApi, concreteMarksApi, driversApi, vehiclesApi, warehousesApi, companiesApi, materialsApi, scaleApi, api } from '../services/api';
import type { Invoice, Order, Counterparty, ConcreteMark, Driver, Vehicle, Warehouse, Company, Material, User } from '../types';
import { InvoiceType } from '../types';
import { useNotifications } from '../hooks/useNotifications';
import { useApiData } from '../hooks/useApiData';
import { useAuthStore } from '../stores/authStore';
import { openIn2GIS, openInYandex, openInGoogle } from '../utils/mapUtils';

interface InvoicesPageNewProps {
  type?: InvoiceType; // Фильтр по типу накладной (если передан, показываем только этот тип)
  title?: string; // Заголовок страницы
}

export const InvoicesPageNew: React.FC<InvoicesPageNewProps> = ({ type: filterType, title }) => {
  const [modalOpen, setModalOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<InvoiceType | 'ALL'>(filterType || 'ALL');
  const [loadingScale, setLoadingScale] = useState(false);
  const [lastWeighInfo, setLastWeighInfo] = useState<{ type: 'brutto' | 'tara'; weight: number; timestamp: string; photoUrl?: string } | null>(null);
  const [liveWeight, setLiveWeight] = useState<{ weight: number; connected: boolean } | null>(null);
  const [printInvoice, setPrintInvoice] = useState<Invoice | null>(null);

  const { user } = useAuthStore();

  // Функция для определения класса поля в зависимости от заполненности
  const getFieldClass = (value: any, additionalClasses: string = '') => {
    const baseClass = additionalClasses ? `${additionalClasses} ` : '';
    if (value && value !== '' && value !== '0') {
      return `${baseClass}bg-blue-50 border-blue-200`;
    }
    return `${baseClass}bg-white`;
  };

  // Загрузка данных
  const { data: invoices, loading: invoicesLoading, refetch } = useApiData<Invoice>({
    apiCall: () => {
      // Для водителей используем /invoices/my, для остальных - /invoices
      const isDriver = user?.role === 'DRIVER';
      const apiCall = isDriver ? invoicesApi.getMy : invoicesApi.getAll;
      
      const params: any = {};
      if (filterType) {
        params.type = filterType;
      }
      if (searchQuery) {
        params.search = searchQuery;
      }
      
      console.log('🔍 Поиск накладных с параметрами:', params);
      
      return apiCall(params).then(res => res.data);
    },
    dependencies: [filterType, user?.role, searchQuery]
  });

  const { data: orders, refetch: refetchOrders } = useApiData<Order>({
    apiCall: () => ordersApi.getAll(),
    dependencies: []
  });

  const { data: counterparties, refetch: refetchCounterparties } = useApiData<Counterparty>({
    apiCall: () => counterpartiesApi.getAll(),
    dependencies: []
  });

  const { data: concreteMarks, loading: concreteMarksLoading, refetch: refetchConcreteMarks } = useApiData<ConcreteMark>({
    apiCall: async () => {
      try {
        console.log('🔄 Загружаем марки бетона...');
        const response = await concreteMarksApi.getAll();
        console.log('📋 Ответ API марок бетона:', response);
        console.log('📦 Данные марок бетона:', response.data.data);
        
        // Возвращаем данные в том же формате, что ожидает useApiData
        return {
          data: response.data.data // Получаем только массив данных
        };
      } catch (error) {
        console.error('❌ Ошибка загрузки марок бетона:', error);
        throw error;
      }
    },
    dependencies: []
  });

  const { data: drivers, refetch: refetchDrivers } = useApiData<Driver>({
    apiCall: () => driversApi.getAll(),
    dependencies: []
  });

  const { data: vehicles, refetch: refetchVehicles } = useApiData<Vehicle>({
    apiCall: () => vehiclesApi.getAll(),
    dependencies: []
  });

  const { data: warehouses, refetch: refetchWarehouses } = useApiData<Warehouse>({
    apiCall: () => warehousesApi.getAll(),
    dependencies: []
  });

  const { data: companies, refetch: refetchCompanies } = useApiData<Company>({
    apiCall: () => companiesApi.getAll(),
    dependencies: []
  });

  const { data: materials, refetch: refetchMaterials } = useApiData<Material>({
    apiCall: () => materialsApi.getAll(),
    dependencies: []
  });

  const [formData, setFormData] = useState({
    type: 'EXPENSE' as InvoiceType,
    orderId: '',
    customerId: '',
    supplierId: '',
    concreteMarkId: '',
    quantityM3: '',
    unitPrice: '',
    totalPrice: '',
    driverId: '',
    vehicleId: '',
    warehouseId: '',
    companyId: '',
    materialId: '',
    grossWeightKg: '',
    grossWeightAt: '',
    tareWeightKg: '',
    tareWeightAt: '',
    netWeightKg: '',
    moisturePercent: '',
    correctedWeightKg: '',
    deliveryDate: '',
    deliveryAddress: '',
    coordinates: '',
    notes: '',
    contractNumber: 'Без договора', // Номер договора (по умолчанию "Без договора")
    sealNumbers: '', // Номер пломбы
    departedPlantAt: '', // Время убытия с завода (автоматически текущее время)
    arrivedSiteAt: '', // Время прибытия на объект
    departedSiteAt: '', // Время убытия с объекта
    concreteMarkMaterials: [] as Array<{materialId: string, quantityPerM3: string, unit: string}>, // Материалы марки бетона
  });

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [showPriceFields, setShowPriceFields] = useState(false); // Галочка для показа полей цен
  const [showVatField, setShowVatField] = useState(false); // Галочка для НДС
  const [vatRate, setVatRate] = useState('12'); // Ставка НДС в процентах (по умолчанию 12%)

  // Автозаполнение данных из заказа при изменении orderId для расходных накладных
  useEffect(() => {
    if (formData.type === InvoiceType.EXPENSE && formData.orderId && orders && !editingInvoice) {
      const selectedOrder = orders.find(order => order.id.toString() === formData.orderId);
      if (selectedOrder) {
        console.log('🔄 Автозаполнение из заказа:', selectedOrder);
        setFormData(prev => {
          const newFormData = {
            ...prev,
            customerId: selectedOrder.customerId.toString(),
            concreteMarkId: selectedOrder.concreteMarkId.toString(),
            // deliveryDate остается текущей датой, не перезаписываем датой из заказа
            deliveryAddress: selectedOrder.deliveryAddress,
            coordinates: selectedOrder.coordinates || '',
            notes: selectedOrder.notes || '',
          };
          
          // Загружаем материалы марки бетона из заказа
          if (selectedOrder.concreteMarkId && concreteMarks) {
            console.log('🔍 Загружаем материалы марки бетона из заказа...');
            const selectedMark = concreteMarks.find(m => m.id.toString() === selectedOrder.concreteMarkId.toString());
            console.log('🎯 Найденная марка из заказа:', selectedMark);
            
            if (selectedMark && selectedMark.materials) {
              console.log('📦 Материалы марки из заказа:', selectedMark.materials);
              
              const newMaterials = selectedMark.materials.map(cm => ({
                materialId: cm.materialId.toString(),
                quantityPerM3: cm.quantityPerM3.toString(),
                unit: cm.unit
              }));
              
              (newFormData as any).concreteMarkMaterials = newMaterials;
              console.log('✅ Материалы марки бетона загружены из заказа:', newMaterials);
            }
          }
          
          return newFormData;
        });
      }
    }
  }, [formData.orderId, formData.type, orders, editingInvoice, concreteMarks]);

  // Пуллинг текущего веса от выбранного склада
  useEffect(() => {
    console.log('🔄 useEffect для получения веса запущен');
    console.log('📦 formData.warehouseId:', formData.warehouseId);
    console.log('📦 warehouses:', warehouses);
    
    if (!formData.warehouseId) {
      console.log('⚠️ Склад не выбран, останавливаем пуллинг веса');
      setLiveWeight(null);
      return;
    }
    const selected = warehouses?.find(w => w.id.toString() === formData.warehouseId) as any;
    console.log('📦 Выбранный склад:', selected);
    
    if (!selected || !selected.hasScales || !selected.scaleIpAddress || !selected.scaleApiKey) {
      console.log('⚠️ Склад не настроен для весов:', {
        hasScales: selected?.hasScales,
        scaleIpAddress: selected?.scaleIpAddress,
        scaleApiKey: selected?.scaleApiKey ? '***есть***' : 'нет'
      });
      setLiveWeight(null);
      return;
    }
    
    console.log('✅ Склад настроен для весов, запускаем пуллинг...');
    let timer: any;
    const fetchWeight = async () => {
      try {
        // Используем бэкенд как прокси для избежания CORS ошибок
        console.log(`⚖️ Запрос текущего веса через бэкенд для склада ${selected.id}`);
        
        const response = await scaleApi.getCurrentWeight(selected.id);
        const data = response.data || response;
        // ScaleBridge API может возвращать weight, unit, stable или weight, connected
        // Обрабатываем оба формата
        const weight = data.weight ?? 0;
        const connected = data.connected !== undefined ? !!data.connected : (data.stable !== undefined ? true : true);
        console.log(`✅ Получен вес: ${weight} кг, подключено: ${connected}`);
        setLiveWeight({ 
          weight, 
          connected 
        });
      } catch (e: any) {
        // Тихо обрабатываем ошибку подключения без спама в консоль
        console.log(`❌ Ошибка получения веса: ${e.message}`);
        setLiveWeight({ weight: 0, connected: false });
      }
    };
    fetchWeight();
    timer = setInterval(fetchWeight, 2000); // Увеличили интервал до 2 сек
    return () => clearInterval(timer);
  }, [formData.warehouseId, warehouses]);

  // Автоматическое обновление данных для водителей (polling каждые 30 секунд)
  useEffect(() => {
    if (user?.role === 'DRIVER') {
      const interval = setInterval(() => {
        refetch();
      }, 30000); // 30 секунд

      return () => clearInterval(interval);
    }
  }, [user?.role, refetch]);

  // Функции для автоматических расчетов
  const calculateNetWeight = (grossWeight: string, tareWeight: string): string => {
    const gross = parseFloat(grossWeight);
    const tare = parseFloat(tareWeight);
    
    if (!isNaN(gross) && !isNaN(tare) && gross >= tare) {
      return (gross - tare).toFixed(1);
    }
    return '';
  };

  const calculateCorrectedWeight = (netWeight: string, moisturePercent: string): string => {
    const net = parseFloat(netWeight);
    const moisture = parseFloat(moisturePercent);
    
    if (!isNaN(net) && net > 0 && !isNaN(moisture) && moisture >= 0) {
      // Формула: Скорректированный вес = Нетто - (Нетто * Влажность/100)
      const corrected = net - (net * moisture / 100);
      return corrected.toFixed(1);
    }
    return '';
  };

  // Обработчики для автоматических расчетов
  const handleGrossWeightChange = (value: string) => {
    setFormData({ ...formData, grossWeightKg: value });
    
    // Автоматически рассчитываем нетто вес
    if (value && formData.tareWeightKg) {
      const netWeight = calculateNetWeight(value, formData.tareWeightKg);
      if (netWeight) {
        // Автоматически рассчитываем скорректированный вес с учетом влажности
        const correctedWeight = calculateCorrectedWeight(netWeight, formData.moisturePercent);
        setFormData(prev => ({ 
          ...prev, 
          grossWeightKg: value, 
          netWeightKg: netWeight,
          correctedWeightKg: correctedWeight 
        }));
        return;
      }
    }
    setFormData({ ...formData, grossWeightKg: value });
  };

  const handleTareWeightChange = (value: string) => {
    setFormData({ ...formData, tareWeightKg: value });
    
    // Автоматически рассчитываем нетто вес
    if (formData.grossWeightKg && value) {
      const netWeight = calculateNetWeight(formData.grossWeightKg, value);
      if (netWeight) {
        // Автоматически рассчитываем скорректированный вес с учетом влажности
        const correctedWeight = calculateCorrectedWeight(netWeight, formData.moisturePercent);
        setFormData(prev => ({ 
          ...prev, 
          tareWeightKg: value, 
          netWeightKg: netWeight,
          correctedWeightKg: correctedWeight 
        }));
        return;
      }
    }
    setFormData({ ...formData, tareWeightKg: value });
  };

  const handleMoisturePercentChange = (value: string) => {
    setFormData({ ...formData, moisturePercent: value });
    
    // Автоматически рассчитываем скорректированный вес
    if (formData.netWeightKg && value) {
      const correctedWeight = calculateCorrectedWeight(formData.netWeightKg, value);
      if (correctedWeight) {
        setFormData(prev => ({ ...prev, correctedWeightKg: correctedWeight }));
        return;
      }
    }
    setFormData({ ...formData, moisturePercent: value });
  };

  // Обработчик для автоматического заполнения адреса и координат склада
  const handleWarehouseChange = (value: string) => {
    setFormData({ ...formData, warehouseId: value });
    
    // Для приходных накладных автоматически заполняем адрес и координаты склада
    if (formData.type === InvoiceType.INCOME && value && warehouses) {
      const selectedWarehouse = warehouses.find(warehouse => warehouse.id.toString() === value);
      if (selectedWarehouse) {
        setFormData(prev => ({
          ...prev,
          warehouseId: value,
          deliveryAddress: selectedWarehouse.address,
          coordinates: selectedWarehouse.latitude && selectedWarehouse.longitude 
            ? `${selectedWarehouse.latitude}, ${selectedWarehouse.longitude}` 
            : ''
        }));
        return;
      }
    }
    setFormData({ ...formData, warehouseId: value });
  };

  // Обработчик для автоматического заполнения данных из заказа (для расходных накладных)
  const handleOrderChange = (value: string) => {
    // Просто устанавливаем orderId, остальное заполнится через useEffect
    setFormData(prev => ({ ...prev, orderId: value, quantityM3: '' }));
    
    // Обновляем данные заказов для актуального индикатора
    if (refetchOrders) {
      refetchOrders();
    }
  };

  // Зафиксировать вес брутто с весов указанного склада
  const handleGetBruttoFromScale = async () => {
    if (!formData.warehouseId) {
      error('Сначала выберите склад');
      return;
    }

    // Проверяем, настроены ли весы для выбранного склада
    const selectedWarehouse = warehouses?.find(w => w.id.toString() === formData.warehouseId);
    const warehouse = selectedWarehouse as any; // Временное решение для новых полей ScaleBridge
    if (!warehouse?.hasScales || !warehouse?.scaleIpAddress || !warehouse?.scaleApiKey) {
      error('Для этого склада не настроены весы ScaleBridge. Сначала настройте весы в настройках склада.');
      return;
    }

    console.log('🔍 Фиксация веса БРУТТО для склада:', formData.warehouseId);
    console.log('📊 Настройки весов:', {
      hasScales: warehouse.hasScales,
      scaleIpAddress: warehouse.scaleIpAddress,
      scaleApiKey: warehouse.scaleApiKey ? '***настроен***' : 'не настроен'
    });
    
    setLoadingScale(true);
    
    try {
      console.log('📡 Отправляем команду взвешивания БРУТТО...');
      // Используем /weigh для фиксации веса с фото
      const response = await api.post(`/scale/${formData.warehouseId}/weigh`, {
        action: 'brutto',
        orderId: formData.orderId ? parseInt(formData.orderId) : undefined
      });
      console.log('✅ Получен ответ от API:', response.data);
      
      if (response.data && response.data.weight !== undefined) {
        const bruttoWeight = response.data.weight.toString();
        console.log('⚖️ Зафиксирован вес БРУТТО:', bruttoWeight);
        
        // Автоматически рассчитываем нетто если есть тара
        const netWeight = formData.tareWeightKg ? calculateNetWeight(bruttoWeight, formData.tareWeightKg) : '';
        console.log(`🧮 Расчет НЕТТО: Брутто=${bruttoWeight}, Тара=${formData.tareWeightKg}, Нетто=${netWeight}`);
        
        setFormData(prev => ({ 
          ...prev, 
          grossWeightKg: bruttoWeight, 
          grossWeightAt: response.data.timestamp || new Date().toISOString(),
          netWeightKg: netWeight || prev.netWeightKg
        }));
        
        // Сохраняем информацию о взвешивании
        setLastWeighInfo({
          type: 'brutto',
          weight: response.data.weight,
          timestamp: response.data.timestamp || new Date().toISOString(),
          photoUrl: response.data.photoUrl
        });
        
        // Показываем информацию о фото
        if (response.data.photoUrl) {
          success(`Зафиксирован вес БРУТТО: ${response.data.weight} кг\nФото сохранено`);
        } else {
          success(`Зафиксирован вес БРУТТО: ${response.data.weight} кг`);
        }
      } else {
        console.error('❌ Неверный формат ответа:', response.data);
        error(response.data.message || 'Не удалось зафиксировать вес с весов');
      }
    } catch (err: any) {
      console.error('💥 Ошибка при фиксации веса БРУТТО:', err);
      console.error('📋 Детали ошибки:', err.response?.data);
      error(`Ошибка подключения к весам: ${err.response?.data?.message || err.message}`);
    } finally {
      setLoadingScale(false);
    }
  };

  // Зафиксировать вес тары с весов указанного склада
  const handleGetTareFromScale = async () => {
    if (!formData.warehouseId) {
      error('Сначала выберите склад');
      return;
    }

    // Проверяем, настроены ли весы для выбранного склада
    const selectedWarehouse = warehouses?.find(w => w.id.toString() === formData.warehouseId);
    const warehouse = selectedWarehouse as any; // Временное решение для новых полей ScaleBridge
    if (!warehouse?.hasScales || !warehouse?.scaleIpAddress || !warehouse?.scaleApiKey) {
      error('Для этого склада не настроены весы ScaleBridge. Сначала настройте весы в настройках склада.');
      return;
    }

    console.log('🔍 Фиксация веса ТАРА для склада:', formData.warehouseId);
    setLoadingScale(true);
    
    try {
      console.log('📡 Отправляем команду взвешивания ТАРА...');
      // Используем /weigh для фиксации веса с фото
      const response = await api.post(`/scale/${formData.warehouseId}/weigh`, {
        action: 'tara',
        orderId: formData.orderId ? parseInt(formData.orderId) : undefined
      });
      console.log('✅ Получен ответ от API для ТАРА:', response.data);
      
      if (response.data && response.data.weight !== undefined) {
        const tareWeight = response.data.weight.toString();
        console.log('⚖️ Зафиксирован вес ТАРА:', tareWeight);
        
        // Автоматически рассчитываем нетто если есть брутто
        const netWeight = formData.grossWeightKg ? calculateNetWeight(formData.grossWeightKg, tareWeight) : '';
        console.log(`🧮 Расчет НЕТТО: Брутто=${formData.grossWeightKg}, Тара=${tareWeight}, Нетто=${netWeight}`);
        
        setFormData(prev => ({ 
          ...prev, 
          tareWeightKg: tareWeight, 
          tareWeightAt: response.data.timestamp || new Date().toISOString(),
          netWeightKg: netWeight || prev.netWeightKg
        }));
        
        // Сохраняем информацию о взвешивании
        setLastWeighInfo({
          type: 'tara',
          weight: response.data.weight,
          timestamp: response.data.timestamp || new Date().toISOString(),
          photoUrl: response.data.photoUrl
        });
        
        // Показываем информацию о фото
        if (response.data.photoUrl) {
          success(`Зафиксирован вес ТАРА: ${response.data.weight} кг\nФото сохранено`);
        } else {
          success(`Зафиксирован вес ТАРА: ${response.data.weight} кг`);
        }
      } else {
        console.error('❌ Неверный формат ответа для ТАРА:', response.data);
        error(response.data.message || 'Не удалось зафиксировать вес с весов');
      }
    } catch (err: any) {
      console.error('💥 Ошибка при фиксации веса ТАРА:', err);
      console.error('📋 Детали ошибки:', err.response?.data);
      error(`Ошибка подключения к весам: ${err.response?.data?.message || err.message}`);
    } finally {
      setLoadingScale(false);
    }
  };

  // Обработчик для автоматического заполнения даты доставки при выборе типа накладной
  const handleInvoiceTypeChange = (value: InvoiceType) => {
    // Для приходных накладных автоматически заполняем текущую дату и время
    if (value === InvoiceType.INCOME) {
      const now = new Date();
      
      // Получаем локальную дату и время в формате YYYY-MM-DDTHH:MM
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      
      const currentDateTime = `${year}-${month}-${day}T${hours}:${minutes}`;
      
      console.log('🕐 Текущая дата и время компьютера:', {
        localDateTime: currentDateTime,
        fullDate: now.toLocaleString('ru-RU'),
        isoString: now.toISOString(),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
      });
      
      setFormData(prev => ({
        ...prev,
        type: value,
        deliveryDate: currentDateTime
      }));
    } else {
      // Для расходных накладных очищаем дату доставки
      setFormData(prev => ({
        ...prev,
        type: value,
        deliveryDate: ''
      }));
    }
  };

  const invoiceTypeLabels = {
    [InvoiceType.EXPENSE]: 'Расходная',
    [InvoiceType.INCOME]: 'Приходная',
  };

  const { success, error } = useNotifications();

  const columns: Column<Invoice>[] = [
    { id: 'invoiceNumber', label: 'Номер накладной', minWidth: 120 },
    { id: 'type', label: 'Тип', minWidth: 100, render: (value) => invoiceTypeLabels[value as InvoiceType] },
    { id: 'customer', label: 'Клиент/Поставщик', minWidth: 150, render: (_value, row) => row.customer?.name || row.supplier?.name || '-' },
    { id: 'date', label: 'Дата', minWidth: 100, render: (value) => new Date(value).toLocaleDateString('ru-RU') },
    { id: 'quantityM3', label: 'Количество (м³)', minWidth: 120, render: (value) => value ? `${value} м³` : '-' },
    { id: 'grossWeightKg', label: 'Вес (кг)', minWidth: 100, render: (_value, row) => {
        // Приоритет: скорректированный вес > нетто вес > брутто вес
        const correctedWeight = row.correctedWeightKg;
        const netWeight = row.netWeightKg;
        const grossWeight = row.grossWeightKg;
        
        if (correctedWeight && correctedWeight > 0) {
          return `${correctedWeight} кг (скорр.)`;
        } else if (netWeight && netWeight > 0) {
          return `${netWeight} кг (нетто)`;
        } else if (grossWeight && grossWeight > 0) {
          return `${grossWeight} кг (брутто)`;
        } else {
          return '-';
        }
      }
    },
    { id: 'status', label: 'Статус', minWidth: 100, render: (value) => value || 'Активная' },
    // Колонка с адресом и картами для водителей (только для расходных накладных)
    ...(user?.role === 'DRIVER' ? [{
      id: 'date' as keyof Invoice, // Используем существующее поле
      label: 'Адрес доставки',
      minWidth: 250,
      render: (_value: any, row: Invoice) => {
        if (row.type !== InvoiceType.EXPENSE) return null;
        
        const invoiceWithOrder = row as any;
        const coordinates = invoiceWithOrder.order?.coordinates;
        const address = invoiceWithOrder.order?.deliveryAddress || invoiceWithOrder.departureAddress || '-';
        
        return (
          <div className="flex flex-col gap-1">
            <div className="text-sm">{address}</div>
            {coordinates && (
              <div className="flex gap-1">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => openIn2GIS(coordinates)}
                  className="text-xs px-2 py-1 h-auto"
                >
                  2ГИС
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => openInYandex(coordinates)}
                  className="text-xs px-2 py-1 h-auto"
                >
                  Яндекс
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => openInGoogle(coordinates)}
                  className="text-xs px-2 py-1 h-auto"
                >
                  Google
                </Button>
              </div>
            )}
          </div>
        );
      }
    }] : []),
    // Колонка для действий водителя (только для расходных накладных)
    ...(user?.role === 'DRIVER' ? [{
      id: 'id' as keyof Invoice, // Используем существующее поле id
      label: 'Действия водителя',
      minWidth: 200,
      render: (_value: any, row: Invoice) => {
        if (row.type !== InvoiceType.EXPENSE) return null;
        
        const invoiceWithTimes = row as any; // Type assertion для временных полей
        
        return (
          <div className="flex gap-2">
            {!invoiceWithTimes.arrivedSiteAt ? (
              <Button
                size="sm"
                variant="outline"
                onClick={() => updateInvoiceTime(row.id, 'arrivedSiteAt')}
                className="text-xs"
              >
                Прибыл на объект
              </Button>
            ) : (
              <span className="text-xs text-gray-700 font-semibold">
                Прибыл: {new Date(invoiceWithTimes.arrivedSiteAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
            
            {invoiceWithTimes.arrivedSiteAt && !invoiceWithTimes.departedSiteAt ? (
              <Button
                size="sm"
                variant="outline"
                onClick={() => updateInvoiceTime(row.id, 'departedSiteAt')}
                className="text-xs"
              >
                Выехал с объекта
              </Button>
            ) : invoiceWithTimes.departedSiteAt ? (
              <span className="text-xs text-gray-700 font-semibold">
                Выехал: {new Date(invoiceWithTimes.departedSiteAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
              </span>
            ) : null}
          </div>
        );
      }
    }] : []),
  ];

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    
    if (formData.type === InvoiceType.EXPENSE) {
      // Валидация для расходной накладной
      if (!formData.customerId) errors.customerId = 'Клиент обязателен';
      if (!formData.concreteMarkId) errors.concreteMarkId = 'Марка бетона обязательна';
      if (!formData.quantityM3) errors.quantityM3 = 'Количество обязательно';
      // Новые обязательные поля
      if (!formData.contractNumber || formData.contractNumber.trim() === '') errors.contractNumber = 'Номер договора обязателен';
      if (!formData.sealNumbers || formData.sealNumbers.trim() === '') errors.sealNumbers = 'Номер пломбы обязателен';
      // Цена обязательна только если галочка "Указать цены" включена
      if (showPriceFields && !formData.unitPrice) errors.unitPrice = 'Цена обязательна';
    } else if (formData.type === InvoiceType.INCOME) {
      // Валидация для приходной накладной
      // Обязательные поля: только Брутто и Склад
      if (!formData.grossWeightKg) errors.grossWeightKg = 'Брутто вес обязателен';
      if (!formData.warehouseId) errors.warehouseId = 'Склад обязателен';
      
      // Остальные поля опциональны (supplierId, materialId, driverId, vehicleId, tareWeightKg, netWeightKg)
    }
    
    // Общие обязательные поля только для расходных накладных
    if (formData.type === InvoiceType.EXPENSE) {
      if (!formData.driverId) errors.driverId = 'Водитель обязателен';
      if (!formData.vehicleId) errors.vehicleId = 'Транспорт обязателен';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const resetForm = () => {
    setFormData({
      type: 'EXPENSE' as InvoiceType,
      orderId: '',
      customerId: '',
      supplierId: '',
      concreteMarkId: '',
      quantityM3: '',
      unitPrice: '',
      totalPrice: '',
      driverId: '',
      vehicleId: '',
      warehouseId: '',
      companyId: '',
      materialId: '',
      grossWeightKg: '',
      grossWeightAt: '',
      tareWeightKg: '',
      tareWeightAt: '',
      netWeightKg: '',
      moisturePercent: '',
      correctedWeightKg: '',
      deliveryDate: '',
      deliveryAddress: '',
      coordinates: '',
      notes: '',
      contractNumber: 'Без договора',
      sealNumbers: '',
      departedPlantAt: new Date().toISOString().slice(0, 16), // Автоматически текущее время
      arrivedSiteAt: '',
      departedSiteAt: '',
      concreteMarkMaterials: [],
    });
    setLastWeighInfo(null); // Сбрасываем информацию о взвешивании
    setFormErrors({});
    setEditingInvoice(null);
    setModalOpen(false);
  };

  const openCreateModal = () => {
    resetForm();
    setShowPriceFields(false); // Сбрасываем галочку цен
    setShowVatField(false); // Сбрасываем галочку НДС
    setVatRate('12'); // Сбрасываем ставку НДС на 12%
    
    // Если выбран конкретный тип накладной, используем его как тип по умолчанию
    const defaultType = selectedType !== 'ALL' ? selectedType : 'EXPENSE';
    
    setFormData({
      type: defaultType,
      orderId: '',
      customerId: '',
      supplierId: '',
      concreteMarkId: '',
      quantityM3: '',
      unitPrice: '',
      totalPrice: '',
      driverId: '',
      vehicleId: '',
      warehouseId: '',
      companyId: '',
      materialId: '',
      grossWeightKg: '',
      grossWeightAt: '',
      tareWeightKg: '',
      tareWeightAt: '',
      netWeightKg: '',
      moisturePercent: '',
      correctedWeightKg: '',
      deliveryDate: defaultType === InvoiceType.INCOME ? new Date().toISOString().slice(0, 16) : new Date().toISOString().slice(0, 10), // Автозаполнение текущей даты для всех типов накладных
      deliveryAddress: '',
      coordinates: '',
      notes: '',
      contractNumber: 'Без договора',
      sealNumbers: '',
      departedPlantAt: new Date().toISOString().slice(0, 16),
      arrivedSiteAt: '',
      departedSiteAt: '',
      concreteMarkMaterials: [],
    });
    
    // Обновляем список заказов при открытии формы для актуальных данных
    if (refetchOrders) {
      refetchOrders();
    }
    
    setModalOpen(true);
  };

  const handleEdit = (invoice: Invoice) => {
    setEditingInvoice(invoice);
    
    // Проверяем есть ли цены - если есть, включаем галочку
    const hasPrices = !!(invoice.basePricePerM3 || invoice.salePricePerM3);
    setShowPriceFields(hasPrices);
    
    // Проверяем есть ли НДС - если есть, включаем галочку и устанавливаем ставку
    const hasVat = !!(invoice as any).vatRate;
    setShowVatField(hasVat);
    if (hasVat) {
      setVatRate(((invoice as any).vatRate || 12).toString());
    }
    
    setFormData({
      type: invoice.type,
      orderId: invoice.orderId?.toString() || '',
      customerId: invoice.customerId?.toString() || '',
      supplierId: invoice.supplierId?.toString() || '',
      concreteMarkId: invoice.concreteMarkId?.toString() || '',
      quantityM3: invoice.quantityM3?.toString() || '',
      unitPrice: invoice.basePricePerM3?.toString() || '',
      totalPrice: invoice.salePricePerM3?.toString() || '',
      driverId: invoice.driverId?.toString() || '',
      vehicleId: invoice.vehicleId?.toString() || '',
      warehouseId: invoice.warehouseId?.toString() || '',
      companyId: invoice.companyId?.toString() || '',
      materialId: invoice.materialId?.toString() || '',
      grossWeightKg: invoice.grossWeightKg?.toString() || '',
      grossWeightAt: '', // Время взвешивания брутто
      tareWeightKg: invoice.tareWeightKg?.toString() || '',
      tareWeightAt: '', // Время взвешивания тары
      netWeightKg: invoice.netWeightKg?.toString() || '',
      moisturePercent: invoice.moisturePercent?.toString() || '',
      correctedWeightKg: invoice.correctedWeightKg?.toString() || '',
      // Исправлен формат даты для datetime-local (нужен формат YYYY-MM-DDTHH:MM)
      deliveryDate: invoice.date ? (invoice.type === InvoiceType.INCOME ? new Date(invoice.date).toISOString().slice(0, 16) : new Date(invoice.date).toISOString().slice(0, 10)) : '',
      deliveryAddress: invoice.departureAddress || '',
      coordinates: invoice.latitudeTo && invoice.longitudeTo ? `${invoice.latitudeTo}, ${invoice.longitudeTo}` : '',
      notes: '',
      contractNumber: (invoice as any).contractNumber || 'Без договора',
      sealNumbers: (invoice.sealNumbers && invoice.sealNumbers.length > 0) ? invoice.sealNumbers[0] : '',
      departedPlantAt: (invoice as any).departedPlantAt ? new Date((invoice as any).departedPlantAt).toISOString().slice(0, 16) : '',
      arrivedSiteAt: (invoice as any).arrivedSiteAt ? new Date((invoice as any).arrivedSiteAt).toISOString().slice(0, 16) : '',
      departedSiteAt: (invoice as any).departedSiteAt ? new Date((invoice as any).departedSiteAt).toISOString().slice(0, 16) : '',
      concreteMarkMaterials: [],
    });
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    try {
      const data: any = {
        type: formData.type,
        warehouseId: formData.warehouseId ? parseInt(formData.warehouseId) : undefined,
        createdById: 1, // Временно используем ID 1
      };

      if (formData.type === InvoiceType.EXPENSE) {
        // Данные для расходной накладной
        data.customerId = parseInt(formData.customerId);
        data.concreteMarkId = parseInt(formData.concreteMarkId);
        data.quantityM3 = parseFloat(formData.quantityM3);
        
        // Цены добавляем только если галочка стоит
        if (showPriceFields) {
          if (formData.unitPrice) data.basePricePerM3 = parseFloat(formData.unitPrice);
          if (formData.totalPrice) data.salePricePerM3 = parseFloat(formData.totalPrice);
          
          // НДС добавляем только если галочка НДС стоит
          if (showVatField && vatRate) {
            data.vatRate = parseFloat(vatRate);
            // Рассчитываем сумму НДС
            if (data.basePricePerM3 && data.quantityM3) {
              data.vatAmount = (data.basePricePerM3 * data.quantityM3 * parseFloat(vatRate)) / 100;
            }
          }
        }
        
        if (formData.orderId) data.orderId = parseInt(formData.orderId);
        if (formData.driverId) data.driverId = parseInt(formData.driverId);
        if (formData.vehicleId) data.vehicleId = parseInt(formData.vehicleId);
        if (formData.companyId) data.companyId = parseInt(formData.companyId);
        
        // Новые поля для расходных накладных
        if (formData.contractNumber) data.contractNumber = formData.contractNumber;
        if (formData.sealNumbers) data.sealNumbers = formData.sealNumbers;
        if (formData.departedPlantAt) data.departedPlantAt = new Date(formData.departedPlantAt);
        if (formData.arrivedSiteAt) data.arrivedSiteAt = new Date(formData.arrivedSiteAt);
        if (formData.departedSiteAt) data.departedSiteAt = new Date(formData.departedSiteAt);
      } else if (formData.type === InvoiceType.INCOME) {
        // Данные для приходной накладной
        // Обязательные поля: только Брутто и Склад
        data.grossWeightKg = parseFloat(formData.grossWeightKg);
        
        // Опциональные поля
        if (formData.supplierId) {
          data.customerId = parseInt(formData.supplierId); // Для приходных накладных customerId = supplierId
          data.supplierId = parseInt(formData.supplierId);
        }
        if (formData.companyId) data.companyId = parseInt(formData.companyId);
        if (formData.materialId) data.materialId = parseInt(formData.materialId);
        
        if (formData.tareWeightKg) data.tareWeightKg = parseFloat(formData.tareWeightKg);
        if (formData.tareWeightAt) data.tareWeightAt = new Date(formData.tareWeightAt);
        if (formData.netWeightKg) data.netWeightKg = parseFloat(formData.netWeightKg);
        if (formData.moisturePercent) data.moisturePercent = parseFloat(formData.moisturePercent);
        if (formData.correctedWeightKg) data.correctedWeightKg = parseFloat(formData.correctedWeightKg);
        if (formData.grossWeightAt) data.grossWeightAt = new Date(formData.grossWeightAt);
        
        // Водитель и транспорт опциональны для приходных накладных
        if (formData.driverId) data.driverId = parseInt(formData.driverId);
        if (formData.vehicleId) data.vehicleId = parseInt(formData.vehicleId);
      }

      if (formData.deliveryAddress) data.departureAddress = formData.deliveryAddress;
      if (formData.coordinates) {
        const [lat, lng] = formData.coordinates.split(',').map(coord => parseFloat(coord.trim()));
        if (!isNaN(lat) && !isNaN(lng)) {
          data.latitudeTo = lat;
          data.longitudeTo = lng;
        }
      }

      console.log('📤 Отправляем данные накладной:', data);
      console.log('📋 Исходные данные формы:', formData);

      if (editingInvoice) {
        await invoicesApi.update(editingInvoice.id, data);
        success('Накладная обновлена');
      } else {
        await invoicesApi.create(data);
        success('Накладная создана');
      }
      
      resetForm();
      refetch();
      // Обновляем список заказов для актуализации количества в индикаторе
      if (refetchOrders) {
        refetchOrders();
      }
    } catch (err: any) {
      console.error('Ошибка при сохранении накладной:', err);
      console.error('📋 Детали ошибки:', err.response?.data);
      console.error('🔍 Полный ответ сервера:', err.response?.data);
      
      // Если message - это массив, выводим все сообщения
      const errorMessage = Array.isArray(err.response?.data?.message) 
        ? err.response.data.message.join('; ') 
        : err.response?.data?.message || 'Ошибка при сохранении';
      
      console.error('❌ Сообщения об ошибках:', errorMessage);
      error(errorMessage);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    
    try {
      await invoicesApi.delete(deleteId);
      success('Накладная удалена');
      setDeleteId(null);
      setConfirmOpen(false);
      refetch();
      // Обновляем список заказов для актуализации количества
      if (refetchOrders) {
        refetchOrders();
      }
    } catch (err: any) {
      console.error('Ошибка при удалении накладной:', err);
      error(err.response?.data?.message || 'Ошибка при удалении');
    }
  };

  // Функция копирования накладной
  const handleCopy = async (invoice: Invoice) => {
    // Обновляем список заказов СНАЧАЛА для получения актуальных данных
    if (refetchOrders) {
      await refetchOrders();
    }

    // Если есть orderId, берем актуальные данные из обновленного списка заказов
    if (invoice.orderId && orders) {
      const order = orders.find(o => o.id === invoice.orderId);
      
      if (order) {
        const newFormData = {
          type: invoice.type,
          orderId: invoice.orderId.toString(),
          customerId: order.customerId.toString(),
          supplierId: '',
          concreteMarkId: order.concreteMarkId.toString(),
          quantityM3: '', // Оставляем пустым для ручного ввода
          unitPrice: invoice.basePricePerM3?.toString() || '',
          totalPrice: invoice.salePricePerM3?.toString() || '',
          driverId: invoice.driverId?.toString() || '',
          vehicleId: invoice.vehicleId?.toString() || '',
          warehouseId: invoice.warehouseId?.toString() || '',
          companyId: invoice.companyId?.toString() || '',
          materialId: '',
          grossWeightKg: '',
          grossWeightAt: '',
          tareWeightKg: '',
          tareWeightAt: '',
          netWeightKg: '',
          moisturePercent: '',
          correctedWeightKg: '',
          deliveryDate: invoice.type === InvoiceType.INCOME ? new Date().toISOString().slice(0, 16) : new Date().toISOString().slice(0, 10), // Текущая дата при копировании
          deliveryAddress: order.deliveryAddress || '',
          coordinates: order.coordinates || '',
          notes: order.notes || '',
          contractNumber: 'Без договора',
          sealNumbers: '',
          departedPlantAt: new Date().toISOString().slice(0, 16),
          arrivedSiteAt: '',
          departedSiteAt: '',
          concreteMarkMaterials: [],
        };
        
        // Загружаем материалы марки бетона из заказа при копировании
        if (order.concreteMarkId && concreteMarks) {
          console.log('🔍 Загружаем материалы марки бетона при копировании из заказа...');
          const selectedMark = concreteMarks.find(m => m.id.toString() === order.concreteMarkId.toString());
          console.log('🎯 Найденная марка при копировании:', selectedMark);
          
          if (selectedMark && selectedMark.materials) {
            console.log('📦 Материалы марки при копировании:', selectedMark.materials);
            
            const newMaterials = selectedMark.materials.map(cm => ({
              materialId: cm.materialId.toString(),
              quantityPerM3: cm.quantityPerM3.toString(),
              unit: cm.unit
            }));
            
            (newFormData as any).concreteMarkMaterials = newMaterials;
            console.log('✅ Материалы марки бетона загружены при копировании:', newMaterials);
          }
        }
        
        setFormData(newFormData);
      } else {
        // Если заказ не найден в списке, копируем данные из накладной
        const newFormData = {
          type: invoice.type,
          orderId: invoice.orderId?.toString() || '',
          customerId: invoice.customerId?.toString() || '',
          supplierId: '',
          concreteMarkId: invoice.concreteMarkId?.toString() || '',
          quantityM3: '',
          unitPrice: invoice.basePricePerM3?.toString() || '',
          totalPrice: invoice.salePricePerM3?.toString() || '',
          driverId: invoice.driverId?.toString() || '',
          vehicleId: invoice.vehicleId?.toString() || '',
          warehouseId: invoice.warehouseId?.toString() || '',
          companyId: invoice.companyId?.toString() || '',
          materialId: '',
          grossWeightKg: '',
          grossWeightAt: '',
          tareWeightKg: '',
          tareWeightAt: '',
          netWeightKg: '',
          moisturePercent: '',
          correctedWeightKg: '',
          deliveryDate: invoice.type === InvoiceType.INCOME ? new Date().toISOString().slice(0, 16) : new Date().toISOString().slice(0, 10), // Текущая дата при копировании
          deliveryAddress: invoice.departureAddress || '',
          coordinates: '',
          notes: '',
          contractNumber: 'Без договора',
          sealNumbers: '',
          departedPlantAt: new Date().toISOString().slice(0, 16),
          arrivedSiteAt: '',
          departedSiteAt: '',
          concreteMarkMaterials: [],
        };
        
        // Загружаем материалы марки бетона из накладной при копировании
        if (invoice.concreteMarkId && concreteMarks) {
          console.log('🔍 Загружаем материалы марки бетона при копировании из накладной...');
          const selectedMark = concreteMarks.find(m => m.id.toString() === invoice.concreteMarkId?.toString());
          console.log('🎯 Найденная марка при копировании из накладной:', selectedMark);
          
          if (selectedMark && selectedMark.materials) {
            console.log('📦 Материалы марки при копировании из накладной:', selectedMark.materials);
            
            const newMaterials = selectedMark.materials.map(cm => ({
              materialId: cm.materialId.toString(),
              quantityPerM3: cm.quantityPerM3.toString(),
              unit: cm.unit
            }));
            
            (newFormData as any).concreteMarkMaterials = newMaterials;
            console.log('✅ Материалы марки бетона загружены при копировании из накладной:', newMaterials);
          }
        }
        
        setFormData(newFormData);
      }
    } else {
      // Если нет заказа, копируем из накладной как есть (для приходных накладных)
      setFormData({
        type: invoice.type,
        orderId: '',
        customerId: invoice.customerId?.toString() || '',
        supplierId: invoice.supplierId?.toString() || '',
        concreteMarkId: invoice.concreteMarkId?.toString() || '',
        quantityM3: '',
        unitPrice: invoice.basePricePerM3?.toString() || '',
        totalPrice: invoice.salePricePerM3?.toString() || '',
        driverId: invoice.driverId?.toString() || '',
        vehicleId: invoice.vehicleId?.toString() || '',
        warehouseId: invoice.warehouseId?.toString() || '',
        companyId: invoice.companyId?.toString() || '',
        materialId: invoice.materialId?.toString() || '',
        grossWeightKg: invoice.grossWeightKg?.toString() || '',
        grossWeightAt: '',
        tareWeightKg: invoice.tareWeightKg?.toString() || '',
        tareWeightAt: '',
        netWeightKg: invoice.netWeightKg?.toString() || '',
        moisturePercent: invoice.moisturePercent?.toString() || '',
        correctedWeightKg: invoice.correctedWeightKg?.toString() || '',
        deliveryDate: new Date().toISOString().slice(0, 16), // Текущая дата при копировании
        deliveryAddress: invoice.departureAddress || '',
        coordinates: '',
        notes: '',
        contractNumber: 'Без договора',
        sealNumbers: '',
        departedPlantAt: new Date().toISOString().slice(0, 16),
        arrivedSiteAt: '',
        departedSiteAt: '',
        concreteMarkMaterials: [],
      });
    }
    
    setEditingInvoice(null); // Это новая накладная, не редактирование
    setModalOpen(true);
    success('Данные скопированы из заказа. Заполните количество и сохраните.');
  };

  // Функция для обновления времени в накладной (для водителей)
  const updateInvoiceTime = async (invoiceId: number, timeType: 'arrivedSiteAt' | 'departedSiteAt') => {
    try {
      if (timeType === 'arrivedSiteAt') {
        await api.patch(`/invoices/${invoiceId}/mark-arrived-at-site`, {
          latitude: 0, // Можно добавить получение геолокации
          longitude: 0
        });
        success('Прибытие на объект отмечено');
      } else if (timeType === 'departedSiteAt') {
        await api.patch(`/invoices/${invoiceId}/mark-departed-from-site`, {
          latitude: 0, // Можно добавить получение геолокации
          longitude: 0
        });
        success('Выезд с объекта отмечен');
      }
      
      // Обновляем список накладных
      refetch();
    } catch (error: any) {
      console.error('Ошибка при обновлении времени:', error);
      error(error.response?.data?.message || 'Ошибка при обновлении времени');
    }
  };

  // Функция печати накладной
  const handlePrint = (invoice: Invoice) => {
    setPrintInvoice(invoice);
    
    // Небольшая задержка для рендеринга
    setTimeout(() => {
      window.print();
    }, 100);
  };

  // Фильтрация теперь происходит на backend
  const filteredData = invoices || [];

  return (
    <div className="p-3 sm:p-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4 sm:mb-6">
        <h1 className="text-xl sm:text-2xl font-bold">{title || 'Накладные'}</h1>
        <Button onClick={openCreateModal} className="w-full sm:w-auto text-sm sm:text-base bg-gray-800 hover:bg-gray-900">
          <span className="sm:inline">{filterType === InvoiceType.INCOME ? 'Добавить приходную' : filterType === InvoiceType.EXPENSE ? 'Добавить расходную' : 'Добавить накладную'}</span>
        </Button>
      </div>

      <div className="mb-4 flex flex-col sm:flex-row gap-3 sm:gap-4 items-stretch sm:items-center">
        <Input
          placeholder="Поиск..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full sm:max-w-md"
        />

        {!filterType && (
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
            <Label htmlFor="typeFilter" className="text-sm font-medium whitespace-nowrap">
              Тип:
            </Label>
            <Select value={selectedType} onValueChange={(value: InvoiceType | 'ALL') => setSelectedType(value)}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue />
              </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Все</SelectItem>
              <SelectItem value={InvoiceType.INCOME}>Приходные</SelectItem>
              <SelectItem value={InvoiceType.EXPENSE}>Расходные</SelectItem>
            </SelectContent>
          </Select>
        </div>
        )}
        
        <div className="text-xs sm:text-sm text-gray-600">
          Показано: {filteredData.length}
        </div>
      </div>

      <DataTable
        data={filteredData}
        columns={columns}
        loading={invoicesLoading}
        onEdit={handleEdit}
        searchable={false}
        onCopy={filterType === InvoiceType.EXPENSE ? handleCopy : undefined}
        onPrint={handlePrint}
        onDelete={(invoice) => {
          setDeleteId(invoice.id);
          setConfirmOpen(true);
        }}
      />

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-4xl w-[95vw] sm:w-[90vw] max-h-[95vh] sm:max-h-[90vh] overflow-y-auto modal-content p-3 sm:p-6">
          <DialogHeader>
            <div className="flex flex-col sm:flex-row justify-between items-start gap-3">
              <div>
                <DialogTitle className="text-lg sm:text-xl">
                  {editingInvoice ? 'Редактировать накладную' : 'Добавить накладную'}
                </DialogTitle>
                <DialogDescription className="text-sm">
                  Внесите изменения в данные
                </DialogDescription>
              </div>
              {/* Индикатор оставшегося количества для расходных накладных */}
              {formData.type === InvoiceType.EXPENSE && formData.orderId && orders && (
                (() => {
                  const selectedOrder = orders.find(o => o.id.toString() === formData.orderId);
                  if (selectedOrder) {
                    // Считаем сумму уже созданных расходных накладных по этому заказу
                    // Используем накладные из заказа, если они есть, или из общего списка
                    const orderInvoices = selectedOrder.invoices || 
                      (invoices ? invoices.filter(inv => 
                        inv.orderId?.toString() === formData.orderId && 
                        inv.type === InvoiceType.EXPENSE &&
                        (!editingInvoice || inv.id !== editingInvoice.id) // Исключаем редактируемую накладную
                      ) : []);
                    
                    const totalInvoiced = orderInvoices.reduce((sum, inv) => {
                      const quantity = typeof inv.quantityM3 === 'number' ? inv.quantityM3 : parseFloat(String(inv.quantityM3 || 0));
                      return sum + quantity;
                    }, 0);
                    
                    // Учитываем текущее введенное количество в форме (если есть)
                    const currentFormQuantity = formData.quantityM3 ? parseFloat(String(formData.quantityM3)) : 0;
                    const editingInvoiceQuantity = editingInvoice && editingInvoice.orderId?.toString() === formData.orderId
                      ? (typeof editingInvoice.quantityM3 === 'number' ? editingInvoice.quantityM3 : parseFloat(String(editingInvoice.quantityM3 || 0)))
                      : 0;
                    
                    // При редактировании вычитаем старое значение и добавляем новое из формы
                    // При создании просто добавляем значение из формы
                    const totalInvoicedWithCurrent = totalInvoiced - editingInvoiceQuantity + (isNaN(currentFormQuantity) ? 0 : currentFormQuantity);
                    
                    const initialQuantity = typeof selectedOrder.quantityM3 === 'number' 
                      ? selectedOrder.quantityM3 
                      : parseFloat(String(selectedOrder.quantityM3 || 0));
                    const remaining = initialQuantity - totalInvoicedWithCurrent;
                    
                    return (
                      <div className="bg-gray-100 text-gray-900 px-2 sm:px-4 py-2 rounded-lg border-2 border-gray-400">
                        <div className="text-xs font-medium mb-1">Всего в заказе: {initialQuantity.toFixed(1)} м³</div>
                        {totalInvoiced > 0 && (
                          <div className="text-xs text-gray-600 mb-1">
                            Доставлено: {totalInvoiced.toFixed(1)} м³
                            {currentFormQuantity > 0 && !editingInvoice && (
                              <span className="text-blue-600 ml-1">(+{currentFormQuantity.toFixed(1)})</span>
                            )}
                            {editingInvoice && editingInvoiceQuantity !== currentFormQuantity && (
                              <span className="text-blue-600 ml-1">
                                ({editingInvoiceQuantity > currentFormQuantity ? '-' : '+'}
                                {Math.abs(editingInvoiceQuantity - currentFormQuantity).toFixed(1)})
                              </span>
                            )}
                          </div>
                        )}
                        <div className={`text-sm sm:text-lg font-bold ${remaining < 0 ? 'text-red-700' : 'text-blue-700'}`}>
                          Осталось: {remaining.toFixed(1)} м³
                        </div>
                        {remaining < 0 && (
                          <div className="text-xs text-red-600 mt-1 font-medium">
                            ⚠️ Превышен объем заказа!
                          </div>
                        )}
                      </div>
                    );
                  }
                  return null;
                })()
              )}
            </div>
          </DialogHeader>
          
          <div className="modal-grid">
            {/* Определяем, какой тип накладной выбран */}
            {(() => {
              const isExpense = formData.type === InvoiceType.EXPENSE;
              const isIncome = formData.type === InvoiceType.INCOME;
              
              return (
                <>
                  {/* Общие поля для всех типов накладных */}
                  <div>
                    <Label htmlFor="type">Тип накладной</Label>
                    <Select
                      value={formData.type}
                      onValueChange={handleInvoiceTypeChange}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(invoiceTypeLabels).map(([value, label]) => (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Поля для РАСХОДНОЙ накладной (бетон для клиента) */}
                  {isExpense && (
                    <>
                      <div>
                        <Label htmlFor="orderId">Заказ</Label>
                        <Select
                          value={formData.orderId}
                          onValueChange={handleOrderChange}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Выберите заказ" />
                          </SelectTrigger>
                          <SelectContent>
                            {orders?.map((order) => (
                              <SelectItem key={order.id} value={order.id.toString()}>
                                #{order.orderNumber} - {order.customer?.name} - {order.quantityM3} м³
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <SelectWithQuickAdd
                          label="Клиент"
                          value={formData.customerId}
                          onValueChange={(value) => setFormData({ ...formData, customerId: value })}
                          options={counterparties?.filter(cp => cp.type === 'CUSTOMER').map(cp => ({
                            value: cp.id.toString(),
                            label: cp.name
                          })) || []}
                          placeholder="Выберите клиента"
                          required
                          enableQuickAdd
                          quickAddTitle="Добавить клиента"
                          quickAddFields={[
                            { name: 'name', label: 'Название', required: true },
                            { name: 'bin', label: 'БИН', required: true },
                            { name: 'phone', label: 'Телефон', type: 'tel', required: true },
                            { name: 'address', label: 'Адрес', required: false },
                            { name: 'email', label: 'Email', type: 'email', required: false },
                          ]}
                          onQuickAdd={async (data) => {
                            await counterpartiesApi.create({
                              name: data.name,
                              kind: 'LEGAL',
                              type: 'CUSTOMER',
                              binOrIin: data.bin || undefined,
                              phone: data.phone,
                              address: data.address || undefined,
                              email: data.email || undefined,
                            });
                            await refetchCounterparties();
                            success('Клиент успешно добавлен!');
                          }}
                        />
                        {formErrors.customerId && (
                          <p className="text-red-500 text-sm mt-1">{formErrors.customerId}</p>
                        )}
                      </div>

                      <div>
                        {/* Отладочная информация о марках бетона */}
                        {(() => {
                          console.log('🔍 Состояние загрузки марок бетона:', concreteMarksLoading);
                          console.log('📋 Загруженные марки бетона:', concreteMarks);
                          return null;
                        })()}
                        {concreteMarksLoading && <p className="text-sm text-gray-600">Загружаем марки бетона...</p>}
                        {!concreteMarksLoading && concreteMarks && concreteMarks.length === 0 && (
                          <p className="text-sm text-gray-600">Марки бетона не найдены. Создайте марку бетона сначала.</p>
                        )}
                        <SelectWithQuickAdd
                          label="Марка бетона"
                          value={formData.concreteMarkId}
                          onValueChange={(value) => {
                            setFormData({ ...formData, concreteMarkId: value });
                            // Автоматически загружаем материалы для выбранной марки бетона
                            if (value && concreteMarks) {
                              console.log('🔍 Выбрана марка бетона:', value);
                              console.log('📋 Все марки бетона:', concreteMarks);
                              
                              const selectedMark = concreteMarks.find(m => m.id.toString() === value);
                              console.log('🎯 Найденная марка:', selectedMark);
                              
                              if (selectedMark && selectedMark.materials) {
                                console.log('📦 Материалы марки:', selectedMark.materials);
                                
                                // Очищаем текущие материалы и добавляем новые
                                const newMaterials = selectedMark.materials.map(cm => ({
                                  materialId: cm.materialId.toString(),
                                  quantityPerM3: cm.quantityPerM3.toString(),
                                  unit: cm.unit
                                }));
                                
                                // Обновляем форму с новыми материалами
                                setFormData(prev => ({
                                  ...prev,
                                  concreteMarkId: value,
                                  concreteMarkMaterials: newMaterials
                                }));
                                
                                console.log('✅ Материалы марки бетона загружены:', newMaterials);
                              } else {
                                console.log('❌ Материалы не найдены для марки:', selectedMark);
                              }
                            } else {
                              console.log('❌ Марки бетона не загружены или значение пустое');
                            }
                          }}
                          options={(() => {
                            console.log('🎯 Формируем опции для марки бетона:', concreteMarks);
                            const options = concreteMarks?.map(m => ({
                              value: m.id.toString(),
                              label: m.name
                            })) || [];
                            console.log('📝 Опции марки бетона:', options);
                            return options;
                          })()}
                          placeholder="Выберите марку бетона"
                          required
                          enableQuickAdd
                          quickAddTitle="Добавить марку бетона"
                          quickAddFields={[
                            { name: 'name', label: 'Название марки', required: true, placeholder: 'М300' },
                          ]}
                          onQuickAdd={async (data) => {
                            await concreteMarksApi.create({
                              name: data.name,
                            });
                            await refetchConcreteMarks();
                            success('Марка бетона добавлена!');
                          }}
                        />
                        {formErrors.concreteMarkId && (
                          <p className="text-red-500 text-sm mt-1">{formErrors.concreteMarkId}</p>
                        )}
                      </div>

                      <div>
                        <Label htmlFor="quantityM3">Количество (м³) *</Label>
                        <Input
                          id="quantityM3"
                          type="number"
                          step="0.1"
                          min="0"
                          value={formData.quantityM3}
                          onChange={(e) => setFormData({ ...formData, quantityM3: e.target.value })}
                          placeholder="Введите количество"
                          className={getFieldClass(formData.quantityM3)}
                        />
                        {formErrors.quantityM3 && (
                          <p className="text-red-500 text-sm mt-1">{formErrors.quantityM3}</p>
                        )}
                      </div>

                      {/* Чекбокс для показа полей цен */}
                      <div className="flex items-center space-x-2 p-3 bg-gray-50 rounded">
                        <Checkbox
                          id="showPrices"
                          checked={showPriceFields}
                          onCheckedChange={(checked) => setShowPriceFields(checked as boolean)}
                        />
                        <Label htmlFor="showPrices" className="cursor-pointer">
                          Указать цены (необязательно)
                        </Label>
                      </div>

                      {/* Поля цен - показываем только если галочка стоит */}
                      {showPriceFields && (
                        <>
                          <div>
                            <Label htmlFor="unitPrice">Цена за м³ *</Label>
                            <Input
                              id="unitPrice"
                              type="number"
                              step="0.01"
                              min="0"
                              value={formData.unitPrice}
                              onChange={(e) => setFormData({ ...formData, unitPrice: e.target.value })}
                              placeholder="Введите цену"
                              className={getFieldClass(formData.unitPrice)}
                            />
                            {formErrors.unitPrice && (
                              <p className="text-red-500 text-sm mt-1">{formErrors.unitPrice}</p>
                            )}
                          </div>

                          <div>
                            <Label htmlFor="totalPrice">Общая сумма (автоматически)</Label>
                            <Input
                              id="totalPrice"
                              type="number"
                              step="0.01"
                              min="0"
                              value={
                                formData.unitPrice && formData.quantityM3
                                  ? (parseFloat(formData.unitPrice) * parseFloat(formData.quantityM3)).toFixed(2)
                                  : formData.totalPrice
                              }
                              readOnly
                              disabled
                              className="bg-gray-100"
                            />
                            <p className="text-xs text-gray-500 mt-1">
                              {formData.unitPrice && formData.quantityM3
                                ? `${parseFloat(formData.unitPrice).toLocaleString('ru-RU')} ₸/м³ × ${formData.quantityM3} м³`
                                : 'Укажите цену и количество'}
                            </p>
                          </div>

                          {/* Чекбокс для НДС - показываем только если включены цены */}
                          <div className="flex items-center space-x-2 p-3 bg-gray-50 rounded border border-gray-300">
                            <Checkbox
                              id="showVat"
                              checked={showVatField}
                              onCheckedChange={(checked) => setShowVatField(checked as boolean)}
                            />
                            <Label htmlFor="showVat" className="cursor-pointer">
                              Включить НДС
                            </Label>
                          </div>

                          {/* Поле ставки НДС */}
                          {showVatField && (
                            <div>
                              <Label htmlFor="vatRate">Ставка НДС (%)</Label>
                              <Input
                                id="vatRate"
                                type="number"
                                step="0.01"
                                min="0"
                                max="100"
                                value={vatRate}
                                onChange={(e) => setVatRate(e.target.value)}
                                placeholder="Введите ставку НДС"
                              />
                              <p className="text-xs text-gray-500 mt-1">
                                {formData.unitPrice && formData.quantityM3 && vatRate ? (
                                  <>
                                    НДС от общей суммы: {((parseFloat(formData.unitPrice) * parseFloat(formData.quantityM3) * parseFloat(vatRate)) / 100).toLocaleString('ru-RU')} ₸
                                  </>
                                ) : '—'}
                              </p>
                              <p className="text-sm font-bold text-gray-900 mt-1">
                                {formData.unitPrice && formData.quantityM3 && vatRate ? (
                                  <>
                                    Итого с НДС: {((parseFloat(formData.unitPrice) * parseFloat(formData.quantityM3)) * (1 + parseFloat(vatRate) / 100)).toLocaleString('ru-RU')} ₸
                                  </>
                                ) : '—'}
                              </p>
                            </div>
                          )}
                        </>
                      )}
                    </>
                  )}

                  {/* Поля для ПРИХОДНОЙ накладной (материалы на склад) */}
                  {isIncome && (
                    <>
                      <div>
                        <SelectWithQuickAdd
                          label="Поставщик"
                          value={formData.supplierId}
                          onValueChange={(value) => setFormData({ ...formData, supplierId: value })}
                          options={counterparties?.filter(cp => cp.type === 'SUPPLIER').map(cp => ({
                            value: cp.id.toString(),
                            label: cp.name
                          })) || []}
                          placeholder="Выберите поставщика (опционально)"
                          enableQuickAdd
                          quickAddTitle="Добавить поставщика"
                          quickAddFields={[
                            { name: 'name', label: 'Название', required: true },
                            { name: 'bin', label: 'БИН', required: true },
                            { name: 'phone', label: 'Телефон', type: 'tel', required: true },
                            { name: 'address', label: 'Адрес', required: false },
                            { name: 'email', label: 'Email', type: 'email', required: false },
                          ]}
                          onQuickAdd={async (data) => {
                            await counterpartiesApi.create({
                              name: data.name,
                              kind: 'LEGAL',
                              type: 'SUPPLIER',
                              binOrIin: data.bin || undefined,
                              phone: data.phone,
                              address: data.address || undefined,
                              email: data.email || undefined,
                            });
                            await refetchCounterparties();
                            success('Поставщик успешно добавлен!');
                          }}
                        />
                        {formErrors.supplierId && (
                          <p className="text-red-500 text-sm mt-1">{formErrors.supplierId}</p>
                        )}
                      </div>

                      <div>
                        <SelectWithQuickAdd
                          label="Материал"
                          value={formData.materialId}
                          onValueChange={(value) => setFormData({ ...formData, materialId: value })}
                          options={materials?.map(m => ({
                            value: m.id.toString(),
                            label: `${m.name} (${m.unit})`
                          })) || []}
                          placeholder="Выберите материал (опционально)"
                          enableQuickAdd
                          quickAddTitle="Добавить материал"
                          quickAddFields={[
                            { name: 'name', label: 'Название материала', required: true },
                            { 
                              name: 'unit', 
                              label: 'Единица измерения', 
                              type: 'select',
                              required: true, 
                              placeholder: 'Выберите единицу',
                              options: [
                                { value: 'шт', label: 'Штуки (шт)' },
                                { value: 'кг', label: 'Килограммы (кг)' },
                                { value: 'л', label: 'Литры (л)' },
                                { value: 'м', label: 'Метры (м)' },
                                { value: 'м²', label: 'Квадратные метры (м²)' },
                                { value: 'м³', label: 'Кубические метры (м³)' },
                                { value: 'т', label: 'Тонны (т)' },
                                { value: 'упак', label: 'Упаковки (упак)' },
                                { value: 'комп', label: 'Комплекты (комп)' },
                                { value: 'пара', label: 'Пары (пара)' },
                                { value: 'рулон', label: 'Рулоны (рулон)' },
                                { value: 'лист', label: 'Листы (лист)' },
                              ]
                            },
                          ]}
                          onQuickAdd={async (data) => {
                            await materialsApi.create({
                              name: data.name,
                              unit: data.unit,
                            });
                            await refetchMaterials();
                            success('Материал добавлен!');
                          }}
                        />
                        {formErrors.materialId && (
                          <p className="text-red-500 text-sm mt-1">{formErrors.materialId}</p>
                        )}
                      </div>

                      <div>
                        <Label htmlFor="grossWeightKg">Брутто (кг) *</Label>
                        <div className="flex gap-2 items-center">
                          <Input
                            id="grossWeightKg"
                            type="number"
                            step="0.1"
                            min="0"
                            value={formData.grossWeightKg}
                            onChange={(e) => handleGrossWeightChange(e.target.value)}
                            placeholder="Нажмите кнопку БРУТТО"
                            className={getFieldClass(formData.grossWeightKg, 'flex-1 bg-gray-50')}
                            readOnly
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={handleGetBruttoFromScale}
                            disabled={!formData.warehouseId || loadingScale}
                            className="px-4 whitespace-nowrap"
                          >
                            {loadingScale ? '...' : 'БРУТТО'}
                          </Button>
                          {liveWeight && (
                            <span className="text-xs text-gray-600 whitespace-nowrap">Текущий: <span className="font-semibold">{liveWeight.weight} кг</span></span>
                          )}
                        </div>
                        {formData.grossWeightAt && (
                          <p className="text-xs text-gray-500 mt-1">Время фиксации брутто: {new Date(formData.grossWeightAt).toLocaleString('ru-RU')}</p>
                        )}
                        {formErrors.grossWeightKg && (
                          <p className="text-red-500 text-sm mt-1">{formErrors.grossWeightKg}</p>
                        )}
                      </div>

                      <div>
                        <Label htmlFor="tareWeightKg">Тара (кг)</Label>
                        <div className="flex gap-2 items-center">
                          <Input
                            id="tareWeightKg"
                            type="number"
                            step="0.1"
                            min="0"
                            value={formData.tareWeightKg}
                            onChange={(e) => handleTareWeightChange(e.target.value)}
                            placeholder="Введите вес тары"
                            className={getFieldClass(formData.tareWeightKg, 'flex-1')}
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={handleGetTareFromScale}
                            disabled={!formData.warehouseId || loadingScale}
                            className="px-4 whitespace-nowrap"
                          >
                            {loadingScale ? '...' : 'ТАРА'}
                          </Button>
                          {liveWeight && (
                            <span className="text-xs text-gray-600 whitespace-nowrap">Текущий: <span className="font-semibold">{liveWeight.weight} кг</span></span>
                          )}
                        </div>
                        {formData.tareWeightAt && (
                          <p className="text-xs text-gray-500 mt-1">Время фиксации тары: {new Date(formData.tareWeightAt).toLocaleString('ru-RU')}</p>
                        )}
                      </div>

                      <div>
                        <Label htmlFor="netWeightKg">Нетто (кг) - авторасчет</Label>
                        <Input
                          id="netWeightKg"
                          type="number"
                          step="0.1"
                          min="0"
                          value={formData.netWeightKg}
                          onChange={(e) => setFormData({ ...formData, netWeightKg: e.target.value })}
                          placeholder="Брутто - Тара"
                          className="bg-gray-50"
                          readOnly
                        />
                        <p className="text-xs text-gray-500 mt-1">Автоматически: Брутто - Тара</p>
                      </div>

                      {/* Информация о последней фиксации веса */}
                      {lastWeighInfo && (
                        <div className="col-span-2 bg-gray-50 border border-gray-300 rounded-md p-3">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-gray-900 font-semibold text-sm">
                              Последняя фиксация: {lastWeighInfo.type === 'brutto' ? 'БРУТТО' : 'ТАРА'}
                            </span>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div>
                              <span className="text-gray-700">Вес:</span>
                              <span className="ml-2 font-semibold text-gray-900">{lastWeighInfo.weight} кг</span>
                            </div>
                            <div>
                              <span className="text-gray-700">Время:</span>
                              <span className="ml-2 text-gray-900">
                                {new Date(lastWeighInfo.timestamp).toLocaleString('ru-RU', {
                                  day: '2-digit',
                                  month: '2-digit',
                                  year: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                  second: '2-digit'
                                })}
                              </span>
                            </div>
                          </div>
                          {lastWeighInfo.photoUrl && (
                            <div className="mt-2 flex items-center gap-2">
                              <span className="px-2 py-1 bg-white rounded text-xs text-gray-900 border border-gray-300">
                                Фото сохранено
                              </span>
                            </div>
                          )}
                        </div>
                      )}

                      <div>
                        <Label htmlFor="moisturePercent">Влажность (%)</Label>
                        <Input
                          id="moisturePercent"
                          type="number"
                          step="0.1"
                          min="0"
                          max="100"
                          value={formData.moisturePercent}
                          onChange={(e) => handleMoisturePercentChange(e.target.value)}
                          placeholder="Введите влажность"
                        />
                      </div>

                      <div>
                        <Label htmlFor="correctedWeightKg">Скорректированный вес (кг) - авторасчет</Label>
                        <Input
                          id="correctedWeightKg"
                          type="number"
                          step="0.1"
                          min="0"
                          value={formData.correctedWeightKg}
                          onChange={(e) => setFormData({ ...formData, correctedWeightKg: e.target.value })}
                          placeholder="Автоматически рассчитывается"
                          className="bg-gray-50"
                          readOnly
                        />
                        <p className="text-xs text-gray-500 mt-1">Нетто - (Нетто × Влажность/100)</p>
                      </div>
                    </>
                  )}

                  {/* Общие поля для всех типов накладных */}
                  <div>
                    <SelectWithQuickAdd
                      label="Склад"
                      value={formData.warehouseId}
                      onValueChange={handleWarehouseChange}
                      options={warehouses?.map(w => ({
                        value: w.id.toString(),
                        label: w.name
                      })) || []}
                      placeholder="Выберите склад"
                      required
                      enableQuickAdd
                      quickAddTitle="Добавить склад"
                      quickAddFields={[
                        { name: 'name', label: 'Название склада', required: true },
                        { name: 'address', label: 'Адрес', required: true },
                        { name: 'phone', label: 'Телефон', type: 'tel', required: false },
                        { name: 'companyId', label: 'ID компании', type: 'number', required: true, placeholder: '1' },
                      ]}
                      onQuickAdd={async (data) => {
                        await warehousesApi.create({
                          name: data.name,
                          address: data.address,
                          phone: data.phone || undefined,
                          companyId: parseInt(data.companyId),
                        });
                        await refetchWarehouses();
                        success('Склад добавлен!');
                      }}
                    />
                    {formErrors.warehouseId && (
                      <p className="text-red-500 text-sm mt-1">{formErrors.warehouseId}</p>
                    )}
                  </div>

                  {/* Общие поля для логистики и доставки */}
                  <div>
                    <SelectWithQuickAdd
                      label="Водитель"
                      value={formData.driverId}
                      onValueChange={(value) => setFormData({ ...formData, driverId: value })}
                      options={drivers?.map(d => ({
                        value: d.id.toString(),
                        label: `${d.firstName} ${d.lastName}`
                      })) || []}
                      placeholder={isIncome ? "Выберите водителя (опционально)" : "Выберите водителя"}
                      enableQuickAdd
                      quickAddTitle="Добавить водителя"
                      quickAddFields={[
                        { name: 'firstName', label: 'Имя', required: true },
                        { name: 'lastName', label: 'Фамилия', required: true },
                        { name: 'phone', label: 'Телефон (логин)', type: 'tel', required: true },
                        { name: 'email', label: 'Email', type: 'email', required: false },
                      ]}
                      onQuickAdd={async (data) => {
                        await driversApi.create({
                          firstName: data.firstName,
                          lastName: data.lastName,
                          phone: data.phone,
                          email: data.email || undefined,
                        });
                        await refetchDrivers();
                        success('Водитель добавлен!');
                      }}
                    />
                    {formErrors.driverId && (
                      <p className="text-red-500 text-sm mt-1">{formErrors.driverId}</p>
                    )}
                  </div>

                  <div>
                    <SelectWithQuickAdd
                      label="Транспорт"
                      value={formData.vehicleId}
                      onValueChange={(value) => setFormData({ ...formData, vehicleId: value })}
                      options={vehicles?.map(v => ({
                        value: v.id.toString(),
                        label: `${v.plate}${v.type ? ` - ${v.type}` : ''}`
                      })) || []}
                      placeholder={isIncome ? "Выберите транспорт (опционально)" : "Выберите транспорт"}
                      enableQuickAdd
                      quickAddTitle="Добавить транспорт"
                      quickAddFields={[
                        { name: 'plate', label: 'Номер автомобиля', required: true, placeholder: 'А123БВ' },
                        { name: 'type', label: 'Тип транспорта', required: false, placeholder: 'КамАЗ' },
                        { name: 'capacity', label: 'Грузоподъёмность', type: 'number', required: true },
                        { 
                          name: 'unit', 
                          label: 'Единица измерения', 
                          type: 'select',
                          required: true, 
                          placeholder: 'Выберите единицу',
                          options: [
                            { value: 'кг', label: 'Килограммы (кг)' },
                            { value: 'т', label: 'Тонны (т)' },
                            { value: 'м³', label: 'Кубические метры (м³)' },
                            { value: 'л', label: 'Литры (л)' },
                          ]
                        },
                      ]}
                      onQuickAdd={async (data) => {
                        await vehiclesApi.create({
                          plate: data.plate,
                          type: data.type || undefined,
                          capacity: parseFloat(data.capacity),
                          unit: data.unit,
                        });
                        await refetchVehicles();
                        success('Транспорт добавлен!');
                      }}
                    />
                    {formErrors.vehicleId && (
                      <p className="text-red-500 text-sm mt-1">{formErrors.vehicleId}</p>
                    )}
                  </div>

                  <div>
                    <SelectWithQuickAdd
                      label="Компания"
                      value={formData.companyId}
                      onValueChange={(value) => setFormData({ ...formData, companyId: value })}
                      options={companies?.map(c => ({
                        value: c.id.toString(),
                        label: c.name
                      })) || []}
                      placeholder="Выберите компанию"
                      enableQuickAdd
                      quickAddTitle="Добавить компанию"
                      quickAddFields={[
                        { name: 'name', label: 'Название компании', required: true },
                        { name: 'bin', label: 'БИН', required: true },
                        { name: 'address', label: 'Адрес', required: false },
                        { name: 'phone', label: 'Телефон', type: 'tel', required: false },
                        { name: 'email', label: 'Email', type: 'email', required: false },
                      ]}
                      onQuickAdd={async (data) => {
                        await companiesApi.create({
                          name: data.name,
                          bin: data.bin,
                          address: data.address || undefined,
                          phone: data.phone || undefined,
                          email: data.email || undefined,
                        });
                        await refetchCompanies();
                        success('Компания добавлена!');
                      }}
                    />
                  </div>

                  <div>
                    <Label htmlFor="deliveryDate">
                      Дата доставки
                      {formData.type === InvoiceType.INCOME && (
                        <span className="text-xs text-gray-500 ml-2">(автозаполнение)</span>
                      )}
                    </Label>
                    <Input
                      id="deliveryDate"
                      type={formData.type === InvoiceType.INCOME ? "datetime-local" : "date"}
                      value={formData.deliveryDate}
                      onChange={(e) => setFormData({ ...formData, deliveryDate: e.target.value })}
                      placeholder={formData.type === InvoiceType.INCOME ? "ДД.ММ.ГГГГ ЧЧ:ММ" : "ДД.ММ.ГГГГ"}
                      className={formData.type === InvoiceType.INCOME ? "bg-gray-50" : ""}
                    />
                  </div>

                  <div>
                    <Label htmlFor="deliveryAddress">Адрес доставки</Label>
                    <Input
                      id="deliveryAddress"
                      value={formData.deliveryAddress}
                      onChange={(e) => setFormData({ ...formData, deliveryAddress: e.target.value })}
                      placeholder="Введите адрес доставки"
                    />
                  </div>

                  <div>
                    <Label htmlFor="coordinates">Координаты</Label>
                    <Input
                      id="coordinates"
                      value={formData.coordinates}
                      onChange={(e) => setFormData({ ...formData, coordinates: e.target.value })}
                      placeholder="Введите координаты"
                    />
                  </div>

                  <div>
                    <Label htmlFor="notes">Примечания</Label>
                    <Input
                      id="notes"
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      placeholder="Введите примечания"
                    />
                  </div>

                  {/* Новые поля для расходных накладных */}
                  {formData.type === InvoiceType.EXPENSE && (
                    <>
                      <div>
                        <Label htmlFor="contractNumber">Договор <span className="text-red-500">*</span></Label>
                        <Input
                          id="contractNumber"
                          value={formData.contractNumber}
                          onChange={(e) => setFormData({ ...formData, contractNumber: e.target.value })}
                          placeholder="Введите номер договора"
                          required
                          className={getFieldClass(formData.contractNumber)}
                        />
                        {formErrors.contractNumber && (
                          <p className="text-red-500 text-sm mt-1">{formErrors.contractNumber}</p>
                        )}
                      </div>

                      <div>
                        <Label htmlFor="sealNumbers">Пломба <span className="text-red-500">*</span></Label>
                        <Input
                          id="sealNumbers"
                          value={formData.sealNumbers}
                          onChange={(e) => setFormData({ ...formData, sealNumbers: e.target.value })}
                          placeholder="Введите номер пломбы"
                          required
                          className={getFieldClass(formData.sealNumbers)}
                        />
                        {formErrors.sealNumbers && (
                          <p className="text-red-500 text-sm mt-1">{formErrors.sealNumbers}</p>
                        )}
                      </div>

                      <div>
                        <Label htmlFor="departedPlantAt">Время убытия с завода</Label>
                        <Input
                          id="departedPlantAt"
                          type="datetime-local"
                          value={formData.departedPlantAt}
                          onChange={(e) => setFormData({ ...formData, departedPlantAt: e.target.value })}
                          className={getFieldClass(formData.departedPlantAt)}
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Автоматически заполняется текущим временем
                        </p>
                      </div>

                      <div>
                        <Label htmlFor="arrivedSiteAt">Время прибытия на объект</Label>
                        <Input
                          id="arrivedSiteAt"
                          type="datetime-local"
                          value={formData.arrivedSiteAt}
                          onChange={(e) => setFormData({ ...formData, arrivedSiteAt: e.target.value })}
                          className={getFieldClass(formData.arrivedSiteAt)}
                        />
                      </div>

                      <div>
                        <Label htmlFor="departedSiteAt">Время убытия с объекта</Label>
                        <Input
                          id="departedSiteAt"
                          type="datetime-local"
                          value={formData.departedSiteAt}
                          onChange={(e) => setFormData({ ...formData, departedSiteAt: e.target.value })}
                          className={getFieldClass(formData.departedSiteAt)}
                        />
                      </div>

                      {/* Материалы марки бетона */}
                      {(() => {
                        console.log('🔍 Отображение материалов:', formData.concreteMarkMaterials);
                        return null;
                      })()}
                      {formData.concreteMarkMaterials.length > 0 && (
                        <div className="col-span-2">
                          <Label>Материалы марки бетона (можно редактировать)</Label>
                          <div className="mt-2 space-y-2 border border-gray-200 rounded-md p-3 bg-gray-50">
                            {formData.concreteMarkMaterials.map((material, index) => {
                              const materialInfo = materials?.find(m => m.id.toString() === material.materialId);
                              return (
                                <div key={index} className="grid grid-cols-3 gap-2 items-center">
                                  <div>
                                    <Label className="text-xs text-gray-600">Материал</Label>
                                    <p className="text-sm font-medium">{materialInfo?.name || `ID: ${material.materialId}`}</p>
                                  </div>
                                  <div>
                                    <Label className="text-xs text-gray-600">Количество на м³</Label>
                                    <Input
                                      value={material.quantityPerM3}
                                      onChange={(e) => {
                                        const newMaterials = [...formData.concreteMarkMaterials];
                                        newMaterials[index] = { ...material, quantityPerM3: e.target.value };
                                        setFormData({ ...formData, concreteMarkMaterials: newMaterials });
                                      }}
                                      className="text-sm"
                                      type="number"
                                      step="0.1"
                                    />
                                  </div>
                                  <div>
                                    <Label className="text-xs text-gray-600">Единица</Label>
                                    <Input
                                      value={material.unit}
                                      onChange={(e) => {
                                        const newMaterials = [...formData.concreteMarkMaterials];
                                        newMaterials[index] = { ...material, unit: e.target.value };
                                        setFormData({ ...formData, concreteMarkMaterials: newMaterials });
                                      }}
                                      className="text-sm"
                                    />
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                          <p className="text-xs text-gray-500 mt-1">
                            Материалы автоматически загружены из настроек марки бетона. Вы можете изменить количество и единицы измерения.
                          </p>
                        </div>
                      )}
                    </>
                  )}
                </>
              );
            })()}
          </div>

          <DialogFooter className="flex flex-col sm:flex-row gap-2 sm:gap-3">
            <Button variant="outline" onClick={resetForm} className="w-full sm:w-auto">
              Отмена
            </Button>
            <Button onClick={handleSubmit} className="w-full sm:w-auto bg-gray-800 hover:bg-gray-900">
              {editingInvoice ? 'Обновить' : 'Создать'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent className="w-[95vw] sm:w-auto max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg">Подтвердите удаление</AlertDialogTitle>
            <AlertDialogDescription className="text-sm">
              Вы уверены, что хотите удалить эту накладную? Это действие нельзя отменить.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex flex-col sm:flex-row gap-2">
            <AlertDialogCancel className="w-full sm:w-auto">Отмена</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="w-full sm:w-auto bg-gray-800 hover:bg-gray-900">
              Удалить
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Компонент для печати накладной */}
      {printInvoice && (
        <div className="hidden print:block print:absolute print:top-0 print:left-0 print:w-full print:z-50">
          <div className="two-up-container">
            <div className="half-page">
              <InvoicePrintComponent invoice={printInvoice} />
            </div>
            <div className="half-page">
              <InvoicePrintComponent invoice={printInvoice} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Компонент для печати накладной
const InvoicePrintComponent: React.FC<{ invoice: Invoice }> = ({ invoice }) => {
  const getInvoiceTypeLabel = (type: InvoiceType) => {
    return type === InvoiceType.EXPENSE ? 'Расходная накладная' : 'Приходная накладная';
  };

  // Функция для форматирования ФИО в формат "Фамилия И.О."
  const formatFio = (user: User | undefined): string => {
    if (!user) return '_________________';
    
    const lastName = user.lastName || '';
    const firstName = user.firstName || '';
    
    if (!lastName && !firstName) {
      // Если нет имени и фамилии, используем логин
      return user.username || user.login || '_________________';
    }
    
    // Формируем инициалы
    const firstInitial = firstName ? firstName.charAt(0).toUpperCase() + '.' : '';
    const middleInitial = ''; // У нас нет отчества в структуре User
    
    // Формируем строку "Фамилия И."
    if (lastName && firstName) {
      return `${lastName} ${firstInitial}`.trim();
    } else if (lastName) {
      return lastName;
    } else if (firstName) {
      return firstName;
    }
    
    return '_________________';
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('ru-RU', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Учет влажности: если есть moisturePercent и correctedWeightKg — используем скорректированное нетто
  const hasMoisture = typeof (invoice as any).moisturePercent === 'number' && (invoice as any).moisturePercent > 0 && typeof (invoice as any).correctedWeightKg === 'number';
  const effectiveNetKg: number | null = hasMoisture
    ? (invoice as any).correctedWeightKg as unknown as number
    : (typeof invoice.netWeightKg === 'number' ? invoice.netWeightKg : null);

  const isIncome = invoice.type !== InvoiceType.EXPENSE;

  return (
    <div className="bg-white p-8 print:p-2 print:bg-white" style={{ fontFamily: 'Arial, sans-serif' }}>
      {/* Заголовок документа */}
      <div className="text-center mb-8 print:mb-3">
        <h1 className="text-2xl font-bold mb-2 print:text-xl">
          {getInvoiceTypeLabel(invoice.type)} № {invoice.invoiceNumber} от {formatDate(invoice.date)}
        </h1>
      </div>

      {/* Компактный блок: Организация и Поставщик в одной строке */}
      <div className="mb-6 print:mb-4 grid grid-cols-2 gap-4">
        <div className="border border-gray-300 p-4 print:p-3">
          <h2 className="text-base font-semibold mb-2 print:text-sm">Организация (покупатель)</h2>
          <p className="font-semibold print:text-sm">{invoice.company?.name || '—'}</p>
          <div className="text-xs print:text-xs space-y-1">
            {(invoice.company as any)?.bin && (<p>БИН: {(invoice.company as any).bin}</p>)}
            {(invoice.company as any)?.inn && (
              <p>
                ИНН: {(invoice.company as any).inn}
                {(invoice.company as any)?.kpp ? ` | КПП: ${(invoice.company as any).kpp}` : ''}
                {(invoice.company as any)?.ogrn ? ` | ОГРН: ${(invoice.company as any).ogrn}` : ''}
              </p>
            )}
            {invoice.company?.address && (<p>Адрес: {invoice.company.address}</p>)}
          </div>
        </div>

        <div className="border border-gray-300 p-4 print:p-3">
          <h2 className="text-base font-semibold mb-2 print:text-sm">{invoice.type === InvoiceType.EXPENSE ? 'Получатель' : 'Поставщик'}</h2>
          <p className="font-semibold print:text-sm">{invoice.customer?.name || invoice.supplier?.name || '—'}</p>
          <div className="text-xs print:text-xs space-y-1">
            {(invoice.customer as any)?.inn && (<p>ИНН: {(invoice.customer as any).inn}</p>)}
            {(invoice.supplier as any)?.inn && !((invoice.customer as any)?.inn) && (<p>ИНН: {(invoice.supplier as any).inn}</p>)}
            {(invoice.customer as any)?.address && (<p>Адрес: {(invoice.customer as any).address}</p>)}
            {(invoice.supplier as any)?.address && !((invoice.customer as any)?.address) && (<p>Адрес: {(invoice.supplier as any).address}</p>)}
          </div>
        </div>
      </div>

      {/* Компактный блок: Транспорт и Дополнительная информация в одной строке */}
      <div className="mb-6 print:mb-4 grid grid-cols-2 gap-4">
        {/* Транспорт */}
        {(invoice.driver || invoice.vehicle) && (
          <div>
            <h2 className="text-lg font-semibold mb-3 print:text-base">Транспорт</h2>
            <table className="w-full" style={{ borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th className="border border-gray-300 p-2 text-left text-xs print:text-xs">Водитель</th>
                  <th className="border border-gray-300 p-2 text-left text-xs print:text-xs">Телефон</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border border-gray-300 p-2 text-xs print:text-xs">{invoice.driver?.name || '—'}</td>
                  <td className="border border-gray-300 p-2 text-xs print:text-xs">{invoice.driver?.phone || '—'}</td>
                </tr>
              </tbody>
            </table>
            <table className="w-full mt-2" style={{ borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th className="border border-gray-300 p-2 text-left text-xs print:text-xs">Транспорт</th>
                  <th className="border border-gray-300 p-2 text-left text-xs print:text-xs">Гос. номер</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border border-gray-300 p-2 text-xs print:text-xs">{invoice.vehicle?.type || '—'}</td>
                  <td className="border border-gray-300 p-2 text-xs print:text-xs">{invoice.vehicle?.plate || '—'}</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {/* Дополнительная информация для расходных накладных */}
        {!isIncome && (
          <div>
            <h2 className="text-lg font-semibold mb-3 print:text-base">Дополнительная информация</h2>
            <div className="border border-gray-300">
              <table className="w-full" style={{ borderCollapse: 'collapse' }}>
                <tbody>
                  <tr>
                    <td className="border border-gray-300 p-2 text-xs print:text-xs font-semibold bg-gray-50 print:bg-gray-100" style={{ width: '40%' }}>
                      Договор:
                    </td>
                    <td className="border border-gray-300 p-2 text-xs print:text-xs">
                      {(invoice as any).contractNumber || 'Без договора'}
                    </td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 p-2 text-xs print:text-xs font-semibold bg-gray-50 print:bg-gray-100">
                      Пломба:
                    </td>
                    <td className="border border-gray-300 p-2 text-xs print:text-xs">
                      {(invoice.sealNumbers && invoice.sealNumbers.length > 0) ? invoice.sealNumbers.join(', ') : '—'}
                    </td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 p-2 text-xs print:text-xs font-semibold bg-gray-50 print:bg-gray-100">
                      Убытие с завода:
                    </td>
                    <td className="border border-gray-300 p-2 text-xs print:text-xs">
                      {(invoice as any).departedPlantAt 
                        ? new Date((invoice as any).departedPlantAt).toLocaleString('ru-RU', {
                            year: 'numeric',
                            month: '2-digit',
                            day: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit'
                          })
                        : '___________________'}
                    </td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 p-2 text-xs print:text-xs font-semibold bg-gray-50 print:bg-gray-100">
                      Прибытие на объект:
                    </td>
                    <td className="border border-gray-300 p-2 text-xs print:text-xs">
                      {(invoice as any).arrivedSiteAt 
                        ? new Date((invoice as any).arrivedSiteAt).toLocaleString('ru-RU', {
                            year: 'numeric',
                            month: '2-digit',
                            day: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit'
                          })
                        : '___________________'}
                    </td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 p-2 text-xs print:text-xs font-semibold bg-gray-50 print:bg-gray-100">
                      Убытие с объекта:
                    </td>
                    <td className="border border-gray-300 p-2 text-xs print:text-xs">
                      {(invoice as any).departedSiteAt 
                        ? new Date((invoice as any).departedSiteAt).toLocaleString('ru-RU', {
                            year: 'numeric',
                            month: '2-digit',
                            day: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit'
                          })
                        : '___________________'}
                    </td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 p-2 text-xs print:text-xs font-semibold bg-gray-50 print:bg-gray-100">
                      Склад:
                    </td>
                    <td className="border border-gray-300 p-2 text-xs print:text-xs">
                      {(invoice as any).warehouse?.name || '—'}
                    </td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 p-2 text-xs print:text-xs font-semibold bg-gray-50 print:bg-gray-100">
                      Расстояние (км):
                    </td>
                    <td className="border border-gray-300 p-2 text-xs print:text-xs">
                      {invoice.distanceKm ? `${invoice.distanceKm} км` : '—'}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Информация о материалах */}
      <div className="mb-6 print:mb-4">
        <h2 className="text-lg font-semibold mb-3 print:text-base">Материалы</h2>
        <div className="border border-gray-300">
          <table className="w-full">
            <thead className="bg-gray-50 print:bg-gray-100">
              <tr>
                <th className="border border-gray-300 p-2 text-left text-sm print:text-xs">Наименование</th>
                {isIncome ? null : (
                  <th className="border border-gray-300 p-2 text-center text-sm print:text-xs">Количество (м³)</th>
                )}
                <th className="border border-gray-300 p-2 text-center text-sm print:text-xs">Вес (кг)</th>
                {/* Показываем колонки цен только если есть цены в накладной */}
                {!isIncome && (invoice.basePricePerM3 || invoice.salePricePerM3) && (
                  <>
                    <th className="border border-gray-300 p-2 text-center text-sm print:text-xs">Цена за м³</th>
                    <th className="border border-gray-300 p-2 text-center text-sm print:text-xs">Сумма</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {/* Для расходной накладной выводим марку бетона */}
              {!isIncome && invoice.concreteMark?.name && (
                <tr>
                  <td className="border border-gray-300 p-2 text-sm print:text-xs">
                    {invoice.concreteMark.name}
                  </td>
                  <td className="border border-gray-300 p-2 text-center text-sm print:text-xs">
                    {invoice.quantityM3 || '-'}
                  </td>
                  <td className="border border-gray-300 p-2 text-center text-sm print:text-xs">
                    {invoice.netWeightKg || invoice.grossWeightKg || '-'}
                  </td>
                  {/* Колонки цен для расходной накладной */}
                  {(invoice.basePricePerM3 || invoice.salePricePerM3) && (
                    <>
                      <td className="border border-gray-300 p-2 text-center text-sm print:text-xs">
                        {invoice.basePricePerM3 ? `${invoice.basePricePerM3.toLocaleString('ru-RU')} ₸` : '-'}
                      </td>
                      <td className="border border-gray-300 p-2 text-center text-sm print:text-xs">
                        {invoice.basePricePerM3 && invoice.quantityM3 
                          ? `${(invoice.basePricePerM3 * invoice.quantityM3).toLocaleString('ru-RU')} ₸` 
                          : '-'}
                      </td>
                    </>
                  )}
                </tr>
              )}
              
              {/* Для приходной накладной выводим материал из поля формы, даже если нет позиций */}
              {isIncome && invoice.material?.name && (
                <tr>
                  <td className="border border-gray-300 p-2 text-sm print:text-xs">
                    {invoice.material.name}
                  </td>
                  {/* для приходной колонка м³ скрыта */}
                  <td className="border border-gray-300 p-2 text-center text-sm print:text-xs">
                    {invoice.netWeightKg || invoice.grossWeightKg || '-'}
                  </td>
                </tr>
              )}
              {invoice.items?.map((item, index) => (
                <tr key={index}>
                  <td className="border border-gray-300 p-2 text-sm print:text-xs">
                    {item.material?.name || 'Не указан'}
                  </td>
                  {isIncome ? null : (
                    <td className="border border-gray-300 p-2 text-center text-sm print:text-xs">
                      {item.quantity || '-'}
                    </td>
                  )}
                  <td className="border border-gray-300 p-2 text-center text-sm print:text-xs">
                    {item.quantity || '-'} {item.unit}
                  </td>
                  {/* Колонки цен показываем только если есть цены в накладной */}
                  {!isIncome && (invoice.basePricePerM3 || invoice.salePricePerM3) && (
                    <>
                      <td className="border border-gray-300 p-2 text-center text-sm print:text-xs">
                        {invoice.basePricePerM3 ? `${invoice.basePricePerM3.toLocaleString('ru-RU')} ₸` : '-'}
                      </td>
                      <td className="border border-gray-300 p-2 text-center text-sm print:text-xs">
                        {invoice.basePricePerM3 && invoice.quantityM3 
                          ? `${(invoice.basePricePerM3 * invoice.quantityM3).toLocaleString('ru-RU')} ₸` 
                          : '-'}
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Весовые данные */}
      {(invoice.grossWeightKg || invoice.tareWeightKg || effectiveNetKg) && (
        <div className="mb-6 print:mb-4">
          <h2 className="text-lg font-semibold mb-3 print:text-base">Весовые данные</h2>
          <div className="grid grid-cols-3 gap-4 print:grid-cols-3">
            {invoice.grossWeightKg && (
              <div className="border border-gray-300 p-3 print:p-2 text-center">
                <p className="font-semibold text-sm print:text-xs">Брутто</p>
                <p className="text-lg font-bold print:text-base">{invoice.grossWeightKg} кг</p>
                {invoice.grossWeightAt && (
                  <p className="text-xs text-gray-600 print:text-xs">Время фиксации: {new Date(invoice.grossWeightAt).toLocaleString('ru-RU')}</p>
                )}
              </div>
            )}
            {invoice.tareWeightKg && (
              <div className="border border-gray-300 p-3 print:p-2 text-center">
                <p className="font-semibold text-sm print:text-xs">Тара</p>
                <p className="text-lg font-bold print:text-base">{invoice.tareWeightKg} кг</p>
                {invoice.tareWeightAt && (
                  <p className="text-xs text-gray-600 print:text-xs">Время фиксации: {new Date(invoice.tareWeightAt).toLocaleString('ru-RU')}</p>
                )}
              </div>
            )}
            {(effectiveNetKg !== null) && (
              <div className="border border-gray-300 p-3 print:p-2 text-center">
                <p className="font-semibold text-sm print:text-xs">{hasMoisture ? 'Нетто (с учетом влажности)' : 'Нетто'}</p>
                <p className="text-lg font-bold print:text-base">{effectiveNetKg} кг</p>
                {hasMoisture && (
                  <p className="text-xs text-gray-600 print:text-xs">Влажность: {(invoice as any).moisturePercent}%{typeof invoice.netWeightKg === 'number' ? `, исходное нетто: ${invoice.netWeightKg} кг` : ''}</p>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Итоговая информация */}
      <div className="mb-6 print:mb-4">
        <div className="border-t-2 border-gray-400 pt-4 print:pt-3">
          {/* Итого показываем только если есть цены */}
          {!isIncome && (invoice.basePricePerM3 || invoice.salePricePerM3) && (
            <div className="text-right">
              {(invoice as any).vatRate && (invoice as any).vatAmount && invoice.basePricePerM3 && invoice.quantityM3 ? (
                <>
                  <p className="text-sm print:text-xs mb-1">
                    <strong>Сумма без НДС:</strong> {(invoice.basePricePerM3 * invoice.quantityM3).toLocaleString('ru-RU')} ₸
                  </p>
                  <p className="text-sm print:text-xs mb-1">
                    <strong>НДС ({(invoice as any).vatRate}%):</strong> {((invoice as any).vatAmount).toLocaleString('ru-RU')} ₸
                  </p>
                  <p className="text-lg font-bold print:text-base">
                    <strong>Итого с НДС: {((invoice.basePricePerM3 * invoice.quantityM3) + (invoice as any).vatAmount).toLocaleString('ru-RU')} ₸</strong>
                  </p>
                </>
              ) : (
                <p className="text-lg font-bold print:text-base">
                  <strong>Итого: {invoice.basePricePerM3 && invoice.quantityM3 ? (invoice.basePricePerM3 * invoice.quantityM3).toLocaleString('ru-RU') : 0} ₸</strong>
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Отступ между материалами и подписями */}
      <div className="mb-8 print:mb-6">
        <br />
        <br />
      </div>

      {/* Подписи */}
      <div className="grid grid-cols-2 gap-8 print:gap-6">
        <div>
          <p className="text-sm print:text-xs mb-8 print:mb-6">
            Отпустил: {invoice.type === InvoiceType.EXPENSE 
              ? (invoice.releasedByFio || formatFio(invoice.createdBy))
              : '_________________'}
          </p>
          <p className="text-sm print:text-xs">(подпись)</p>
        </div>
        <div>
          <p className="text-sm print:text-xs mb-8 print:mb-6">Получил: _________________</p>
          <p className="text-sm print:text-xs">(подпись)</p>
        </div>
      </div>

      {/* Дата и время печати */}
      <div className="mt-8 print:mt-6 text-center text-xs print:text-xs text-gray-500">
        Документ распечатан: {new Date().toLocaleString('ru-RU')}
      </div>
    </div>
  );
};