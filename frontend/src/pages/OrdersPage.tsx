import React, { useState } from 'react';
import {
  Box,
  TextField,
  Button,
  MenuItem,
  Chip,
  Grid,
} from '@mui/material';
import { DataTable, type Column } from '../components/DataTable';
import { Modal } from '../components/Modal';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { ordersApi, counterpartiesApi, concreteMarksApi } from '../services/api';
import type { Order, Counterparty, ConcreteMark } from '../types';
import { PaymentType, OrderStatus } from '../types';
import { useNotifications } from '../hooks/useNotifications';
import { useApiData } from '../hooks/useApiData';
import { useAuthStore } from '../stores/authStore';

export const OrdersPage: React.FC = () => {
  const [modalOpen, setModalOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  const { success, error } = useNotifications();
  const { user } = useAuthStore();
  
  const { data: orders, loading, refetch } = useApiData<Order>({
    apiCall: () => {
      // Для водителей и менеджеров используем /orders/my (только свои заказы)
      // Для остальных - /orders (с фильтрацией по правам доступа)
      const useMyOrders = user?.role === 'DRIVER' || user?.role === 'MANAGER' || user?.role === 'OPERATOR';
      const apiCall = useMyOrders ? ordersApi.getMy : ordersApi.getAll;
      
      return apiCall({ search: searchQuery });
    },
    dependencies: [searchQuery, user?.role]
  });
  
  const { data: counterparties } = useApiData<Counterparty>({
    apiCall: () => counterpartiesApi.getAll()
  });
  
  const { data: concreteMarks } = useApiData<ConcreteMark>({
    apiCall: () => concreteMarksApi.getAll()
  });

  const [formData, setFormData] = useState({
    customerId: '',
    concreteMarkId: '',
    quantityM3: '',
    paymentType: 'CASH' as PaymentType,
    deliveryDate: '',
    deliveryTime: '',
    deliveryAddress: '',
    coordinates: '',
    notes: '',
  });

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const orderStatusLabels = {
    [OrderStatus.DRAFT]: 'Черновик',
    [OrderStatus.PENDING_DIRECTOR]: 'На рассмотрении директора',
    [OrderStatus.APPROVED_BY_DIRECTOR]: 'Одобрено директором',
    [OrderStatus.PENDING_DISPATCHER]: 'На рассмотрении диспетчера',
    [OrderStatus.DISPATCHED]: 'Отправлено',
    [OrderStatus.IN_DELIVERY]: 'В доставке',
    [OrderStatus.DELIVERED]: 'Доставлено',
    [OrderStatus.COMPLETED]: 'Завершено',
    [OrderStatus.REJECTED]: 'Отклонено',
    [OrderStatus.CANCELED]: 'Отменено',
    [OrderStatus.WAITING_CREATOR_APPROVAL]: 'Ожидает одобрения создателя',
  };

  const paymentTypeLabels = {
    [PaymentType.CASH]: 'Наличные',
    [PaymentType.CASHLESS]: 'Безналичные',
  };

  const getStatusColor = (status: OrderStatus) => {
    switch (status) {
      case OrderStatus.COMPLETED:
        return 'success';
      case OrderStatus.REJECTED:
      case OrderStatus.CANCELED:
        return 'error';
      case OrderStatus.IN_DELIVERY:
      case OrderStatus.DISPATCHED:
        return 'info';
      default:
        return 'default';
    }
  };

  const columns: Column[] = [
    { id: 'orderNumber', label: 'Номер заказа', minWidth: 120 },
    { 
      id: 'status', 
      label: 'Статус', 
      minWidth: 150,
      render: (value) => (
        <Chip 
          label={orderStatusLabels[value as OrderStatus]} 
          size="small" 
          color={getStatusColor(value as OrderStatus) as any}
          variant="outlined"
        />
      )
    },
    { 
      id: 'customer', 
      label: 'Заказчик', 
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
      id: 'paymentType', 
      label: 'Тип оплаты', 
      minWidth: 120,
      render: (value) => paymentTypeLabels[value as PaymentType] || value
    },
    { 
      id: 'deliveryDate', 
      label: 'Дата доставки', 
      minWidth: 120,
      render: (value) => value ? new Date(value).toLocaleDateString('ru-RU') : '-'
    },
    { id: 'deliveryAddress', label: 'Адрес доставки', minWidth: 200 },
  ];

  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  const handleAdd = () => {
    setEditingOrder(null);
    setFormData({
      customerId: '',
      concreteMarkId: '',
      quantityM3: '',
      paymentType: PaymentType.CASH,
      deliveryDate: '',
      deliveryTime: '',
      deliveryAddress: '',
      coordinates: '',
      notes: '',
    });
    setFormErrors({});
    setModalOpen(true);
  };

  const handleEdit = (id: number) => {
    const order = orders.find(o => o.id === id);
    if (order) {
      setEditingOrder(order);
      setFormData({
        customerId: order.customerId.toString(),
        concreteMarkId: order.concreteMarkId.toString(),
        quantityM3: order.quantityM3.toString(),
        paymentType: order.paymentType,
        deliveryDate: order.deliveryDate ? 
          new Date(order.deliveryDate).toISOString().split('T')[0] : '',
        deliveryTime: order.deliveryTime,
        deliveryAddress: order.deliveryAddress,
        coordinates: order.coordinates || '',
        notes: order.notes || '',
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

    if (!formData.customerId) {
      errors.customerId = 'Заказчик обязателен';
    }

    if (!formData.concreteMarkId) {
      errors.concreteMarkId = 'Марка бетона обязательна';
    }

    if (!formData.quantityM3 || isNaN(Number(formData.quantityM3)) || Number(formData.quantityM3) <= 0) {
      errors.quantityM3 = 'Объем должен быть положительным числом';
    }

    if (!formData.deliveryDate) {
      errors.deliveryDate = 'Дата доставки обязательна';
    }

    if (!formData.deliveryTime.trim()) {
      errors.deliveryTime = 'Время доставки обязательно';
    }

    if (!formData.deliveryAddress.trim()) {
      errors.deliveryAddress = 'Адрес доставки обязателен';
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
        customerId: Number(formData.customerId),
        concreteMarkId: Number(formData.concreteMarkId),
        quantityM3: Number(formData.quantityM3),
        deliveryDate: new Date(formData.deliveryDate).toISOString(),
        createdById: user?.id || 1,
      };

      if (editingOrder) {
        await ordersApi.update(editingOrder.id, data);
        success('Заказ успешно обновлен');
      } else {
        await ordersApi.create(data);
        success('Заказ успешно создан');
      }
      
      setModalOpen(false);
      refetch();
    } catch (err: any) {
      error(err.response?.data?.message || 'Ошибка сохранения заказа');
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteId) return;

    try {
      await ordersApi.delete(deleteId);
      success('Заказ успешно удален');
      setConfirmOpen(false);
      setDeleteId(null);
      refetch();
    } catch (err: any) {
      error(err.response?.data?.message || 'Ошибка удаления заказа');
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (formErrors[field]) {
      setFormErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  return (
    <Box>
      <DataTable
        title="Заказы"
        columns={columns}
        data={orders}
        loading={loading}
        onAdd={handleAdd}
        onEdit={handleEdit}
        onDelete={handleDelete}
        searchable
        searchFields={['orderNumber', 'deliveryAddress']}
        onSearch={handleSearch}
      />

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingOrder ? 'Редактировать заказ' : 'Добавить заказ'}
        maxWidth="lg"
        actions={
          <Box display="flex" gap={1}>
            <Button onClick={() => setModalOpen(false)}>
              Отмена
            </Button>
            <Button onClick={handleSave} variant="contained">
              {editingOrder ? 'Обновить' : 'Создать'}
            </Button>
          </Box>
        }
      >
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              select
              label="Заказчик *"
              value={formData.customerId}
              onChange={(e) => handleInputChange('customerId', e.target.value)}
              error={!!formErrors.customerId}
              helperText={formErrors.customerId}
            >
              <MenuItem value="">Выберите заказчика</MenuItem>
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
              select
              label="Тип оплаты *"
              value={formData.paymentType}
              onChange={(e) => handleInputChange('paymentType', e.target.value)}
            >
              {Object.entries(paymentTypeLabels).map(([value, label]) => (
                <MenuItem key={value} value={value}>
                  {label}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Дата доставки *"
              type="date"
              value={formData.deliveryDate}
              onChange={(e) => handleInputChange('deliveryDate', e.target.value)}
              error={!!formErrors.deliveryDate}
              helperText={formErrors.deliveryDate}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Время доставки *"
              value={formData.deliveryTime}
              onChange={(e) => handleInputChange('deliveryTime', e.target.value)}
              error={!!formErrors.deliveryTime}
              helperText={formErrors.deliveryTime}
              placeholder="09:00"
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Адрес доставки *"
              value={formData.deliveryAddress}
              onChange={(e) => handleInputChange('deliveryAddress', e.target.value)}
              error={!!formErrors.deliveryAddress}
              helperText={formErrors.deliveryAddress}
              multiline
              rows={2}
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Координаты"
              value={formData.coordinates}
              onChange={(e) => handleInputChange('coordinates', e.target.value)}
              placeholder="43.238949, 76.889709"
              helperText="Широта, долгота (необязательно)"
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Примечания"
              value={formData.notes}
              onChange={(e) => handleInputChange('notes', e.target.value)}
              multiline
              rows={3}
            />
          </Grid>
        </Grid>
      </Modal>

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={handleConfirmDelete}
        title="Удаление заказа"
        message="Вы уверены, что хотите удалить этот заказ? Это действие нельзя отменить."
      />
    </Box>
  );
};