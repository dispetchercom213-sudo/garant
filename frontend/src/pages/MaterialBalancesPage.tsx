import React, { useState, useEffect } from 'react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card } from '../components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { warehousesApi } from '../services/api';
import { useNotifications } from '../hooks/useNotifications';
import { useApiData } from '../hooks/useApiData';
import { Download } from 'lucide-react';
import type { Warehouse } from '../types';

interface MaterialBalanceData {
  warehouseId: number;
  warehouseName: string;
  warehouseAddress: string;
  companyName: string | null;
  materialId: number;
  materialName: string;
  materialType: string;
  materialUnit: string;
  currentBalance: number;
  consumed: number;
  totalReceived: number;
}

interface MaterialBalancesResponse {
  data: MaterialBalanceData[];
  summary: {
    totalWarehouses: number;
    totalMaterials: number;
    totalBalance: number;
    totalConsumed: number;
    totalReceived: number;
  };
  period: {
    startDate: string | null;
    endDate: string | null;
  };
}

export const MaterialBalancesPage: React.FC = () => {
  const { error } = useNotifications();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<MaterialBalancesResponse | null>(null);
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>('');

  const { data: warehouses } = useApiData<Warehouse>({
    apiCall: () => warehousesApi.getAll({ limit: 1000 }),
  });

  useEffect(() => {
    loadReport();
  }, []);

  const loadReport = async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      if (selectedWarehouseId) params.warehouseId = selectedWarehouseId;

      const response = await warehousesApi.getAllMaterialBalances(params);
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

  const formatNumber = (value: number) => {
    return value.toFixed(2);
  };

  const downloadExcel = () => {
    if (!data) return;

    const headers = [
      'Склад',
      'Адрес склада',
      'Компания',
      'Материал',
      'Тип материала',
      'Единица измерения',
      'Текущий остаток',
      'Израсходовано',
      'Всего получено',
    ];

    const rows = data.data.map((item) => [
      item.warehouseName || '-',
      item.warehouseAddress || '-',
      item.companyName || '-',
      item.materialName || '-',
      item.materialType || '-',
      item.materialUnit || '-',
      formatNumber(item.currentBalance),
      formatNumber(item.consumed),
      formatNumber(item.totalReceived),
    ]);

    const summaryRow = [
      'ИТОГО',
      '',
      '',
      '',
      '',
      '',
      formatNumber(data.summary.totalBalance),
      formatNumber(data.summary.totalConsumed),
      formatNumber(data.summary.totalReceived),
    ];

    const escapeHtml = (s: string) => (s ?? '').toString().replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const thead = `<tr>${headers.map(h => `<th>${escapeHtml(h)}</th>`).join('')}</tr>`;
    const tbody = rows.map(r => `<tr>${r.map(c => `<td>${escapeHtml(c)}</td>`).join('')}</tr>`).join('');
    const summaryTr = `<tr style="font-weight: bold; background-color: #f0f0f0;">${summaryRow.map(c => `<td>${escapeHtml(c)}</td>`).join('')}</tr>`;
    const periodStr = data.period.startDate && data.period.endDate 
      ? `${formatDate(data.period.startDate)}_${formatDate(data.period.endDate)}`
      : 'all';
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8" /><title>Остатки материалов на складах</title></head><body><h1>Остатки материалов на складах</h1><p>Период: ${data.period.startDate ? formatDate(data.period.startDate) : 'Все время'} - ${data.period.endDate ? formatDate(data.period.endDate) : 'Все время'}</p><table border="1">${thead}${tbody}${summaryTr}</table></body></html>`;
    const blob = new Blob([html], { type: 'application/vnd.ms-excel;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `Остатки_материалов_${periodStr}.xls`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // Группируем данные по складам для отображения
  const groupedByWarehouse = data?.data.reduce((acc, item) => {
    if (!acc[item.warehouseId]) {
      acc[item.warehouseId] = {
        warehouse: {
          id: item.warehouseId,
          name: item.warehouseName,
          address: item.warehouseAddress,
          companyName: item.companyName,
        },
        materials: [],
      };
    }
    acc[item.warehouseId].materials.push(item);
    return acc;
  }, {} as Record<number, { warehouse: any; materials: MaterialBalanceData[] }>) || {};

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">Остатки материалов на складах</h1>
        <p className="text-gray-600">Просмотр текущих остатков и расходования материалов</p>
      </div>

      <Card className="p-4 sm:p-6 mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-4">
          <div>
            <Label htmlFor="warehouse">Склад</Label>
            <Select value={selectedWarehouseId || "all"} onValueChange={(value) => setSelectedWarehouseId(value === "all" ? "" : value)}>
              <SelectTrigger id="warehouse">
                <SelectValue placeholder="Все склады" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все склады</SelectItem>
                {warehouses?.map((warehouse) => (
                  <SelectItem key={warehouse.id} value={warehouse.id.toString()}>
                    {warehouse.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
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
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
              <div>
                <p className="text-sm text-gray-600">Складов</p>
                <p className="text-2xl font-bold">{data.summary.totalWarehouses}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Материалов</p>
                <p className="text-2xl font-bold">{data.summary.totalMaterials}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Текущий остаток</p>
                <p className="text-2xl font-bold">{formatNumber(data.summary.totalBalance)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Израсходовано</p>
                <p className="text-2xl font-bold">{formatNumber(data.summary.totalConsumed)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Всего получено</p>
                <p className="text-2xl font-bold">{formatNumber(data.summary.totalReceived)}</p>
              </div>
            </div>
          </Card>

          {/* Таблица по складам */}
          {Object.keys(groupedByWarehouse).length === 0 ? (
            <Card className="p-6 text-center">
              <p className="text-gray-500">Нет данных для отображения</p>
            </Card>
          ) : (
            <div className="space-y-6">
              {Object.values(groupedByWarehouse).map((group) => (
                <Card key={group.warehouse.id} className="p-4 sm:p-6">
                  <div className="mb-4">
                    <h3 className="text-lg font-semibold">{group.warehouse.name}</h3>
                    <p className="text-sm text-gray-600">{group.warehouse.address}</p>
                    {group.warehouse.companyName && (
                      <p className="text-sm text-gray-600">Компания: {group.warehouse.companyName}</p>
                    )}
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse border border-gray-300 text-sm">
                      <thead>
                        <tr className="bg-gray-100">
                          <th className="border border-gray-300 px-2 py-2 text-left">Материал</th>
                          <th className="border border-gray-300 px-2 py-2 text-left">Тип</th>
                          <th className="border border-gray-300 px-2 py-2 text-left">Ед. изм.</th>
                          <th className="border border-gray-300 px-2 py-2 text-right">Текущий остаток</th>
                          <th className="border border-gray-300 px-2 py-2 text-right">Израсходовано</th>
                          <th className="border border-gray-300 px-2 py-2 text-right">Всего получено</th>
                        </tr>
                      </thead>
                      <tbody>
                        {group.materials.map((material) => (
                          <tr key={`${group.warehouse.id}_${material.materialId}`} className="hover:bg-gray-50">
                            <td className="border border-gray-300 px-2 py-2 font-medium">{material.materialName}</td>
                            <td className="border border-gray-300 px-2 py-2">{material.materialType}</td>
                            <td className="border border-gray-300 px-2 py-2">{material.materialUnit}</td>
                            <td className="border border-gray-300 px-2 py-2 text-right">{formatNumber(material.currentBalance)}</td>
                            <td className="border border-gray-300 px-2 py-2 text-right">{formatNumber(material.consumed)}</td>
                            <td className="border border-gray-300 px-2 py-2 text-right">{formatNumber(material.totalReceived)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>
              ))}
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

