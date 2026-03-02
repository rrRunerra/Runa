import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { config } from 'dotenv';

config({ path: '../../.env' });

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(new ValidationPipe());

  const builder = new DocumentBuilder().setTitle('API').setVersion('1.0');
  const document = SwaggerModule.createDocument(app, builder.build());
  SwaggerModule.setup('docs', app, document);

  await app.listen(process.env.NEST_PORT || 4000);
}
bootstrap();
