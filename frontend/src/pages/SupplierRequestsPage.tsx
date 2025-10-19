import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { type InternalRequest, RequestStatus } from '../types';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../components/ui/dialog';
import { Badge } from '../components/ui/badge';
import { Package, ShoppingCart, LayoutGrid, Table } from 'lucide-react';
import { DataTable, type Column } from '../components/ui/data-table';
import { RequestCard } from '../components/RequestCard';

export const SupplierRequestsPage: React.FC = () => {
  const [requests, setRequests] = useState<InternalRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<InternalRequest | null>(null);
  const [viewMode, setViewMode] = useState<'cards' | 'table'>(() => {
    const saved = localStorage.getItem('supplierRequestsViewMode');
    return (saved as 'cards' | 'table') || 'cards';
  });
  const [formData, setFormData] = useState({
    supplier: '',
    price: '',
  });

  const toggleViewMode = (mode: 'cards' | 'table') => {
    setViewMode(mode);
    localStorage.setItem('supplierRequestsViewMode', mode);
  };

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const response = await api.get('/internal-requests');
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

  const openEditModal = (request: InternalRequest) => {
    setSelectedRequest(request);
    setFormData({
      supplier: request.supplier || '',
      price: request.price?.toString() || '',
    });
    setIsEditModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRequest) return;

    setLoading(true);
    try {
      await api.patch(`/internal-requests/${selectedRequest.id}/supply-fill`, {
        supplier: formData.supplier,
        price: parseFloat(formData.price),
      });

      setIsEditModalOpen(false);
      setSelectedRequest(null);
      fetchRequests();
    } catch (error: any) {
      console.error('Ошибка заполнения данных:', error);
      alert(error.response?.data?.message || 'Ошибка заполнения');
    } finally {
      setLoading(false);
    }
  };

  const handleMarkPurchased = async (id: number) => {
    if (!confirm('Отметить как закупленное?')) return;

    try {
      setLoading(true);
      await api.patch(`/internal-requests/${id}/mark-purchased`);
      fetchRequests();
    } catch (error: any) {
      console.error('Ошибка отметки закупки:', error);
      alert(error.response?.data?.message || 'Ошибка');
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
    {
      id: 'employee' as keyof InternalRequest,
      label: 'Сотрудник',
      minWidth: 180,
      render: (_value, row) => {
        const emp = row.employee;
        return emp ? `${emp.firstName || ''} ${emp.lastName || ''}`.trim() : '-';
      },
    },
    { id: 'itemName', label: 'Наименование', minWidth: 200 },
    {
      id: 'quantity',
      label: 'Количество',
      minWidth: 120,
      render: (value, row) => `${value} ${row.unit}`,
    },
    {
      id: 'supplier',
      label: 'Поставщик',
      minWidth: 150,
      render: (value) => value || <span className="text-gray-400">Не указан</span>,
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
      id: 'id' as keyof InternalRequest,
      label: 'Действия',
      minWidth: 120,
      render: (_value, row) => (
        <div className="flex gap-1 sm:gap-2">
          {(row.status === RequestStatus.NEW || row.status === RequestStatus.UNDER_REVIEW) && (
            <Button
              size="sm"
              variant="default"
              onClick={() => openEditModal(row)}
              disabled={loading}
              className="text-xs sm:text-sm px-2 sm:px-3"
            >
              <Package className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
              <span className="hidden sm:inline">Заполнить</span>
              <span className="sm:hidden">✏️</span>
            </Button>
          )}
          {row.status === RequestStatus.FUNDED && (
            <Button
              size="sm"
              variant="default"
              onClick={() => handleMarkPurchased(row.id)}
              disabled={loading}
              className="text-xs sm:text-sm px-2 sm:px-3"
            >
              <ShoppingCart className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
              <span className="hidden sm:inline">Закуплено</span>
              <span className="sm:hidden">🛒</span>
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="p-3 sm:p-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-0 mb-4 sm:mb-6">
        <h1 className="text-xl sm:text-2xl font-bold">📦 Заявки сотрудников</h1>
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
                <p className="text-gray-500 text-center">Нет заявок для обработки</p>
              </CardContent>
            </Card>
          ) : (
            requests.map((request) => (
              <RequestCard
                key={request.id}
                request={request}
                showAction={
                  (request.status === RequestStatus.NEW || request.status === RequestStatus.UNDER_REVIEW) ||
                  request.status === RequestStatus.FUNDED
                }
                actionLabel={
                  request.status === RequestStatus.FUNDED ? 'Отметить закупленным' : 'Заполнить данные'
                }
                actionIcon={
                  request.status === RequestStatus.FUNDED ? 
                  <ShoppingCart className="h-4 w-4" /> : 
                  <Package className="h-4 w-4" />
                }
                onAction={() => 
                  request.status === RequestStatus.FUNDED 
                    ? handleMarkPurchased(request.id)
                    : openEditModal(request)
                }
              />
            ))
          )}
        </div>
      )}

      {/* Вид таблицей */}
      {viewMode === 'table' && (
        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle className="text-base sm:text-lg">Список заявок на обработку</CardTitle>
          </CardHeader>
          <CardContent className="p-0 sm:p-6">
            {loading && requests.length === 0 ? (
              <p className="p-4 sm:p-0">Загрузка...</p>
            ) : requests.length === 0 ? (
              <p className="text-gray-500 p-4 sm:p-0">Нет заявок для обработки</p>
            ) : (
              <DataTable columns={columns} data={requests} />
            )}
          </CardContent>
        </Card>
      )}

      {/* Модальное окно заполнения данных */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="max-w-md w-[95vw] sm:w-full max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Заполнить данные заявки</DialogTitle>
            <DialogDescription>
              Укажите поставщика и стоимость товара
            </DialogDescription>
          </DialogHeader>
          {selectedRequest && (
            <div className="mb-4 p-3 bg-gray-50 rounded">
              <p><strong>Заявка:</strong> {selectedRequest.requestNumber}</p>
              <p><strong>Товар:</strong> {selectedRequest.itemName}</p>
              <p><strong>Количество:</strong> {selectedRequest.quantity} {selectedRequest.unit}</p>
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="supplier">Поставщик *</Label>
              <Input
                id="supplier"
                value={formData.supplier}
                onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                placeholder="Название компании или поставщика"
                required
              />
            </div>
            <div>
              <Label htmlFor="price">Цена за единицу *</Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                placeholder="1000.00"
                required
              />
            </div>
            {formData.price && selectedRequest && (
              <div className="p-3 bg-blue-50 rounded">
                <p className="font-semibold">
                  Итоговая сумма: {(parseFloat(formData.price) * selectedRequest.quantity).toFixed(2)} ₸
                </p>
              </div>
            )}
            <div className="flex flex-col sm:flex-row justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setIsEditModalOpen(false)} className="w-full sm:w-auto">
                Отмена
              </Button>
              <Button type="submit" disabled={loading} className="w-full sm:w-auto">
                {loading ? 'Отправка...' : 'Отправить директору'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

