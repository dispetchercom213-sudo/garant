import React, { useEffect, useState, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { Box, Typography, Paper, Card, CardContent, Chip, CircularProgress, useMediaQuery, useTheme } from '@mui/material';
import { LocalShipping, Person, Assignment, LocationOn } from '@mui/icons-material';
import { invoicesApi } from '../services/api';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Фикс для иконок Leaflet в React
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

const DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

L.Marker.prototype.options.icon = DefaultIcon;

interface VehicleData {
  vehicle: {
    id: number;
    plate: string;
    type: string;
    capacity?: number;
  };
  driver: {
    id: number;
    firstName: string;
    lastName: string;
    phone: string;
  } | null;
  invoice: {
    id: number;
    invoiceNumber: string;
    quantityM3?: number;
    status?: string | null;
  };
  order: {
    id: number;
    orderNumber: string;
    deliveryAddress: string;
    coordinates?: string;
    createdBy?: {
      id: number;
      username: string;
      firstName?: string;
      lastName?: string;
    } | null;
  } | null;
  customer: {
    id: number;
    name: string;
  } | null;
  latitude: number | null;
  longitude: number | null;
  status: string;
  lastUpdate: string;
}

const statusLabels: Record<string, { label: string; color: 'success' | 'warning' | 'info' | 'error' | 'default' }> = {
  arrived: { label: 'На объекте', color: 'success' },
  departed: { label: 'Выехал с объекта', color: 'warning' },
  at_plant: { label: 'На заводе', color: 'info' },
  in_transit: { label: 'В пути', color: 'warning' },
  at_warehouse: { label: 'На складе', color: 'info' },
  unknown: { label: 'Неизвестно', color: 'default' },
};

export const AllVehiclesMapPage: React.FC = () => {
  const [vehicles, setVehicles] = useState<VehicleData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.down('md'));

  const loadVehicles = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('🗺️ Загрузка всех машин в работе для карты...');
      const response = await invoicesApi.getAllVehiclesForMap();
      console.log('✅ Машины загружены:', response.data?.length || 0, 'единиц');
      setVehicles(response.data || []);
    } catch (err: any) {
      console.error('❌ Ошибка загрузки машин:', {
        status: err.response?.status,
        message: err.response?.data?.message,
        url: err.config?.url,
      });
      
      if (err.response?.status === 401) {
        console.warn('⚠️ Токен истек, будет редирект на логин');
        return;
      }
      
      if (err.response?.status === 403) {
        setError('Недостаточно прав для просмотра карты транспорта.');
        return;
      }
      
      setError(err.response?.data?.message || 'Не удалось загрузить данные транспорта');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadVehicles();
    // Обновляем данные каждые 30 секунд
    const interval = setInterval(loadVehicles, 30000);
    return () => clearInterval(interval);
  }, []);

  // Фильтруем транспорт с валидными координатами
  const vehiclesWithCoordinates = useMemo(() => {
    return vehicles.filter(v => v.latitude !== null && v.longitude !== null);
  }, [vehicles]);

  // Вычисляем центр карты
  const mapCenter: [number, number] = useMemo(() => {
    if (vehiclesWithCoordinates.length === 0) {
      // Координаты по умолчанию (например, Алматы)
      return [43.2389, 76.8897];
    }

    const avgLat = vehiclesWithCoordinates.reduce((sum, v) => sum + (v.latitude || 0), 0) / vehiclesWithCoordinates.length;
    const avgLng = vehiclesWithCoordinates.reduce((sum, v) => sum + (v.longitude || 0), 0) / vehiclesWithCoordinates.length;
    
    return [avgLat, avgLng];
  }, [vehiclesWithCoordinates]);

  // Парсим координаты заказа
  const parseOrderCoordinates = (coordinates?: string): [number, number] | null => {
    if (!coordinates) return null;
    const parts = coordinates.split(',').map(s => s.trim());
    if (parts.length !== 2) return null;
    const lat = parseFloat(parts[0]);
    const lng = parseFloat(parts[1]);
    if (isNaN(lat) || isNaN(lng)) return null;
    return [lat, lng];
  };

  if (loading && vehicles.length === 0) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ 
      height: isMobile ? '100vh' : 'auto',
      display: isMobile ? 'flex' : 'block',
      flexDirection: isMobile ? 'column' : undefined,
      pb: isMobile ? 0 : 2,
    }}>
      <Box sx={{ 
        px: isMobile ? 1 : 2, 
        pt: isMobile ? 1 : 2,
        pb: isMobile ? 1 : 2,
        flexShrink: 0,
      }}>
        <Typography variant={isMobile ? 'h5' : 'h4'} gutterBottom sx={{ fontSize: isMobile ? '1.25rem' : undefined }}>
          Карта транспорта
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: isMobile ? 1 : 2, fontSize: isMobile ? '0.75rem' : undefined }}>
          Все машины в работе
        </Typography>

        {error && (
          <Paper sx={{ 
            p: isMobile ? 1 : 2, 
            mb: isMobile ? 1 : 2, 
            bgcolor: 'error.light', 
            color: 'error.contrastText',
            fontSize: isMobile ? '0.75rem' : undefined,
          }}>
            <Typography variant={isMobile ? 'body2' : 'body1'}>{error}</Typography>
          </Paper>
        )}

        <Box sx={{ 
          mb: isMobile ? 1 : 2, 
          display: 'flex', 
          gap: 1, 
          flexWrap: 'wrap',
        }}>
          <Chip
            label={`Всего: ${vehicles.length}`}
            color="primary"
            icon={<LocalShipping />}
            size={isMobile ? 'small' : 'medium'}
            sx={{ fontSize: isMobile ? '0.7rem' : undefined }}
          />
          <Chip
            label={`С координатами: ${vehiclesWithCoordinates.length}`}
            color="success"
            size={isMobile ? 'small' : 'medium'}
            sx={{ fontSize: isMobile ? '0.7rem' : undefined }}
          />
        </Box>
      </Box>

      <Paper sx={{ 
            height: isMobile ? 'calc(100vh - 180px)' : isTablet ? '500px' : '600px',
            position: 'relative',
            overflow: 'hidden',
            mx: isMobile ? 0 : 2,
            flex: isMobile ? 1 : undefined,
            minHeight: isMobile ? '400px' : '500px',
            border: '1px solid',
            borderColor: 'divider',
          }}>
        <MapContainer
          center={mapCenter}
          zoom={isMobile ? 10 : 11}
          style={{ height: '100%', width: '100%', zIndex: 0 }}
          zoomControl={!isMobile}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          
          {vehiclesWithCoordinates.map((vehicleData) => {
            const status = statusLabels[vehicleData.status] || statusLabels.unknown;
            
            return (
              <React.Fragment key={vehicleData.vehicle.id}>
                <Marker
                  position={[vehicleData.latitude!, vehicleData.longitude!]}
                >
                  <Popup maxWidth={isMobile ? 200 : 300} closeButton={true}>
                    <Box sx={{ 
                      maxWidth: isMobile ? 180 : 280,
                      fontSize: isMobile ? '0.75rem' : undefined,
                    }}>
                      <Typography 
                        variant={isMobile ? 'body1' : 'h6'} 
                        gutterBottom
                        sx={{ fontSize: isMobile ? '0.9rem' : undefined, fontWeight: 'bold' }}
                      >
                        <LocalShipping sx={{ verticalAlign: 'middle', mr: 0.5, fontSize: isMobile ? 16 : 20 }} />
                        {vehicleData.vehicle.plate}
                      </Typography>
                      <Typography 
                        variant="body2" 
                        color="text.secondary"
                        sx={{ fontSize: isMobile ? '0.7rem' : undefined }}
                      >
                        Тип: {vehicleData.vehicle.type}
                        {vehicleData.vehicle.capacity && ` • ${vehicleData.vehicle.capacity} ${vehicleData.vehicle.type === 'MIXER' ? 'м³' : 'т'}`}
                      </Typography>
                      {vehicleData.driver && (
                        <Typography 
                          variant="body2" 
                          sx={{ mt: 0.5, fontSize: isMobile ? '0.7rem' : undefined }}
                        >
                          <Person sx={{ verticalAlign: 'middle', mr: 0.5, fontSize: isMobile ? 14 : 16 }} />
                          {vehicleData.driver.firstName} {vehicleData.driver.lastName}
                          <br />
                          <small style={{ fontSize: isMobile ? '0.65rem' : undefined }}>📞 {vehicleData.driver.phone}</small>
                        </Typography>
                      )}
                      {vehicleData.order && (
                        <Typography 
                          variant="body2" 
                          sx={{ mt: 0.5, fontSize: isMobile ? '0.7rem' : undefined }}
                        >
                          <Assignment sx={{ verticalAlign: 'middle', mr: 0.5, fontSize: isMobile ? 14 : 16 }} />
                          Заказ: {vehicleData.order.orderNumber}
                          <br />
                          <small style={{ fontSize: isMobile ? '0.65rem' : undefined }}>📍 {vehicleData.order.deliveryAddress}</small>
                          {vehicleData.order.createdBy && (
                            <>
                              <br />
                              <small style={{ fontSize: isMobile ? '0.65rem' : undefined }}>
                                Менеджер: {vehicleData.order.createdBy.firstName || vehicleData.order.createdBy.username} {vehicleData.order.createdBy.lastName || ''}
                              </small>
                            </>
                          )}
                        </Typography>
                      )}
                      {vehicleData.customer && (
                        <Typography 
                          variant="body2" 
                          sx={{ mt: 0.5, fontSize: isMobile ? '0.7rem' : undefined }}
                        >
                          Клиент: {vehicleData.customer.name}
                        </Typography>
                      )}
                      <Typography 
                        variant="body2" 
                        sx={{ mt: 0.5, fontSize: isMobile ? '0.7rem' : undefined }}
                      >
                        Накладная: {vehicleData.invoice.invoiceNumber}
                        {vehicleData.invoice.quantityM3 && ` • ${vehicleData.invoice.quantityM3} м³`}
                      </Typography>
                      <Chip
                        label={status.label}
                        color={status.color}
                        size="small"
                        sx={{ mt: 0.5, fontSize: isMobile ? '0.65rem' : undefined, height: isMobile ? 20 : undefined }}
                      />
                      <Typography 
                        variant="caption" 
                        display="block" 
                        sx={{ 
                          mt: 0.5, 
                          color: 'text.secondary',
                          fontSize: isMobile ? '0.6rem' : undefined,
                        }}
                      >
                        Обновлено: {new Date(vehicleData.lastUpdate).toLocaleString('ru-RU')}
                      </Typography>
                    </Box>
                  </Popup>
                </Marker>
                
                {/* Показываем маркер точки доставки, если есть координаты заказа */}
                {vehicleData.order && (() => {
                  const orderCoords = parseOrderCoordinates(vehicleData.order.coordinates);
                  if (orderCoords) {
                    return (
                      <Marker
                        position={orderCoords}
                        icon={L.icon({
                          iconUrl: 'data:image/svg+xml;base64,' + btoa(`
                            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
                              <circle cx="16" cy="16" r="12" fill="#4caf50" stroke="#fff" stroke-width="2"/>
                              <circle cx="16" cy="16" r="4" fill="#fff"/>
                            </svg>
                          `),
                          iconSize: [32, 32],
                          iconAnchor: [16, 16],
                        })}
                      >
                        <Popup maxWidth={isMobile ? 200 : 250}>
                          <Box sx={{ 
                            maxWidth: isMobile ? 180 : 230,
                            fontSize: isMobile ? '0.75rem' : undefined,
                          }}>
                            <Typography 
                              variant={isMobile ? 'body2' : 'subtitle2'}
                              sx={{ 
                                fontSize: isMobile ? '0.85rem' : undefined,
                                fontWeight: 'bold',
                              }}
                            >
                              <LocationOn sx={{ verticalAlign: 'middle', mr: 0.5, fontSize: isMobile ? 14 : 16 }} />
                              Точка доставки
                            </Typography>
                            <Typography 
                              variant="body2"
                              sx={{ fontSize: isMobile ? '0.7rem' : undefined, mt: 0.5 }}
                            >
                              Заказ: {vehicleData.order.orderNumber}
                            </Typography>
                            <Typography 
                              variant="body2" 
                              color="text.secondary"
                              sx={{ fontSize: isMobile ? '0.65rem' : undefined, mt: 0.5 }}
                            >
                              {vehicleData.order.deliveryAddress}
                            </Typography>
                          </Box>
                        </Popup>
                      </Marker>
                    );
                  }
                  return null;
                })()}
              </React.Fragment>
            );
          })}
        </MapContainer>
      </Paper>

      {/* Список транспорта без координат */}
      {vehicles.filter(v => v.latitude === null || v.longitude === null).length > 0 && (
        <Box sx={{ 
          mt: isMobile ? 1 : 2,
          px: isMobile ? 1 : 2,
          pb: isMobile ? 1 : 2,
        }}>
          <Typography 
            variant={isMobile ? 'subtitle1' : 'h6'} 
            gutterBottom
            sx={{ fontSize: isMobile ? '0.95rem' : undefined, fontWeight: 'bold' }}
          >
            Транспорт без координат
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {vehicles.filter(v => v.latitude === null || v.longitude === null).map((vehicleData) => {
              const status = statusLabels[vehicleData.status] || statusLabels.unknown;
              return (
                <Card key={vehicleData.vehicle.id} sx={{ 
                  boxShadow: isMobile ? 1 : 2,
                }}>
                  <CardContent sx={{ p: isMobile ? 1.5 : 2 }}>
                    <Box sx={{ 
                      display: 'flex', 
                      flexDirection: isMobile ? 'column' : 'row',
                      justifyContent: 'space-between', 
                      alignItems: isMobile ? 'flex-start' : 'center',
                      gap: isMobile ? 1 : 0,
                    }}>
                      <Box sx={{ flex: 1 }}>
                        <Typography 
                          variant={isMobile ? 'body1' : 'h6'}
                          sx={{ 
                            fontSize: isMobile ? '0.9rem' : undefined,
                            fontWeight: isMobile ? 'bold' : undefined,
                          }}
                        >
                          <LocalShipping sx={{ 
                            verticalAlign: 'middle', 
                            mr: 0.5, 
                            fontSize: isMobile ? 16 : 20 
                          }} />
                          {vehicleData.vehicle.plate}
                        </Typography>
                        {vehicleData.driver && (
                          <Typography 
                            variant="body2" 
                            color="text.secondary"
                            sx={{ 
                              fontSize: isMobile ? '0.75rem' : undefined,
                              mt: isMobile ? 0.5 : 0,
                            }}
                          >
                            Водитель: {vehicleData.driver.firstName} {vehicleData.driver.lastName}
                          </Typography>
                        )}
                        {vehicleData.order && (
                          <Typography 
                            variant="body2" 
                            color="text.secondary"
                            sx={{ 
                              fontSize: isMobile ? '0.75rem' : undefined,
                              mt: isMobile ? 0.5 : 0,
                            }}
                          >
                            Заказ: {vehicleData.order.orderNumber}
                          </Typography>
                        )}
                      </Box>
                      <Chip 
                        label={status.label} 
                        color={status.color}
                        size={isMobile ? 'small' : 'medium'}
                        sx={{ 
                          fontSize: isMobile ? '0.7rem' : undefined,
                          height: isMobile ? 24 : undefined,
                          alignSelf: isMobile ? 'flex-start' : 'center',
                        }}
                      />
                    </Box>
                  </CardContent>
                </Card>
              );
            })}
          </Box>
        </Box>
      )}
    </Box>
  );
};


