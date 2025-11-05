import { useState, useEffect } from 'react';
import { Container, Title, Card, Stack, Text, Badge, Table, Loader, Center } from '@mantine/core';
import { driverWeighingHistoryApi } from '../services/api';
import { notifications } from '@mantine/notifications';

interface WeighingHistoryItem {
  id: number;
  vehicleId: number;
  vehicle?: {
    plate: string;
  };
  supplierId?: number;
  supplier?: {
    name: string;
  };
  companyId?: number;
  company?: {
    name: string;
  };
  materialId?: number;
  material?: {
    name: string;
  };
  warehouseId?: number;
  warehouse?: {
    name: string;
  };
  grossWeightKg?: number;
  tareWeightKg?: number;
  netWeightKg?: number;
  invoiceId?: number;
  invoice?: {
    invoiceNumber: string;
  };
  createdAt: string;
}

export default function DriverWeighingHistoryPage() {
  const [history, setHistory] = useState<WeighingHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  const loadHistory = async () => {
    try {
      setLoading(true);
      const response = await driverWeighingHistoryApi.getMy();
      setHistory(response.data || []);
    } catch (error: any) {
      notifications.show({
        title: 'Ошибка',
        message: error.response?.data?.message || 'Не удалось загрузить историю взвешивания',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, []);

  if (loading) {
    return (
      <Container size="xl" py="xl">
        <Center>
          <Loader size="lg" />
        </Center>
      </Container>
    );
  }

  return (
    <Container size="xl" py="xl">
      <Stack gap="md">
        <Title order={2}>История взвешивания</Title>

        {history.length === 0 ? (
          <Card>
            <Text c="dimmed" ta="center" py="xl">
              История взвешивания пуста
            </Text>
          </Card>
        ) : (
          <Card>
            <Table striped highlightOnHover>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Дата</Table.Th>
                  <Table.Th>Транспорт</Table.Th>
                  <Table.Th>Поставщик</Table.Th>
                  <Table.Th>Компания</Table.Th>
                  <Table.Th>Материал</Table.Th>
                  <Table.Th>Склад</Table.Th>
                  <Table.Th>Брутто (кг)</Table.Th>
                  <Table.Th>Тара (кг)</Table.Th>
                  <Table.Th>Нетто (кг)</Table.Th>
                  <Table.Th>Накладная</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {history.map((item) => (
                  <Table.Tr key={item.id}>
                    <Table.Td>
                      {new Date(item.createdAt).toLocaleString('ru-RU')}
                    </Table.Td>
                    <Table.Td>
                      {item.vehicle?.plate || '-'}
                    </Table.Td>
                    <Table.Td>
                      {item.supplier?.name || '-'}
                    </Table.Td>
                    <Table.Td>
                      {item.company?.name || '-'}
                    </Table.Td>
                    <Table.Td>
                      {item.material?.name || '-'}
                    </Table.Td>
                    <Table.Td>
                      {item.warehouse?.name || '-'}
                    </Table.Td>
                    <Table.Td>
                      {item.grossWeightKg ? `${item.grossWeightKg}` : '-'}
                    </Table.Td>
                    <Table.Td>
                      {item.tareWeightKg ? `${item.tareWeightKg}` : '-'}
                    </Table.Td>
                    <Table.Td>
                      {item.netWeightKg ? (
                        <Badge color="green">{item.netWeightKg}</Badge>
                      ) : (
                        '-'
                      )}
                    </Table.Td>
                    <Table.Td>
                      {item.invoice?.invoiceNumber || '-'}
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Card>
        )}
      </Stack>
    </Container>
  );
}

