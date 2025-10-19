import React, { useState } from 'react';
import {
  Box,
  TextField,
  Button,
  MenuItem,
  Chip,
  Grid,
  Typography,
  Divider,
} from '@mui/material';
import { DataTable, type Column } from '../components/DataTable';
import { Modal } from '../components/Modal';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { invoicesApi, ordersApi, counterpartiesApi, concreteMarksApi, driversApi, vehiclesApi, warehousesApi, companiesApi, materialsApi } from '../services/api';
import type { Invoice, Order, Counterparty, ConcreteMark, Driver, Vehicle, Warehouse, Company, Material } from '../types';
import { InvoiceType, OrderStatus } from '../types';
import { useNotifications } from '../hooks/useNotifications';
import { useApiData } from '../hooks/useApiData';
import { useAuthStore } from '../stores/authStore';

export const InvoicesPage: React.FC = () => {
  const [modalOpen, setModalOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  const { success, error } = useNotifications();
  const { user } = useAuthStore();
  
  const { data: invoices, loading, refetch } = useApiData<Invoice>({
    apiCall: () => {
      // Для водителей используем /invoices/my, для остальных - /invoices
      const isDriver = user?.role === 'DRIVER';
      const apiCall = isDriver ? invoicesApi.getMy : invoicesApi.getAll;
      
      return apiCall({ search: searchQuery }).then(res => res.data);
    },
    dependencies: [searchQuery, user?.role]
  });
  
  const { data: orders } = useApiData<Order>({
    apiCall: () => ordersApi.getAll()
  });
  
  const { data: counterparties } = useApiData<Counterparty>({
    apiCall: () => counterpartiesApi.getAll()
  });
  
  const { data: concreteMarks } = useApiData<ConcreteMark>({
    apiCall: () => concreteMarksApi.getAll()
  });
  
  const { data: drivers } = useApiData<Driver>({
    apiCall: () => driversApi.getAll()
  });
  
  const { data: vehicles } = useApiData<Vehicle>({
    apiCall: () => vehiclesApi.getAll()
  });
  
  const { data: warehouses } = useApiData<Warehouse>({
    apiCall: () => warehousesApi.getAll()
  });
  
  const { data: companies } = useApiData<Company>({
    apiCall: () => companiesApi.getAll()
  });
  
  const { data: materials } = useApiData<Material>({
    apiCall: () => materialsApi.getAll()
  });

  const [formData, setFormData] = useState({
    type: 'EXPENSE' as InvoiceType,
    orderId: '',
    companyId: '',
    warehouseId: '',
    customerId: '',
    supplierId: '',
    concreteMarkId: '',
    quantityM3: '',
    slumpValue: '',
    sealNumbers: '',
    departureAddress: '',
    coordinatesFrom: '',
    coordinatesTo: '',
    vehicleId: '',
    driverId: '',
    dispatcherId: '',
    releasedByFio: '',
    receivedByFio: '',
    basePricePerM3: '',
    salePricePerM3: '',
    managerProfit: '',
    materialId: '',
    grossWeightKg: '',
    tareWeightKg: '',
    netWeightKg: '',
    moisturePercent: '',
    correctedWeightKg: '',
  });

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const invoiceTypeLabels = {
    [InvoiceType.EXPENSE]: 'Расходная',
    [InvoiceType.INCOME]: 'Приходная',
  };

  const statusLabels = {
    'PENDING': 'Ожидает',
    'DISPATCHED': 'Отправлено',
    'IN_TRANSIT': 'В пути',
    'DELIVERED': 'Доставлено',
    'CANCELLED': 'Отменено',
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'DELIVERED':
        return 'success';
      case 'CANCELLED':
        return 'error';
      case 'IN_TRANSIT':
      case 'DISPATCHED':
        return 'info';
      default:
        return 'default';
    }
  };

  const columns: Column[] = [
    { id: 'invoiceNumber', label: 'Номер накладной', minWidth: 120 },
    { 
      id: 'type', 
      label: 'Тип', 
      minWidth: 100,
      render: (value) => (
        <Chip 
          label={invoiceTypeLabels[value as InvoiceType]} 
          size="small" 
          variant="outlined"
        />
      )
    },
    { 
      id: 'status', 
      label: 'Статус', 
      minWidth: 120,
      render: (value) => (
        <Chip 
          label={statusLabels[value as keyof typeof statusLabels] || value} 
          size="small" 
          color={getStatusColor(value as string) as any}
          variant="outlined"
        />
      )
    },
    { 
      id: 'customer', 
      label: 'Покупатель', 
      minWidth: 200,
      render: (value) => value?.name || '-'
    },
    { 
      id: 'concreteMark', 
      label: 'Марка бетона', 
      minWidth: 150,
      render: (value) => value?.name || '-'
    },
    { id: 'quantityM3', label: 'Объем (м³)', minWidth: 100 },
    { 
      id: 'driver', 
      label: 'Водитель', 
      minWidth: 150,
      render: (value) => value ? `${value.firstName} ${value.lastName}` : '-'
    },
    { 
      id: 'vehicle', 
      label: 'Транспорт', 
      minWidth: 120,
      render: (value) => value?.plate || '-'
    },
    { 
      id: 'date', 
      label: 'Дата', 
      minWidth: 120,
      render: (value) => value ? new Date(value).toLocaleDateString('ru-RU') : '-'
    },
  ];

  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  const handleAdd = () => {
    setEditingInvoice(null);
    setFormData({
      type: 'EXPENSE' as InvoiceType,
      orderId: '',
      companyId: '',
      warehouseId: '',
      customerId: '',
      supplierId: '',
      concreteMarkId: '',
      quantityM3: '',
      slumpValue: '',
      sealNumbers: '',
      departureAddress: '',
      coordinatesFrom: '',
      coordinatesTo: '',
      vehicleId: '',
      driverId: '',
      dispatcherId: '',
      releasedByFio: '',
      receivedByFio: '',
      basePricePerM3: '',
      salePricePerM3: '',
      managerProfit: '',
      materialId: '',
      grossWeightKg: '',
      tareWeightKg: '',
      netWeightKg: '',
      moisturePercent: '',
      correctedWeightKg: '',
    });
    setFormErrors({});
    setModalOpen(true);
  };

  const handleEdit = (id: number) => {
    const invoice = invoices.find(i => i.id === id);
    if (invoice) {
      setEditingInvoice(invoice);
      setFormData({
        type: invoice.type,
        orderId: invoice.orderId?.toString() || '',
        companyId: invoice.companyId?.toString() || '',
        warehouseId: invoice.warehouseId?.toString() || '',
        customerId: invoice.customerId?.toString() || '',
        supplierId: invoice.supplierId?.toString() || '',
        concreteMarkId: invoice.concreteMarkId?.toString() || '',
        quantityM3: invoice.quantityM3?.toString() || '',
        slumpValue: invoice.slumpValue?.toString() || '',
        sealNumbers: invoice.sealNumbers?.join(', ') || '',
        departureAddress: invoice.departureAddress || '',
        coordinatesFrom: invoice.latitudeFrom && invoice.longitudeFrom 
          ? `${invoice.latitudeFrom}, ${invoice.longitudeFrom}` 
          : '',
        coordinatesTo: invoice.latitudeTo && invoice.longitudeTo 
          ? `${invoice.latitudeTo}, ${invoice.longitudeTo}` 
          : '',
        vehicleId: invoice.vehicleId?.toString() || '',
        driverId: invoice.driverId?.toString() || '',
        dispatcherId: invoice.dispatcherId?.toString() || '',
        releasedByFio: invoice.releasedByFio || '',
        receivedByFio: invoice.receivedByFio || '',
        basePricePerM3: invoice.basePricePerM3?.toString() || '',
        salePricePerM3: invoice.salePricePerM3?.toString() || '',
        managerProfit: invoice.managerProfit?.toString() || '',
        materialId: invoice.materialId?.toString() || '',
        grossWeightKg: invoice.grossWeightKg?.toString() || '',
        tareWeightKg: invoice.tareWeightKg?.toString() || '',
        netWeightKg: invoice.netWeightKg?.toString() || '',
        moisturePercent: invoice.moisturePercent?.toString() || '',
        correctedWeightKg: invoice.correctedWeightKg?.toString() || '',
      });
      setFormErrors({});
      setModalOpen(true);
    }
  };

  const handleDelete = (id: number) => {
    setDeleteId(id);
    setConfirmOpen(true);
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};

    if (formData.type === InvoiceType.EXPENSE) {
      if (!formData.customerId) {
        errors.customerId = 'Покупатель обязателен для расходной накладной';
      }
      if (!formData.concreteMarkId) {
        errors.concreteMarkId = 'Марка бетона обязательна для расходной накладной';
      }
      if (!formData.quantityM3 || isNaN(Number(formData.quantityM3)) || Number(formData.quantityM3) <= 0) {
        errors.quantityM3 = 'Объем должен быть положительным числом';
      }
    } else {
      if (!formData.supplierId) {
        errors.supplierId = 'Поставщик обязателен для приходной накладной';
      }
      if (!formData.materialId) {
        errors.materialId = 'Материал обязателен для приходной накладной';
      }
      if (!formData.grossWeightKg || isNaN(Number(formData.grossWeightKg)) || Number(formData.grossWeightKg) <= 0) {
        errors.grossWeightKg = 'Вес брутто должен быть положительным числом';
      }
    }

    // Валидация координат
    if (formData.coordinatesFrom && formData.coordinatesFrom.trim()) {
      const coordsFrom = formData.coordinatesFrom.split(',');
      if (coordsFrom.length !== 2) {
        errors.coordinatesFrom = 'Введите координаты отправления в формате: широта, долгота';
      } else {
        const lat = coordsFrom[0].trim();
        const lng = coordsFrom[1].trim();
        if (isNaN(Number(lat)) || isNaN(Number(lng))) {
          errors.coordinatesFrom = 'Координаты отправления должны быть числами';
        }
      }
    }

    if (formData.coordinatesTo && formData.coordinatesTo.trim()) {
      const coordsTo = formData.coordinatesTo.split(',');
      if (coordsTo.length !== 2) {
        errors.coordinatesTo = 'Введите координаты прибытия в формате: широта, долгота';
      } else {
        const lat = coordsTo[0].trim();
        const lng = coordsTo[1].trim();
        if (isNaN(Number(lat)) || isNaN(Number(lng))) {
          errors.coordinatesTo = 'Координаты прибытия должны быть числами';
        }
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      const data = {
        ...formData,
        orderId: formData.orderId ? Number(formData.orderId) : undefined,
        companyId: formData.companyId ? Number(formData.companyId) : undefined,
        warehouseId: formData.warehouseId ? Number(formData.warehouseId) : undefined,
        customerId: formData.customerId ? Number(formData.customerId) : undefined,
        supplierId: formData.supplierId ? Number(formData.supplierId) : undefined,
        concreteMarkId: formData.concreteMarkId ? Number(formData.concreteMarkId) : undefined,
        quantityM3: formData.quantityM3 ? Number(formData.quantityM3) : undefined,
        slumpValue: formData.slumpValue ? Number(formData.slumpValue) : undefined,
        sealNumbers: formData.sealNumbers ? formData.sealNumbers.split(',').map(s => s.trim()) : [],
        latitudeFrom: formData.coordinatesFrom ? Number(formData.coordinatesFrom.split(',')[0].trim()) : undefined,
        longitudeFrom: formData.coordinatesFrom ? Number(formData.coordinatesFrom.split(',')[1].trim()) : undefined,
        latitudeTo: formData.coordinatesTo ? Number(formData.coordinatesTo.split(',')[0].trim()) : undefined,
        longitudeTo: formData.coordinatesTo ? Number(formData.coordinatesTo.split(',')[1].trim()) : undefined,
        vehicleId: formData.vehicleId ? Number(formData.vehicleId) : undefined,
        driverId: formData.driverId ? Number(formData.driverId) : undefined,
        dispatcherId: formData.dispatcherId ? Number(formData.dispatcherId) : undefined,
        basePricePerM3: formData.basePricePerM3 ? Number(formData.basePricePerM3) : undefined,
        salePricePerM3: formData.salePricePerM3 ? Number(formData.salePricePerM3) : undefined,
        managerProfit: formData.managerProfit ? Number(formData.managerProfit) : undefined,
        materialId: formData.materialId ? Number(formData.materialId) : undefined,
        grossWeightKg: formData.grossWeightKg ? Number(formData.grossWeightKg) : undefined,
        tareWeightKg: formData.tareWeightKg ? Number(formData.tareWeightKg) : undefined,
        netWeightKg: formData.netWeightKg ? Number(formData.netWeightKg) : undefined,
        moisturePercent: formData.moisturePercent ? Number(formData.moisturePercent) : undefined,
        correctedWeightKg: formData.correctedWeightKg ? Number(formData.correctedWeightKg) : undefined,
        createdById: user?.id || 1,
      };
      
      // Убираем coordinatesFrom и coordinatesTo из данных, отправляемых на сервер
      delete (data as any).coordinatesFrom;
      delete (data as any).coordinatesTo;

      if (editingInvoice) {
        await invoicesApi.update(editingInvoice.id, data);
        success('Накладная успешно обновлена');
      } else {
        await invoicesApi.create(data);
        success('Накладная успешно создана');
      }
      
      setModalOpen(false);
      refetch();
    } catch (err: any) {
      error(err.response?.data?.message || 'Ошибка сохранения накладной');
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteId) return;

    try {
      await invoicesApi.delete(deleteId);
      success('Накладная успешно удалена');
      setConfirmOpen(false);
      setDeleteId(null);
      refetch();
    } catch (err: any) {
      error(err.response?.data?.message || 'Ошибка удаления накладной');
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (formErrors[field]) {
      setFormErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const renderExpenseFields = () => (
    <>
      <Grid item xs={12}>
        <Typography variant="h6" gutterBottom>
          Расходная накладная (бетон)
        </Typography>
        <Divider />
      </Grid>
      
      <Grid item xs={12} sm={6}>
        <TextField
          fullWidth
          select
          label="Заказ"
          value={formData.orderId}
          onChange={(e) => handleInputChange('orderId', e.target.value)}
        >
          <MenuItem value="">Выберите заказ</MenuItem>
          {orders
            .filter(o => o.status === OrderStatus.APPROVED_BY_DIRECTOR)
            .map((order) => (
            <MenuItem key={order.id} value={order.id.toString()}>
              {order.orderNumber} - {order.customer?.name}
            </MenuItem>
          ))}
        </TextField>
      </Grid>

      <Grid item xs={12} sm={6}>
        <TextField
          fullWidth
          select
          label="Покупатель *"
          value={formData.customerId}
          onChange={(e) => handleInputChange('customerId', e.target.value)}
          error={!!formErrors.customerId}
          helperText={formErrors.customerId}
        >
          <MenuItem value="">Выберите покупателя</MenuItem>
          {counterparties
            .filter(c => c.type === 'CUSTOMER')
            .map((counterparty) => (
            <MenuItem key={counterparty.id} value={counterparty.id.toString()}>
              {counterparty.name}
            </MenuItem>
          ))}
        </TextField>
      </Grid>

      <Grid item xs={12} sm={6}>
        <TextField
          fullWidth
          select
          label="Марка бетона *"
          value={formData.concreteMarkId}
          onChange={(e) => handleInputChange('concreteMarkId', e.target.value)}
          error={!!formErrors.concreteMarkId}
          helperText={formErrors.concreteMarkId}
        >
          <MenuItem value="">Выберите марку бетона</MenuItem>
          {concreteMarks.map((mark) => (
            <MenuItem key={mark.id} value={mark.id.toString()}>
              {mark.name}
            </MenuItem>
          ))}
        </TextField>
      </Grid>

      <Grid item xs={12} sm={6}>
        <TextField
          fullWidth
          label="Объем (м³) *"
          type="number"
          value={formData.quantityM3}
          onChange={(e) => handleInputChange('quantityM3', e.target.value)}
          error={!!formErrors.quantityM3}
          helperText={formErrors.quantityM3}
          inputProps={{ step: 'any', min: '0' }}
        />
      </Grid>

      <Grid item xs={12} sm={6}>
        <TextField
          fullWidth
          label="Осадка конуса (см)"
          type="number"
          value={formData.slumpValue}
          onChange={(e) => handleInputChange('slumpValue', e.target.value)}
          inputProps={{ step: 'any', min: '0' }}
        />
      </Grid>

      <Grid item xs={12} sm={6}>
        <TextField
          fullWidth
          label="Номера пломб"
          value={formData.sealNumbers}
          onChange={(e) => handleInputChange('sealNumbers', e.target.value)}
          placeholder="12345, 67890"
          helperText="Разделите номера запятыми"
        />
      </Grid>

      <Grid item xs={12}>
        <TextField
          fullWidth
          label="Адрес доставки"
          value={formData.departureAddress}
          onChange={(e) => handleInputChange('departureAddress', e.target.value)}
          multiline
          rows={2}
        />
      </Grid>

      <Grid item xs={12} sm={6}>
        <TextField
          fullWidth
          label="Координаты отправления"
          value={formData.coordinatesFrom}
          onChange={(e) => handleInputChange('coordinatesFrom', e.target.value)}
          error={!!formErrors.coordinatesFrom}
          helperText={formErrors.coordinatesFrom || "Формат: широта, долгота"}
          placeholder="43.238949, 76.889709"
        />
      </Grid>

      <Grid item xs={12} sm={6}>
        <TextField
          fullWidth
          label="Координаты прибытия"
          value={formData.coordinatesTo}
          onChange={(e) => handleInputChange('coordinatesTo', e.target.value)}
          error={!!formErrors.coordinatesTo}
          helperText={formErrors.coordinatesTo || "Формат: широта, долгота"}
          placeholder="43.238949, 76.889709"
        />
      </Grid>

      <Grid item xs={12} sm={6}>
        <TextField
          fullWidth
          select
          label="Транспорт"
          value={formData.vehicleId}
          onChange={(e) => handleInputChange('vehicleId', e.target.value)}
        >
          <MenuItem value="">Выберите транспорт</MenuItem>
          {vehicles.map((vehicle) => (
            <MenuItem key={vehicle.id} value={vehicle.id.toString()}>
              {vehicle.plate} ({vehicle.type})
            </MenuItem>
          ))}
        </TextField>
      </Grid>

      <Grid item xs={12} sm={6}>
        <TextField
          fullWidth
          select
          label="Водитель"
          value={formData.driverId}
          onChange={(e) => handleInputChange('driverId', e.target.value)}
        >
          <MenuItem value="">Выберите водителя</MenuItem>
          {drivers.map((driver) => (
            <MenuItem key={driver.id} value={driver.id.toString()}>
              {driver.firstName} {driver.lastName}
            </MenuItem>
          ))}
        </TextField>
      </Grid>

      <Grid item xs={12} sm={6}>
        <TextField
          fullWidth
          label="Отпустил (ФИО)"
          value={formData.releasedByFio}
          onChange={(e) => handleInputChange('releasedByFio', e.target.value)}
        />
      </Grid>

      <Grid item xs={12} sm={6}>
        <TextField
          fullWidth
          label="Получил (ФИО)"
          value={formData.receivedByFio}
          onChange={(e) => handleInputChange('receivedByFio', e.target.value)}
        />
      </Grid>

      <Grid item xs={12} sm={4}>
        <TextField
          fullWidth
          label="Базовая цена за м³"
          type="number"
          value={formData.basePricePerM3}
          onChange={(e) => handleInputChange('basePricePerM3', e.target.value)}
          inputProps={{ step: 'any', min: '0' }}
        />
      </Grid>

      <Grid item xs={12} sm={4}>
        <TextField
          fullWidth
          label="Продажная цена за м³"
          type="number"
          value={formData.salePricePerM3}
          onChange={(e) => handleInputChange('salePricePerM3', e.target.value)}
          inputProps={{ step: 'any', min: '0' }}
        />
      </Grid>

      <Grid item xs={12} sm={4}>
        <TextField
          fullWidth
          label="Прибыль менеджера"
          type="number"
          value={formData.managerProfit}
          onChange={(e) => handleInputChange('managerProfit', e.target.value)}
          inputProps={{ step: 'any', min: '0' }}
        />
      </Grid>
    </>
  );

  const renderIncomeFields = () => (
    <>
      <Grid item xs={12}>
        <Typography variant="h6" gutterBottom>
          Приходная накладная (материалы)
        </Typography>
        <Divider />
      </Grid>

      <Grid item xs={12} sm={6}>
        <TextField
          fullWidth
          select
          label="Поставщик *"
          value={formData.supplierId}
          onChange={(e) => handleInputChange('supplierId', e.target.value)}
          error={!!formErrors.supplierId}
          helperText={formErrors.supplierId}
        >
          <MenuItem value="">Выберите поставщика</MenuItem>
          {counterparties
            .filter(c => c.type === 'SUPPLIER')
            .map((counterparty) => (
            <MenuItem key={counterparty.id} value={counterparty.id.toString()}>
              {counterparty.name}
            </MenuItem>
          ))}
        </TextField>
      </Grid>

      <Grid item xs={12} sm={6}>
        <TextField
          fullWidth
          select
          label="Материал *"
          value={formData.materialId}
          onChange={(e) => handleInputChange('materialId', e.target.value)}
          error={!!formErrors.materialId}
          helperText={formErrors.materialId}
        >
          <MenuItem value="">Выберите материал</MenuItem>
          {materials.map((material) => (
            <MenuItem key={material.id} value={material.id.toString()}>
              {material.name} ({material.unit})
            </MenuItem>
          ))}
        </TextField>
      </Grid>

      <Grid item xs={12} sm={6}>
        <TextField
          fullWidth
          label="Вес брутто (кг) *"
          type="number"
          value={formData.grossWeightKg}
          onChange={(e) => handleInputChange('grossWeightKg', e.target.value)}
          error={!!formErrors.grossWeightKg}
          helperText={formErrors.grossWeightKg}
          inputProps={{ step: 'any', min: '0' }}
        />
      </Grid>

      <Grid item xs={12} sm={6}>
        <TextField
          fullWidth
          label="Вес тары (кг)"
          type="number"
          value={formData.tareWeightKg}
          onChange={(e) => handleInputChange('tareWeightKg', e.target.value)}
          inputProps={{ step: 'any', min: '0' }}
        />
      </Grid>

      <Grid item xs={12} sm={6}>
        <TextField
          fullWidth
          label="Вес нетто (кг)"
          type="number"
          value={formData.netWeightKg}
          onChange={(e) => handleInputChange('netWeightKg', e.target.value)}
          inputProps={{ step: 'any', min: '0' }}
        />
      </Grid>

      <Grid item xs={12} sm={6}>
        <TextField
          fullWidth
          label="Влажность (%)"
          type="number"
          value={formData.moisturePercent}
          onChange={(e) => handleInputChange('moisturePercent', e.target.value)}
          inputProps={{ step: 'any', min: '0', max: '100' }}
        />
      </Grid>

      <Grid item xs={12} sm={6}>
        <TextField
          fullWidth
          label="Вес с поправкой на влажность (кг)"
          type="number"
          value={formData.correctedWeightKg}
          onChange={(e) => handleInputChange('correctedWeightKg', e.target.value)}
          inputProps={{ step: 'any', min: '0' }}
        />
      </Grid>
    </>
  );

  return (
    <Box>
      <DataTable
        title="Накладные"
        columns={columns}
        data={invoices}
        loading={loading}
        onAdd={handleAdd}
        onEdit={handleEdit}
        onDelete={handleDelete}
        searchable
        searchFields={['invoiceNumber', 'departureAddress']}
        onSearch={handleSearch}
      />

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingInvoice ? 'Редактировать накладную' : 'Добавить накладную'}
        maxWidth="xl"
        actions={
          <Box display="flex" gap={1}>
            <Button onClick={() => setModalOpen(false)}>
              Отмена
            </Button>
            <Button onClick={handleSave} variant="contained">
              {editingInvoice ? 'Обновить' : 'Создать'}
            </Button>
          </Box>
        }
      >
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              select
              label="Тип накладной *"
              value={formData.type}
              onChange={(e) => handleInputChange('type', e.target.value)}
            >
              {Object.entries(invoiceTypeLabels).map(([value, label]) => (
                <MenuItem key={value} value={value}>
                  {label}
                </MenuItem>
              ))}
            </TextField>
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              select
              label="Компания"
              value={formData.companyId}
              onChange={(e) => handleInputChange('companyId', e.target.value)}
            >
              <MenuItem value="">Выберите компанию</MenuItem>
              {companies.map((company) => (
                <MenuItem key={company.id} value={company.id.toString()}>
                  {company.name}
                </MenuItem>
              ))}
            </TextField>
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              select
              label="Склад"
              value={formData.warehouseId}
              onChange={(e) => handleInputChange('warehouseId', e.target.value)}
            >
              <MenuItem value="">Выберите склад</MenuItem>
              {warehouses.map((warehouse) => (
                <MenuItem key={warehouse.id} value={warehouse.id.toString()}>
                  {warehouse.name}
                </MenuItem>
              ))}
            </TextField>
          </Grid>

          {formData.type === InvoiceType.EXPENSE ? renderExpenseFields() : renderIncomeFields()}
        </Grid>
      </Modal>

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={handleConfirmDelete}
        title="Удаление накладной"
        message="Вы уверены, что хотите удалить эту накладную? Это действие нельзя отменить."
      />
    </Box>
  );
};