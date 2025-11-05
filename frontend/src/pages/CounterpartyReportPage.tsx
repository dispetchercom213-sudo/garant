import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card } from '../components/ui/card';
import { reportsApi, counterpartiesApi } from '../services/api';
import { useNotifications } from '../hooks/useNotifications';
import { useAuthStore } from '../stores/authStore';
import { UserRole } from '../types';
import { Download, ArrowLeft } from 'lucide-react';

interface CounterpartyReportRow {
  id: number;
  customerName: string;
  invoiceNumber: string;
  date: string;
  concreteMarkName: string;
  vehiclePlateNumber: string;
  quantityM3: number;
  deliveryAddress: string;
  arrivedSiteAt: string | null;
  departedSiteAt: string | null;
  cementPerM3: number | null;
  sandPerM3: number | null;
  gravelPerM3: number | null;
}

export const CounterpartyReportPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { error } = useNotifications();
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<CounterpartyReportRow[]>([]);
  const [counterpartyName, setCounterpartyName] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  
  const isManager = user?.role === UserRole.MANAGER;

  useEffect(() => {
    if (id) {
      loadCounterpartyInfo();
      loadReport();
    }
  }, [id, startDate, endDate]);

  const loadCounterpartyInfo = async () => {
    if (!id) return;
    try {
      const response = await counterpartiesApi.getById(parseInt(id, 10));
      setCounterpartyName(response.data?.name || 'Контрагент');
    } catch (err: any) {
      console.error('Ошибка загрузки информации о контрагенте:', err);
    }
  };

  const loadReport = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const params: any = {};
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;

      const response = await reportsApi.getCounterpartyReport(parseInt(id, 10), params);
      setData(response.data || []);
    } catch (err: any) {
      error(err.response?.data?.message || 'Ошибка при загрузке отчета');
      console.error('Ошибка загрузки отчета:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatNumber = (value: number | null) => {
    if (value === null || value === undefined) return '-';
    return value.toFixed(2);
  };

  const downloadExcel = () => {
    const headers = [
      'Наименование покупателя (клиент)',
      'Номера накладных',
      'Дата',
      'Марка бетона',
      'Номера транспорта',
      'Количество объема (м³)',
      'Объект доставки',
      'Время прибытия на объект',
      'Время убытия с объекта',
      ...(isManager ? [] : [
        'Расход цемента за один куб',
        'Расход песок за один куб',
        'Расход щебень за один куб',
      ]),
    ];

    const rows = data.map((row) => [
      row.customerName || '-',
      row.invoiceNumber || '-',
      formatDate(row.date),
      row.concreteMarkName || '-',
      row.vehiclePlateNumber || '-',
      row.quantityM3?.toFixed(2) || '0',
      row.deliveryAddress || '-',
      formatDate(row.arrivedSiteAt),
      formatDate(row.departedSiteAt),
      ...(isManager ? [] : [
        formatNumber(row.cementPerM3),
        formatNumber(row.sandPerM3),
        formatNumber(row.gravelPerM3),
      ]),
    ]);

    const escapeHtml = (s: string) => (s ?? '').toString().replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const thead = `<tr>${headers.map(h => `<th>${escapeHtml(h)}</th>`).join('')}</tr>`;
    const tbody = rows.map(r => `<tr>${r.map(c => `<td>${escapeHtml(c)}</td>`).join('')}</tr>`).join('');
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8" /></head><body><table border="1">${thead}${tbody}</table></body></html>`;
    const blob = new Blob([html], { type: 'application/vnd.ms-excel;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `Отчет_по_контрагенту_${counterpartyName}_${new Date().toISOString().split('T')[0]}.xls`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <Button
          variant="outline"
          onClick={() => navigate(-1)}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Назад
        </Button>
        <h1 className="text-2xl font-bold mb-2">Отчет по контрагенту</h1>
        <p className="text-gray-600">{counterpartyName}</p>
      </div>

      <Card className="p-4 sm:p-6 mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
          <div>
            <Label htmlFor="startDate">Дата начала</Label>
            <Input
              id="startDate"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="endDate">Дата окончания</Label>
            <Input
              id="endDate"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
          <div className="flex items-end">
            <Button onClick={loadReport} className="w-full">
              Применить фильтр
            </Button>
          </div>
        </div>
        <div className="flex justify-end">
          <Button onClick={downloadExcel} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Скачать Excel
          </Button>
        </div>
      </Card>

      {loading ? (
        <div className="text-center py-8">
          <p className="text-gray-500">Загрузка...</p>
        </div>
      ) : data.length === 0 ? (
        <Card className="p-6 text-center">
          <p className="text-gray-500">Нет данных для отображения</p>
        </Card>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse border border-gray-300 text-sm">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-gray-300 px-2 py-2 text-left">Наименование покупателя</th>
                <th className="border border-gray-300 px-2 py-2 text-left">Номера накладных</th>
                <th className="border border-gray-300 px-2 py-2 text-left">Дата</th>
                <th className="border border-gray-300 px-2 py-2 text-left">Марка бетона</th>
                <th className="border border-gray-300 px-2 py-2 text-left">Номера транспорта</th>
                <th className="border border-gray-300 px-2 py-2 text-right">Количество объема (м³)</th>
                <th className="border border-gray-300 px-2 py-2 text-left">Объект доставки</th>
                <th className="border border-gray-300 px-2 py-2 text-left">Время прибытия на объект</th>
                <th className="border border-gray-300 px-2 py-2 text-left">Время убытия с объекта</th>
                {!isManager && (
                  <>
                    <th className="border border-gray-300 px-2 py-2 text-right">Расход цемента за один куб</th>
                    <th className="border border-gray-300 px-2 py-2 text-right">Расход песок за один куб</th>
                    <th className="border border-gray-300 px-2 py-2 text-right">Расход щебень за один куб</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {data.map((row) => (
                <tr key={row.id} className="hover:bg-gray-50">
                  <td className="border border-gray-300 px-2 py-2">{row.customerName}</td>
                  <td className="border border-gray-300 px-2 py-2">{row.invoiceNumber}</td>
                  <td className="border border-gray-300 px-2 py-2">{formatDate(row.date)}</td>
                  <td className="border border-gray-300 px-2 py-2">{row.concreteMarkName}</td>
                  <td className="border border-gray-300 px-2 py-2">{row.vehiclePlateNumber}</td>
                  <td className="border border-gray-300 px-2 py-2 text-right">{row.quantityM3?.toFixed(2) || '0'}</td>
                  <td className="border border-gray-300 px-2 py-2">{row.deliveryAddress}</td>
                  <td className="border border-gray-300 px-2 py-2">{formatDate(row.arrivedSiteAt)}</td>
                  <td className="border border-gray-300 px-2 py-2">{formatDate(row.departedSiteAt)}</td>
                  {!isManager && (
                    <>
                      <td className="border border-gray-300 px-2 py-2 text-right">{formatNumber(row.cementPerM3)}</td>
                      <td className="border border-gray-300 px-2 py-2 text-right">{formatNumber(row.sandPerM3)}</td>
                      <td className="border border-gray-300 px-2 py-2 text-right">{formatNumber(row.gravelPerM3)}</td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

