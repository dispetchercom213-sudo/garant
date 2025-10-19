import React from 'react';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Edit, Trash2 } from 'lucide-react';

interface EntityCardField {
  label: string;
  value: React.ReactNode;
  fullWidth?: boolean;
}

interface EntityCardProps {
  title: string;
  subtitle?: string;
  badge?: {
    label: string;
    variant?: 'default' | 'secondary' | 'destructive' | 'outline';
  };
  fields: EntityCardField[];
  onEdit?: () => void;
  onDelete?: () => void;
  canDelete?: boolean;
}

export const EntityCard: React.FC<EntityCardProps> = ({
  title,
  subtitle,
  badge,
  fields,
  onEdit,
  onDelete,
  canDelete = true
}) => {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        {/* Заголовок и действия */}
        <div className="flex justify-between items-start mb-3">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-lg truncate">{title}</h3>
            {subtitle && (
              <p className="text-sm text-gray-600 truncate">{subtitle}</p>
            )}
          </div>
          <div className="flex gap-2 ml-2 flex-shrink-0">
            {badge && (
              <Badge variant={badge.variant || 'default'}>
                {badge.label}
              </Badge>
            )}
            {onEdit && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onEdit}
                className="h-8 w-8 p-0"
              >
                <Edit className="h-4 w-4" />
              </Button>
            )}
            {onDelete && canDelete && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onDelete}
                className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Поля */}
        <div className="grid grid-cols-2 gap-3">
          {fields.map((field, index) => (
            <div 
              key={index} 
              className={field.fullWidth ? 'col-span-2' : 'col-span-1'}
            >
              <p className="text-xs text-gray-500 mb-1">{field.label}</p>
              <div className="text-sm font-medium">
                {field.value || '-'}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

