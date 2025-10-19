# 📚 Руководство по использованию SelectWithQuickAdd

## 🎯 Что это?

`SelectWithQuickAdd` — это компонент выпадающего списка с кнопкой "**+**", которая позволяет быстро добавлять новые элементы справочников **прямо из формы**, не переходя на другие страницы.

---

## 🚀 Быстрый старт

### Импорт компонента

```tsx
import { SelectWithQuickAdd } from '../components/SelectWithQuickAdd';
import { counterpartiesApi } from '../services/api';
```

---

## 📝 Пример 1: Добавление контрагента

```tsx
const [counterparties, setCounterparties] = useState<Counterparty[]>([]);
const [selectedCounterpartyId, setSelectedCounterpartyId] = useState('');

const fetchCounterparties = async () => {
  const response = await counterpartiesApi.getAll();
  setCounterparties(response.data.data);
};

useEffect(() => {
  fetchCounterparties();
}, []);

// В форме:
<SelectWithQuickAdd
  label="Контрагент"
  value={selectedCounterpartyId}
  onValueChange={setSelectedCounterpartyId}
  options={counterparties.map(c => ({
    value: c.id.toString(),
    label: c.name
  }))}
  placeholder="Выберите контрагента"
  required
  
  // Настройки быстрого добавления
  enableQuickAdd
  quickAddTitle="Добавить контрагента"
  quickAddFields={[
    { name: 'name', label: 'Название', required: true },
    { name: 'phone', label: 'Телефон', type: 'tel', required: true },
    { name: 'binOrIin', label: 'БИН/ИИН', required: false },
    { name: 'address', label: 'Адрес', required: false },
  ]}
  onQuickAdd={async (data) => {
    // Отправляем данные на сервер
    await counterpartiesApi.create({
      name: data.name,
      kind: 'LEGAL', // Юридическое лицо по умолчанию
      type: 'CUSTOMER',
      phone: data.phone,
      binOrIin: data.binOrIin || undefined,
      address: data.address || undefined,
    });
    
    // Обновляем список
    await fetchCounterparties();
    
    // Показываем уведомление
    alert('Контрагент успешно добавлен!');
  }}
/>
```

---

## 📝 Пример 2: Добавление марки бетона

```tsx
<SelectWithQuickAdd
  label="Марка бетона"
  value={selectedMarkId}
  onValueChange={setSelectedMarkId}
  options={concreteMarks.map(m => ({
    value: m.id.toString(),
    label: m.name
  }))}
  placeholder="Выберите марку"
  required
  
  enableQuickAdd
  quickAddTitle="Добавить марку бетона"
  quickAddFields={[
    { name: 'name', label: 'Название марки', required: true, placeholder: 'М300' },
  ]}
  onQuickAdd={async (data) => {
    await concreteMarksApi.create({
      name: data.name,
    });
    await fetchConcreteMarks();
  }}
/>
```

---

## 📝 Пример 3: Добавление транспорта

```tsx
<SelectWithQuickAdd
  label="Транспорт"
  value={selectedVehicleId}
  onValueChange={setSelectedVehicleId}
  options={vehicles.map(v => ({
    value: v.id.toString(),
    label: `${v.plate} (${v.type || 'Не указан'})`
  }))}
  placeholder="Выберите транспорт"
  
  enableQuickAdd
  quickAddTitle="Добавить транспорт"
  quickAddFields={[
    { name: 'plate', label: 'Номер автомобиля', required: true, placeholder: 'А123БВ' },
    { name: 'type', label: 'Тип транспорта', required: false, placeholder: 'КамАЗ' },
    { name: 'capacity', label: 'Грузоподъёмность', type: 'number', required: true },
    { name: 'unit', label: 'Единица измерения', required: true, placeholder: 'тонн' },
  ]}
  onQuickAdd={async (data) => {
    await vehiclesApi.create({
      plate: data.plate,
      type: data.type || undefined,
      capacity: parseFloat(data.capacity),
      unit: data.unit,
    });
    await fetchVehicles();
  }}
/>
```

---

## 📝 Пример 4: Добавление материала (с выпадающим списком)

```tsx
<SelectWithQuickAdd
  label="Материал"
  value={selectedMaterialId}
  onValueChange={setSelectedMaterialId}
  options={materials.map(m => ({
    value: m.id.toString(),
    label: `${m.name} (${m.unit})`
  }))}
  placeholder="Выберите материал"
  
  enableQuickAdd
  quickAddTitle="Добавить материал"
  quickAddFields={[
    { name: 'name', label: 'Название материала', required: true },
    { 
      name: 'unit', 
      label: 'Единица измерения', 
      type: 'select',  // ⭐ Выпадающий список!
      required: true, 
      placeholder: 'Выберите единицу',
      options: [
        { value: 'шт', label: 'Штуки (шт)' },
        { value: 'кг', label: 'Килограммы (кг)' },
        { value: 'л', label: 'Литры (л)' },
        { value: 'м', label: 'Метры (м)' },
        { value: 'м²', label: 'Квадратные метры (м²)' },
        { value: 'м³', label: 'Кубические метры (м³)' },
        { value: 'т', label: 'Тонны (т)' },
        { value: 'упак', label: 'Упаковки (упак)' },
        { value: 'комп', label: 'Комплекты (комп)' },
        { value: 'пара', label: 'Пары (пара)' },
        { value: 'рулон', label: 'Рулоны (рулон)' },
        { value: 'лист', label: 'Листы (лист)' },
      ]
    },
  ]}
  onQuickAdd={async (data) => {
    await materialsApi.create({
      name: data.name,
      unit: data.unit,
    });
    await fetchMaterials();
  }}
/>
```

---

## 📝 Пример 5: Добавление склада

```tsx
<SelectWithQuickAdd
  label="Склад"
  value={selectedWarehouseId}
  onValueChange={setSelectedWarehouseId}
  options={warehouses.map(w => ({
    value: w.id.toString(),
    label: w.name
  }))}
  placeholder="Выберите склад"
  
  enableQuickAdd
  quickAddTitle="Добавить склад"
  quickAddFields={[
    { name: 'name', label: 'Название склада', required: true },
    { name: 'address', label: 'Адрес', required: true },
    { name: 'phone', label: 'Телефон', type: 'tel', required: false },
    { name: 'companyId', label: 'ID компании', type: 'number', required: true },
  ]}
  onQuickAdd={async (data) => {
    await warehousesApi.create({
      name: data.name,
      address: data.address,
      phone: data.phone || undefined,
      companyId: parseInt(data.companyId),
    });
    await fetchWarehouses();
  }}
/>
```

---

## 🔧 API компонента

### Props

| Prop | Тип | Обязательный | Описание |
|------|-----|--------------|----------|
| `label` | `string` | ✅ | Подпись поля |
| `value` | `string` | ✅ | Текущее выбранное значение |
| `onValueChange` | `(value: string) => void` | ✅ | Обработчик изменения |
| `options` | `Array<{value: string, label: string}>` | ✅ | Список опций |
| `placeholder` | `string` | ❌ | Текст-заполнитель |
| `required` | `boolean` | ❌ | Обязательное ли поле |
| `disabled` | `boolean` | ❌ | Заблокировано ли поле |
| `enableQuickAdd` | `boolean` | ❌ | Включить кнопку "+" |
| `quickAddTitle` | `string` | ❌ | Заголовок модального окна |
| `quickAddFields` | `Array<QuickAddField>` | ❌ | Поля формы добавления |
| `onQuickAdd` | `(data: Record<string, string>) => Promise<void>` | ❌ | Обработчик добавления |

### QuickAddField

```tsx
interface QuickAddField {
  name: string;           // Имя поля (ключ в data)
  label: string;          // Подпись поля
  type?: 'text' | 'number' | 'email' | 'tel' | 'select';  // Тип поля
  required?: boolean;     // Обязательное ли поле
  placeholder?: string;   // Текст-заполнитель
  options?: Array<{ value: string; label: string }>;  // Опции для type: 'select'
}
```

**Новое!** Поддержка выпадающих списков (`type: 'select'`)!

---

## ✅ Где уже реализовано:

### ✅ В форме создания/редактирования накладных (`InvoicesPageNew.tsx`):
- ✅ **Клиент** (заказчик) — для расходных накладных
- ✅ **Поставщик** — для приходных накладных
- ✅ **Марка бетона** — для расходных накладных
- ✅ **Материал** (с выпадающим списком единиц) — для приходных накладных
- ✅ **Склад** — для всех типов накладных
- ✅ **Водитель** — для всех типов накладных
- ✅ **Транспорт** (с выпадающим списком единиц) — для всех типов накладных
- ✅ **Компания** — для всех типов накладных

### ✅ В форме создания заказов (`OrdersPageNew.tsx`):
- ✅ **Заказчик** (контрагент-клиент)
- ✅ **Марка бетона**

### 📝 Где можно добавить (TODO):

### В форме создания внутренних заявок:
- ⏳ Склад (warehouseId)

---

## 🎨 Адаптивность

Компонент **автоматически адаптируется** под мобильные устройства:
- Модальное окно занимает **95%** ширины на телефоне
- Максимальная ширина **~28rem** на десктопе
- Все поля формы **вертикально выровнены**

---

## 💡 Преимущества

✅ **Ускоряет работу** — не нужно переходить на другие страницы  
✅ **Повышает удобство** — всё в одном месте  
✅ **Сокращает клики** — быстрое добавление в 2 клика  
✅ **Универсальность** — подходит для любых справочников  
✅ **Адаптивность** — работает на всех устройствах  
✅ **Выпадающие списки** — поддержка `type: 'select'` для стандартизации данных  

---

## 🚦 Что дальше?

1. **Замените обычные `Select`** на `SelectWithQuickAdd` во всех формах
2. **Настройте поля** под каждый справочник
3. **Добавьте уведомления** после успешного создания
4. **Протестируйте** на мобильных устройствах

**Готово! Теперь ваши пользователи могут создавать справочники прямо из форм! 🎉**

