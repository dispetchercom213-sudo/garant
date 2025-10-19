import { useState, useEffect } from 'react';
import { Container, Title, Card, Group, Text, Button, Stack, Badge, Box } from '@mantine/core';
import { IconCheck, IconMapPin, IconTruckDelivery, IconBuildingFactory, IconMap2 } from '@tabler/icons-react';
import { invoicesApi } from '../services/api';
import { notifications } from '@mantine/notifications';
import styles from '../styles/MyInvoicesDriverPage.module.css';
import { openIn2GIS, openInYandex, openInGoogle } from '../utils/mapUtils';

interface Invoice {
  id: number;
  invoiceNumber: string;
  driverAcceptedAt?: string;
  arrivedSiteAt?: string;
  departedSiteAt?: string;
  arrivedPlantAt?: string;
  quantityM3?: number;
  departureAddress?: string;
  customer?: {
    name: string;
  };
  concreteMark?: {
    name: string;
  };
  vehicle?: {
    licensePlate: string;
  };
  order?: {
    deliveryAddress?: string;
    coordinates?: string;
    latitudeTo?: number;
    longitudeTo?: number;
  };
}

export default function MyInvoicesDriverPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingInvoiceId, setUpdatingInvoiceId] = useState<number | null>(null);
  const [showCompleted, setShowCompleted] = useState(false);

  const loadInvoices = async () => {
    try {
      setLoading(true);
      const response = await invoicesApi.getMyActive();
      setInvoices(response.data || []);
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

  // Разделяем накладные на активные и завершённые
  const activeInvoices = invoices.filter(inv => !inv.arrivedPlantAt);
  const completedInvoices = invoices.filter(inv => inv.arrivedPlantAt);

  useEffect(() => {
    loadInvoices();
  }, []);

  // Функция для получения текущих координат
  const getCurrentLocation = (): Promise<{ latitude: number; longitude: number }> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation не поддерживается вашим браузером'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
        },
        (error) => {
          console.warn('Не удалось получить координаты:', error);
          // Возвращаем null координаты если геолокация недоступна
          resolve({ latitude: 0, longitude: 0 });
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        }
      );
    });
  };

  const handleAccept = async (invoice: Invoice) => {
    try {
      setUpdatingInvoiceId(invoice.id);
      await invoicesApi.accept(invoice.id);
      notifications.show({
        title: 'Успешно',
        message: 'Накладная принята',
        color: 'gray',
      });
      await loadInvoices();
    } catch (error: any) {
      notifications.show({
        title: 'Ошибка',
        message: error.response?.data?.message || 'Не удалось принять накладную',
        color: 'red',
      });
    } finally {
      setUpdatingInvoiceId(null);
    }
  };

  const handleArrivedAtSite = async (invoice: Invoice) => {
    try {
      setUpdatingInvoiceId(invoice.id);
      const location = await getCurrentLocation();
      await invoicesApi.markArrivedAtSite(invoice.id, location.latitude, location.longitude);
      notifications.show({
        title: 'Успешно',
        message: 'Прибытие на объект отмечено',
        color: 'gray',
      });
      await loadInvoices();
    } catch (error: any) {
      notifications.show({
        title: 'Ошибка',
        message: error.response?.data?.message || 'Не удалось отметить прибытие',
        color: 'red',
      });
    } finally {
      setUpdatingInvoiceId(null);
    }
  };

  const handleDepartedFromSite = async (invoice: Invoice) => {
    try {
      setUpdatingInvoiceId(invoice.id);
      const location = await getCurrentLocation();
      await invoicesApi.markDepartedFromSite(invoice.id, location.latitude, location.longitude);
      notifications.show({
        title: 'Успешно',
        message: 'Выезд с объекта отмечен',
        color: 'gray',
      });
      await loadInvoices();
    } catch (error: any) {
      notifications.show({
        title: 'Ошибка',
        message: error.response?.data?.message || 'Не удалось отметить выезд',
        color: 'red',
      });
    } finally {
      setUpdatingInvoiceId(null);
    }
  };

  const handleArrivedAtPlant = async (invoice: Invoice) => {
    try {
      setUpdatingInvoiceId(invoice.id);
      const location = await getCurrentLocation();
      await invoicesApi.markArrivedAtPlant(invoice.id, location.latitude, location.longitude);
      notifications.show({
        title: 'Успешно',
        message: 'Прибытие на завод отмечено. Маршрут завершён!',
        color: 'gray',
      });
      await loadInvoices();
    } catch (error: any) {
      notifications.show({
        title: 'Ошибка',
        message: error.response?.data?.message || 'Не удалось отметить прибытие',
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
      <Title order={2} className={styles.title}>🚚 Мои накладные</Title>
      
      {/* Переключатель активные/завершённые */}
      <Group justify="center" mb="md">
        <Button
          variant={!showCompleted ? 'filled' : 'outline'}
          color="gray"
          onClick={() => setShowCompleted(false)}
          size="lg"
        >
          Активные ({activeInvoices.length})
        </Button>
        <Button
          variant={showCompleted ? 'filled' : 'outline'}
          color="gray"
          onClick={() => setShowCompleted(true)}
          size="lg"
        >
          Завершённые ({completedInvoices.length})
        </Button>
      </Group>
      
      {displayInvoices.length === 0 ? (
        <Card shadow="sm" padding="xl" radius="md" className={styles.emptyCard}>
          <Text size="lg" ta="center" c="dimmed">
            {showCompleted ? 'Нет завершённых накладных' : 'Нет активных накладных'}
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
                  {invoice.driverAcceptedAt && (
                    <Badge color="gray" size="lg">Принята</Badge>
                  )}
                </Group>

                {/* Информация о доставке */}
                <Box className={styles.infoBox}>
                  <Text size="sm" c="dimmed">Клиент:</Text>
                  <Text size="lg" fw={500}>{invoice.customer?.name || '—'}</Text>
                </Box>

                <Box className={styles.infoBox}>
                  <Text size="sm" c="dimmed">Адрес доставки:</Text>
                  <Text size="md" mb="xs">{invoice.order?.deliveryAddress || invoice.departureAddress || '—'}</Text>
                  
                  {/* Кнопки для открытия карт */}
                  {invoice.order?.coordinates && (
                    <Group gap="xs" mt="xs">
                      <Button
                        size="xs"
                        variant="light"
                        color="gray"
                        leftSection={<IconMap2 size={16} />}
                        onClick={() => openIn2GIS(invoice.order?.coordinates)}
                      >
                        2ГИС
                      </Button>
                      <Button
                        size="xs"
                        variant="light"
                        color="red"
                        leftSection={<IconMap2 size={16} />}
                        onClick={() => openInYandex(invoice.order?.coordinates)}
                      >
                        Яндекс
                      </Button>
                      <Button
                        size="xs"
                        variant="light"
                        color="gray"
                        leftSection={<IconMap2 size={16} />}
                        onClick={() => openInGoogle(invoice.order?.coordinates)}
                      >
                        Google
                      </Button>
                    </Group>
                  )}
                </Box>

                <Group grow>
                  <Box className={styles.infoBox}>
                    <Text size="sm" c="dimmed">Бетон:</Text>
                    <Text size="md" fw={500}>{invoice.concreteMark?.name || '—'}</Text>
                  </Box>
                  <Box className={styles.infoBox}>
                    <Text size="sm" c="dimmed">Объём:</Text>
                    <Text size="md" fw={500}>{invoice.quantityM3 || 0} м³</Text>
                  </Box>
                </Group>

                {/* Кнопки действий или история для завершённых */}
                <Stack gap="xs" mt="md">
                  {invoice.arrivedPlantAt ? (
                    // Завершённая накладная - показываем историю
                    <Box className={styles.completedBox}>
                      <Badge color="gray" size="xl" mb="sm">Маршрут завершён</Badge>
                      <Stack gap="xs">
                        {invoice.driverAcceptedAt && (
                          <Text size="sm">Принята: {formatTime(invoice.driverAcceptedAt)}</Text>
                        )}
                        {invoice.arrivedSiteAt && (
                          <Text size="sm">Прибыл на объект: {formatTime(invoice.arrivedSiteAt)}</Text>
                        )}
                        {invoice.departedSiteAt && (
                          <Text size="sm">Выехал с объекта: {formatTime(invoice.departedSiteAt)}</Text>
                        )}
                        {invoice.arrivedPlantAt && (
                          <Text size="sm">Прибыл на завод: {formatTime(invoice.arrivedPlantAt)}</Text>
                        )}
                      </Stack>
                    </Box>
                  ) : (
                    // Активная накладная - показываем кнопки
                    <>
                      {!invoice.driverAcceptedAt && (
                        <Button
                          size="xl"
                          fullWidth
                          color="gray"
                          leftSection={<IconCheck size={24} />}
                          loading={updatingInvoiceId === invoice.id}
                          onClick={() => handleAccept(invoice)}
                          className={styles.actionButton}
                        >
                          Принять
                        </Button>
                      )}

                      {invoice.driverAcceptedAt && !invoice.arrivedSiteAt && (
                        <>
                          <Button
                            size="xl"
                            fullWidth
                            color="gray"
                            leftSection={<IconMapPin size={24} />}
                            loading={updatingInvoiceId === invoice.id}
                            onClick={() => handleArrivedAtSite(invoice)}
                            className={styles.actionButton}
                          >
                            Прибыл на объект
                          </Button>
                          <Text size="xs" ta="center" c="dimmed" mt={-8}>
                            Принята: {formatTime(invoice.driverAcceptedAt)}
                          </Text>
                        </>
                      )}

                      {invoice.arrivedSiteAt && !invoice.departedSiteAt && (
                        <>
                          <Button
                            size="xl"
                            fullWidth
                            color="orange"
                            leftSection={<IconTruckDelivery size={24} />}
                            loading={updatingInvoiceId === invoice.id}
                            onClick={() => handleDepartedFromSite(invoice)}
                            className={styles.actionButton}
                          >
                            Выехал с объекта
                          </Button>
                          <Text size="xs" ta="center" c="dimmed" mt={-8}>
                            Прибыл на объект: {formatTime(invoice.arrivedSiteAt)}
                          </Text>
                        </>
                      )}

                      {invoice.departedSiteAt && !invoice.arrivedPlantAt && (
                        <>
                          <Button
                            size="xl"
                            fullWidth
                            color="yellow"
                            leftSection={<IconBuildingFactory size={24} />}
                            loading={updatingInvoiceId === invoice.id}
                            onClick={() => handleArrivedAtPlant(invoice)}
                            className={styles.actionButton}
                          >
                            Прибыл на завод
                          </Button>
                          <Text size="xs" ta="center" c="dimmed" mt={-8}>
                            Выехал с объекта: {formatTime(invoice.departedSiteAt)}
                          </Text>
                        </>
                      )}
                    </>
                  )}
                </Stack>
              </Stack>
            </Card>
          ))}
        </Stack>
      )}
    </Container>
  );
}

