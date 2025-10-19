import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { type InternalRequest, RequestStatus } from '../types';
import { Button } from '../components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { DollarSign, LayoutGrid, Table } from 'lucide-react';
import { DataTable, type Column } from '../components/ui/data-table';
import { RequestCard } from '../components/RequestCard';

export const AccountantRequestsPage: React.FC = () => {
  const [requests, setRequests] = useState<InternalRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState<'cards' | 'table'>(() => {
    const saved = localStorage.getItem('accountantRequestsViewMode');
    return (saved as 'cards' | 'table') || 'cards';
  });

  const toggleViewMode = (mode: 'cards' | 'table') => {
    setViewMode(mode);
    localStorage.setItem('accountantRequestsViewMode', mode);
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

  const handleFund = async (id: number) => {
    if (!confirm('Подтвердить выделение средств?')) return;

    try {
      setLoading(true);
      await api.patch(`/internal-requests/${id}/accountant-fund`);
      fetchRequests();
    } catch (error: any) {
      console.error('Ошибка выделения средств:', error);
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
      id: 'directorDecision',
      label: 'Решение директора',
      minWidth: 200,
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
          {row.status === RequestStatus.WAITING_ACCOUNTANT && (
            <Button
              size="sm"
              variant="default"
              onClick={() => handleFund(row.id)}
              disabled={loading}
              className="text-xs sm:text-sm px-2 sm:px-3"
            >
              <DollarSign className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
              <span className="hidden sm:inline">Выделить средства</span>
              <span className="sm:hidden">💰</span>
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="p-3 sm:p-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-0 mb-4 sm:mb-6">
        <h1 className="text-xl sm:text-2xl font-bold">💰 Заявки на финансирование</h1>
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
                <p className="text-gray-500 text-center">Нет заявок на финансирование</p>
              </CardContent>
            </Card>
          ) : (
            requests.map((request) => (
              <RequestCard
                key={request.id}
                request={request}
                showAction={request.status === RequestStatus.WAITING_ACCOUNTANT}
                actionLabel="Выделить средства"
                actionIcon={<DollarSign className="h-4 w-4" />}
                onAction={() => handleFund(request.id)}
              />
            ))
          )}
        </div>
      )}

      {/* Вид таблицей */}
      {viewMode === 'table' && (
        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle className="text-base sm:text-lg">Список заявок, одобренных директором</CardTitle>
          </CardHeader>
          <CardContent className="p-0 sm:p-6">
            {loading && requests.length === 0 ? (
              <p className="p-4 sm:p-0">Загрузка...</p>
            ) : requests.length === 0 ? (
              <p className="text-gray-500 p-4 sm:p-0">Нет заявок на финансирование</p>
            ) : (
              <DataTable columns={columns} data={requests} />
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

