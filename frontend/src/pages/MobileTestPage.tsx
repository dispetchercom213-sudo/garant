import React from 'react';
import { PageContainer } from '../components/PageContainer';

export const MobileTestPage: React.FC = () => {
  return (
    <PageContainer>
      <div className="space-y-4">
        <h1 className="text-3xl font-bold">Тест мобильной прокрутки</h1>
        <p className="text-gray-600">
          Эта страница предназначена для тестирования прокрутки на мобильных устройствах.
        </p>
        
        {/* Создаем много контента для тестирования прокрутки */}
        {Array.from({ length: 50 }, (_, i) => (
          <div key={i} className="p-4 bg-white rounded-lg shadow border">
            <h3 className="text-lg font-semibold mb-2">
              Блок контента #{i + 1}
            </h3>
            <p className="text-gray-600">
              Lorem ipsum dolor sit amet, consectetur adipiscing elit. 
              Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. 
              Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris.
            </p>
            <div className="mt-2 text-sm text-gray-500">
              ID: {i + 1} | Время: {new Date().toLocaleTimeString()}
            </div>
          </div>
        ))}
        
        <div className="p-4 bg-green-100 rounded-lg border border-green-300">
          <h3 className="text-lg font-semibold text-green-800 mb-2">
            ✅ Конец контента
          </h3>
          <p className="text-green-700">
            Если вы видите этот блок, значит прокрутка работает корректно!
          </p>
        </div>
      </div>
    </PageContainer>
  );
};
