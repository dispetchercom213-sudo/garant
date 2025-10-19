import React, { useState } from 'react';
import {
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  IconButton,
  Box,
  TextField,
  InputAdornment,
  Button,
} from '@mui/material';
import {
  Search,
  Add,
  Edit,
  Delete,
  Visibility,
} from '@mui/icons-material';

export interface Column {
  id: string;
  label: string;
  minWidth?: number;
  align?: 'right' | 'left' | 'center';
  format?: (value: any) => string;
  render?: (value: any, row: any) => React.ReactNode;
}

interface DataTableProps {
  title: string;
  columns: Column[];
  data: any[];
  loading?: boolean;
  onAdd?: () => void;
  onEdit?: (id: number) => void;
  onDelete?: (id: number) => void;
  onView?: (id: number) => void;
  searchable?: boolean;
  searchFields?: string[];
  onSearch?: (query: string) => void;
}

export const DataTable: React.FC<DataTableProps> = ({
  title,
  columns,
  data,
  loading = false,
  onAdd,
  onEdit,
  onDelete,
  onView,
  searchable = true,
  searchFields = [],
  onSearch,
}) => {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchQuery, setSearchQuery] = useState('');

  const handleChangePage = (_event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(+event.target.value);
    setPage(0);
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    onSearch?.(query);
  };

  const filteredData = searchable && searchQuery
    ? (Array.isArray(data) ? data.filter(row =>
        searchFields.some(field =>
          row[field]?.toString().toLowerCase().includes(searchQuery.toLowerCase())
        )
      ) : [])
    : (Array.isArray(data) ? data : []);

  return (
    <Paper sx={{ width: '100%', overflow: 'hidden' }}>
      <Box sx={{ p: 2 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Box display="flex" alignItems="center" gap={2}>
            <h2 style={{ margin: 0 }}>{title}</h2>
            {onAdd && (
              <Button
                variant="contained"
                startIcon={<Add />}
                onClick={onAdd}
                size="small"
              >
                Добавить
              </Button>
            )}
          </Box>
          
          {searchable && (
            <TextField
              size="small"
              placeholder="Поиск..."
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search />
                  </InputAdornment>
                ),
              }}
              sx={{ minWidth: 250 }}
            />
          )}
        </Box>
      </Box>

      <TableContainer sx={{ maxHeight: 440 }}>
        <Table stickyHeader aria-label="sticky table">
          <TableHead>
            <TableRow>
              {columns.map((column) => (
                <TableCell
                  key={column.id}
                  align={column.align}
                  style={{ minWidth: column.minWidth }}
                >
                  {column.label}
                </TableCell>
              ))}
              {(onEdit || onDelete || onView) && (
                <TableCell align="center" style={{ minWidth: 120 }}>
                  Действия
                </TableCell>
              )}
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={columns.length + (onEdit || onDelete || onView ? 1 : 0)} align="center">
                  Загрузка...
                </TableCell>
              </TableRow>
            ) : filteredData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length + (onEdit || onDelete || onView ? 1 : 0)} align="center">
                  Данные не найдены
                </TableCell>
              </TableRow>
            ) : (
              filteredData
                .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                .map((row) => (
                  <TableRow hover role="checkbox" tabIndex={-1} key={row.id}>
                    {columns.map((column) => {
                      const value = row[column.id];
                      return (
                        <TableCell key={column.id} align={column.align}>
                          {column.render
                            ? column.render(value, row)
                            : column.format
                            ? column.format(value)
                            : value}
                        </TableCell>
                      );
                    })}
                    {(onEdit || onDelete || onView) && (
                      <TableCell align="center">
                        <Box display="flex" justifyContent="center" gap={1}>
                          {onView && (
                            <IconButton
                              size="small"
                              onClick={() => onView(row.id)}
                              title="Просмотр"
                            >
                              <Visibility />
                            </IconButton>
                          )}
                          {onEdit && (
                            <IconButton
                              size="small"
                              onClick={() => onEdit(row.id)}
                              title="Редактировать"
                            >
                              <Edit />
                            </IconButton>
                          )}
                          {onDelete && (
                            <IconButton
                              size="small"
                              onClick={() => onDelete(row.id)}
                              title="Удалить"
                              color="error"
                            >
                              <Delete />
                            </IconButton>
                          )}
                        </Box>
                      </TableCell>
                    )}
                  </TableRow>
                ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
      
      <TablePagination
        rowsPerPageOptions={[10, 25, 100]}
        component="div"
        count={filteredData.length}
        rowsPerPage={rowsPerPage}
        page={page}
        onPageChange={handleChangePage}
        onRowsPerPageChange={handleChangeRowsPerPage}
        labelRowsPerPage="Строк на странице:"
        labelDisplayedRows={({ from, to, count }) =>
          `${from}-${to} из ${count !== -1 ? count : `более чем ${to}`}`
        }
      />
    </Paper>
  );
};

