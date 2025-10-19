import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { type InternalRequest, RequestStatus } from '../types';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { DataTable, type Column } from '../components/ui/data-table';
import { FileSpreadsheet, Printer, LayoutGrid, Table } from 'lucide-react';
import { RequestCard } from '../components/RequestCard';

export const InternalRequestsReportPage: React.FC = () => {
  const [requests, setRequests] = useState<InternalRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [viewMode, setViewMode] = useState<'cards' | 'table'>(() => {
    const saved = localStorage.getItem('reportRequestsViewMode');
    return (saved as 'cards' | 'table') || 'table';
  });
  const [stats, setStats] = useState({
    total: 0,
    totalAmount: 0,
    approved: 0,
    rejected: 0,
    pending: 0,
    completed: 0,
  });

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const response = await api.get('/internal-requests');
      const data = response.data.data || [];
      setRequests(data);
      
      // Расчёт статистики
      const totalAmount = data.reduce((sum: number, req: InternalRequest) => 
        sum + (req.totalAmount || 0), 0
      );
      
      setStats({
        total: data.length,
        totalAmount,
        approved: data.filter((r: InternalRequest) => r.status === RequestStatus.APPROVED || r.status === RequestStatus.WAITING_ACCOUNTANT || r.status === RequestStatus.FUNDED || r.status === RequestStatus.PURCHASED || r.status === RequestStatus.DELIVERED).length,
        rejected: data.filter((r: InternalRequest) => r.status === RequestStatus.REJECTED).length,
        pending: data.filter((r: InternalRequest) => r.status === RequestStatus.NEW || r.status === RequestStatus.UNDER_REVIEW || r.status === RequestStatus.WAITING_DIRECTOR).length,
        completed: data.filter((r: InternalRequest) => r.status === RequestStatus.DELIVERED).length,
      });
    } catch (error) {
      console.error('Ошибка загрузки отчёта:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const toggleViewMode = (mode: 'cards' | 'table') => {
    setViewMode(mode);
    localStorage.setItem('reportRequestsViewMode', mode);
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

  const filteredRequests = filterStatus === 'ALL' 
    ? requests 
    : requests.filter(r => r.status === filterStatus);

  const columns: Column<InternalRequest>[] = [
    { 
      id: 'requestNumber', 
      label: '№ Заявки', 
      minWidth: 120 
    },
    {
      id: 'employee' as keyof InternalRequest,
      label: 'Сотрудник',
      minWidth: 180,
      render: (_value, row) => {
        const emp = row.employee;
        return emp ? `${emp.firstName || ''} ${emp.lastName || ''}`.trim() : '-';
      },
    },
    { 
      id: 'itemName', 
      label: 'Наименование', 
      minWidth: 200 
    },
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
      id: 'price',
      label: 'Цена за ед.',
      minWidth: 120,
      render: (value) => value ? `${value.toFixed(2)} ₸` : '-',
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
      minWidth: 150,
      render: (value) => getStatusBadge(value as RequestStatus),
    },
    {
      id: 'reason',
      label: 'Назначение',
      minWidth: 180,
      render: (value) => value || '-',
    },
    {
      id: 'createdAt',
      label: 'Дата создания',
      minWidth: 150,
      render: (value) => new Date(value as string).toLocaleDateString('ru-RU'),
    },
  ];

  const handlePrint = () => {
    window.print();
  };

  const handleExport = () => {
    const csv = [
      ['№ Заявки', 'Сотрудник', 'Наименование', 'Количество', 'Ед. изм.', 'Поставщик', 'Цена', 'Сумма', 'Статус', 'Назначение', 'Дата'].join(';'),
      ...filteredRequests.map(req => [
        req.requestNumber,
        `${req.employee?.firstName || ''} ${req.employee?.lastName || ''}`.trim(),
        req.itemName,
        req.quantity,
        req.unit,
        req.supplier || '',
        req.price || '',
        req.totalAmount || '',
        req.status,
        req.reason || '',
        new Date(req.createdAt).toLocaleDateString('ru-RU'),
      ].join(';'))
    ].join('\n');

    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `internal_requests_report_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  return (
    <div className="p-3 sm:p-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-0 mb-4 sm:mb-6">
        <h1 className="text-xl sm:text-2xl font-bold">📊 Отчёт по внутренним заявкам</h1>
        <div className="flex gap-2 w-full sm:w-auto">
          <div className="flex border rounded-lg overflow-hidden">
            <Button
              variant={viewMode === 'cards' ? 'default' : 'outline'}
              size="sm"
              onClick={() => toggleViewMode('cards')}
              className="rounded-none border-0"
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'table' ? 'default' : 'outline'}
              size="sm"
              onClick={() => toggleViewMode('table')}
              className="rounded-none border-0"
            >
              <Table className="h-4 w-4" />
            </Button>
          </div>
          <Button onClick={handleExport} variant="outline" className="flex-1 sm:flex-none">
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Экспорт CSV</span>
            <span className="sm:hidden">CSV</span>
          </Button>
          <Button onClick={handlePrint} variant="outline" className="flex-1 sm:flex-none">
            <Printer className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Печать</span>
            <span className="sm:hidden">🖨️</span>
          </Button>
        </div>
      </div>

      {/* Статистические карточки */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4 mb-4 sm:mb-6">
        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="text-xs sm:text-sm text-gray-500">Всего заявок</div>
            <div className="text-xl sm:text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="text-xs sm:text-sm text-gray-500">Общая сумма</div>
            <div className="text-lg sm:text-xl font-bold text-blue-600">
              {stats.totalAmount.toFixed(2)} ₸
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="text-xs sm:text-sm text-gray-500">На рассмотрении</div>
            <div className="text-xl sm:text-2xl font-bold text-yellow-600">{stats.pending}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="text-xs sm:text-sm text-gray-500">Одобрено</div>
            <div className="text-xl sm:text-2xl font-bold text-green-600">{stats.approved}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="text-xs sm:text-sm text-gray-500">Завершено</div>
            <div className="text-xl sm:text-2xl font-bold text-blue-600">{stats.completed}</div>
          </CardContent>
        </Card>
      </div>

      {/* Фильтр */}
      <div className="mb-4">
        <Label htmlFor="statusFilter" className="text-sm font-medium">
          Фильтр по статусу:
        </Label>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-full sm:w-64 mt-1">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Все заявки</SelectItem>
            <SelectItem value={RequestStatus.NEW}>Новые</SelectItem>
            <SelectItem value={RequestStatus.WAITING_DIRECTOR}>Ожидают директора</SelectItem>
            <SelectItem value={RequestStatus.APPROVED}>Одобрены</SelectItem>
            <SelectItem value={RequestStatus.REJECTED}>Отклонены</SelectItem>
            <SelectItem value={RequestStatus.WAITING_ACCOUNTANT}>Ожидают бухгалтера</SelectItem>
            <SelectItem value={RequestStatus.FUNDED}>Финансированы</SelectItem>
            <SelectItem value={RequestStatus.PURCHASED}>Закуплены</SelectItem>
            <SelectItem value={RequestStatus.DELIVERED}>Завершены</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Вид карточками */}
      {viewMode === 'cards' && (
        <div className="space-y-3">
          {loading ? (
            <Card>
              <CardContent className="p-4">
                <p>Загрузка...</p>
              </CardContent>
            </Card>
          ) : filteredRequests.length === 0 ? (
            <Card>
              <CardContent className="p-4">
                <p className="text-gray-500 text-center">Нет данных по заданному фильтру</p>
              </CardContent>
            </Card>
          ) : (
            filteredRequests.map((request) => (
              <RequestCard key={request.id} request={request} showAction={false} />
            ))
          )}
        </div>
      )}

      {/* Вид таблицей */}
      {viewMode === 'table' && (
        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle className="text-base sm:text-lg">
              Список заявок ({filteredRequests.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 sm:p-6">
            {loading ? (
              <p className="p-4 sm:p-0">Загрузка...</p>
            ) : filteredRequests.length === 0 ? (
              <p className="text-gray-500 p-4 sm:p-0">Нет данных по заданному фильтру</p>
            ) : (
              <DataTable columns={columns} data={filteredRequests} searchable={false} />
            )}
          </CardContent>
        </Card>
      )}

      {/* Стили для печати */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .print-area, .print-area * {
            visibility: visible;
          }
          .print-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          button, .no-print {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
};

