import React, { useState } from "react";
import { Check, Cpu, Camera, Download, Network, Hammer } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { useNotifications } from "../../hooks/useNotifications";

const ScaleSetupPage: React.FC = () => {
  const [status, setStatus] = useState("");
  const [downloading, setDownloading] = useState(false);
  const [weight, setWeight] = useState<number | null>(null);
  const [testWarehouseId, setTestWarehouseId] = useState<string>("1");
  const { success, error } = useNotifications();

  const downloadInstaller = async () => {
    setDownloading(true);
    setStatus("📦 Подготовка установщика...");
    
    try {
      const response = await fetch("/api/v1/scale/download", {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Ошибка при скачивании");
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "ScaleBridge-Installer-Fixed.zip";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      
      setStatus("✅ Установщик ScaleBridge загружен!");
      success("Установщик ScaleBridge успешно загружен!");
    } catch (error: any) {
      console.error("Ошибка при скачивании:", error);
      setStatus("❌ Ошибка при загрузке установщика");
      error(error.message || "Ошибка при загрузке установщика");
    } finally {
      setDownloading(false);
    }
  };

  const testConnection = async () => {
    if (!testWarehouseId) {
      error("Укажите ID склада для тестирования");
      return;
    }

    setStatus("🔍 Проверка соединения...");
    
    try {
      const response = await fetch(`/api/v1/scale/${testWarehouseId}/read`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Ошибка подключения");
      }
      
      const data = await response.json();
      setWeight(data.weight);
      setStatus("✅ Подключение успешно!");
      success(`Подключение к весам успешно! Текущий вес: ${data.weight} кг`);
    } catch (error: any) {
      console.error("Ошибка при тестировании:", error);
      setStatus("❌ Не удалось подключиться. Проверьте IP или программу.");
      error(error.message || "Не удалось подключиться к весам");
      setWeight(null);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-bold flex items-center gap-2">
            ⚙️ Настройка весов (ScaleBridge)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <p className="text-muted-foreground leading-relaxed">
            Программа <strong>ScaleBridge</strong> соединяет физические весы (COM-порт)
            с веб-приложением BetonAPP. Установите её на компьютер с подключёнными весами.
          </p>

          {/* 1️⃣ СКАЧИВАНИЕ */}
          <div className="border-t pt-6">
            <h2 className="text-lg font-semibold flex items-center gap-2 mb-4">
              <Download className="w-5 h-5" /> 1. Скачать установщик
            </h2>
            <p className="text-muted-foreground mb-4">
              Нажмите кнопку ниже, чтобы загрузить автоустановщик ScaleBridge с автоматической настройкой:
            </p>
            <div className="flex gap-3 items-center">
              <Button
                onClick={downloadInstaller}
                disabled={downloading}
                className="bg-green-600 hover:bg-green-700"
              >
                {downloading ? "📦 Загрузка..." : "📦 Скачать автоустановщик"}
              </Button>
              {status && <p className="text-sm text-muted-foreground">{status}</p>}
            </div>
          </div>

          {/* 2️⃣ УСТАНОВКА */}
          <div className="border-t pt-6">
            <h2 className="text-lg font-semibold flex items-center gap-2 mb-4">
              <Cpu className="w-5 h-5" /> 2. Установка
            </h2>
            <p className="text-muted-foreground mb-4">
              Запустите скачанный файл <code className="bg-muted px-2 py-1 rounded">ScaleBridgeSetup.exe</code> от имени администратора:
            </p>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <h3 className="font-semibold text-blue-800 mb-2">🚀 Установщик автоматически:</h3>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• Проверит и установит Node.js (если нужно)</li>
                <li>• Установит ScaleBridge в C:\Program Files (x86)\BetonAPP\ScaleBridge</li>
                <li>• Установит все зависимости (npm install)</li>
                <li>• Создаст ярлык "ScaleBridge" на рабочем столе</li>
                <li>• Добавит в автозагрузку Windows</li>
                <li>• Предложит запустить программу сразу</li>
              </ul>
            </div>
            
            <h3 className="text-md font-semibold mb-3">⚙️ Настройка параметров</h3>
            <p className="text-muted-foreground mb-4">
              После установки откройте файл конфигурации и укажите параметры:
            </p>
            <p className="text-sm text-muted-foreground mb-3">
              Путь к файлу: <code className="bg-muted px-2 py-1 rounded">C:\Program Files (x86)\BetonAPP\ScaleBridge\config.json</code>
            </p>
            <pre className="bg-muted text-sm p-4 rounded-lg overflow-x-auto">
{`{
  "comPort": "COM3",
  "baudRate": 9600,
  "cameraUrl": "http://192.168.0.120:8081/shot.jpg"
}`}
            </pre>
            <p className="text-muted-foreground mt-2 text-sm">
              ⚠️ Если камера не используется, оставьте cameraUrl пустым.
            </p>
          </div>

          {/* 3️⃣ ПРИВЯЗКА */}
          <div className="border-t pt-6">
            <h2 className="text-lg font-semibold flex items-center gap-2 mb-4">
              <Network className="w-5 h-5" /> 3. Привязка склада
            </h2>
            <p className="text-muted-foreground mb-4">
              В разделе <strong>"Склады"</strong> укажите:
              <br />
              <code className="bg-muted px-2 py-1 rounded">scaleUrl = http://IP_компьютера:8080</code><br />
              Например: <code className="bg-muted px-2 py-1 rounded">http://192.168.0.55:8080</code>
            </p>
          </div>

          {/* 4️⃣ ПРОВЕРКА */}
          <div className="border-t pt-6">
            <h2 className="text-lg font-semibold flex items-center gap-2 mb-4">
              <Camera className="w-5 h-5" /> 4. Проверка подключения
            </h2>
            <div className="space-y-4">
              <div className="flex gap-3 items-end">
                <div>
                  <Label htmlFor="warehouseId">ID склада для тестирования</Label>
                  <Input
                    id="warehouseId"
                    type="number"
                    value={testWarehouseId}
                    onChange={(e) => setTestWarehouseId(e.target.value)}
                    placeholder="1"
                    className="w-32"
                  />
                </div>
                <Button
                  onClick={testConnection}
                  disabled={!testWarehouseId}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  🔍 Проверить соединение
                </Button>
              </div>
              
              {weight !== null && (
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-lg font-semibold text-green-800">
                    Текущий вес: <span className="text-blue-600">{weight.toFixed(2)} кг</span>
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* 5️⃣ ГОТОВО */}
          <div className="border-t pt-6">
            <h2 className="text-lg font-semibold flex items-center gap-2 mb-4">
              <Hammer className="w-5 h-5" /> 5. Готово к использованию
            </h2>
            <div className="space-y-3">
              <p className="text-muted-foreground">
                После установки ScaleBridge будет готов к работе:
              </p>
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h3 className="font-semibold text-green-800 mb-2">🚀 Способы запуска:</h3>
                <ul className="text-sm text-green-700 space-y-1">
                  <li>• <strong>Ярлык на рабочем столе:</strong> Дважды кликните "ScaleBridge"</li>
                  <li>• <strong>Меню Пуск:</strong> BetonAPP → ScaleBridge</li>
                  <li>• <strong>Автозапуск:</strong> Программа запустится при старте Windows</li>
                </ul>
              </div>
              <p className="text-muted-foreground">
                ScaleBridge начнёт передавать вес и фото при нажатии "БРУТТО" и "ТАРА" в разделе "Весы".
              </p>
            </div>
          </div>

          {/* Дополнительная информация */}
          <div className="border-t pt-6">
            <h2 className="text-lg font-semibold flex items-center gap-2 mb-4">
              <Check className="w-5 h-5" /> Дополнительная информация
            </h2>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-semibold text-blue-800 mb-2">Системные требования:</h3>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• Windows 7/8/10/11 (x64)</li>
                <li>• Node.js 18+ (устанавливается автоматически)</li>
                <li>• COM-порт для подключения весов (RS-232)</li>
                <li>• IP-камера (опционально)</li>
              </ul>
            </div>
            
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mt-4">
              <h3 className="font-semibold text-yellow-800 mb-2">Важно:</h3>
              <ul className="text-sm text-yellow-700 space-y-1">
                <li>• Убедитесь, что COM-порт свободен</li>
                <li>• Проверьте настройки брандмауэра для порта 8080</li>
                <li>• IP-камера должна быть доступна в локальной сети</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ScaleSetupPage;
