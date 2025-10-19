import React from 'react';
import { Button } from './ui/button';
import { LayoutGrid, Table } from 'lucide-react';

interface ViewToggleProps {
  view: 'table' | 'cards';
  onViewChange: (view: 'table' | 'cards') => void;
}

export const ViewToggle: React.FC<ViewToggleProps> = ({ view, onViewChange }) => {
  return (
    <div className="flex gap-1 border rounded-md p-1">
      <Button
        variant={view === 'table' ? 'secondary' : 'ghost'}
        size="sm"
        onClick={() => onViewChange('table')}
        className="h-8 px-3"
      >
        <Table className="h-4 w-4 mr-1" />
        <span className="hidden sm:inline">Список</span>
      </Button>
      <Button
        variant={view === 'cards' ? 'secondary' : 'ghost'}
        size="sm"
        onClick={() => onViewChange('cards')}
        className="h-8 px-3"
      >
        <LayoutGrid className="h-4 w-4 mr-1" />
        <span className="hidden sm:inline">Карточки</span>
      </Button>
    </div>
  );
};

