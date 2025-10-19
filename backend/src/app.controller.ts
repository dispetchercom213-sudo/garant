import { Controller, Get } from '@nestjs/common';

@Controller()
export class AppController {
  @Get('health')
  healthCheck() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'GARANT BETON API',
      version: '1.0.0',
    };
  }

  @Get()
  root() {
    return {
      message: 'GARANT BETON API',
      version: '1.0.0',
      documentation: '/api/v1',
    };
  }
}

