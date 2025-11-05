import React, { useState, useMemo } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './table';
import { Button } from './button';
import { Input } from './input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './select';
import { ChevronLeft, ChevronRight, Search, ChevronsLeft, ChevronsRight, Edit, Trash2, Printer, Copy } from 'lucide-react';

export interface Column<T = any> {
  id: keyof T;
  label: string;
  minWidth?: number;
  render?: (value: any, row: T) => React.ReactNode;
}

interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  loading?: boolean;
  searchable?: boolean;
  searchFields?: (keyof T)[];
  searchPlaceholder?: string;
  onSearch?: (query: string) => void;
  onAdd?: () => void;
  onEdit?: (item: T) => void;
  onDelete?: (item: T) => void;
  canDelete?: (item: T) => boolean;
  onPrint?: (item: T) => void;
  onCopy?: (item: T) => void;
  addButtonText?: string;
  showActions?: boolean;
}

export function DataTable<T extends Record<string, any>>({
  data,
  columns,
  loading = false,
  searchable = true,
  searchFields = [],
  searchPlaceholder = "Поиск...",
  onSearch,
  onAdd,
  onEdit,
  onDelete,
  canDelete,
  onPrint,
  onCopy,
  addButtonText = "Добавить",
  showActions = true
}: DataTableProps<T>) {
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Фильтрация данных
  const filteredData = useMemo(() => {
    if (!searchable || !searchQuery) return data;
    
    return data.filter(row =>
      searchFields.some(field =>
        row[field]?.toString().toLowerCase().includes(searchQuery.toLowerCase())
      )
    );
  }, [data, searchQuery, searchable, searchFields]);

  // Пагинация
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * rowsPerPage;
    return filteredData.slice(startIndex, startIndex + rowsPerPage);
  }, [filteredData, currentPage, rowsPerPage]);

  const totalPages = Math.ceil(filteredData.length / rowsPerPage);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    setCurrentPage(1); // Сбрасываем на первую страницу при поиске
    onSearch?.(query);
  };

  const handleRowsPerPageChange = (value: string) => {
    setRowsPerPage(Number(value));
    setCurrentPage(1);
  };

  const goToPage = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Загрузка...</div>
      </div>
    );
  }

  return (
    <div className="space-y-3 sm:space-y-4">
      {/* Заголовок и поиск */}
      <div className="flex flex-col gap-2 sm:flex-row sm:justify-between sm:items-center">
        <div className="flex items-center gap-2 sm:gap-4">
          {searchable && (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder={searchPlaceholder}
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-10 w-full sm:w-64"
              />
            </div>
          )}
        </div>
        
        {onAdd && (
          <div className="flex justify-end">
            <Button onClick={onAdd} className="w-full sm:w-auto">
              {addButtonText}
            </Button>
          </div>
        )}
      </div>

      {/* Таблица - скрыта на мобильных */}
      <div className="hidden sm:block border border-gray-300 overflow-x-auto rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((column) => (
                <TableHead key={String(column.id)} style={{ minWidth: column.minWidth }} className="whitespace-nowrap">
                  {column.label}
                </TableHead>
              ))}
              {showActions && (onEdit || onDelete || onPrint || onCopy) && (
                <TableHead className="text-right">Действия</TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length + (showActions ? 1 : 0)} className="text-center py-8">
                  <div className="text-gray-500">
                    {searchQuery ? 'Ничего не найдено' : 'Нет данных'}
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              paginatedData.map((row, index) => (
                <TableRow key={index}>
                  {columns.map((column) => (
                    <TableCell key={String(column.id)} className="whitespace-nowrap">
                      {column.render 
                        ? column.render(row[column.id], row)
                        : String(row[column.id] || '-')
                      }
                    </TableCell>
                  ))}
                  {showActions && (onEdit || onDelete || onPrint || onCopy) && (
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1 sm:gap-2">
                        {onEdit && (
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-7 w-7 sm:h-8 sm:w-8"
                            onClick={() => onEdit(row)}
                            title="Редактировать"
                          >
                            <Edit className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                          </Button>
                        )}
                        {onCopy && (
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-7 w-7 sm:h-8 sm:w-8 text-gray-700 border-gray-300 hover:bg-gray-50"
                            onClick={() => onCopy(row)}
                            title="Копировать"
                          >
                            <Copy className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                          </Button>
                        )}
                        {onPrint && (
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-7 w-7 sm:h-8 sm:w-8 text-gray-700 border-gray-300 hover:bg-gray-50"
                            onClick={() => onPrint(row)}
                            title="Печать"
                          >
                            <Printer className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                          </Button>
                        )}
                        {onDelete && (
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-7 w-7 sm:h-8 sm:w-8"
                            onClick={() => onDelete(row)}
                            disabled={canDelete ? !canDelete(row) : false}
                            title={canDelete && !canDelete(row) ? "Нельзя удалить" : "Удалить"}
                          >
                            <Trash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Карточный вид для мобильных */}
      <div className="block sm:hidden space-y-3">
        {paginatedData.length === 0 ? (
          <div className="text-center py-8 text-gray-500 bg-white border border-gray-200 rounded-lg">
            {searchQuery ? 'Ничего не найдено' : 'Нет данных'}
          </div>
        ) : (
          paginatedData.map((row, index) => {
            // Находим колонку с действиями (actions)
            const actionsColumn = columns.find(col => col.id === 'actions' || col.label === 'Действия');
            const actionButtons = actionsColumn?.render ? actionsColumn.render(null, row) : null;
            
            return (
              <div key={index} className="bg-white border border-gray-200 rounded-lg p-3 shadow-sm">
                {/* Основная информация */}
                <div className="space-y-2 mb-3">
                  {columns.filter(col => col.id !== 'actions' && col.label !== 'Действия').slice(0, 4).map((column) => (
                    <div key={String(column.id)} className="flex justify-between items-start">
                      <span className="text-xs font-medium text-gray-600 w-1/3">{column.label}:</span>
                      <span className="text-sm text-gray-900 w-2/3 text-right">
                        {column.render 
                          ? column.render(row[column.id], row)
                          : String(row[column.id] || '-')
                        }
                      </span>
                    </div>
                  ))}
                </div>
                
                {/* Действия из колонки actions */}
                {actionButtons && (
                  <div className="flex flex-wrap gap-2 pt-3 border-t border-gray-200">
                    {actionButtons}
                  </div>
                )}
                
                {/* Стандартные действия */}
                {showActions && (onEdit || onDelete || onPrint || onCopy) && !actionButtons && (
                  <div className="flex flex-wrap gap-2 pt-3 border-t border-gray-200">
                    {onEdit && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 min-w-[70px] text-xs py-1.5"
                        onClick={() => onEdit(row)}
                      >
                        <Edit className="h-3.5 w-3.5" />
                      </Button>
                    )}
                    {onCopy && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 min-w-[70px] text-xs text-gray-700 border-gray-300 py-1.5"
                        onClick={() => onCopy(row)}
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </Button>
                    )}
                    {onPrint && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 min-w-[70px] text-xs text-gray-700 border-gray-300 py-1.5"
                        onClick={() => onPrint(row)}
                      >
                        <Printer className="h-3.5 w-3.5" />
                      </Button>
                    )}
                    {onDelete && (!canDelete || canDelete(row)) && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 min-w-[70px] text-xs text-red-600 border-red-300 py-1.5"
                        onClick={() => onDelete(row)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Пагинация */}
      {filteredData.length > 0 && (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between bg-white sm:bg-transparent p-3 sm:p-0 rounded-lg sm:rounded-none border sm:border-0 border-gray-200">
          <div className="flex items-center gap-2 justify-between sm:justify-start">
            <span className="text-xs sm:text-sm text-gray-700">
              На странице:
            </span>
            <Select value={String(rowsPerPage)} onValueChange={handleRowsPerPageChange}>
              <SelectTrigger className="w-20 sm:w-24 text-xs sm:text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="25">25</SelectItem>
                <SelectItem value="50">50</SelectItem>
                <SelectItem value="100">100</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2 justify-between sm:justify-end">
            <span className="text-xs sm:text-sm text-gray-700">
              {((currentPage - 1) * rowsPerPage) + 1}-
              {Math.min(currentPage * rowsPerPage, filteredData.length)} из {filteredData.length}
            </span>
            
            <div className="flex items-center gap-0.5 sm:gap-1">
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8 sm:h-10 sm:w-10"
                onClick={() => goToPage(1)}
                disabled={currentPage === 1}
              >
                <ChevronsLeft className="h-3 w-3 sm:h-4 sm:w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8 sm:h-10 sm:w-10"
                onClick={() => goToPage(currentPage - 1)}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-3 w-3 sm:h-4 sm:w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8 sm:h-10 sm:w-10"
                onClick={() => goToPage(currentPage + 1)}
                disabled={currentPage === totalPages}
              >
                <ChevronRight className="h-3 w-3 sm:h-4 sm:w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8 sm:h-10 sm:w-10"
                onClick={() => goToPage(totalPages)}
                disabled={currentPage === totalPages}
              >
                <ChevronsRight className="h-3 w-3 sm:h-4 sm:w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
