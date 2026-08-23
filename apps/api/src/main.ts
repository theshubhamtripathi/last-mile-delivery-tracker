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

  // Normalise (drop trailing slash, lowercase) so a stray slash or casing in the
  // CORS_ORIGIN env value can't silently break cross-site auth.
  const normalise = (u: string) => u.trim().replace(/\/+$/, '').toLowerCase();
  const allowed = new Set(
    (config.get<string>('CORS_ORIGIN') ?? 'http://localhost:3000')
      .split(',')
      .map(normalise)
      .filter(Boolean),
  );
  // eslint-disable-next-line no-console
  console.log(`CORS allowed origins: ${[...allowed].join(', ')}`);
  app.enableCors({
    origin: (origin, cb) => {
      // No Origin header = same-origin or a non-browser client (curl, health).
      if (!origin || allowed.has(normalise(origin))) return cb(null, true);
      return cb(null, false);
    },
    credentials: true,
  });

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

  // Hosting platforms (Render, Railway, …) inject PORT and expect the app to
  // bind it; fall back to API_PORT for local dev. Bind 0.0.0.0 so the platform
  // health check can reach the container.
  const port = Number(
    config.get<string>('PORT') ?? config.get<string>('API_PORT') ?? '4000',
  );
  await app.listen(port, '0.0.0.0');
  // eslint-disable-next-line no-console
  console.log(`API listening on port ${port} (docs at /docs)`);
}

void bootstrap();
