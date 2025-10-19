// Утилиты для работы с данными форм

/**
 * Очищает объект от пустых строк, заменяя их на undefined
 * Это нужно для правильной отправки данных на бэкенд
 */
export function cleanFormData<T extends Record<string, any>>(
  data: T,
  optionalFields: (keyof T)[]
): Partial<T> {
  const cleaned = { ...data } as Partial<T>;
  
  optionalFields.forEach(field => {
    if (cleaned[field] === '') {
      (cleaned as any)[field] = undefined;
    }
  });
  
  return cleaned;
}

/**
 * Создает объект с очищенными данными для отправки на API
 */
export function prepareApiData<T extends Record<string, any>>(
  data: T,
  optionalFields: (keyof T)[]
): Partial<T> {
  return cleanFormData(data, optionalFields);
}
