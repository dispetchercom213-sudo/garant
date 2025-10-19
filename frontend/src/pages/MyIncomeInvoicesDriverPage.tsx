import { useState, useEffect } from 'react';
import { Container, Title, Card, Group, Text, Button, Stack, Badge, Box } from '@mantine/core';
import { IconScale, IconCheck } from '@tabler/icons-react';
import { invoicesApi, scaleApi } from '../services/api';
import { notifications } from '@mantine/notifications';
import styles from '../styles/MyInvoicesDriverPage.module.css';

interface Invoice {
  id: number;
  invoiceNumber: string;
  type: string;
  grossWeightKg?: number;
  tareWeightKg?: number;
  netWeightKg?: number;
  grossWeightAt?: string;
  tareWeightAt?: string;
  warehouseId?: number;
  warehouse?: {
    id: number;
    name: string;
    scaleIpAddress?: string;
    scaleApiKey?: string;
    hasScales?: boolean;
  };
  supplier?: {
    name: string;
  };
  material?: {
    name: string;
  };
  vehicle?: {
    licensePlate: string;
  };
  createdAt: string;
}

export default function MyIncomeInvoicesDriverPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingInvoiceId, setUpdatingInvoiceId] = useState<number | null>(null);
  const [showCompleted, setShowCompleted] = useState(false);

  const loadInvoices = async () => {
    try {
      setLoading(true);
      // Загружаем только приходные накладные водителя
      const response = await invoicesApi.getMyActive();
      const incomeInvoices = (response.data || []).filter((inv: Invoice) => inv.type === 'INCOME');
      setInvoices(incomeInvoices);
    } catch (error: any) {
      notifications.show({
        title: 'Ошибка',
        message: error.response?.data?.message || 'Не удалось загрузить накладные',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  // Разделяем накладные на активные (не взвешенные) и завершённые (взвешенные)
  const activeInvoices = invoices.filter(inv => !inv.grossWeightKg || !inv.tareWeightKg);
  const completedInvoices = invoices.filter(inv => inv.grossWeightKg && inv.tareWeightKg);

  useEffect(() => {
    loadInvoices();
    // Автообновление каждые 10 секунд
    const interval = setInterval(loadInvoices, 10000);
    return () => clearInterval(interval);
  }, []);

  // Взвешивание БРУТТО
  const handleWeighBrutto = async (invoice: Invoice) => {
    if (!invoice.warehouseId) {
      notifications.show({
        title: 'Ошибка',
        message: 'Склад не указан в накладной',
        color: 'red',
      });
      return;
    }

    try {
      setUpdatingInvoiceId(invoice.id);
      const response = await scaleApi.weigh(invoice.warehouseId, {
        action: 'brutto',
        orderId: invoice.id
      });

      if (response.data && response.data.weight !== undefined) {
        // Обновляем накладную с весом брутто
        await invoicesApi.update(invoice.id, {
          grossWeightKg: response.data.weight,
          grossWeightAt: response.data.timestamp || new Date().toISOString(),
        });

        notifications.show({
          title: '✅ Взвешивание',
          message: `БРУТТО зафиксирован: ${response.data.weight} кг`,
          color: 'green',
        });
        await loadInvoices();
      }
    } catch (error: any) {
      notifications.show({
        title: 'Ошибка',
        message: error.response?.data?.message || 'Не удалось зафиксировать вес БРУТТО',
        color: 'red',
      });
    } finally {
      setUpdatingInvoiceId(null);
    }
  };

  // Взвешивание ТАРА
  const handleWeighTara = async (invoice: Invoice) => {
    if (!invoice.warehouseId) {
      notifications.show({
        title: 'Ошибка',
        message: 'Склад не указан в накладной',
        color: 'red',
      });
      return;
    }

    try {
      setUpdatingInvoiceId(invoice.id);
      const response = await scaleApi.weigh(invoice.warehouseId, {
        action: 'tara',
        orderId: invoice.id
      });

      if (response.data && response.data.weight !== undefined) {
        const tareWeight = response.data.weight;
        const bruttoWeight = invoice.grossWeightKg || 0;
        const netWeight = bruttoWeight > 0 ? bruttoWeight - tareWeight : 0;

        // Обновляем накладную с весом тары и нетто
        await invoicesApi.update(invoice.id, {
          tareWeightKg: tareWeight,
          tareWeightAt: response.data.timestamp || new Date().toISOString(),
          netWeightKg: netWeight > 0 ? netWeight : undefined,
        });

        notifications.show({
          title: '✅ Взвешивание',
          message: `ТАРА зафиксирована: ${tareWeight} кг, НЕТТО: ${netWeight.toFixed(1)} кг`,
          color: 'green',
        });
        await loadInvoices();
      }
    } catch (error: any) {
      notifications.show({
        title: 'Ошибка',
        message: error.response?.data?.message || 'Не удалось зафиксировать вес ТАРА',
        color: 'red',
      });
    } finally {
      setUpdatingInvoiceId(null);
    }
  };

  const formatTime = (dateStr?: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  if (loading) {
    return (
      <Container size="md" className={styles.container}>
        <Title order={2} className={styles.title}>Загрузка...</Title>
      </Container>
    );
  }

  const displayInvoices = showCompleted ? completedInvoices : activeInvoices;

  return (
    <Container size="md" className={styles.container}>
      <Title order={2} className={styles.title}>⚖️ Приходные накладные</Title>
      
      {/* Переключатель активные/завершённые */}
      <Group justify="center" mb="md">
        <Button
          variant={!showCompleted ? 'filled' : 'outline'}
          color="blue"
          onClick={() => setShowCompleted(false)}
          size="lg"
        >
          Не взвешенные ({activeInvoices.length})
        </Button>
        <Button
          variant={showCompleted ? 'filled' : 'outline'}
          color="green"
          onClick={() => setShowCompleted(true)}
          size="lg"
        >
          Взвешенные ({completedInvoices.length})
        </Button>
      </Group>
      
      {displayInvoices.length === 0 ? (
        <Card shadow="sm" padding="xl" radius="md" className={styles.emptyCard}>
          <Text size="lg" ta="center" c="dimmed">
            {showCompleted ? 'Нет взвешенных накладных' : 'Нет накладных для взвешивания'}
          </Text>
        </Card>
      ) : (
        <Stack gap="md">
          {displayInvoices.map((invoice) => (
            <Card key={invoice.id} shadow="md" padding="lg" radius="md" className={styles.invoiceCard}>
              <Stack gap="sm">
                {/* Заголовок накладной */}
                <Group justify="space-between">
                  <Text size="xl" fw={700} className={styles.invoiceNumber}>
                    № {invoice.invoiceNumber}
                  </Text>
                  {invoice.grossWeightKg && invoice.tareWeightKg && (
                    <Badge color="green" size="lg" leftSection={<IconCheck size={16} />}>
                      Взвешено
                    </Badge>
                  )}
                </Group>

                {/* Информация о накладной */}
                <Box className={styles.infoBox}>
                  <Text size="sm" c="dimmed">Склад:</Text>
                  <Text size="lg" fw={500}>{invoice.warehouse?.name || '—'}</Text>
                </Box>

                <Group grow>
                  <Box className={styles.infoBox}>
                    <Text size="sm" c="dimmed">Поставщик:</Text>
                    <Text size="md" fw={500}>{invoice.supplier?.name || '—'}</Text>
                  </Box>
                  <Box className={styles.infoBox}>
                    <Text size="sm" c="dimmed">Материал:</Text>
                    <Text size="md" fw={500}>{invoice.material?.name || '—'}</Text>
                  </Box>
                </Group>

                <Box className={styles.infoBox}>
                  <Text size="sm" c="dimmed">Транспорт:</Text>
                  <Text size="md" fw={500}>{invoice.vehicle?.licensePlate || '—'}</Text>
                </Box>

                <Box className={styles.infoBox}>
                  <Text size="sm" c="dimmed">Дата создания:</Text>
                  <Text size="md">{formatDate(invoice.createdAt)}</Text>
                </Box>

                {/* Весовые данные если есть */}
                {(invoice.grossWeightKg || invoice.tareWeightKg) && (
                  <Box className={styles.weightInfo} mt="md" p="md" style={{ backgroundColor: '#f0f9ff', borderRadius: 8 }}>
                    <Text size="sm" fw={700} mb="xs">⚖️ Весовые данные:</Text>
                    <Group grow>
                      {invoice.grossWeightKg && (
                        <Box>
                          <Text size="xs" c="dimmed">Брутто:</Text>
                          <Text size="lg" fw={700} c="blue">{invoice.grossWeightKg} кг</Text>
                          {invoice.grossWeightAt && (
                            <Text size="xs" c="dimmed">{formatTime(invoice.grossWeightAt)}</Text>
                          )}
                        </Box>
                      )}
                      {invoice.tareWeightKg && (
                        <Box>
                          <Text size="xs" c="dimmed">Тара:</Text>
                          <Text size="lg" fw={700} c="orange">{invoice.tareWeightKg} кг</Text>
                          {invoice.tareWeightAt && (
                            <Text size="xs" c="dimmed">{formatTime(invoice.tareWeightAt)}</Text>
                          )}
                        </Box>
                      )}
                      {invoice.netWeightKg && (
                        <Box>
                          <Text size="xs" c="dimmed">Нетто:</Text>
                          <Text size="lg" fw={700} c="green">{invoice.netWeightKg.toFixed(1)} кг</Text>
                        </Box>
                      )}
                    </Group>
                  </Box>
                )}

                {/* Кнопки взвешивания только для активных накладных */}
                {!showCompleted && invoice.warehouse?.hasScales && (
                  <Stack gap="xs" mt="md">
                    <Group grow>
                      <Button
                        size="xl"
                        color="blue"
                        leftSection={<IconScale size={24} />}
                        loading={updatingInvoiceId === invoice.id}
                        onClick={() => handleWeighBrutto(invoice)}
                        disabled={!!invoice.grossWeightKg}
                      >
                        {invoice.grossWeightKg ? `✓ ${invoice.grossWeightKg} кг` : 'БРУТТО'}
                      </Button>
                      <Button
                        size="xl"
                        color="orange"
                        leftSection={<IconScale size={24} />}
                        loading={updatingInvoiceId === invoice.id}
                        onClick={() => handleWeighTara(invoice)}
                        disabled={!invoice.grossWeightKg || !!invoice.tareWeightKg}
                      >
                        {invoice.tareWeightKg ? `✓ ${invoice.tareWeightKg} кг` : 'ТАРА'}
                      </Button>
                    </Group>
                    {!invoice.warehouse?.hasScales && (
                      <Text size="sm" c="red" ta="center">
                        ⚠️ Весы не настроены для этого склада
                      </Text>
                    )}
                  </Stack>
                )}
              </Stack>
            </Card>
          ))}
        </Stack>
      )}
    </Container>
  );
}

