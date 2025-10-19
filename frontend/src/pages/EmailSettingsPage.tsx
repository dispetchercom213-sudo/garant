import { useState, useEffect } from 'react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { useNotifications } from '../hooks/useNotifications';
import { Mail, Settings, Save, TestTube } from 'lucide-react';

interface EmailSettings {
  MAIL_SERVICE: string;
  MAIL_USER: string;
  MAIL_PASS: string;
  MAIL_TO: string;
  MAIL_HOST: string;
  MAIL_PORT: string;
  MAIL_SECURE: boolean;
}

export default function EmailSettingsPage() {
  const [settings, setSettings] = useState<EmailSettings>({
    MAIL_SERVICE: 'gmail',
    MAIL_USER: '',
    MAIL_PASS: '',
    MAIL_TO: '',
    MAIL_HOST: '',
    MAIL_PORT: '587',
    MAIL_SECURE: false,
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const { success, error } = useNotifications();

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const response = await fetch('/api/v1/settings/email');
      if (response.ok) {
        const data = await response.json();
        setSettings({
          MAIL_SERVICE: data.MAIL_SERVICE || 'gmail',
          MAIL_USER: data.MAIL_USER || '',
          MAIL_PASS: data.MAIL_PASS || '',
          MAIL_TO: data.MAIL_TO || '',
          MAIL_HOST: data.MAIL_HOST || '',
          MAIL_PORT: data.MAIL_PORT || '587',
          MAIL_SECURE: data.MAIL_SECURE || false,
        });
      }
    } catch (error) {
      console.error('Ошибка загрузки настроек:', error);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    setMessage('');
    
    try {
      const response = await fetch('/api/v1/settings/email', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(settings),
      });

      if (response.ok) {
        setMessage('✅ Настройки сохранены');
        success('Настройки email сохранены');
        setTimeout(() => setMessage(''), 3000);
      } else {
        const errorData = await response.json();
        error(errorData.message || 'Ошибка сохранения настроек');
      }
    } catch (err) {
      error('Ошибка сохранения настроек');
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestConnection = async () => {
    setIsLoading(true);
    try {
      // Здесь можно добавить endpoint для тестирования подключения
      const response = await fetch('/api/v1/settings/email/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(settings),
      });

      if (response.ok) {
        success('Подключение к почте успешно!');
      } else {
        error('Ошибка подключения к почте');
      }
    } catch (err) {
      error('Ошибка тестирования подключения');
    } finally {
      setIsLoading(false);
    }
  };

  const updateSetting = (key: keyof EmailSettings, value: string | boolean) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">📧 Настройки Email</h1>
          <p className="text-muted-foreground">Настройка автоматической отправки архивов фото</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Основные настройки */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Настройки почты
            </CardTitle>
            <CardDescription>
              Конфигурация для отправки архивов фото
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="mail_service">Почтовый сервис</Label>
              <Select
                value={settings.MAIL_SERVICE}
                onValueChange={(value) => updateSetting('MAIL_SERVICE', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="gmail">Gmail</SelectItem>
                  <SelectItem value="mail.ru">Mail.ru</SelectItem>
                  <SelectItem value="yandex">Yandex</SelectItem>
                  <SelectItem value="custom">Другой (настройка вручную)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="mail_user">Адрес отправителя</Label>
              <Input
                id="mail_user"
                type="email"
                value={settings.MAIL_USER}
                onChange={(e) => updateSetting('MAIL_USER', e.target.value)}
                placeholder="example@gmail.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="mail_pass">Пароль приложения</Label>
              <div className="relative">
                <Input
                  id="mail_pass"
                  type={showPassword ? 'text' : 'password'}
                  value={settings.MAIL_PASS}
                  onChange={(e) => updateSetting('MAIL_PASS', e.target.value)}
                  placeholder="Пароль приложения или основной пароль"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? '👁️' : '🙈'}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Для Gmail используйте пароль приложения
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="mail_to">Кому отправлять архив</Label>
              <Input
                id="mail_to"
                type="email"
                value={settings.MAIL_TO}
                onChange={(e) => updateSetting('MAIL_TO', e.target.value)}
                placeholder="admin@company.com"
              />
            </div>
          </CardContent>
        </Card>

        {/* Дополнительные настройки */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Дополнительные настройки
            </CardTitle>
            <CardDescription>
              Для кастомных SMTP серверов
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="mail_host">SMTP хост</Label>
              <Input
                id="mail_host"
                value={settings.MAIL_HOST}
                onChange={(e) => updateSetting('MAIL_HOST', e.target.value)}
                placeholder="smtp.example.com"
                disabled={settings.MAIL_SERVICE !== 'custom'}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="mail_port">SMTP порт</Label>
              <Input
                id="mail_port"
                type="number"
                value={settings.MAIL_PORT}
                onChange={(e) => updateSetting('MAIL_PORT', e.target.value)}
                placeholder="587"
                disabled={settings.MAIL_SERVICE !== 'custom'}
              />
            </div>

            <div>
              <Label htmlFor="mail_secure">Использовать SSL/TLS</Label>
              <Select
                value={settings.MAIL_SECURE.toString()}
                onValueChange={(value) => updateSetting('MAIL_SECURE', value)}
                disabled={settings.MAIL_SERVICE !== 'custom'}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Выберите опцию" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="true">Да</SelectItem>
                  <SelectItem value="false">Нет</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h4 className="font-medium text-blue-900 mb-2">ℹ️ Информация</h4>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• Архивы отправляются ежедневно в 3:00</li>
                <li>• Фото старше 30 дней архивируются</li>
                <li>• Старые архивы удаляются через неделю</li>
                <li>• Для Gmail нужен пароль приложения</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Кнопки действий */}
      <div className="flex gap-4 mt-6">
        <Button
          onClick={handleSave}
          disabled={isSaving}
          className="flex items-center gap-2"
        >
          <Save className="h-4 w-4" />
          {isSaving ? 'Сохранение...' : 'Сохранить настройки'}
        </Button>

        <Button
          onClick={handleTestConnection}
          disabled={isLoading || !settings.MAIL_USER || !settings.MAIL_PASS}
          variant="outline"
          className="flex items-center gap-2"
        >
          <TestTube className="h-4 w-4" />
          {isLoading ? 'Тестирование...' : 'Тест подключения'}
        </Button>
      </div>

      {message && (
        <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700">
          {message}
        </div>
      )}

      {/* Инструкция по настройке Gmail */}
      {settings.MAIL_SERVICE === 'gmail' && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>📋 Инструкция по настройке Gmail</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="list-decimal list-inside space-y-2 text-sm">
              <li>Войдите в свой Google аккаунт</li>
              <li>Перейдите в "Безопасность" → "Двухэтапная аутентификация"</li>
              <li>В разделе "Пароли приложений" создайте новый пароль</li>
              <li>Скопируйте сгенерированный пароль и вставьте в поле "Пароль приложения"</li>
              <li>Сохраните настройки</li>
            </ol>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

