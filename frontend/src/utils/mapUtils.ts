/**
 * Утилиты для работы с картографическими сервисами
 */

/**
 * Парсит строку координат в формате "lat,lng" или "lat, lng"
 */
export const parseCoordinates = (coordinates: string | undefined): { lat: number; lng: number } | null => {
  if (!coordinates) return null;
  
  const parts = coordinates.split(',').map(s => s.trim());
  if (parts.length !== 2) return null;
  
  const lat = parseFloat(parts[0]);
  const lng = parseFloat(parts[1]);
  
  if (isNaN(lat) || isNaN(lng)) return null;
  
  return { lat, lng };
};

/**
 * Открывает координаты в 2ГИС
 */
export const openIn2GIS = (coordinates: string | undefined) => {
  const coords = parseCoordinates(coordinates);
  if (!coords) {
    alert('Координаты не указаны или указаны неверно');
    return;
  }
  
  // 2GIS использует формат: https://2gis.kz/geo/{lon},{lat}
  const url = `https://2gis.kz/geo/${coords.lng},${coords.lat}`;
  window.open(url, '_blank');
};

/**
 * Открывает координаты в Яндекс.Картах
 */
export const openInYandex = (coordinates: string | undefined) => {
  const coords = parseCoordinates(coordinates);
  if (!coords) {
    alert('Координаты не указаны или указаны неверно');
    return;
  }
  
  // Яндекс.Карты используют формат: https://yandex.ru/maps/?ll={lon},{lat}&z=16&pt={lon},{lat}
  const url = `https://yandex.ru/maps/?ll=${coords.lng},${coords.lat}&z=16&pt=${coords.lng},${coords.lat}`;
  window.open(url, '_blank');
};

/**
 * Открывает координаты в Google Maps
 */
export const openInGoogle = (coordinates: string | undefined) => {
  const coords = parseCoordinates(coordinates);
  if (!coords) {
    alert('Координаты не указаны или указаны неверно');
    return;
  }
  
  // Google Maps используют формат: https://www.google.com/maps/search/?api=1&query={lat},{lon}
  const url = `https://www.google.com/maps/search/?api=1&query=${coords.lat},${coords.lng}`;
  window.open(url, '_blank');
};

/**
 * Показывает меню выбора карты
 */
export const showMapSelector = (coordinates: string | undefined) => {
  const coords = parseCoordinates(coordinates);
  if (!coords) {
    alert('Координаты не указаны или указаны неверно');
    return;
  }
  
  return coords;
};

