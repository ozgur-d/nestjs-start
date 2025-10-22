import fastifyCookie from '@fastify/cookie';
import fastifyMultipart from '@fastify/multipart';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Cache } from 'cache-manager';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({
      trustProxy: true,
      bodyLimit: 1024 * 1024 * 100, // 100mb
      logger: false,
    }),
  );

  const configService = app.get(ConfigService);

  // Redis bağlantısını test et
  const cacheManager = app.get<Cache>(CACHE_MANAGER);
  await cacheManager.set('health_check', 'ok', 5000);
  const result = await cacheManager.get('health_check');
  if (result !== 'ok') {
    throw new Error('Redis connection test failed');
  }
  logger.log('✓ Redis connection successful');

  app.setGlobalPrefix('api/v1');

  //validation class
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
    }),
  );

  // Add cookie support
  await app.register(fastifyCookie, {
    secret: configService.getOrThrow<string>('COOKIE_SECRET'),
    hook: 'onRequest',
  });

  // Add multipart/form-data support
  await app.register(fastifyMultipart, {
    limits: {
      fileSize: 1024 * 1024 * 100, // 100MB
    },
  });

  //swagger config
  const config = new DocumentBuilder()
    .addBearerAuth({
      type: 'http',
      scheme: 'bearer',
      bearerFormat: 'JWT',
      in: 'header',
    })
    .setTitle('API DOCUMENT')
    .setDescription('API DOCUMENT')
    .setVersion('1.0')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api-docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  });

  const node_env = configService.getOrThrow<string>('NODE_ENV');
  const isProd = configService.getOrThrow<string>('NODE_ENV') === 'production';
  const siteUrl = configService.getOrThrow<string>('SITE_URL');
  const allowedOrigins = isProd ? [siteUrl] : [siteUrl, 'http://localhost:3000'];

  //allow any cors
  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
  });

  const port = configService.getOrThrow<number>('PORT', 5656);
  await app.listen(port, '0.0.0.0');

  //log node_env
  logger.verbose(`🚀 Application is running on NODE_ENV: ${node_env}`);
  logger.verbose(`🚀 Server is running on http://localhost:${port}/api-docs`);
}

bootstrap().catch((err) => console.log(err));
