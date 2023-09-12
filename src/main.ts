import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

import * as cors from 'cors';
import * as dotenv from 'dotenv';
import { ValidationPipe } from '@nestjs/common';
dotenv.config();

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.use(cors());

  app.useGlobalPipes(
    new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
    }),
);
  const config = new DocumentBuilder()
    .setTitle('SEO')
    .setDescription('The SEO-tools Apis')
    .setVersion('1.0')
    .addTag('SEO')
    .build();
  
  app.setGlobalPrefix('api');
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/swagger', app, document);
  await app.listen(process.env.PORT || 3000);
}
bootstrap();
