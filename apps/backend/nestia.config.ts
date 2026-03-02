import 'reflect-metadata';
import { INestiaConfig } from '@nestia/sdk';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';

const NESTIA_CONFIG: INestiaConfig = {
  input: async () => {
    const app = await NestFactory.create(AppModule, { logger: false });
    return app;
  },
  output: '../../packages/api',
  swagger: {
    output: 'swagger.json',
    security: {
      bearer: {
        type: 'apiKey',
        name: 'Authorization',
        in: 'header',
      },
    },
  },
};
export default NESTIA_CONFIG;
