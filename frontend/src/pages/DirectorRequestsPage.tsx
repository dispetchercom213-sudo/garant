import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { type InternalRequest, RequestStatus } from '../types';
import { Button } from '../components/ui/button';
import { Textarea } from '../components/ui/textarea';
import { Label } from '../components/ui/label';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../components/ui/dialog';
import { Badge } from '../components/ui/badge';
import { CheckCircle, XCircle, LayoutGrid, Table } from 'lucide-react';
import { DataTable, type Column } from '../components/ui/data-table';
import { RequestCard } from '../components/RequestCard';

export const DirectorRequestsPage: React.FC = () => {
  const [requests, setRequests] = useState<InternalRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [isDecisionModalOpen, setIsDecisionModalOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<InternalRequest | null>(null);
  const [decision, setDecision] = useState('');
  const [isApproved, setIsApproved] = useState(true);
  const [viewMode, setViewMode] = useState<'cards' | 'table'>(() => {
    const saved = localStorage.getItem('directorRequestsViewMode');
    return (saved as 'cards' | 'table') || 'cards';
  });

  const toggleViewMode = (mode: 'cards' | 'table') => {
    setViewMode(mode);
    localStorage.setItem('directorRequestsViewMode', mode);
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

  const openDecisionModal = (request: InternalRequest, approved: boolean) => {
    setSelectedRequest(request);
    setIsApproved(approved);
    setDecision('');
    setIsDecisionModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRequest) return;

    setLoading(true);
    try {
      await api.patch(`/internal-requests/${selectedRequest.id}/director-decision`, {
        approved: isApproved,
        decision: decision.trim() || (isApproved ? 'Одобрено' : 'Отклонено'),
      });

      setIsDecisionModalOpen(false);
      setSelectedRequest(null);
      setDecision('');
      fetchRequests();
    } catch (error: any) {
      console.error('Ошибка принятия решения:', error);
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
      label: 'Инициатор',
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
      render: (value) => value || '-',
    },
    {
      id: 'totalAmount',
      label: 'Сумма',
      minWidth: 120,
      render: (value) => value ? `${value.toFixed(2)} ₸` : '-',
    },
    {
      id: 'reason',
      label: 'Назначение',
      minWidth: 180,
      render: (value) => value || '-',
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
          {row.status === RequestStatus.WAITING_DIRECTOR && (
            <>
              <Button
                size="sm"
                variant="default"
                onClick={() => openDecisionModal(row, true)}
                disabled={loading}
                className="text-xs sm:text-sm px-2 sm:px-3"
              >
                <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4 mr-0 sm:mr-1" />
                <span className="hidden sm:inline">Принять</span>
                <span className="sm:hidden">✓</span>
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => openDecisionModal(row, false)}
                disabled={loading}
                className="text-xs sm:text-sm px-2 sm:px-3"
              >
                <XCircle className="h-3 w-3 sm:h-4 sm:w-4 mr-0 sm:mr-1" />
                <span className="hidden sm:inline">Отклонить</span>
                <span className="sm:hidden">✗</span>
              </Button>
            </>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="p-3 sm:p-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-0 mb-4 sm:mb-6">
        <h1 className="text-xl sm:text-2xl font-bold">👔 Заявки на утверждение</h1>
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
                <p className="text-gray-500 text-center">Нет заявок на утверждение</p>
              </CardContent>
            </Card>
          ) : (
            requests.map((request) => (
              <div key={request.id}>
                <RequestCard request={request} showAction={false} />
                {request.status === RequestStatus.WAITING_DIRECTOR && (
                  <div className="flex gap-2 mt-2">
                    <Button
                      onClick={() => openDecisionModal(request, true)}
                      className="flex-1"
                      disabled={loading}
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Принять
                    </Button>
                    <Button
                      onClick={() => openDecisionModal(request, false)}
                      variant="destructive"
                      className="flex-1"
                      disabled={loading}
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      Отклонить
                    </Button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* Вид таблицей */}
      {viewMode === 'table' && (
        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle className="text-base sm:text-lg">Список заявок, ожидающих решения</CardTitle>
          </CardHeader>
          <CardContent className="p-0 sm:p-6">
            {loading && requests.length === 0 ? (
              <p className="p-4 sm:p-0">Загрузка...</p>
            ) : requests.length === 0 ? (
              <p className="text-gray-500 p-4 sm:p-0">Нет заявок на утверждение</p>
            ) : (
              <DataTable columns={columns} data={requests} />
            )}
          </CardContent>
        </Card>
      )}

      {/* Модальное окно решения */}
      <Dialog open={isDecisionModalOpen} onOpenChange={setIsDecisionModalOpen}>
        <DialogContent className="max-w-md w-[95vw] sm:w-full max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {isApproved ? '✅ Принять заявку' : '❌ Отклонить заявку'}
            </DialogTitle>
            <DialogDescription>
              {isApproved 
                ? 'Подтвердите одобрение заявки и добавьте комментарий при необходимости'
                : 'Укажите причину отклонения заявки'}
            </DialogDescription>
          </DialogHeader>
          {selectedRequest && (
            <div className="mb-4 p-3 bg-gray-50 rounded">
              <p><strong>Заявка:</strong> {selectedRequest.requestNumber}</p>
              <p><strong>Инициатор:</strong> {selectedRequest.employee?.firstName} {selectedRequest.employee?.lastName}</p>
              <p><strong>Товар:</strong> {selectedRequest.itemName}</p>
              <p><strong>Количество:</strong> {selectedRequest.quantity} {selectedRequest.unit}</p>
              <p><strong>Поставщик:</strong> {selectedRequest.supplier}</p>
              <p><strong>Сумма:</strong> {selectedRequest.totalAmount?.toFixed(2)} ₸</p>
            </div>
          )}
          <form onSubmit={(e: React.FormEvent) => handleSubmit(e)} className="space-y-4">
            <div>
              <Label htmlFor="decision">Комментарий (необязательно)</Label>
              <Textarea
                id="decision"
                value={decision}
                onChange={(e) => setDecision(e.target.value)}
                placeholder={isApproved ? 'Одобрено...' : 'Причина отклонения...'}
                rows={4}
              />
            </div>
            <div className="flex flex-col sm:flex-row justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setIsDecisionModalOpen(false)} className="w-full sm:w-auto">
                Отмена
              </Button>
              <Button
                type="submit"
                variant={isApproved ? 'default' : 'destructive'}
                disabled={loading}
                className="w-full sm:w-auto"
              >
                {loading ? 'Отправка...' : isApproved ? 'Одобрить' : 'Отклонить'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

