import fastifyCookie from '@fastify/cookie';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { DateTime } from 'luxon';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter(),
  );

  app.setGlobalPrefix('api');

  //validation class
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
    }),
  );

  // Cookie desteği ekle
  await app.register(fastifyCookie, {
    secret: process.env.COOKIE_SECRET || 'my-secret-548932857', // Cookie imzalama için secret
    hook: 'onRequest', // Her request'te çalışacak
  });

  //swagger config
  const config = new DocumentBuilder()
    .addBearerAuth({
      type: 'http',
      scheme: 'bearer',
      bearerFormat: 'JWT',
      in: 'header',
    })
    .addCookieAuth('refresh_token')
    .setTitle('API DOCUMENT')
    .setDescription('API DOCUMENT')
    .setVersion('1.0')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  });

  //allow any cors
  app.enableCors();

  await app.listen(5656);
}

bootstrap()
  .then(() =>
    console.log(
      'Server started ' +
        DateTime.now().toLocaleString(DateTime.DATETIME_MED) +
        ' "http://localhost:5656/api" ',
    ),
  )
  .catch((err) => console.log(err));
