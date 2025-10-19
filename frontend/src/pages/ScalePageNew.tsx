import { useState, useEffect } from 'react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { useApiData } from '../hooks/useApiData';
import { useNotifications } from '../hooks/useNotifications';
import type { Warehouse } from '../types';
import { Scale, Camera, Weight, History, Settings } from 'lucide-react';

interface ScaleFix {
  id: number;
  warehouseId: number;
  type: 'brutto' | 'tara';
  weight: number;
  photoPath?: string;
  createdAt: string;
  warehouse: {
    id: number;
    name: string;
  };
}

interface ScaleData {
  weight: number;
  warehouseId: number;
  warehouseName: string;
}

export default function ScalePageNew() {
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>('');
  const [currentWeight, setCurrentWeight] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(false);
  const [scaleHistory, setScaleHistory] = useState<ScaleFix[]>([]);
  const [lastFix, setLastFix] = useState<ScaleFix | null>(null);

  const { success, error } = useNotifications();

  // Загружаем склады
  const { data: warehouses } = useApiData<Warehouse>({
    apiCall: () => fetch('/api/v1/warehouses').then(res => res.json()),
    dependencies: []
  });

  // Автообновление веса каждые 2 секунды
  useEffect(() => {
    if (!selectedWarehouseId) return;

    const interval = setInterval(async () => {
      try {
        const response = await fetch(`/api/v1/scale/${selectedWarehouseId}/read`);
        if (response.ok) {
          const data: ScaleData = await response.json();
          setCurrentWeight(data.weight);
        }
      } catch (error) {
        console.error('Ошибка получения веса:', error);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [selectedWarehouseId]);

  const handleWarehouseChange = async (warehouseId: string) => {
    setSelectedWarehouseId(warehouseId);
    
    if (warehouseId) {
      try {
        const response = await fetch(`/api/v1/scale/${warehouseId}/read`);
        if (response.ok) {
          const data: ScaleData = await response.json();
          setCurrentWeight(data.weight);
        } else {
          error('Ошибка подключения к весам');
        }
      } catch (err) {
        error('Ошибка подключения к весам');
      }

      // Загружаем историю
      loadScaleHistory(warehouseId);
    }
  };

  const loadScaleHistory = async (warehouseId: string) => {
    try {
      const response = await fetch(`/api/v1/scale/${warehouseId}/history`);
      if (response.ok) {
        const data = await response.json();
        setScaleHistory(data.fixes);
      }
    } catch (error) {
      console.error('Ошибка загрузки истории:', error);
    }
  };

  const handleFixWeight = async (type: 'brutto' | 'tara') => {
    if (!selectedWarehouseId) {
      error('Выберите склад');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`/api/v1/scale/${selectedWarehouseId}/fix`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ type }),
      });

      if (response.ok) {
        const fixData: ScaleFix = await response.json();
        setLastFix(fixData);
        success(`${type === 'brutto' ? 'Брутто' : 'Тара'} зафиксировано: ${fixData.weight} кг`);
        
        // Обновляем историю
        loadScaleHistory(selectedWarehouseId);
      } else {
        const errorData = await response.json();
        error(errorData.message || 'Ошибка фиксации веса');
      }
    } catch (err) {
      error('Ошибка фиксации веса');
    } finally {
      setIsLoading(false);
    }
  };

  const selectedWarehouse = warehouses?.find(w => w.id.toString() === selectedWarehouseId);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">⚖️ Весы</h1>
          <p className="text-muted-foreground">Фиксация веса и фото при взвешивании</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Панель управления */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Scale className="h-5 w-5" />
              Управление весами
            </CardTitle>
            <CardDescription>
              Выберите склад и зафиксируйте вес
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="warehouse">Склад</Label>
              <Select value={selectedWarehouseId} onValueChange={handleWarehouseChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Выберите склад" />
                </SelectTrigger>
                <SelectContent>
                  {warehouses?.map((warehouse) => (
                    <SelectItem key={warehouse.id} value={warehouse.id.toString()}>
                      {warehouse.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedWarehouse && (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                  <div>
                    <Label className="text-sm font-medium">Текущий вес</Label>
                    <div className="text-2xl font-bold">{currentWeight.toFixed(2)} кг</div>
                  </div>
                  <Weight className="h-8 w-8 text-muted-foreground" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <Button
                    onClick={() => handleFixWeight('brutto')}
                    disabled={isLoading}
                    className="h-16 text-lg font-semibold bg-green-600 hover:bg-green-700"
                  >
                    <Weight className="mr-2 h-5 w-5" />
                    БРУТТО
                  </Button>
                  <Button
                    onClick={() => handleFixWeight('tara')}
                    disabled={isLoading}
                    variant="outline"
                    className="h-16 text-lg font-semibold border-orange-500 text-orange-600 hover:bg-orange-50"
                  >
                    <Weight className="mr-2 h-5 w-5" />
                    ТАРА
                  </Button>
                </div>

                {lastFix && (
                  <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center gap-2 text-green-700">
                      <Camera className="h-4 w-4" />
                      <span className="font-medium">Последняя фиксация:</span>
                    </div>
                    <div className="mt-1 text-sm text-green-600">
                      {lastFix.type === 'brutto' ? 'Брутто' : 'Тара'}: {lastFix.weight} кг
                    </div>
                    <div className="text-xs text-green-500">
                      {new Date(lastFix.createdAt).toLocaleString('ru-RU')}
                    </div>
                    {lastFix.photoPath && (
                      <div className="mt-2">
                        <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded text-xs">
                          📸 Фото сохранено
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* История */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              История взвешиваний
            </CardTitle>
            <CardDescription>
              Последние фиксации веса
            </CardDescription>
          </CardHeader>
          <CardContent>
            {scaleHistory.length > 0 ? (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {scaleHistory.slice(0, 10).map((fix) => (
                  <div
                    key={fix.id}
                    className="p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <span className={`px-2 py-1 rounded text-xs ${fix.type === 'brutto' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'}`}>
                        {fix.type === 'brutto' ? 'Брутто' : 'Тара'}
                      </span>
                      <span className="font-semibold">{fix.weight} кг</span>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {new Date(fix.createdAt).toLocaleString('ru-RU')}
                    </div>
                    {fix.photoPath && (
                      <div className="flex items-center gap-1 mt-1">
                        <Camera className="h-3 w-3 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">Фото</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <History className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>Нет данных о взвешиваниях</p>
                <p className="text-sm">Выберите склад для просмотра истории</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Информация о складе */}
      {selectedWarehouse && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Информация о складе
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label className="text-sm font-medium">Название</Label>
                <div className="text-sm">{selectedWarehouse.name}</div>
              </div>
              <div>
                <Label className="text-sm font-medium">Адрес</Label>
                <div className="text-sm">{selectedWarehouse.address || 'Не указан'}</div>
              </div>
              <div>
                <Label className="text-sm font-medium">Статус весов</Label>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-1 rounded text-xs ${selectedWarehouse.scaleActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                    {selectedWarehouse.scaleActive ? 'Активны' : 'Неактивны'}
                  </span>
                  {selectedWarehouse.scaleUrl && (
                    <span className="px-2 py-1 border border-gray-300 rounded text-xs">
                      {selectedWarehouse.scaleUrl}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

