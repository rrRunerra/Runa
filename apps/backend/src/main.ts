import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { config } from 'dotenv';
import fs from 'fs';
import 'reflect-metadata';

config({ path: '../../.env' });

fs.watchFile('../../.env', () => {
  console.log('Environment variables changed');
  config({ path: '../../.env', override: true });
});

const REQUIRED_ENV_VARS = [
  'NEST_PORT',
  'DATABASE_URL',
  'NEXTAUTH_SECRET',
  'NEXTAUTH_URL',
  'NEXT_PUBLIC_URL',
  'NEXT_PUBLIC_API_URL',
];

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors();
  app.useGlobalPipes(new ValidationPipe());

  const builder = new DocumentBuilder().setTitle('API').setVersion('1.0');
  const document = SwaggerModule.createDocument(app, builder.build());
  SwaggerModule.setup('docs', app, document);

  for (const envVar of REQUIRED_ENV_VARS) {
    if (!process.env[envVar]) {
      throw new Error(`${envVar} is not defined`);
    }
  }

  await app.listen(Number(process.env.NEST_PORT));
}
bootstrap();
