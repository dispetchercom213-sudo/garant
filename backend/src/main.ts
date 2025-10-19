import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { initUsers } from './init-users';

async function bootstrap() {
  // Инициализация пользователей перед запуском приложения
  await initUsers();
  
  const app = await NestFactory.create(AppModule);
  
  // Глобальная валидация
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }));

  // CORS настройки
  const allowedOrigins = process.env.CORS_ORIGIN 
    ? process.env.CORS_ORIGIN.split(',')
    : ['http://localhost:3000', 'http://localhost:5173'];
  
  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
  });

  // Глобальный префикс API
  app.setGlobalPrefix('api/v1');

  const port = process.env.PORT || 4000;
  await app.listen(port);
  
  console.log(`🚀 BetonAPP Backend запущен на порту ${port}`);
  console.log(`📊 API доступен по адресу: http://localhost:${port}/api/v1`);
}

bootstrap();



