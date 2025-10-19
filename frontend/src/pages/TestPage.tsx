import React, { useState } from 'react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { DataTable, type Column } from '../components/ui/data-table';
import { Plus, Building, MapPin } from 'lucide-react';

export const TestPage: React.FC = () => {
  const [open, setOpen] = useState(false);

  const testData = [
    { id: 1, name: 'Тестовая компания', bin: '123456789012', address: 'г. Алматы' },
    { id: 2, name: 'Другая компания', bin: '987654321098', address: 'г. Астана' },
  ];

  const columns: Column<typeof testData[0]>[] = [
    { id: 'name', label: 'Название', minWidth: 200 },
    { id: 'bin', label: 'БИН', minWidth: 120 },
    { id: 'address', label: 'Адрес', minWidth: 200 },
  ];

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Заголовок и статистика */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Тестовая страница BetonAPP</h1>
          <p className="text-gray-600">Демонстрация shadcn/ui + TailwindCSS</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Добавить компанию
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Добавить компанию</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Название компании *</Label>
                <Input id="name" placeholder="Введите название" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bin">БИН *</Label>
                <Input id="bin" placeholder="Введите БИН" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">Адрес *</Label>
                <Input id="address" placeholder="Введите адрес" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="type">Тип компании</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Выберите тип" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ooo">ООО</SelectItem>
                    <SelectItem value="too">ТОО</SelectItem>
                    <SelectItem value="ip">ИП</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setOpen(false)}>
                  Отмена
                </Button>
                <Button onClick={() => setOpen(false)}>
                  Создать
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Карточки статистики */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Всего компаний</CardTitle>
            <Building className="h-4 w-4 text-gray-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">2</div>
            <p className="text-xs text-gray-600">+1 с прошлой недели</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Активные заказы</CardTitle>
            <MapPin className="h-4 w-4 text-gray-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">12</div>
            <p className="text-xs text-gray-600">+3 с вчера</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Выручка</CardTitle>
            <Building className="h-4 w-4 text-gray-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₽1,234,567</div>
            <p className="text-xs text-gray-600">+20% с прошлого месяца</p>
          </CardContent>
        </Card>
      </div>

      {/* Таблица с данными */}
      <DataTable
        data={testData}
        columns={columns}
        searchable={true}
        searchFields={['name', 'bin', 'address']}
        searchPlaceholder="Поиск компаний..."
        onAdd={() => setOpen(true)}
        onEdit={(item) => console.log('Edit:', item)}
        onDelete={(item) => console.log('Delete:', item)}
        addButtonText="Добавить компанию"
      />
    </div>
  );
};
