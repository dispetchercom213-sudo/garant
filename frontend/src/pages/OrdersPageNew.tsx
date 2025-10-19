import React, { useState } from 'react';
import { DataTable, type Column } from '../components/ui/data-table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '../components/ui/alert-dialog';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { SelectWithQuickAdd } from '../components/SelectWithQuickAdd';
import { ViewToggle } from '../components/ViewToggle';
import { EntityCard } from '../components/EntityCard';
import { ordersApi, counterpartiesApi, concreteMarksApi, additionalServicesApi } from '../services/api';
import type { Order, Counterparty, ConcreteMark, AdditionalService } from '../types';
import { PaymentType, OrderStatus, UserRole } from '../types';
import { useNotifications } from '../hooks/useNotifications';
import { useApiData } from '../hooks/useApiData';
import { useAuthStore } from '../stores/authStore';
import { Check, X, Truck, Trash2, Clock, Edit } from 'lucide-react';

export const OrdersPageNew: React.FC = () => {
  const [modalOpen, setModalOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [proposeChangesModalOpen, setProposeChangesModalOpen] = useState(false);
  const [deletionRequestModalOpen, setDeletionRequestModalOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [proposingChangesOrder, setProposingChangesOrder] = useState<Order | null>(null);
  const [requestingDeletionOrder, setRequestingDeletionOrder] = useState<Order | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<OrderStatus | 'ALL'>('ALL');
  const [changeReason, setChangeReason] = useState('');
  const [deletionReason, setDeletionReason] = useState('');
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
  
  const { success, error } = useNotifications();
  const { user } = useAuthStore();
  
  const { data: orders, loading, refetch } = useApiData<Order>({
    apiCall: () => {
      // Для водителей используем /orders/my, для остальных - /orders
      const isDriver = user?.role === 'DRIVER';
      const apiCall = isDriver ? ordersApi.getMy : ordersApi.getAll;
      
      return apiCall({ 
        search: searchQuery,
        status: statusFilter !== 'ALL' ? statusFilter : undefined
      });
    },
    dependencies: [searchQuery, statusFilter, user?.role]
  });
  
  // Проверяем, может ли пользователь управлять справочниками (добавлять новые марки бетона)
  const canManageReferences = user && [UserRole.ADMIN as string, UserRole.DEVELOPER as string, UserRole.DIRECTOR as string, UserRole.DISPATCHER as string].includes(user.role);

  // Загружаем справочники для всех пользователей (для создания заказов)
  const { data: counterparties, refetch: refetchCounterparties } = useApiData<Counterparty>({
    apiCall: () => counterpartiesApi.getAll()
  });
  
  const { data: concreteMarks, refetch: refetchConcreteMarks } = useApiData<ConcreteMark>({
    apiCall: () => concreteMarksApi.getAll()
  });

  const { data: additionalServices, refetch: refetchAdditionalServices } = useApiData<AdditionalService>({
    apiCall: () => additionalServicesApi.getAll()
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

  // Состояние для дополнительных услуг
  const [selectedServices, setSelectedServices] = useState<Array<{
    additionalServiceId: number;
    quantity: number;
    price: number;
  }>>([]);

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const paymentTypeLabels = {
    [PaymentType.CASH]: 'Наличные',
    [PaymentType.CASHLESS]: 'Безналичные',
  };

  const statusLabels = {
    [OrderStatus.DRAFT]: 'Черновик',
    [OrderStatus.PENDING_DIRECTOR]: 'Ожидает директора',
    [OrderStatus.WAITING_CREATOR_APPROVAL]: 'Ожидает создателя',
    [OrderStatus.APPROVED_BY_DIRECTOR]: 'Одобрен директором',
    [OrderStatus.PENDING_DISPATCHER]: 'Ожидает диспетчера',
    [OrderStatus.DISPATCHED]: 'Отправлен',
    [OrderStatus.IN_DELIVERY]: 'В доставке',
    [OrderStatus.DELIVERED]: 'Доставлен',
    [OrderStatus.COMPLETED]: 'Завершён',
    [OrderStatus.REJECTED]: 'Отклонён',
    [OrderStatus.CANCELED]: 'Отменён',
  };


  const canApproveAsDirector = (row: Order) => user?.role === 'DIRECTOR' && row.status === OrderStatus.PENDING_DIRECTOR;
  const canRejectAsDirector = (row: Order) => user?.role === 'DIRECTOR' && (row.status === OrderStatus.PENDING_DIRECTOR || row.status === OrderStatus.PENDING_DISPATCHER);
  const canDispatchAsDispatcher = (row: Order) => (user?.role === 'DISPATCHER' || user?.role === 'DIRECTOR') && row.status === OrderStatus.PENDING_DISPATCHER;
  
  // Проверка: можно ли удалить заказ
  const canDeleteOrder = (row: Order) => {
    // Разрешенные статусы для удаления
    const allowedStatuses: OrderStatus[] = [
      OrderStatus.DRAFT,
      OrderStatus.PENDING_DIRECTOR,
      OrderStatus.WAITING_CREATOR_APPROVAL,
      OrderStatus.REJECTED,
      OrderStatus.CANCELED,
    ];
    
    // Проверяем статус
    if (!allowedStatuses.includes(row.status as OrderStatus)) {
      return false;
    }
    
    // Проверяем права: создатель (включая водителя), директор, диспетчер или админ
    const canDelete = 
      user?.role === 'ADMIN' ||
      user?.role === 'DEVELOPER' ||
      row.createdById === user?.id || // Создатель (может быть водитель, менеджер, оператор)
      user?.role === 'DIRECTOR' ||
      user?.role === 'DISPATCHER';
    
    return canDelete;
  };

  const approveDirector = async (row: Order) => {
    try {
      await ordersApi.update(row.id, { status: OrderStatus.PENDING_DISPATCHER });
      success('Заказ одобрен директором');
      refetch();
    } catch (e: any) {
      error(e.response?.data?.message || 'Ошибка одобрения');
    }
  };

  const rejectOrder = async (row: Order) => {
    try {
      await ordersApi.update(row.id, { status: OrderStatus.REJECTED });
      success('Заказ отклонён');
      refetch();
    } catch (e: any) {
      error(e.response?.data?.message || 'Ошибка отклонения');
    }
  };

  const dispatchOrder = async (row: Order) => {
    try {
      await ordersApi.update(row.id, { status: OrderStatus.DISPATCHED });
      success('Заказ отправлен');
      refetch();
    } catch (e: any) {
      error(e.response?.data?.message || 'Ошибка отправки');
    }
  };

  const columns: Column<Order>[] = [
    { id: 'id', label: '№', minWidth: 80 },
    { 
      id: 'customer', 
      label: 'Заказчик', 
      minWidth: 150,
      render: (value) => value?.name || '-'
    },
    { 
      id: 'concreteMark', 
      label: 'Марка бетона', 
      minWidth: 150,
      render: (value) => value?.name || '-'
    },
    { id: 'quantityM3', label: 'Количество (м³)', minWidth: 120 },
    { 
      id: 'paymentType', 
      label: 'Оплата', 
      minWidth: 100,
      render: (value: PaymentType) => (
        <span className="px-2 py-1 rounded text-xs bg-blue-100 text-blue-800">
          {paymentTypeLabels[value]}
        </span>
      )
    },
    { 
      id: 'status', 
      label: 'Статус', 
      minWidth: 300,
      render: (_v, row) => (
        <div className="space-y-1">
          {/* Степпер */}
          <div className="flex items-center gap-1 text-xs">
            <span className={`px-2 py-0.5 rounded ${row.status === OrderStatus.PENDING_DIRECTOR || row.status === OrderStatus.WAITING_CREATOR_APPROVAL || row.status === OrderStatus.APPROVED_BY_DIRECTOR || row.status === OrderStatus.PENDING_DISPATCHER || row.status === OrderStatus.DISPATCHED || row.status === OrderStatus.IN_DELIVERY || row.status === OrderStatus.COMPLETED ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-500'}`}>Директор</span>
            <span>→</span>
            <span className={`px-2 py-0.5 rounded ${row.status === OrderStatus.PENDING_DISPATCHER || row.status === OrderStatus.DISPATCHED || row.status === OrderStatus.IN_DELIVERY || row.status === OrderStatus.COMPLETED ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-500'}`}>Диспетчер</span>
            <span>→</span>
            <span className={`px-2 py-0.5 rounded ${row.status === OrderStatus.DISPATCHED || row.status === OrderStatus.IN_DELIVERY || row.status === OrderStatus.COMPLETED ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-500'}`}>Отправлен</span>
          </div>
          
          {/* Предложенные изменения */}
          {row.status === OrderStatus.WAITING_CREATOR_APPROVAL && row.changeReason && (
            <div className="bg-amber-50 border border-amber-200 rounded p-2 text-xs">
              <p className="font-semibold text-amber-800">⚠️ Предложены изменения:</p>
              <p className="text-amber-700 mt-1">{row.changeReason}</p>
              {row.proposedDeliveryDate && (
                <p className="text-amber-700">📅 {new Date(row.proposedDeliveryDate).toLocaleDateString()} в {row.proposedDeliveryTime}</p>
              )}
            </div>
          )}

          {/* Запрос на удаление (тройное подтверждение) */}
          {row.deletionRequestedById && (
            <div className="bg-red-50 border border-red-200 rounded p-2 text-xs">
              <p className="font-semibold text-red-800">🗑️ Запрос на удаление</p>
              <p className="text-red-700 mt-1">{row.deletionReason}</p>
              {row.deletionRequestedBy && (
                <p className="text-red-600 text-xs">От: {row.deletionRequestedBy.firstName} {row.deletionRequestedBy.lastName}</p>
              )}
              <div className="mt-2 flex gap-2 flex-wrap">
                <span className={`px-2 py-0.5 rounded text-xs ${row.directorApprovedDeletion ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                  {row.directorApprovedDeletion ? '✅' : '⏳'} Директор
                </span>
                <span className={`px-2 py-0.5 rounded text-xs ${row.dispatcherApprovedDeletion ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                  {row.dispatcherApprovedDeletion ? '✅' : '⏳'} Диспетчер
                </span>
                <span className={`px-2 py-0.5 rounded text-xs ${row.creatorApprovedDeletion ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                  {row.creatorApprovedDeletion ? '✅' : '⏳'} Создатель
                </span>
              </div>
            </div>
          )}
        </div>
      )
    },
    { id: 'deliveryDate', label: 'Дата доставки', minWidth: 120 },
    { id: 'deliveryAddress', label: 'Адрес доставки', minWidth: 200 },
    {
      id: 'actions' as any,
      label: 'Действия',
      minWidth: 300,
      render: (_v, row) => (
        <div className="flex gap-2 flex-wrap">
          {/* Кнопка редактирования - только для создателя и только до принятия */}
          {row.createdById === user?.id && row.status === OrderStatus.PENDING_DIRECTOR && (
            <Button size="sm" variant="outline" className="px-2" onClick={() => handleEdit(row)}>
              <Edit className="h-4 w-4 mr-1" /> Изменить
            </Button>
          )}
          
          {/* Кнопки для директора */}
          {canApproveAsDirector(row) && (
            <>
              <Button size="sm" className="px-2 bg-gray-800 hover:bg-gray-900" onClick={() => approveDirector(row)}>
                <Check className="h-4 w-4 mr-1" /> Одобрить
              </Button>
              <Button size="sm" variant="outline" className="px-2" onClick={() => openProposeChangesModal(row)}>
                <Clock className="h-4 w-4 mr-1" /> Предложить изменения
              </Button>
            </>
          )}
          
          {/* Кнопки для создателя заказа (ожидает подтверждения изменений) */}
          {row.status === OrderStatus.WAITING_CREATOR_APPROVAL && row.createdById === user?.id && (
            <>
              <Button size="sm" className="px-2 bg-gray-800 hover:bg-gray-900" onClick={() => handleAcceptChanges(row.id)}>
                <Check className="h-4 w-4 mr-1" /> Принять изменения
              </Button>
              <Button size="sm" variant="destructive" className="px-2" onClick={() => handleRejectChanges(row.id)}>
                <X className="h-4 w-4 mr-1" /> Отменить заказ
              </Button>
            </>
          )}
          {canRejectAsDirector(row) && (
            <Button size="sm" variant="destructive" className="px-2" onClick={() => rejectOrder(row)}>
              <X className="h-4 w-4 mr-1" /> Отклонить
            </Button>
          )}
          
          {/* Кнопка для диспетчера */}
          {canDispatchAsDispatcher(row) && (
            <Button size="sm" className="px-2 bg-gray-800 hover:bg-gray-900" onClick={() => dispatchOrder(row)}>
              <Truck className="h-4 w-4 mr-1" /> Отправить
            </Button>
          )}

          {/* Кнопки для подтверждения удаления (тройное подтверждение) */}
          {row.deletionRequestedById && (
            <>
              {/* Кнопка подтверждения для директора */}
              {user?.role === 'DIRECTOR' && !row.directorApprovedDeletion && (
                <Button size="sm" className="px-2 bg-gray-800 hover:bg-gray-900" onClick={() => handleApproveDeletion(row.id)}>
                  <Check className="h-4 w-4 mr-1" /> Подтвердить (Директор)
                </Button>
              )}
              
              {/* Кнопка подтверждения для диспетчера */}
              {user?.role === 'DISPATCHER' && !row.dispatcherApprovedDeletion && (
                <Button size="sm" className="px-2 bg-gray-800 hover:bg-gray-900" onClick={() => handleApproveDeletion(row.id)}>
                  <Check className="h-4 w-4 mr-1" /> Подтвердить (Диспетчер)
                </Button>
              )}
              
              {/* Кнопка подтверждения для создателя */}
              {row.createdById === user?.id && !row.creatorApprovedDeletion && (
                <Button size="sm" className="px-2 bg-gray-800 hover:bg-gray-900" onClick={() => handleApproveDeletion(row.id)}>
                  <Check className="h-4 w-4 mr-1" /> Подтвердить (Я создал)
                </Button>
              )}
              
              {/* Кнопка отклонения - доступна всем трем сторонам */}
              {(user?.role === 'DIRECTOR' || user?.role === 'DISPATCHER' || row.createdById === user?.id) && (
                <Button size="sm" variant="outline" className="px-2" onClick={() => handleRejectDeletion(row.id)}>
                  <X className="h-4 w-4 mr-1" /> Отклонить запрос
                </Button>
              )}
            </>
          )}
        </div>
      )
    },
  ];

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.customerId) {
      errors.customerId = 'Заказчик обязателен';
    }

    if (!formData.concreteMarkId) {
      errors.concreteMarkId = 'Марка бетона обязательна';
    }

    if (!formData.quantityM3 || parseFloat(formData.quantityM3) <= 0) {
      errors.quantityM3 = 'Количество должно быть больше 0';
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

    if (formData.coordinates.trim()) {
      const coordParts = formData.coordinates.split(',');
      if (coordParts.length !== 2) {
        errors.coordinates = 'Координаты должны быть в формате: широта, долгота';
      } else {
        const lat = parseFloat(coordParts[0].trim());
        const lng = parseFloat(coordParts[1].trim());
        if (isNaN(lat) || isNaN(lng)) {
          errors.coordinates = 'Координаты должны быть числами';
        } else if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
          errors.coordinates = 'Недопустимые значения координат';
        }
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    try {
      const data: any = {
        customerId: parseInt(formData.customerId),
        concreteMarkId: parseInt(formData.concreteMarkId),
        quantityM3: parseFloat(formData.quantityM3),
        paymentType: formData.paymentType,
        deliveryDate: new Date(formData.deliveryDate).toISOString(),
        deliveryTime: formData.deliveryTime, // Обязательное поле
        deliveryAddress: formData.deliveryAddress.trim(),
        notes: formData.notes.trim() || undefined,
        createdById: user?.id || 1, // ID текущего пользователя (fallback к ID 1)
      };

      if (formData.coordinates.trim()) {
        data.coordinates = formData.coordinates.trim(); // Отправляем как строку
      }

      // Добавляем дополнительные услуги, если они есть
      if (selectedServices.length > 0) {
        data.additionalServices = selectedServices;
      }

      console.log('Отправляем данные заказа:', data);
      console.log('Исходные данные формы:', formData);
      console.log('Дополнительные услуги:', selectedServices);

      if (editingOrder) {
        // При редактировании отправляем только разрешенные поля
        const updateData: any = {
          deliveryDate: data.deliveryDate,
          deliveryTime: data.deliveryTime,
          deliveryAddress: data.deliveryAddress,
          coordinates: data.coordinates,
          notes: data.notes,
        };
        await ordersApi.update(editingOrder.id, updateData);
        success('Заказ обновлен');
      } else {
        await ordersApi.create(data);
        success('Заказ создан');
      }

      resetForm();
      refetch();
    } catch (err: any) {
      console.error('❌ Ошибка при создании заказа:', err);
      console.error('📋 Детали ошибки:', {
        status: err.response?.status,
        data: err.response?.data,
        message: err.response?.data?.message,
        errors: err.response?.data?.errors
      });
      console.error('🔍 Полный ответ сервера:', JSON.stringify(err.response?.data, null, 2));
      error(err.response?.data?.message || 'Ошибка при сохранении');
    }
  };

  const handleEdit = (order: Order) => {
    setEditingOrder(order);
    
    // Преобразуем дату из ISO формата в формат yyyy-MM-dd для input type="date"
    const formatDateForInput = (isoDate: string) => {
      if (!isoDate) return '';
      try {
        const date = new Date(isoDate);
        return date.toISOString().split('T')[0]; // Получаем только дату в формате yyyy-MM-dd
      } catch (error) {
        console.error('Ошибка при форматировании даты:', error);
        return '';
      }
    };
    
    setFormData({
      customerId: order.customerId?.toString() || '',
      concreteMarkId: order.concreteMarkId?.toString() || '',
      quantityM3: order.quantityM3?.toString() || '',
      paymentType: order.paymentType || PaymentType.CASH,
      deliveryDate: formatDateForInput(order.deliveryDate),
      deliveryTime: order.deliveryTime || '',
      deliveryAddress: order.deliveryAddress || '',
      coordinates: order.coordinates || '',
      notes: order.notes || '',
    });

    // Загружаем дополнительные услуги, если они есть
    if (order.additionalServices && order.additionalServices.length > 0) {
      setSelectedServices(order.additionalServices.map(s => ({
        additionalServiceId: s.additionalServiceId,
        quantity: s.quantity,
        price: s.price,
      })));
    } else {
      setSelectedServices([]);
    }

    setModalOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteId) return;

    try {
      await ordersApi.delete(deleteId);
      success('Заказ удален');
      setConfirmOpen(false);
      setDeleteId(null);
      refetch();
    } catch (err: any) {
      // Если ошибка говорит что нужен запрос на удаление
      if (err.response?.data?.message?.includes('Используйте запрос на удаление')) {
        setConfirmOpen(false);
        const orderToDelete = orders.find(o => o.id === deleteId);
        if (orderToDelete) {
          setRequestingDeletionOrder(orderToDelete);
          setDeletionRequestModalOpen(true);
        }
      } else {
        error(err.response?.data?.message || 'Ошибка при удалении');
      }
    }
  };


  // Отправить запрос на удаление
  const handleRequestDeletion = async () => {
    if (!requestingDeletionOrder || !deletionReason.trim()) {
      error('Укажите причину удаления');
      return;
    }

    try {
      await ordersApi.requestDeletion(requestingDeletionOrder.id, deletionReason);
      success('Запрос на удаление отправлен директору');
      setDeletionRequestModalOpen(false);
      setRequestingDeletionOrder(null);
      setDeletionReason('');
      refetch();
    } catch (err: any) {
      error(err.response?.data?.message || 'Ошибка при отправке запроса');
    }
  };

  // Подтвердить удаление (директор/диспетчер/создатель)
  const handleApproveDeletion = async (orderId: number) => {
    try {
      const response = await ordersApi.approveDeletion(orderId);
      
      if (response.data.deleted) {
        success('Все три стороны подтвердили. Заказ удален!');
      } else {
        success('Ваше подтверждение принято. Ожидаем остальных.');
      }
      
      refetch();
    } catch (err: any) {
      error(err.response?.data?.message || 'Ошибка при подтверждении');
    }
  };

  // Отклонить запрос на удаление
  const handleRejectDeletion = async (orderId: number) => {
    try {
      await ordersApi.rejectDeletion(orderId);
      success('Запрос на удаление отклонен');
      refetch();
    } catch (err: any) {
      error(err.response?.data?.message || 'Ошибка');
    }
  };

  // Открыть модальное окно для предложения изменений
  const openProposeChangesModal = (order: Order) => {
    setProposingChangesOrder(order);
    
    // Преобразуем дату из ISO формата в формат yyyy-MM-dd для input type="date"
    const formatDateForInput = (isoDate: string) => {
      if (!isoDate) return '';
      try {
        const date = new Date(isoDate);
        return date.toISOString().split('T')[0];
      } catch (error) {
        console.error('Ошибка при форматировании даты:', error);
        return '';
      }
    };
    
    setFormData({
      customerId: order.customerId?.toString() || '',
      concreteMarkId: order.concreteMarkId?.toString() || '',
      quantityM3: order.quantityM3?.toString() || '',
      paymentType: order.paymentType || PaymentType.CASH,
      deliveryDate: formatDateForInput(order.deliveryDate),
      deliveryTime: order.deliveryTime || '',
      deliveryAddress: order.deliveryAddress || '',
      coordinates: order.coordinates || '',
      notes: order.notes || '',
    });
    
    setChangeReason('');
    setProposeChangesModalOpen(true);
  };

  // Предложить изменения (директор)
  const handleProposeChanges = async () => {
    if (!proposingChangesOrder) return;

    if (!changeReason.trim()) {
      error('Укажите причину изменения');
      return;
    }

    if (!validateForm()) return;

    try {
      await ordersApi.proposeChanges(proposingChangesOrder.id, {
        deliveryDate: formData.deliveryDate,
        deliveryTime: formData.deliveryTime,
        deliveryAddress: formData.deliveryAddress,
        coordinates: formData.coordinates,
        notes: formData.notes,
        changeReason: changeReason,
      });
      
      success('Изменения отправлены создателю заказа на подтверждение');
      setProposeChangesModalOpen(false);
      setProposingChangesOrder(null);
      setChangeReason('');
      resetForm();
      refetch();
    } catch (err: any) {
      error(err.response?.data?.message || 'Ошибка при отправке изменений');
    }
  };

  // Принять предложенные изменения (создатель)
  const handleAcceptChanges = async (orderId: number) => {
    try {
      await ordersApi.acceptChanges(orderId);
      success('Изменения приняты! Заказ отправлен диспетчеру');
      refetch();
    } catch (err: any) {
      error(err.response?.data?.message || 'Ошибка при принятии изменений');
    }
  };

  // Отклонить предложенные изменения (отменить заказ)
  const handleRejectChanges = async (orderId: number) => {
    try {
      await ordersApi.rejectChanges(orderId);
      success('Заказ отменён');
      refetch();
    } catch (err: any) {
      error(err.response?.data?.message || 'Ошибка при отмене заказа');
    }
  };

  // Функции для работы с дополнительными услугами
  const handleAddService = (serviceId: string) => {
    const service = additionalServices?.find(s => s.id.toString() === serviceId);
    if (!service) return;

    // Проверяем, не добавлена ли уже эта услуга
    if (selectedServices.some(s => s.additionalServiceId === service.id)) {
      error('Эта услуга уже добавлена');
      return;
    }

    setSelectedServices([...selectedServices, {
      additionalServiceId: service.id,
      quantity: 1,
      price: service.price,
    }]);
  };

  const handleRemoveService = (serviceId: number) => {
    setSelectedServices(selectedServices.filter(s => s.additionalServiceId !== serviceId));
  };

  const handleServiceQuantityChange = (serviceId: number, quantity: number) => {
    setSelectedServices(selectedServices.map(s => 
      s.additionalServiceId === serviceId 
        ? { ...s, quantity: Math.max(0.1, quantity) }
        : s
    ));
  };


  const resetForm = () => {
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
    setSelectedServices([]);
    setFormErrors({});
    setEditingOrder(null);
    setModalOpen(false);
  };

  const handleAdd = () => {
    resetForm();
    setModalOpen(true);
  };

  return (
    <div className="p-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-6">
        <h1 className="text-2xl font-bold">Заказы</h1>
        <div className="flex gap-2 w-full sm:w-auto">
          <ViewToggle view={viewMode} onViewChange={setViewMode} />
          <Button onClick={handleAdd} className="bg-gray-800 hover:bg-gray-900 flex-1 sm:flex-initial">
            <span className="sm:inline">Добавить</span>
          </Button>
        </div>
      </div>

      <div className="mb-4 space-y-4">
        <div className="flex gap-4 flex-wrap">
          <Input
            placeholder="Поиск заказов..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="max-w-md"
          />
          <Select
            value={statusFilter}
            onValueChange={(value) => setStatusFilter(value as OrderStatus | 'ALL')}
          >
            <SelectTrigger className="w-[280px]">
              <SelectValue placeholder="Фильтр по статусу" />
            </SelectTrigger>
            <SelectContent>
            <SelectItem value="ALL">📋 Все заказы</SelectItem>
            <SelectItem value={OrderStatus.PENDING_DIRECTOR}>⏳ Ожидают директора</SelectItem>
            <SelectItem value={OrderStatus.WAITING_CREATOR_APPROVAL}>🔄 Ожидают подтверждения</SelectItem>
            <SelectItem value={OrderStatus.PENDING_DISPATCHER}>📋 Ожидают диспетчера</SelectItem>
            <SelectItem value={OrderStatus.DISPATCHED}>🚛 Отправлены</SelectItem>
            <SelectItem value={OrderStatus.IN_DELIVERY}>🚚 В доставке</SelectItem>
            <SelectItem value={OrderStatus.DELIVERED}>📦 Доставлены</SelectItem>
            <SelectItem value={OrderStatus.COMPLETED}>✔️ Завершённые</SelectItem>
            <SelectItem value={OrderStatus.REJECTED}>❌ Отклонённые</SelectItem>
            <SelectItem value={OrderStatus.CANCELED}>🚫 Отменённые</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Быстрые фильтры для ролей */}
      <div className="flex gap-2 flex-wrap">
        <Button
          variant={statusFilter === 'ALL' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setStatusFilter('ALL')}
          className="text-xs"
        >
          📋 Все ({orders.length})
        </Button>
        
        {(user?.role === 'DIRECTOR' || user?.role === 'ADMIN' || user?.role === 'DEVELOPER') && (
          <Button
            variant={statusFilter === OrderStatus.PENDING_DIRECTOR ? 'default' : 'outline'}
            size="sm"
            onClick={() => setStatusFilter(OrderStatus.PENDING_DIRECTOR)}
            className="text-xs"
          >
            ⏳ Ждут моего решения ({orders.filter(o => o.status === OrderStatus.PENDING_DIRECTOR).length})
          </Button>
        )}
        
        {/* Кнопка для создателей заказов - показывает заказы, ожидающие их подтверждения */}
        <Button
          variant={statusFilter === OrderStatus.WAITING_CREATOR_APPROVAL ? 'default' : 'outline'}
          size="sm"
          onClick={() => setStatusFilter(OrderStatus.WAITING_CREATOR_APPROVAL)}
          className="text-xs"
        >
          🔄 Требуют моего ответа ({orders.filter(o => o.status === OrderStatus.WAITING_CREATOR_APPROVAL && o.createdById === user?.id).length})
        </Button>
          
          {(user?.role === 'DISPATCHER' || user?.role === 'DIRECTOR' || user?.role === 'ADMIN' || user?.role === 'DEVELOPER') && (
            <Button
              variant={statusFilter === OrderStatus.PENDING_DISPATCHER ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter(OrderStatus.PENDING_DISPATCHER)}
              className="text-xs"
            >
              📋 Готовы к отправке ({orders.filter(o => o.status === OrderStatus.PENDING_DISPATCHER).length})
            </Button>
          )}
          
          <Button
            variant={statusFilter === OrderStatus.DISPATCHED ? 'default' : 'outline'}
            size="sm"
            onClick={() => setStatusFilter(OrderStatus.DISPATCHED)}
            className="text-xs"
          >
            🚛 Отправлены ({orders.filter(o => o.status === OrderStatus.DISPATCHED).length})
          </Button>
          
          <Button
            variant={statusFilter === OrderStatus.COMPLETED ? 'default' : 'outline'}
            size="sm"
            onClick={() => setStatusFilter(OrderStatus.COMPLETED)}
            className="text-xs"
          >
            ✔️ Завершённые ({orders.filter(o => o.status === OrderStatus.COMPLETED).length})
          </Button>
        </div>
      </div>

      {viewMode === 'table' ? (
        <DataTable
          data={orders}
          columns={columns}
          loading={loading}
          onEdit={handleEdit}
          onDelete={(order) => {
            if (canDeleteOrder(order)) {
              setDeleteId(order.id);
              setConfirmOpen(true);
            }
          }}
          canDelete={canDeleteOrder}
          searchable={false}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {loading ? (
            <p className="col-span-full text-center py-8 text-gray-500">Загрузка...</p>
          ) : orders && orders.length > 0 ? (
            orders.map((order) => (
              <EntityCard
                key={order.id}
                title={`Заказ №${order.orderNumber}`}
                subtitle={order.customer?.name}
                badge={{
                  label: statusLabels[order.status] || order.status,
                  variant: order.status === OrderStatus.COMPLETED ? 'default' : 
                           order.status === OrderStatus.PENDING_DIRECTOR || order.status === OrderStatus.PENDING_DISPATCHER ? 'secondary' : 
                           order.status === OrderStatus.REJECTED || order.status === OrderStatus.CANCELED ? 'destructive' : 'outline'
                }}
                fields={[
                  { label: 'Марка бетона', value: order.concreteMark?.name },
                  { label: 'Количество', value: `${order.quantityM3} м³` },
                  { label: 'Дата доставки', value: new Date(order.deliveryDate).toLocaleDateString('ru-RU') },
                  { label: 'Адрес', value: order.deliveryAddress, fullWidth: true }
                ]}
                onEdit={() => handleEdit(order)}
                onDelete={() => {
                  if (canDeleteOrder(order)) {
                    setDeleteId(order.id);
                    setConfirmOpen(true);
                  }
                }}
                canDelete={canDeleteOrder(order)}
              />
            ))
          ) : (
            <p className="col-span-full text-center py-8 text-gray-500">Нет данных</p>
          )}
        </div>
      )}

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-4xl w-[95vw] max-h-[90vh] overflow-y-auto modal-content">
          <DialogHeader>
            <DialogTitle>
              {editingOrder ? 'Изменить параметры доставки' : 'Добавить заказ'}
            </DialogTitle>
          
            <DialogDescription>
              {editingOrder 
                ? 'Вы можете изменить время, адрес доставки и примечания'
                : 'Заполните все необходимые поля для создания заказа'
              }
            </DialogDescription>
          </DialogHeader>
          
          <div className="modal-grid">
            <div>
              <Label htmlFor="customerId">
                Заказчик {editingOrder && <span className="text-gray-500 text-xs">(только просмотр)</span>}
              </Label>
              {editingOrder ? (
                <Input
                  value={counterparties?.find(cp => cp.id.toString() === formData.customerId)?.name || ''}
                  disabled
                  className="bg-gray-100"
                />
              ) : (
                <>
                  <SelectWithQuickAdd
                    label=""
                    value={formData.customerId}
                    onValueChange={(value) => setFormData({ ...formData, customerId: value })}
                    options={counterparties?.map(cp => ({
                      value: cp.id.toString(),
                      label: cp.name
                    })) || []}
                    placeholder="Выберите заказчика"
                    required
                    enableQuickAdd
                    quickAddTitle="Добавить заказчика"
                    quickAddFields={[
                      { name: 'name', label: 'Название', required: true },
                      { name: 'phone', label: 'Телефон', type: 'tel', required: true },
                      { name: 'binOrIin', label: 'БИН/ИИН', required: false },
                      { name: 'address', label: 'Адрес', required: false },
                    ]}
                    onQuickAdd={async (data) => {
                      await counterpartiesApi.create({
                        name: data.name,
                        kind: 'LEGAL',
                        type: 'CUSTOMER',
                        phone: data.phone,
                        binOrIin: data.binOrIin || undefined,
                        address: data.address || undefined,
                      });
                      await refetchCounterparties();
                      success('Заказчик успешно добавлен!');
                    }}
                  />
                  {formErrors.customerId && (
                    <p className="text-red-500 text-sm mt-1">{formErrors.customerId}</p>
                  )}
                </>
              )}
            </div>

            <div>
              <Label htmlFor="concreteMarkId">
                Марка бетона {editingOrder && <span className="text-gray-500 text-xs">(только просмотр)</span>}
              </Label>
              {editingOrder ? (
                <Input
                  value={concreteMarks?.find(m => m.id.toString() === formData.concreteMarkId)?.name || ''}
                  disabled
                  className="bg-gray-100"
                />
              ) : (
                <>
                  <SelectWithQuickAdd
                    label=""
                    value={formData.concreteMarkId}
                    onValueChange={(value) => setFormData({ ...formData, concreteMarkId: value })}
                    options={concreteMarks?.map(m => ({
                      value: m.id.toString(),
                      label: m.name
                    })) || []}
                    placeholder="Выберите марку бетона"
                    required
                    enableQuickAdd={canManageReferences || false}
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
                    quickAddDisabledMessage="Обратитесь к диспетчеру для добавления новой марки бетона"
                  />
                  {formErrors.concreteMarkId && (
                    <p className="text-red-500 text-sm mt-1">{formErrors.concreteMarkId}</p>
                  )}
                </>
              )}
            </div>

            <div>
              <Label htmlFor="quantityM3">
                Количество (м³) {editingOrder && <span className="text-gray-500 text-xs">(только просмотр)</span>}
              </Label>
              <Input
                id="quantityM3"
                type="number"
                step="0.1"
                min="0"
                value={formData.quantityM3}
                onChange={(e) => setFormData({ ...formData, quantityM3: e.target.value })}
                placeholder="Введите количество"
                disabled={!!editingOrder}
                className={editingOrder ? 'bg-gray-100' : ''}
              />
              {formErrors.quantityM3 && (
                <p className="text-red-500 text-sm mt-1">{formErrors.quantityM3}</p>
              )}
            </div>

            <div>
              <Label htmlFor="paymentType">
                Тип оплаты {editingOrder && <span className="text-gray-500 text-xs">(только просмотр)</span>}
              </Label>
              <Select
                value={formData.paymentType}
                disabled={!!editingOrder}
                onValueChange={(value: PaymentType) => 
                  setFormData({ ...formData, paymentType: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(paymentTypeLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="deliveryDate">Дата доставки *</Label>
              <Input
                id="deliveryDate"
                type="date"
                value={formData.deliveryDate}
                onChange={(e) => setFormData({ ...formData, deliveryDate: e.target.value })}
              />
              {formErrors.deliveryDate && (
                <p className="text-red-500 text-sm mt-1">{formErrors.deliveryDate}</p>
              )}
            </div>

            <div>
              <Label htmlFor="deliveryTime">Время доставки</Label>
              <Input
                id="deliveryTime"
                type="time"
                value={formData.deliveryTime}
                onChange={(e) => setFormData({ ...formData, deliveryTime: e.target.value })}
              />
            </div>

            <div className="col-span-2">
              <Label htmlFor="deliveryAddress">Адрес доставки *</Label>
              <Input
                id="deliveryAddress"
                value={formData.deliveryAddress}
                onChange={(e) => setFormData({ ...formData, deliveryAddress: e.target.value })}
                placeholder="Введите адрес доставки"
              />
              {formErrors.deliveryAddress && (
                <p className="text-red-500 text-sm mt-1">{formErrors.deliveryAddress}</p>
              )}
            </div>

            <div className="col-span-2">
              <Label htmlFor="coordinates">Координаты</Label>
              <Input
                id="coordinates"
                value={formData.coordinates}
                onChange={(e) => setFormData({ ...formData, coordinates: e.target.value })}
                placeholder="Широта, долгота (например: 43.2220, 76.8512)"
              />
              {formErrors.coordinates && (
                <p className="text-red-500 text-sm mt-1">{formErrors.coordinates}</p>
              )}
            </div>

            <div className="col-span-2">
              <Label htmlFor="notes">Примечания</Label>
              <Input
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Введите примечания"
              />
            </div>

            {/* Раздел дополнительных услуг */}
            {!editingOrder && (
              <div className="col-span-2">
                <div className="border-t pt-4 mt-4">
                  <div className="flex items-center justify-between mb-3">
                    <Label className="text-lg font-semibold">Дополнительные услуги</Label>
                  </div>

                  {/* Форма добавления услуги */}
                  <div className="mb-4">
                    <SelectWithQuickAdd
                      label="Добавить услугу"
                      value=""
                      onValueChange={handleAddService}
                      options={additionalServices?.map(s => ({
                        value: s.id.toString(),
                        label: `${s.name}${s.price > 0 ? ` - ${s.price} ₸` : ''}`
                      })) || []}
                      placeholder="Выберите услугу..."
                      enableQuickAdd
                      quickAddTitle="Добавить новую услугу"
                      quickAddFields={[
                        { name: 'name', label: 'Название услуги', required: true },
                        { name: 'description', label: 'Описание', required: false },
                        { name: 'price', label: 'Цена', type: 'number', required: false },
                        { name: 'unit', label: 'Единица измерения', required: false, placeholder: 'шт, час, м³' },
                      ]}
                      onQuickAdd={async (data) => {
                        await additionalServicesApi.create({
                          name: data.name,
                          description: data.description || undefined,
                          price: data.price ? parseFloat(data.price) : 0,
                          unit: data.unit || undefined,
                        });
                        await refetchAdditionalServices();
                        success('Услуга добавлена!');
                      }}
                    />
                  </div>

                {/* Список выбранных услуг */}
                {selectedServices.length > 0 ? (
                  <div className="space-y-2">
                    {selectedServices.map((service) => {
                      const serviceInfo = additionalServices?.find(s => s.id === service.additionalServiceId);
                      return (
                        <div key={service.additionalServiceId} className="p-3 bg-gray-50 rounded-lg space-y-3">
                          <div>
                            <p className="font-medium">{serviceInfo?.name}</p>
                            {serviceInfo?.description && (
                              <p className="text-sm text-gray-600">{serviceInfo.description}</p>
                            )}
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end">
                            <div>
                              <Label className="text-xs">Количество</Label>
                              <Input
                                type="number"
                                step="0.1"
                                min="0.1"
                                value={service.quantity}
                                onChange={(e) => handleServiceQuantityChange(service.additionalServiceId, parseFloat(e.target.value))}
                                className="w-full"
                              />
                            </div>
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-xs text-gray-500">Итого:</p>
                                <p className="text-sm font-semibold">
                                  {(service.quantity * service.price).toFixed(2)} ₸
                                </p>
                              </div>
                              <Button
                                type="button"
                                variant="destructive"
                                size="sm"
                                onClick={() => handleRemoveService(service.additionalServiceId)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    <div className="text-right pt-2 border-t">
                      <p className="text-lg font-semibold">
                        Итого по услугам: {selectedServices.reduce((sum, s) => sum + (s.quantity * s.price), 0).toFixed(2)} ₸
                      </p>
                    </div>
                  </div>
                ) : (
                  <p className="text-gray-500 text-sm italic">Дополнительные услуги не выбраны</p>
                )}
              </div>
            </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={resetForm}>
              Отмена
            </Button>
            <Button onClick={handleSubmit} className="bg-gray-800 hover:bg-gray-900">
              {editingOrder ? 'Обновить' : 'Создать'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Диалог для предложения изменений (директор) */}
      <Dialog open={proposeChangesModalOpen} onOpenChange={setProposeChangesModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Предложить изменения времени и адреса</DialogTitle>
            <DialogDescription>
              Укажите новые параметры доставки и причину изменения. Создатель заказа должен будет подтвердить или отменить заказ.
            </DialogDescription>
          </DialogHeader>

          {proposingChangesOrder && (
            <div className="space-y-4">
              <div className="bg-gray-100 p-4 rounded-lg">
                <h3 className="font-semibold mb-2">Текущие параметры:</h3>
                <p className="text-sm">📅 Дата: {new Date(proposingChangesOrder.deliveryDate).toLocaleDateString()}</p>
                <p className="text-sm">⏰ Время: {proposingChangesOrder.deliveryTime}</p>
                <p className="text-sm">📍 Адрес: {proposingChangesOrder.deliveryAddress}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="newDeliveryDate">Новая дата доставки *</Label>
                  <Input
                    id="newDeliveryDate"
                    type="date"
                    value={formData.deliveryDate}
                    onChange={(e) => setFormData({ ...formData, deliveryDate: e.target.value })}
                  />
                </div>

                <div>
                  <Label htmlFor="newDeliveryTime">Новое время доставки *</Label>
                  <Input
                    id="newDeliveryTime"
                    type="time"
                    value={formData.deliveryTime}
                    onChange={(e) => setFormData({ ...formData, deliveryTime: e.target.value })}
                  />
                </div>

                <div className="col-span-2">
                  <Label htmlFor="newDeliveryAddress">Новый адрес доставки *</Label>
                  <Input
                    id="newDeliveryAddress"
                    value={formData.deliveryAddress}
                    onChange={(e) => setFormData({ ...formData, deliveryAddress: e.target.value })}
                    placeholder="Введите адрес доставки"
                  />
                </div>

                <div className="col-span-2">
                  <Label htmlFor="coordinates">Координаты</Label>
                  <Input
                    id="coordinates"
                    value={formData.coordinates}
                    onChange={(e) => setFormData({ ...formData, coordinates: e.target.value })}
                    placeholder="Широта, Долгота"
                  />
                </div>

                <div className="col-span-2">
                  <Label htmlFor="changeReason">Причина изменения *</Label>
                  <textarea
                    id="changeReason"
                    value={changeReason}
                    onChange={(e) => setChangeReason(e.target.value)}
                    className="w-full min-h-[100px] p-2 border rounded-md"
                    placeholder="Укажите причину изменения времени или адреса доставки"
                    required
                  />
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setProposeChangesModalOpen(false);
              setProposingChangesOrder(null);
              setChangeReason('');
            }}>
              Отмена
            </Button>
            <Button onClick={handleProposeChanges} className="bg-gray-800 hover:bg-gray-900">
              Отправить предложение
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Модальное окно для запроса на удаление */}
      <Dialog open={deletionRequestModalOpen} onOpenChange={setDeletionRequestModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Запрос на удаление заказа</DialogTitle>
            <DialogDescription>
              Этот заказ уже принят в работу. Для удаления необходимо указать причину. Запрос будет отправлен директору на подтверждение.
            </DialogDescription>
          </DialogHeader>

          {requestingDeletionOrder && (
            <div className="space-y-4">
              <div className="bg-gray-100 p-4 rounded-lg">
                <h3 className="font-semibold mb-2">Информация о заказе:</h3>
                <p className="text-sm">📋 Номер: {requestingDeletionOrder.orderNumber}</p>
                <p className="text-sm">🏢 Заказчик: {requestingDeletionOrder.customer?.name}</p>
                <p className="text-sm">🚚 Бетон: {requestingDeletionOrder.concreteMark?.name}</p>
                <p className="text-sm">📦 Количество: {requestingDeletionOrder.quantityM3} м³</p>
                <p className="text-sm">📅 Доставка: {new Date(requestingDeletionOrder.deliveryDate).toLocaleDateString()} в {requestingDeletionOrder.deliveryTime}</p>
              </div>

              <div>
                <Label htmlFor="deletionReason">Причина удаления *</Label>
                <textarea
                  id="deletionReason"
                  value={deletionReason}
                  onChange={(e) => setDeletionReason(e.target.value)}
                  className="w-full min-h-[100px] p-2 border rounded-md"
                  placeholder="Укажите причину, по которой необходимо удалить этот заказ"
                  required
                />
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded p-3 text-sm">
                <p className="text-amber-800">⚠️ Обратите внимание:</p>
                <ul className="list-disc list-inside text-amber-700 mt-1 space-y-1">
                  <li>Запрос будет отправлен директору</li>
                  <li>Директор может подтвердить или отклонить удаление</li>
                  <li>До решения директора заказ останется в системе</li>
                </ul>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setDeletionRequestModalOpen(false);
              setRequestingDeletionOrder(null);
              setDeletionReason('');
            }}>
              Отмена
            </Button>
            <Button onClick={handleRequestDeletion} className="bg-gray-800 hover:bg-gray-900">
              Отправить запрос
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Подтвердите удаление</AlertDialogTitle>
            <AlertDialogDescription>
              Вы уверены, что хотите удалить этот заказ? Это действие нельзя отменить.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-gray-800 hover:bg-gray-900">
              Удалить
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
