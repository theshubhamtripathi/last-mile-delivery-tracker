import 'reflect-metadata';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { requestIdMiddleware } from './common/middleware/request-id.middleware';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { bufferLogs: false });
  const config = app.get(ConfigService);

  app.use(requestIdMiddleware);
  app.use(helmet());
  app.use(cookieParser());

  // Health lives at the root; everything else under /api/v1.
  app.setGlobalPrefix('api/v1', { exclude: ['health', 'health/ready'] });

  const origins = (config.get<string>('CORS_ORIGIN') ?? 'http://localhost:3000')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
  app.enableCors({ origin: origins, credentials: true });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // strip unknown properties
      forbidNonWhitelisted: true, // reject unknown properties outright
      transform: true, // coerce to DTO types
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Last-Mile Delivery Tracker API')
    .setDescription(
      'Configurable rate engine, explainable auto-assignment, immutable tracking history.',
    )
    .setVersion('1.0.0')
    .addBearerAuth()
    .addCookieAuth('access_token')
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, document);

  const port = Number(config.get<string>('API_PORT') ?? '4000');
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`API listening on http://localhost:${port} (docs at /docs)`);
}

void bootstrap();
