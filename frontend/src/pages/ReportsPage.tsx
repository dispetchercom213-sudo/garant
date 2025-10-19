import React, { useMemo, useState, useEffect } from 'react';
import { Box, Typography, Grid, Paper, Button, TextField, MenuItem } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { invoicesApi, counterpartiesApi, vehiclesApi, warehousesApi } from '../services/api';
import type { Invoice, Counterparty, Vehicle, Warehouse } from '../types';
import { InvoiceType } from '../types';

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

export const ReportsPage: React.FC = () => {
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [counterparties, setCounterparties] = useState<Counterparty[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(false);

  // Фильтры
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [warehouseId, setWarehouseId] = useState<string>('');
  const [counterpartyId, setCounterpartyId] = useState<string>('');
  const [vehicleId, setVehicleId] = useState<string>('');

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [invRes, cpRes, vehRes, whRes] = await Promise.all([
          invoicesApi.getAll(),
          counterpartiesApi.getAll(),
          vehiclesApi.getAll(),
          warehousesApi.getAll(),
        ]);
        setInvoices(invRes.data?.data ?? invRes.data ?? []);
        setCounterparties(cpRes.data?.data ?? cpRes.data ?? []);
        setVehicles(vehRes.data?.data ?? vehRes.data ?? []);
        setWarehouses(whRes.data?.data ?? whRes.data ?? []);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const filteredInvoices = useMemo(() => {
    const fromTs = dateFrom ? new Date(dateFrom).getTime() : null;
    const toTs = dateTo ? new Date(dateTo).getTime() : null;
    return invoices.filter((inv) => {
      const ts = new Date(inv.date).getTime();
      if (fromTs && ts < fromTs) return false;
      if (toTs && ts > toTs) return false;
      if (warehouseId && String(inv.warehouseId) !== warehouseId) return false;
      if (counterpartyId && String(inv.customerId ?? inv.supplierId ?? '') !== counterpartyId) return false;
      if (vehicleId && String(inv.vehicleId ?? '') !== vehicleId) return false;
      return true;
    });
  }, [invoices, dateFrom, dateTo, warehouseId, counterpartyId, vehicleId]);

  // Приход/Расход
  const income = useMemo(() => filteredInvoices.filter(i => i.type === InvoiceType.INCOME), [filteredInvoices]);
  const expense = useMemo(() => filteredInvoices.filter(i => i.type === InvoiceType.EXPENSE), [filteredInvoices]);

  const sum = (arr: Invoice[], field: keyof Invoice): number => arr.reduce((acc, i) => acc + (Number(i[field]) || 0), 0);

  const incomeTotals = {
    count: income.length,
    gross: sum(income, 'grossWeightKg'),
    tare: sum(income, 'tareWeightKg'),
    net: sum(income, 'netWeightKg') || income.reduce((acc, i) => acc + Math.max(0, (i.grossWeightKg || 0) - (i.tareWeightKg || 0)), 0),
  };
  const expenseTotals = {
    count: expense.length,
    gross: sum(expense, 'grossWeightKg'),
    tare: sum(expense, 'tareWeightKg'),
    net: sum(expense, 'netWeightKg') || expense.reduce((acc, i) => acc + Math.max(0, (i.grossWeightKg || 0) - (i.tareWeightKg || 0)), 0),
  };

  // По контрагентам
  const byCounterparty = useMemo(() => {
    const map = new Map<number, { name: string; invoices: number; netKg: number }>();
    filteredInvoices.forEach((i) => {
      const id = i.customerId ?? i.supplierId;
      if (!id) return;
      const cp = counterparties.find(c => c.id === id);
      const row = map.get(id) || { name: cp?.name || String(id), invoices: 0, netKg: 0 };
      row.invoices += 1;
      const net = (i.netWeightKg ?? Math.max(0, (i.grossWeightKg || 0) - (i.tareWeightKg || 0)));
      row.netKg += net || 0;
      map.set(id, row);
    });
    return Array.from(map.entries()).map(([id, v]) => ({ id, ...v }));
  }, [filteredInvoices, counterparties]);

  // По рейсам (транспорт)
  const byVehicle = useMemo(() => {
    const map = new Map<number, { plate: string; trips: number; netKg: number }>();
    filteredInvoices.forEach((i) => {
      if (!i.vehicleId) return;
      const v = vehicles.find(vh => vh.id === i.vehicleId);
      const row = map.get(i.vehicleId) || { plate: v?.plate || String(i.vehicleId), trips: 0, netKg: 0 };
      row.trips += 1;
      const net = (i.netWeightKg ?? Math.max(0, (i.grossWeightKg || 0) - (i.tareWeightKg || 0)));
      row.netKg += net || 0;
      map.set(i.vehicleId, row);
    });
    return Array.from(map.entries()).map(([id, v]) => ({ id, ...v }));
  }, [filteredInvoices, vehicles]);

  const exportIncome = () => {
    const headers = ['№', 'Дата', 'Склад', 'Контрагент', 'Брутто,кг', 'Тара,кг', 'Нетто,кг'];
    const rows: string[][] = [];
    income.forEach((i, idx) => {
      const wh = warehouses.find(w => w.id === i.warehouseId)?.name || '';
      const cp = counterparties.find(c => c.id === (i.customerId ?? i.supplierId))?.name || '';
      const net = i.netWeightKg ?? Math.max(0, (i.grossWeightKg || 0) - (i.tareWeightKg || 0));
      rows.push([String(idx + 1), new Date(i.date).toLocaleDateString('ru-RU'), wh, cp, String(i.grossWeightKg || 0), String(i.tareWeightKg || 0), String(net || 0)]);
    });
    rows.push(['', '', '', 'ИТОГО', String(incomeTotals.gross), String(incomeTotals.tare), String(incomeTotals.net)]);
    downloadExcel('income_report', headers, rows);
  };

  const exportExpense = () => {
    const headers = ['№', 'Дата', 'Склад', 'Контрагент', 'Брутто,кг', 'Тара,кг', 'Нетто,кг'];
    const rows: string[][] = [];
    expense.forEach((i, idx) => {
      const wh = warehouses.find(w => w.id === i.warehouseId)?.name || '';
      const cp = counterparties.find(c => c.id === (i.customerId ?? i.supplierId))?.name || '';
      const net = i.netWeightKg ?? Math.max(0, (i.grossWeightKg || 0) - (i.tareWeightKg || 0));
      rows.push([String(idx + 1), new Date(i.date).toLocaleDateString('ru-RU'), wh, cp, String(i.grossWeightKg || 0), String(i.tareWeightKg || 0), String(net || 0)]);
    });
    rows.push(['', '', '', 'ИТОГО', String(expenseTotals.gross), String(expenseTotals.tare), String(expenseTotals.net)]);
    downloadExcel('expense_report', headers, rows);
  };

  const exportCounterparties = () => {
    const headers = ['Контрагент', 'Кол-во накладных', 'Нетто,кг'];
    const rows: string[][] = [];
    byCounterparty.forEach(r => rows.push([r.name, String(r.invoices), String(Math.round(r.netKg))]));
    downloadExcel('counterparties_report', headers, rows);
  };

  const exportVehicles = () => {
    const headers = ['Транспорт', 'Рейсов', 'Нетто,кг'];
    const rows: string[][] = [];
    byVehicle.forEach(r => rows.push([r.plate, String(r.trips), String(Math.round(r.netKg))]));
    downloadExcel('vehicles_report', headers, rows);
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Отчёты
      </Typography>

      {/* Фильтры */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6} md={3}>
            <TextField label="С даты" type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} fullWidth InputLabelProps={{ shrink: true }} />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <TextField label="По дату" type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} fullWidth InputLabelProps={{ shrink: true }} />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <TextField select label="Склад" value={warehouseId} onChange={(e) => setWarehouseId(e.target.value)} fullWidth>
              <MenuItem value="">Все</MenuItem>
              {warehouses.map(w => (<MenuItem key={w.id} value={String(w.id)}>{w.name}</MenuItem>))}
            </TextField>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <TextField select label="Контрагент" value={counterpartyId} onChange={(e) => setCounterpartyId(e.target.value)} fullWidth>
              <MenuItem value="">Все</MenuItem>
              {counterparties.map(c => (<MenuItem key={c.id} value={String(c.id)}>{c.name}</MenuItem>))}
            </TextField>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <TextField select label="Транспорт" value={vehicleId} onChange={(e) => setVehicleId(e.target.value)} fullWidth>
              <MenuItem value="">Все</MenuItem>
              {vehicles.map(v => (<MenuItem key={v.id} value={String(v.id)}>{v.plate}</MenuItem>))}
            </TextField>
          </Grid>
        </Grid>
      </Paper>

      <Grid container spacing={2}>
        {/* Приходные */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>Приходные накладные</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>Кол-во: {incomeTotals.count} | Брутто: {Math.round(incomeTotals.gross)} кг | Тара: {Math.round(incomeTotals.tare)} кг | Нетто: {Math.round(incomeTotals.net)} кг</Typography>
            <Button variant="outlined" size="small" onClick={exportIncome}>Экспорт в Excel (CSV)</Button>
          </Paper>
        </Grid>

        {/* Расходные */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>Расходные накладные</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>Кол-во: {expenseTotals.count} | Брутто: {Math.round(expenseTotals.gross)} кг | Тара: {Math.round(expenseTotals.tare)} кг | Нетто: {Math.round(expenseTotals.net)} кг</Typography>
            <Button variant="outlined" size="small" onClick={exportExpense}>Экспорт в Excel (CSV)</Button>
          </Paper>
        </Grid>

        {/* Контрагенты */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>Отчёт по контрагентам</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>Всего: {byCounterparty.length}</Typography>
            <Button variant="outlined" size="small" onClick={exportCounterparties}>Экспорт в Excel (CSV)</Button>
          </Paper>
        </Grid>

        {/* Рейсы */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>Отчёт по рейсам (транспорт)</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>Всего ТС: {byVehicle.length}</Typography>
            <Button variant="outlined" size="small" onClick={exportVehicles}>Экспорт в Excel (CSV)</Button>
          </Paper>
        </Grid>

        {/* Внутренние заявки */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>📊 Отчёт по внутренним заявкам</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              Просмотр всех заявок сотрудников с фильтрацией и экспортом
            </Typography>
            <Button 
              variant="contained" 
              size="small" 
              onClick={() => navigate('/internal-requests-report')}
            >
              Открыть отчёт
            </Button>
          </Paper>
        </Grid>
      </Grid>

      {loading && (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>Загрузка данных...</Typography>
      )}
    </Box>
  );
};