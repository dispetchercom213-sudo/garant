import React, { useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { SearchableSelect } from './ui/searchable-select';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Plus } from 'lucide-react';

interface SelectWithQuickAddProps {
  label: string;
  value: string;
  onValueChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  // Быстрое добавление
  enableQuickAdd?: boolean;
  quickAddTitle?: string;
  quickAddFields?: Array<{
    name: string;
    label: string;
    type?: 'text' | 'number' | 'email' | 'tel' | 'select';
    required?: boolean;
    placeholder?: string;
    options?: Array<{ value: string; label: string }>; // Для type: 'select'
  }>;
  onQuickAdd?: (data: Record<string, string>) => Promise<void>;
  quickAddDisabledMessage?: string;
}

export const SelectWithQuickAdd: React.FC<SelectWithQuickAddProps> = ({
  label,
  value,
  onValueChange,
  options,
  placeholder = 'Выберите...',
  required = false,
  disabled = false,
  enableQuickAdd = false,
  quickAddTitle = 'Добавить новый элемент',
  quickAddFields = [],
  onQuickAdd,
  quickAddDisabledMessage = 'Нет прав для добавления новых элементов',
}) => {
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [quickAddData, setQuickAddData] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const handleQuickAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!onQuickAdd) return;

    setLoading(true);
    try {
      await onQuickAdd(quickAddData);
      setIsQuickAddOpen(false);
      setQuickAddData({});
    } catch (error) {
      console.error('Ошибка добавления:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <Label className="mb-1 block">
        {label} {required && <span className="text-red-500">*</span>}
      </Label>
      <div className="flex gap-2">
        <div className="flex-1">
          <SearchableSelect
            value={value}
            onValueChange={onValueChange}
            options={options}
            placeholder={placeholder}
            required={required}
            disabled={disabled}
          />
        </div>
        {(enableQuickAdd || quickAddDisabledMessage) && (
          <Button
            type="button"
            size="icon"
            variant="outline"
            onClick={() => {
              if (enableQuickAdd && onQuickAdd) {
                setIsQuickAddOpen(true);
              } else {
                alert(quickAddDisabledMessage);
              }
            }}
            disabled={disabled}
            title={enableQuickAdd ? `Добавить ${label.toLowerCase()}` : quickAddDisabledMessage}
          >
            <Plus className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Диалог быстрого добавления */}
      <Dialog open={isQuickAddOpen} onOpenChange={setIsQuickAddOpen}>
        <DialogContent className="max-w-md w-[95vw] sm:w-full">
          <DialogHeader>
            <DialogTitle>{quickAddTitle}</DialogTitle>
            <DialogDescription>
              Заполните форму для быстрого добавления
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleQuickAddSubmit} className="space-y-4">
            {quickAddFields.map((field) => (
              <div key={field.name}>
                <Label htmlFor={field.name}>
                  {field.label} {field.required && <span className="text-red-500">*</span>}
                </Label>
                {field.type === 'select' ? (
                  <Select
                    value={quickAddData[field.name] || ''}
                    onValueChange={(value) => setQuickAddData({ ...quickAddData, [field.name]: value })}
                    required={field.required}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={field.placeholder || 'Выберите...'} />
                    </SelectTrigger>
                    <SelectContent>
                      {field.options?.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    id={field.name}
                    type={field.type || 'text'}
                    value={quickAddData[field.name] || ''}
                    onChange={(e) => setQuickAddData({ ...quickAddData, [field.name]: e.target.value })}
                    placeholder={field.placeholder}
                    required={field.required}
                  />
                )}
              </div>
            ))}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setIsQuickAddOpen(false)}>
                Отмена
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Добавление...' : 'Добавить'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

