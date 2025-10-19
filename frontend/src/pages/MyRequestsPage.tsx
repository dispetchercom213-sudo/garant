import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { type InternalRequest, RequestStatus } from '../types';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../components/ui/dialog';
import { Badge } from '../components/ui/badge';
import { Plus, CheckCircle, LayoutGrid, Table } from 'lucide-react';
import { DataTable, type Column } from '../components/ui/data-table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { RequestCard } from '../components/RequestCard';

export const MyRequestsPage: React.FC = () => {
  const [requests, setRequests] = useState<InternalRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'cards' | 'table'>(() => {
    // Сохраняем предпочтение пользователя в localStorage
    const saved = localStorage.getItem('requestsViewMode');
    return (saved as 'cards' | 'table') || 'cards';
  });
  const [formData, setFormData] = useState({
    itemName: '',
    quantity: '',
    unit: '',
    reason: '',
  });

  const toggleViewMode = (mode: 'cards' | 'table') => {
    setViewMode(mode);
    localStorage.setItem('requestsViewMode', mode);
  };

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const response = await api.get('/internal-requests/my');
      setRequests(response.data.data);
    } catch (error) {
      console.error('Ошибка загрузки заявок:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await api.post('/internal-requests', {
        itemName: formData.itemName,
        quantity: parseFloat(formData.quantity),
        unit: formData.unit,
        reason: formData.reason || undefined,
      });

      setIsCreateModalOpen(false);
      setFormData({ itemName: '', quantity: '', unit: '', reason: '' });
      fetchRequests();
    } catch (error: any) {
      console.error('Ошибка создания заявки:', error);
      alert(error.response?.data?.message || 'Ошибка создания заявки');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmReceive = async (id: number) => {
    if (!confirm('Подтвердить получение товара/материала?')) return;

    try {
      setLoading(true);
      await api.patch(`/internal-requests/${id}/confirm-receive`);
      fetchRequests();
    } catch (error: any) {
      console.error('Ошибка подтверждения получения:', error);
      alert(error.response?.data?.message || 'Ошибка подтверждения');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: RequestStatus) => {
    const statusMap: Record<RequestStatus, { label: string; variant: 'default' | 'secondary' | 'success' | 'destructive' | 'outline' }> = {
      [RequestStatus.NEW]: { label: 'Новая', variant: 'default' },
      [RequestStatus.UNDER_REVIEW]: { label: 'На рассмотрении', variant: 'secondary' },
      [RequestStatus.WAITING_DIRECTOR]: { label: 'Ожидает директора', variant: 'outline' },
      [RequestStatus.APPROVED]: { label: 'Одобрена', variant: 'success' },
      [RequestStatus.REJECTED]: { label: 'Отклонена', variant: 'destructive' },
      [RequestStatus.WAITING_ACCOUNTANT]: { label: 'Ожидает бухгалтера', variant: 'secondary' },
      [RequestStatus.FUNDED]: { label: 'Финансирована', variant: 'success' },
      [RequestStatus.PURCHASED]: { label: 'Закуплена', variant: 'success' },
      [RequestStatus.DELIVERED]: { label: 'Получена', variant: 'success' },
    };

    const { label, variant } = statusMap[status] || { label: status, variant: 'default' };
    return <Badge variant={variant}>{label}</Badge>;
  };

  const columns: Column<InternalRequest>[] = [
    { id: 'requestNumber', label: '№ Заявки', minWidth: 120 },
    { id: 'itemName', label: 'Наименование', minWidth: 200 },
    {
      id: 'quantity',
      label: 'Количество',
      minWidth: 120,
      render: (value, row) => `${value} ${row.unit}`,
    },
    {
      id: 'totalAmount',
      label: 'Сумма',
      minWidth: 120,
      render: (value) => value ? `${value.toFixed(2)} ₸` : '-',
    },
    {
      id: 'status',
      label: 'Статус',
      minWidth: 180,
      render: (value) => getStatusBadge(value as RequestStatus),
    },
    {
      id: 'currentStep',
      label: 'Текущий этап',
      minWidth: 200,
      render: (value) => value || '-',
    },
    {
      id: 'createdAt',
      label: 'Дата создания',
      minWidth: 150,
      render: (value) => new Date(value as string).toLocaleDateString('ru-RU'),
    },
    {
      id: 'id' as keyof InternalRequest,
      label: 'Действия',
      minWidth: 120,
      render: (_value, row) => (
        <div className="flex gap-1 sm:gap-2">
          {row.status === RequestStatus.PURCHASED && !row.receiverConfirmed && (
            <Button
              size="sm"
              variant="default"
              onClick={() => handleConfirmReceive(row.id)}
              disabled={loading}
              className="text-xs sm:text-sm px-2 sm:px-3"
            >
              <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
              <span className="hidden sm:inline">Получил</span>
              <span className="sm:hidden">✓</span>
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="p-3 sm:p-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-0 mb-4 sm:mb-6">
        <h1 className="text-xl sm:text-2xl font-bold">Мои заявки</h1>
        <div className="flex gap-2 w-full sm:w-auto">
          {/* Переключатель вида */}
          <div className="flex border rounded-lg overflow-hidden">
            <Button
              variant={viewMode === 'cards' ? 'default' : 'outline'}
              size="sm"
              onClick={() => toggleViewMode('cards')}
              className="rounded-none border-0"
            >
              <LayoutGrid className="h-4 w-4 mr-1" />
              <span className="hidden sm:inline">Карточки</span>
            </Button>
            <Button
              variant={viewMode === 'table' ? 'default' : 'outline'}
              size="sm"
              onClick={() => toggleViewMode('table')}
              className="rounded-none border-0"
            >
              <Table className="h-4 w-4 mr-1" />
              <span className="hidden sm:inline">Таблица</span>
            </Button>
          </div>
          <Button onClick={() => setIsCreateModalOpen(true)} className="flex-1 sm:flex-none">
            <Plus className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
            Создать заявку
          </Button>
        </div>
      </div>

      {/* Вид карточками */}
      {viewMode === 'cards' && (
        <div className="space-y-3">
          {loading && requests.length === 0 ? (
            <Card>
              <CardContent className="p-4">
                <p>Загрузка...</p>
              </CardContent>
            </Card>
          ) : requests.length === 0 ? (
            <Card>
              <CardContent className="p-4">
                <p className="text-gray-500 text-center">У вас пока нет заявок</p>
              </CardContent>
            </Card>
          ) : (
            requests.map((request) => (
              <RequestCard
                key={request.id}
                request={request}
                showAction={request.status === RequestStatus.PURCHASED && !request.receiverConfirmed}
                actionLabel="Подтвердить получение"
                actionIcon={<CheckCircle className="h-4 w-4" />}
                onAction={() => handleConfirmReceive(request.id)}
              />
            ))
          )}
        </div>
      )}

      {/* Вид таблицей */}
      {viewMode === 'table' && (
        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle className="text-base sm:text-lg">Список моих заявок</CardTitle>
          </CardHeader>
          <CardContent className="p-0 sm:p-6">
            {loading && requests.length === 0 ? (
              <p className="p-4 sm:p-0">Загрузка...</p>
            ) : requests.length === 0 ? (
              <p className="text-gray-500 p-4 sm:p-0">У вас пока нет заявок</p>
            ) : (
              <DataTable columns={columns} data={requests} />
            )}
          </CardContent>
        </Card>
      )}

      {/* Модальное окно создания заявки */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent className="max-w-md w-[95vw] sm:w-full max-h-[90vh] overflow-y-auto modal-content">
          <DialogHeader>
            <DialogTitle>Создать новую заявку</DialogTitle>
            <DialogDescription>
              Заполните форму для создания новой внутренней заявки
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="itemName">Наименование *</Label>
              <Input
                id="itemName"
                value={formData.itemName}
                onChange={(e) => setFormData({ ...formData, itemName: e.target.value })}
                placeholder="Например: Бумага А4"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="quantity">Количество *</Label>
                <Input
                  id="quantity"
                  type="number"
                  step="0.01"
                  value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                  placeholder="100"
                  required
                />
              </div>
              <div>
                <Label htmlFor="unit">Единица измерения *</Label>
                <Select
                  value={formData.unit}
                  onValueChange={(value) => setFormData({ ...formData, unit: value })}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Выберите единицу" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="шт">Штуки (шт)</SelectItem>
                    <SelectItem value="кг">Килограммы (кг)</SelectItem>
                    <SelectItem value="л">Литры (л)</SelectItem>
                    <SelectItem value="м">Метры (м)</SelectItem>
                    <SelectItem value="м²">Квадратные метры (м²)</SelectItem>
                    <SelectItem value="м³">Кубические метры (м³)</SelectItem>
                    <SelectItem value="т">Тонны (т)</SelectItem>
                    <SelectItem value="упак">Упаковки (упак)</SelectItem>
                    <SelectItem value="комп">Комплекты (комп)</SelectItem>
                    <SelectItem value="пара">Пары (пара)</SelectItem>
                    <SelectItem value="рулон">Рулоны (рулон)</SelectItem>
                    <SelectItem value="лист">Листы (лист)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label htmlFor="reason">Назначение / Причина</Label>
              <Input
                id="reason"
                value={formData.reason}
                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                placeholder="Для офиса / Для производства"
              />
            </div>
            <div className="flex flex-col sm:flex-row justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setIsCreateModalOpen(false)} className="w-full sm:w-auto">
                Отмена
              </Button>
              <Button type="submit" disabled={loading} className="w-full sm:w-auto">
                {loading ? 'Создание...' : 'Создать'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

