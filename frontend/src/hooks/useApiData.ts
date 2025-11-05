import { useState, useEffect } from 'react';
import { useNotifications } from './useNotifications';

interface UseApiDataOptions {
  apiCall: () => Promise<any>;
  dependencies?: React.DependencyList;
}

export function useApiData<T>({
  apiCall,
  dependencies = []
}: UseApiDataOptions) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(false);
  const { error } = useNotifications();

  const fetchData = async () => {
    try {
      setLoading(true);
      console.log('📡 Загружаем данные...');
      const response = await apiCall();
      console.log('✅ Получен ответ от API:', response.data);
      
      // Универсальная обработка разных форматов ответов API
      let responseData: T[] = [];
      
      if (Array.isArray(response.data)) {
        responseData = response.data;
      } else if (response.data?.data && Array.isArray(response.data.data)) {
        responseData = response.data.data;
      } else if (response.data?.items && Array.isArray(response.data.items)) {
        responseData = response.data.items;
      } else if (response.data?.results && Array.isArray(response.data.results)) {
        responseData = response.data.results;
      } else if (response.data && typeof response.data === 'object' && !Array.isArray(response.data)) {
        // Если это объект (например, статистика dashboard), возвращаем его как массив с одним элементом
        // Это позволит использовать useApiData для объектов, но данные нужно будет извлекать из data[0]
        responseData = [response.data] as T[];
      } else {
        console.warn('Unexpected API response format:', response.data);
        responseData = [];
      }
      
      console.log('📊 Обработанные данные:', responseData);
      
      // Проверяем поля ScaleBridge для складов
      if (responseData.length > 0) {
        const firstItem = responseData[0] as any;
        if (firstItem && typeof firstItem === 'object' && 'name' in firstItem) {
          console.log('🏢 Детали первого склада:');
          console.log(`  - Название: ${firstItem.name}`);
          console.log(`  - hasScales: ${firstItem.hasScales}`);
          console.log(`  - scaleIpAddress: ${firstItem.scaleIpAddress}`);
          console.log(`  - scaleApiKey: ${firstItem.scaleApiKey ? '***настроен***' : 'не настроен'}`);
          console.log(`  - scaleComPort: ${firstItem.scaleComPort}`);
          console.log(`  - scaleStatus: ${firstItem.scaleStatus}`);
          
          // Показываем все поля склада
          console.log('📋 Все поля склада:', Object.keys(firstItem));
        }
      }
      
      setData(responseData);
    } catch (err: any) {
      console.error('💥 Ошибка при загрузке данных:', err);
      const errorMessage = err.response?.data?.message || err.message || 'Ошибка загрузки данных';
      error(errorMessage);
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, dependencies);

  return {
    data,
    loading,
    refetch: fetchData
  };
}
