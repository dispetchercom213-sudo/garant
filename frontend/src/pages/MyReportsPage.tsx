import React, { useMemo, useState, useEffect } from 'react';
import { Box, Typography, Grid, Paper, Button, TextField, MenuItem, useMediaQuery, useTheme } from '@mui/material';
import { reportsApi } from '../services/api';
import type { Order, Invoice } from '../types';

// Надёжный экспорт в Excel: HTML-таблица с mime-type XLS (Excel открывает без проблем с кириллицей)
function downloadExcel(filename: string, headers: string[], rows: Array<string[]>) {
  const escapeHtml = (s: string) => (s ?? '').toString().replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const thead = `<tr>${headers.map(h => `<th>${escapeHtml(h)}</th>`).join('')}</tr>`;
  const tbody = rows.map(r => `<tr>${r.map(c => `<td>${escapeHtml(c)}</td>`).join('')}</tr>`).join('');
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8" /></head><body><table border="1">${thead}${tbody}</table></body></html>`;
  const blob = new Blob([html], { type: 'application/vnd.ms-excel;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename.endsWith('.xls') ? filename : `${filename}.xls`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

export const MyReportsPage: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<any>(null);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.down('md'));

  // Фильтры
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [statsRes, ordersRes, invoicesRes] = await Promise.all([
          reportsApi.getMyDashboard(),
          reportsApi.getMyOrders({ startDate: dateFrom, endDate: dateTo }),
          reportsApi.getMyInvoices({ startDate: dateFrom, endDate: dateTo }),
        ]);
        setStats(statsRes.data);
        setOrders(ordersRes.data ?? []);
        setInvoices(invoicesRes.data ?? []);
      } catch (error) {
        console.error('Ошибка загрузки отчетов:', error);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [dateFrom, dateTo]);

  const filteredOrders = useMemo(() => {
    return orders;
  }, [orders]);

  const filteredInvoices = useMemo(() => {
    return invoices;
  }, [invoices]);

  const exportOrders = () => {
    const headers = ['№ заказа', 'Дата создания', 'Контрагент', 'Марка бетона', 'Кол-во, м³', 'Статус', 'Адрес доставки'];
    const rows: string[][] = [];
    filteredOrders.forEach((order) => {
      rows.push([
        order.orderNumber || String(order.id),
        new Date(order.createdAt).toLocaleDateString('ru-RU'),
        order.customer?.name || '',
        order.concreteMark?.name || '',
        String(order.quantityM3 || 0),
        order.status || '',
        order.deliveryAddress || '',
      ]);
    });
    downloadExcel('my_orders_report', headers, rows);
  };

  const exportInvoices = () => {
    const headers = ['№ накладной', 'Дата', 'Тип', 'Контрагент', 'Брутто,кг', 'Тара,кг', 'Нетто,кг'];
    const rows: string[][] = [];
    filteredInvoices.forEach((inv) => {
      const net = inv.netWeightKg ?? Math.max(0, (inv.grossWeightKg || 0) - (inv.tareWeightKg || 0));
      rows.push([
        inv.invoiceNumber || String(inv.id),
        new Date(inv.date).toLocaleDateString('ru-RU'),
        inv.type || '',
        (inv.customer?.name || inv.supplier?.name) || '',
        String(inv.grossWeightKg || 0),
        String(inv.tareWeightKg || 0),
        String(net || 0),
      ]);
    });
    downloadExcel('my_invoices_report', headers, rows);
  };

  const totalOrders = filteredOrders.length;
  const totalInvoices = filteredInvoices.length;
  const totalQuantity = filteredOrders.reduce((sum, o) => sum + (o.quantityM3 || 0), 0);
  const totalNetWeight = filteredInvoices.reduce((sum, i) => {
    const net = i.netWeightKg ?? Math.max(0, (i.grossWeightKg || 0) - (i.tareWeightKg || 0));
    return sum + net;
  }, 0);

  return (
    <Box sx={{ px: isMobile ? 1 : 2, py: isMobile ? 1 : 2 }}>
      <Typography 
        variant={isMobile ? 'h5' : 'h4'} 
        gutterBottom
        sx={{ fontSize: isMobile ? '1.25rem' : undefined }}
      >
        Мои отчёты
      </Typography>
      <Typography 
        variant="body2" 
        color="text.secondary" 
        sx={{ mb: isMobile ? 1.5 : 2, fontSize: isMobile ? '0.75rem' : undefined }}
      >
        Отчёты по вашим заказам и накладным
      </Typography>

      {/* Статистика */}
      {stats && (
        <Grid container spacing={isMobile ? 1 : 2} sx={{ mb: isMobile ? 1.5 : 2 }}>
          <Grid item xs={6} sm={6} md={3}>
            <Paper sx={{ 
              p: isMobile ? 1.5 : 2, 
              textAlign: 'center',
              boxShadow: isMobile ? 1 : 2,
            }}>
              <Typography 
                variant={isMobile ? 'h6' : 'h5'}
                sx={{ fontSize: isMobile ? '1.1rem' : undefined, fontWeight: 'bold' }}
              >
                {stats.totalOrders || 0}
              </Typography>
              <Typography 
                variant="body2" 
                color="text.secondary"
                sx={{ fontSize: isMobile ? '0.7rem' : undefined, mt: 0.5 }}
              >
                Всего заказов
              </Typography>
            </Paper>
          </Grid>
          <Grid item xs={6} sm={6} md={3}>
            <Paper sx={{ 
              p: isMobile ? 1.5 : 2, 
              textAlign: 'center',
              boxShadow: isMobile ? 1 : 2,
            }}>
              <Typography 
                variant={isMobile ? 'h6' : 'h5'}
                sx={{ fontSize: isMobile ? '1.1rem' : undefined, fontWeight: 'bold' }}
              >
                {stats.totalInvoices || 0}
              </Typography>
              <Typography 
                variant="body2" 
                color="text.secondary"
                sx={{ fontSize: isMobile ? '0.7rem' : undefined, mt: 0.5 }}
              >
                Всего накладных
              </Typography>
            </Paper>
          </Grid>
        </Grid>
      )}

      {/* Фильтры */}
      <Paper sx={{ 
        p: isMobile ? 1.5 : 2, 
        mb: isMobile ? 1.5 : 2,
        boxShadow: isMobile ? 1 : 2,
      }}>
        <Grid container spacing={isMobile ? 1.5 : 2}>
          <Grid item xs={12} sm={6}>
            <TextField 
              label="С даты" 
              type="date" 
              value={dateFrom} 
              onChange={(e) => setDateFrom(e.target.value)} 
              fullWidth 
              size={isMobile ? 'small' : 'medium'}
              InputLabelProps={{ shrink: true }} 
              sx={{
                '& .MuiInputBase-input': {
                  fontSize: isMobile ? '0.875rem' : undefined,
                },
              }}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField 
              label="По дату" 
              type="date" 
              value={dateTo} 
              onChange={(e) => setDateTo(e.target.value)} 
              fullWidth 
              size={isMobile ? 'small' : 'medium'}
              InputLabelProps={{ shrink: true }} 
              sx={{
                '& .MuiInputBase-input': {
                  fontSize: isMobile ? '0.875rem' : undefined,
                },
              }}
            />
          </Grid>
        </Grid>
      </Paper>

      <Grid container spacing={isMobile ? 1.5 : 2}>
        {/* Заказы */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ 
            p: isMobile ? 1.5 : 2,
            boxShadow: isMobile ? 1 : 2,
          }}>
            <Typography 
              variant={isMobile ? 'subtitle1' : 'h6'} 
              gutterBottom
              sx={{ 
                fontSize: isMobile ? '0.95rem' : undefined,
                fontWeight: 'bold',
                mb: isMobile ? 1 : 1.5,
              }}
            >
              Мои заказы
            </Typography>
            <Typography 
              variant="body2" 
              color="text.secondary" 
              sx={{ 
                mb: isMobile ? 1 : 1.5,
                fontSize: isMobile ? '0.75rem' : undefined,
                lineHeight: isMobile ? 1.4 : undefined,
              }}
            >
              Всего: {totalOrders} | Объём: {totalQuantity.toFixed(2)} м³
            </Typography>
            <Button 
              variant="outlined" 
              size={isMobile ? 'small' : 'medium'}
              onClick={exportOrders}
              fullWidth={isMobile}
              sx={{
                fontSize: isMobile ? '0.75rem' : undefined,
                py: isMobile ? 0.75 : undefined,
              }}
            >
              Экспорт в Excel
            </Button>
          </Paper>
        </Grid>

        {/* Накладные */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ 
            p: isMobile ? 1.5 : 2,
            boxShadow: isMobile ? 1 : 2,
          }}>
            <Typography 
              variant={isMobile ? 'subtitle1' : 'h6'} 
              gutterBottom
              sx={{ 
                fontSize: isMobile ? '0.95rem' : undefined,
                fontWeight: 'bold',
                mb: isMobile ? 1 : 1.5,
              }}
            >
              Мои накладные
            </Typography>
            <Typography 
              variant="body2" 
              color="text.secondary" 
              sx={{ 
                mb: isMobile ? 1 : 1.5,
                fontSize: isMobile ? '0.75rem' : undefined,
                lineHeight: isMobile ? 1.4 : undefined,
              }}
            >
              Всего: {totalInvoices} | Нетто: {Math.round(totalNetWeight)} кг
            </Typography>
            <Button 
              variant="outlined" 
              size={isMobile ? 'small' : 'medium'}
              onClick={exportInvoices}
              fullWidth={isMobile}
              sx={{
                fontSize: isMobile ? '0.75rem' : undefined,
                py: isMobile ? 0.75 : undefined,
              }}
            >
              Экспорт в Excel
            </Button>
          </Paper>
        </Grid>
      </Grid>

      {loading && (
        <Typography 
          variant="body2" 
          color="text.secondary" 
          sx={{ 
            mt: isMobile ? 1.5 : 2,
            fontSize: isMobile ? '0.75rem' : undefined,
            textAlign: 'center',
          }}
        >
          Загрузка данных...
        </Typography>
      )}
    </Box>
  );
};

