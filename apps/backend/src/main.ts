import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import 'reflect-metadata';

const REQUIRED_ENV_VARS = [
  'NEST_PORT',
  'DATABASE_URL',
  'NEXTAUTH_SECRET',
  'NEXTAUTH_URL',
  'NEXT_PUBLIC_URL',
  'NEXT_PUBLIC_API_URL',
];

REQUIRED_ENV_VARS.forEach((key) => {
  if (!process.env[key]) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
});

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({ origin: process.env.NEXT_PUBLIC_URL, credentials: true });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true }));

  const builder = new DocumentBuilder().setTitle('API').setVersion('1.0');
  const document = SwaggerModule.createDocument(app, builder.build());
  SwaggerModule.setup('docs', app, document);

  const port = Number(process.env.NEST_PORT) || 3000;
  await app.listen(port);
  console.log(`Application is running on: ${await app.getUrl()}`);
}
bootstrap();
