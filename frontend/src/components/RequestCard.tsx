import React from 'react';
import { type InternalRequest, RequestStatus } from '../types';
import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Calendar, DollarSign, Package, User } from 'lucide-react';

interface RequestCardProps {
  request: InternalRequest;
  onAction?: (request: InternalRequest) => void;
  actionLabel?: string;
  actionIcon?: React.ReactNode;
  showAction?: boolean;
}

export const RequestCard: React.FC<RequestCardProps> = ({ 
  request, 
  onAction, 
  actionLabel, 
  actionIcon,
  showAction = false 
}) => {
  const getStatusBadge = (status: RequestStatus) => {
    const statusMap: Record<RequestStatus, { label: string; variant: 'default' | 'secondary' | 'success' | 'destructive' | 'outline' }> = {
      [RequestStatus.NEW]: { label: 'Новая', variant: 'default' },
      [RequestStatus.UNDER_REVIEW]: { label: 'На рассмотрении', variant: 'secondary' },
      [RequestStatus.WAITING_DIRECTOR]: { label: 'У директора', variant: 'outline' },
      [RequestStatus.APPROVED]: { label: 'Одобрена', variant: 'success' },
      [RequestStatus.REJECTED]: { label: 'Отклонена', variant: 'destructive' },
      [RequestStatus.WAITING_ACCOUNTANT]: { label: 'У бухгалтера', variant: 'secondary' },
      [RequestStatus.FUNDED]: { label: 'Финансирована', variant: 'success' },
      [RequestStatus.PURCHASED]: { label: 'Закуплена', variant: 'success' },
      [RequestStatus.DELIVERED]: { label: 'Получена', variant: 'success' },
    };

    const { label, variant } = statusMap[status] || { label: status, variant: 'default' };
    return <Badge variant={variant}>{label}</Badge>;
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        {/* Заголовок карточки */}
        <div className="flex justify-between items-start mb-3">
          <div>
            <div className="text-lg font-semibold text-gray-900">{request.itemName}</div>
            <div className="text-sm text-gray-500">#{request.requestNumber}</div>
          </div>
          {getStatusBadge(request.status)}
        </div>

        {/* Основная информация */}
        <div className="space-y-2 mb-3">
          {/* Количество */}
          <div className="flex items-center gap-2 text-sm">
            <Package className="h-4 w-4 text-gray-400" />
            <span className="text-gray-600">Количество:</span>
            <span className="font-medium">{request.quantity} {request.unit}</span>
          </div>

          {/* Сотрудник (если есть) */}
          {request.employee && (
            <div className="flex items-center gap-2 text-sm">
              <User className="h-4 w-4 text-gray-400" />
              <span className="text-gray-600">Инициатор:</span>
              <span className="font-medium">
                {request.employee.firstName} {request.employee.lastName}
              </span>
            </div>
          )}

          {/* Поставщик (если есть) */}
          {request.supplier && (
            <div className="flex items-center gap-2 text-sm">
              <Package className="h-4 w-4 text-gray-400" />
              <span className="text-gray-600">Поставщик:</span>
              <span className="font-medium">{request.supplier}</span>
            </div>
          )}

          {/* Сумма (если есть) */}
          {request.totalAmount && (
            <div className="flex items-center gap-2 text-sm">
              <DollarSign className="h-4 w-4 text-gray-400" />
              <span className="text-gray-600">Сумма:</span>
              <span className="font-semibold text-gray-900">
                {request.totalAmount.toFixed(2)} ₸
              </span>
            </div>
          )}

          {/* Дата */}
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="h-4 w-4 text-gray-400" />
            <span className="text-gray-600">Создана:</span>
            <span className="font-medium">
              {new Date(request.createdAt).toLocaleDateString('ru-RU')}
            </span>
          </div>
        </div>

        {/* Текущий этап */}
        {request.currentStep && (
          <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded mb-3">
            {request.currentStep}
          </div>
        )}

        {/* Назначение */}
        {request.reason && (
          <div className="text-xs text-gray-600 italic mb-3">
            {request.reason}
          </div>
        )}

        {/* Кнопка действия */}
        {showAction && onAction && (
          <Button 
            onClick={() => onAction(request)} 
            className="w-full"
            size="sm"
          >
            {actionIcon && <span className="mr-2">{actionIcon}</span>}
            {actionLabel || 'Действие'}
          </Button>
        )}
      </CardContent>
    </Card>
  );
};

