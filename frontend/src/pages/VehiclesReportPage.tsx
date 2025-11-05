import React, { useState, useEffect } from 'react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card } from '../components/ui/card';
import { reportsApi } from '../services/api';
import { useNotifications } from '../hooks/useNotifications';
import { Download } from 'lucide-react';

interface VehicleReportData {
  vehicleId: number;
  vehiclePlate: string;
  vehicleType: string;
  totalDistanceKm: number;
  invoiceCount: number;
  averageDistanceKm: number;
  invoices: Array<{
    id: number;
    invoiceNumber: string;
    date: string;
    distanceKm: number;
    totalDistanceKm: number | null;
    driver: {
      name: string;
      phone: string;
    } | null;
  }>;
}

interface VehiclesReportResponse {
  vehicles: VehicleReportData[];
  summary: {
    totalVehicles: number;
    totalDistanceKm: number;
    totalInvoices: number;
    averageDistancePerVehicle: number;
  };
  period: {
    startDate: string | null;
    endDate: string | null;
  };
}

export const VehiclesReportPage: React.FC = () => {
  const { error } = useNotifications();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<VehiclesReportResponse | null>(null);
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  useEffect(() => {
    loadReport();
  }, []);

  const loadReport = async () => {
    setLoading(true);
    try {
      const response = await reportsApi.getVehiclesReport({
        startDate,
        endDate,
      });
      setData(response.data);
    } catch (err: any) {
      console.error('Ошибка загрузки отчета:', err);
      error(err.response?.data?.message || 'Ошибка загрузки отчета');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('ru-RU', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  };

  const downloadExcel = () => {
    if (!data) return;

    const headers = [
      'Гос. номер',
      'Тип транспорта',
      'Общий пробег (км)',
      'Количество накладных',
      'Средний пробег за накладную (км)',
    ];

    const rows = data.vehicles.map((vehicle) => [
      vehicle.vehiclePlate || '-',
      vehicle.vehicleType || '-',
      vehicle.totalDistanceKm.toFixed(2),
      vehicle.invoiceCount.toString(),
      vehicle.averageDistanceKm.toFixed(2),
    ]);

    const summaryRow = [
      'ИТОГО',
      '',
      data.summary.totalDistanceKm.toFixed(2),
      data.summary.totalInvoices.toString(),
      data.summary.averageDistancePerVehicle.toFixed(2),
    ];

    const escapeHtml = (s: string) => (s ?? '').toString().replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const thead = `<tr>${headers.map(h => `<th>${escapeHtml(h)}</th>`).join('')}</tr>`;
    const tbody = rows.map(r => `<tr>${r.map(c => `<td>${escapeHtml(c)}</td>`).join('')}</tr>`).join('');
    const summaryTr = `<tr style="font-weight: bold; background-color: #f0f0f0;">${summaryRow.map(c => `<td>${escapeHtml(c)}</td>`).join('')}</tr>`;
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8" /><title>Отчет по транспорту</title></head><body><h1>Отчет по транспорту</h1><p>Период: ${data.period.startDate ? formatDate(data.period.startDate) : 'Все время'} - ${data.period.endDate ? formatDate(data.period.endDate) : 'Все время'}</p><table border="1">${thead}${tbody}${summaryTr}</table></body></html>`;
    const blob = new Blob([html], { type: 'application/vnd.ms-excel;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    const periodStr = data.period.startDate && data.period.endDate 
      ? `${formatDate(data.period.startDate)}_${formatDate(data.period.endDate)}`
      : 'all';
    a.download = `Отчет_по_транспорту_${periodStr}.xls`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">Отчет по транспорту</h1>
        <p className="text-gray-600">Пробег транспорта по километражу</p>
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
          <div className="flex items-end gap-2">
            <Button onClick={loadReport} className="w-full">
              Применить фильтр
            </Button>
            {data && (
              <Button onClick={downloadExcel} variant="outline" className="w-full">
                <Download className="h-4 w-4 mr-2" />
                Excel
              </Button>
            )}
          </div>
        </div>
      </Card>

      {loading ? (
        <div className="text-center py-8">
          <p className="text-gray-500">Загрузка...</p>
        </div>
      ) : data ? (
        <>
          {/* Сводная информация */}
          <Card className="p-4 sm:p-6 mb-6">
            <h2 className="text-lg font-semibold mb-4">Сводная информация</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-gray-600">Всего транспорта</p>
                <p className="text-2xl font-bold">{data.summary.totalVehicles}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Общий пробег (км)</p>
                <p className="text-2xl font-bold">{data.summary.totalDistanceKm.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Всего накладных</p>
                <p className="text-2xl font-bold">{data.summary.totalInvoices}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Средний пробег на транспорт</p>
                <p className="text-2xl font-bold">{data.summary.averageDistancePerVehicle.toFixed(2)} км</p>
              </div>
            </div>
          </Card>

          {/* Таблица транспорта */}
          {data.vehicles.length === 0 ? (
            <Card className="p-6 text-center">
              <p className="text-gray-500">Нет данных для отображения</p>
            </Card>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-gray-300 text-sm">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border border-gray-300 px-2 py-2 text-left">Гос. номер</th>
                    <th className="border border-gray-300 px-2 py-2 text-left">Тип транспорта</th>
                    <th className="border border-gray-300 px-2 py-2 text-right">Общий пробег (км)</th>
                    <th className="border border-gray-300 px-2 py-2 text-right">Количество накладных</th>
                    <th className="border border-gray-300 px-2 py-2 text-right">Средний пробег за накладную (км)</th>
                  </tr>
                </thead>
                <tbody>
                  {data.vehicles.map((vehicle) => (
                    <tr key={vehicle.vehicleId} className="hover:bg-gray-50">
                      <td className="border border-gray-300 px-2 py-2 font-medium">{vehicle.vehiclePlate}</td>
                      <td className="border border-gray-300 px-2 py-2">{vehicle.vehicleType}</td>
                      <td className="border border-gray-300 px-2 py-2 text-right">{vehicle.totalDistanceKm.toFixed(2)}</td>
                      <td className="border border-gray-300 px-2 py-2 text-right">{vehicle.invoiceCount}</td>
                      <td className="border border-gray-300 px-2 py-2 text-right">{vehicle.averageDistanceKm.toFixed(2)}</td>
                    </tr>
                  ))}
                  {/* Итоговая строка */}
                  <tr className="bg-gray-100 font-bold">
                    <td className="border border-gray-300 px-2 py-2" colSpan={2}>ИТОГО</td>
                    <td className="border border-gray-300 px-2 py-2 text-right">{data.summary.totalDistanceKm.toFixed(2)}</td>
                    <td className="border border-gray-300 px-2 py-2 text-right">{data.summary.totalInvoices}</td>
                    <td className="border border-gray-300 px-2 py-2 text-right">{data.summary.averageDistancePerVehicle.toFixed(2)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </>
      ) : (
        <Card className="p-6 text-center">
          <p className="text-gray-500">Нет данных для отображения</p>
        </Card>
      )}
    </div>
  );
};


