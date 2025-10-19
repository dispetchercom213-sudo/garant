import React, { useState } from 'react';
import { PageContainer } from '../components/PageContainer';
import { Button } from '../components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../components/ui/dialog';
import { ResponsiveDialog } from '../components/ui/responsive-dialog';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';

export const ModalTestPage: React.FC = () => {
  const [standardModalOpen, setStandardModalOpen] = useState(false);
  const [responsiveModalOpen, setResponsiveModalOpen] = useState(false);

  return (
    <PageContainer>
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Тест модальных окон</h1>
        <p className="text-gray-600">
          Эта страница предназначена для тестирования адаптивности модальных окон на мобильных устройствах.
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Button onClick={() => setStandardModalOpen(true)} className="h-20">
            Стандартное модальное окно
          </Button>
          
          <Button onClick={() => setResponsiveModalOpen(true)} className="h-20">
            Адаптивное модальное окно
          </Button>
        </div>
        
        <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
          <h3 className="text-lg font-semibold text-blue-800 mb-2">
            📱 Инструкции по тестированию
          </h3>
          <ul className="text-blue-700 space-y-1">
            <li>• Откройте модальные окна на мобильном устройстве</li>
            <li>• Проверьте, что окна занимают 95% ширины экрана</li>
            <li>• Убедитесь, что прокрутка работает плавно</li>
            <li>• Проверьте, что сетка адаптируется к размеру экрана</li>
          </ul>
        </div>
      </div>

      {/* Стандартное модальное окно */}
      <Dialog open={standardModalOpen} onOpenChange={setStandardModalOpen}>
        <DialogContent className="max-w-2xl w-[95vw] max-h-[90vh] overflow-y-auto modal-content">
          <DialogHeader>
            <DialogTitle>Стандартное модальное окно</DialogTitle>
            <DialogDescription>
              Это стандартное модальное окно с улучшенной мобильной адаптацией
            </DialogDescription>
          </DialogHeader>
          
          <div className="modal-grid space-y-4">
            <div>
              <Label htmlFor="field1">Поле 1</Label>
              <Input id="field1" placeholder="Введите текст..." />
            </div>
            
            <div>
              <Label htmlFor="field2">Поле 2</Label>
              <Input id="field2" placeholder="Введите текст..." />
            </div>
            
            <div className="md:col-span-2">
              <Label htmlFor="textarea">Большое текстовое поле</Label>
              <textarea 
                id="textarea"
                className="w-full p-2 border border-gray-300 rounded-md min-h-[100px]"
                placeholder="Введите длинный текст для тестирования прокрутки..."
              />
            </div>
          </div>
          
          {/* Дополнительный контент для тестирования прокрутки */}
          {Array.from({ length: 10 }, (_, i) => (
            <div key={i} className="p-4 bg-gray-50 rounded-lg border">
              <h4 className="font-semibold mb-2">Блок контента #{i + 1}</h4>
              <p className="text-gray-600">
                Lorem ipsum dolor sit amet, consectetur adipiscing elit. 
                Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.
              </p>
            </div>
          ))}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setStandardModalOpen(false)}>
              Отмена
            </Button>
            <Button onClick={() => setStandardModalOpen(false)}>
              Сохранить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Адаптивное модальное окно */}
      <ResponsiveDialog
        open={responsiveModalOpen}
        onOpenChange={setResponsiveModalOpen}
        title="Адаптивное модальное окно"
        description="Это модальное окно использует специальный компонент для лучшей адаптивности"
        size="xl"
        footer={
          <>
            <Button variant="outline" onClick={() => setResponsiveModalOpen(false)}>
              Отмена
            </Button>
            <Button onClick={() => setResponsiveModalOpen(false)}>
              Сохранить
            </Button>
          </>
        }
      >
        <div className="modal-grid space-y-4">
          <div>
            <Label htmlFor="rfield1">Адаптивное поле 1</Label>
            <Input id="rfield1" placeholder="Введите текст..." />
          </div>
          
          <div>
            <Label htmlFor="rfield2">Адаптивное поле 2</Label>
            <Input id="rfield2" placeholder="Введите текст..." />
          </div>
          
          <div className="md:col-span-2">
            <Label htmlFor="rtextarea">Большое адаптивное поле</Label>
            <textarea 
              id="rtextarea"
              className="w-full p-2 border border-gray-300 rounded-md min-h-[150px]"
              placeholder="Это поле должно хорошо работать на мобильных устройствах..."
            />
          </div>
        </div>
      </ResponsiveDialog>
    </PageContainer>
  );
};
