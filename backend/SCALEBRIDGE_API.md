# ScaleBridge API Integration

## 📋 Обзор

Полная интеграция ScaleBridge с Backend BetonAPP для управления весами и автоматического взвешивания.

## 🔗 API Endpoints

### 1. Получить статус весов

```http
GET /api/scale/:warehouseId/status
```

**Описание**: Получить текущий статус весов для склада

**Headers**: 
- `Authorization: Bearer <JWT_TOKEN>`

**Response**:
```json
{
  "status": "connected",
  "weight": 18460,
  "lastSeen": "2025-10-09T10:30:45.123Z",
  "scaleIp": "192.168.1.100",
  "scalePort": 5055
}
```

---

### 2. Настроить весы для склада

```http
POST /api/scale/:warehouseId/configure
```

**Описание**: Подключить и настроить ScaleBridge для склада

**Headers**: 
- `Authorization: Bearer <JWT_TOKEN>`
- `Content-Type: application/json`

**Body**:
```json
{
  "scaleIp": "192.168.1.100",
  "comPort": "COM3"
}
```

**Response**:
```json
{
  "apiKey": "eb3af4b0-8faf-4308-94d7-f0a6abab50ee",
  "scaleUrl": "http://192.168.1.100:5055"
}
```

---

### 3. Получить API ключ от ScaleBridge

```http
POST /api/scale/:warehouseId/get-api-key
```

**Описание**: Получить API ключ от ScaleBridge и сохранить в БД

**Headers**: 
- `Authorization: Bearer <JWT_TOKEN>`
- `Content-Type: application/json`

**Body**:
```json
{
  "scaleIp": "192.168.1.100"
}
```

**Response**:
```json
{
  "success": true,
  "apiKey": "eb3af4b0-8faf-4308-94d7-f0a6abab50ee",
  "scaleUrl": "http://192.168.1.100:5055"
}
```

---

### 4. Тест соединения с ScaleBridge

```http
POST /api/scale/:warehouseId/test-connection
```

**Описание**: Проверить соединение с ScaleBridge

**Headers**: 
- `Authorization: Bearer <JWT_TOKEN>`
- `Content-Type: application/json`

**Body**:
```json
{
  "scaleIp": "192.168.1.100",
  "apiKey": "eb3af4b0-8faf-4308-94d7-f0a6abab50ee"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Соединение успешно установлено",
  "weight": 18460
}
```

---

### 5. Выполнить взвешивание

```http
POST /api/scale/:warehouseId/weigh
```

**Описание**: Выполнить команду взвешивания (brutto/tara/netto)

**Headers**: 
- `Authorization: Bearer <JWT_TOKEN>`
- `Content-Type: application/json`

**Body**:
```json
{
  "action": "brutto",
  "orderId": 123
}
```

**Параметры**:
- `action`: "brutto" | "tara" | "netto"
- `orderId`: (опционально) ID заказа

**Response**:
```json
{
  "success": true,
  "weight": 18460,
  "photoUrl": "http://192.168.1.100:5055/photos/2025-10-09_10-30-45.jpg",
  "timestamp": "2025-10-09T10:30:45.123Z"
}
```

---

### 6. Получить текущий вес

```http
GET /api/scale/:warehouseId/current-weight
```

**Описание**: Получить текущий вес с весов в реальном времени

**Headers**: 
- `Authorization: Bearer <JWT_TOKEN>`

**Response**:
```json
{
  "weight": 18460,
  "unit": "kg",
  "stable": true
}
```

---

### 7. Поиск ScaleBridge устройств в сети

```http
GET /api/scale/discover?subnet=192.168.1
```

**Описание**: Автоматический поиск ScaleBridge устройств в локальной сети

**Headers**: 
- `Authorization: Bearer <JWT_TOKEN>`

**Query Parameters**:
- `subnet` (опционально): подсеть для сканирования (по умолчанию: 192.168.1)

**Response**:
```json
[
  {
    "ip": "192.168.1.100",
    "url": "http://192.168.1.100:5055",
    "weight": 18460
  },
  {
    "ip": "192.168.1.101",
    "url": "http://192.168.1.101:5055",
    "weight": 0
  }
]
```

---

## 🔐 Аутентификация

Все endpoints требуют JWT токен в заголовке `Authorization`:

```
Authorization: Bearer <your-jwt-token>
```

## 🎯 Роли доступа

| Endpoint | Роли |
|----------|------|
| `/status` | ADMIN, DEVELOPER, DIRECTOR, OPERATOR, MANAGER, DISPATCHER |
| `/configure` | ADMIN, DEVELOPER, DIRECTOR |
| `/get-api-key` | ADMIN, DEVELOPER, DIRECTOR |
| `/test-connection` | ADMIN, DEVELOPER, DIRECTOR |
| `/weigh` | ADMIN, DEVELOPER, DIRECTOR, OPERATOR, MANAGER, DISPATCHER |
| `/current-weight` | ADMIN, DEVELOPER, DIRECTOR, OPERATOR, MANAGER, DISPATCHER |
| `/discover` | ADMIN, DEVELOPER, DIRECTOR |

## 💾 База данных

### Warehouse Model

```prisma
model Warehouse {
  // ... existing fields
  
  // ScaleBridge интеграция
  hasScales          Boolean                    @default(false)
  scaleIpAddress     String?
  scaleApiKey        String?
  scaleComPort       String?
  scaleStatus        String?                    @default("disconnected")
  scaleLastSeen      DateTime?
  
  scaleSettings      ScaleSetting?
  scaleCameraSettings ScaleCameraSetting[]
}
```

### ScaleSetting Model

```prisma
model ScaleSetting {
  id          Int      @id @default(autoincrement())
  warehouseId Int      @unique
  scaleIp     String
  comPort     String
  baudRate    Int      @default(9600)
  dataBits    Int      @default(8)
  parity      String   @default("none")
  stopBits    Int      @default(1)
  backendUrl  String?
  apiKey      String?
  autoStart   Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  warehouse   Warehouse @relation(fields: [warehouseId], references: [id], onDelete: Cascade)
}
```

### ScaleCameraSetting Model

```prisma
model ScaleCameraSetting {
  id           Int       @id @default(autoincrement())
  warehouseId  Int
  weightType   String    // 'brutto', 'tara', 'netto'
  cameraType   String    // 'usb', 'rtsp'
  cameraDevice Int?      // Номер USB камеры (0-4)
  cameraUrl    String?   // RTSP URL
  cameraName   String?   // Название камеры
  enabled      Boolean   @default(true)
  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt
  warehouse    Warehouse @relation(fields: [warehouseId], references: [id], onDelete: Cascade)
}
```

## 🧪 Примеры использования

### cURL

#### Настроить весы
```bash
curl -X POST http://localhost:4000/api/scale/1/configure \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "scaleIp": "192.168.1.100",
    "comPort": "COM3"
  }'
```

#### Выполнить взвешивание
```bash
curl -X POST http://localhost:4000/api/scale/1/weigh \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "brutto",
    "orderId": 123
  }'
```

#### Получить текущий вес
```bash
curl http://localhost:4000/api/scale/1/current-weight \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### JavaScript/TypeScript

```typescript
import { api } from './services/api';

// Настроить весы
const configureScales = async (warehouseId: number, scaleIp: string) => {
  const response = await api.post(`/scale/${warehouseId}/configure`, {
    scaleIp,
    comPort: 'COM3',
  });
  return response.data;
};

// Выполнить взвешивание
const weigh = async (warehouseId: number, action: 'brutto' | 'tara' | 'netto') => {
  const response = await api.post(`/scale/${warehouseId}/weigh`, {
    action,
    orderId: 123,
  });
  return response.data;
};

// Получить текущий вес
const getCurrentWeight = async (warehouseId: number) => {
  const response = await api.get(`/scale/${warehouseId}/current-weight`);
  return response.data;
};

// Поиск устройств
const discoverDevices = async () => {
  const response = await api.get('/scale/discover?subnet=192.168.1');
  return response.data;
};
```

## ⚠️ Обработка ошибок

### Типичные ошибки

| Статус | Описание | Решение |
|--------|----------|---------|
| 400 | Весы не настроены | Настройте весы через `/configure` |
| 502 | ScaleBridge не отвечает | Проверьте IP адрес и доступность ScaleBridge |
| 503 | Весы отключены | Проверьте соединение с весами |
| 500 | Внутренняя ошибка | Проверьте логи Backend |

### Примеры ответов с ошибками

```json
{
  "statusCode": 400,
  "message": "Весы не настроены для данного склада",
  "error": "Bad Request"
}
```

```json
{
  "statusCode": 502,
  "message": "Не удалось подключиться к ScaleBridge по адресу 192.168.1.100:5055",
  "error": "Bad Gateway"
}
```

## 📞 Поддержка

Если у вас возникли проблемы:
1. Проверьте доступность ScaleBridge: `http://<IP>:5055/api/health`
2. Проверьте API ключ в конфигурации ScaleBridge
3. Убедитесь, что порт 5055 не заблокирован файрволом
4. Проверьте логи Backend в консоли

---

**ScaleBridge Integration v1.0.0** | Made with ❤️ for BetonAPP


