import './register-paths';
import { NestFactory } from '@nestjs/core';
import { ExpressAdapter, NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';
import express from 'express';
import path from 'path';
import fs from 'fs';

let cachedServer: express.Express | null = null;

export async function createApp(): Promise<{ app: NestExpressApplication; expressApp: express.Express }> {
  const expressApp = express();
  const app = await NestFactory.create<NestExpressApplication>(
    AppModule,
    new ExpressAdapter(expressApp),
  );
  const configService = app.get(ConfigService);

  // Global filters & pipes
  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: false,
    }),
  );

  // CORS - Support Web SPA and Mobile (Expo, Android/iOS Emulators, Physical Devices)
  const frontendUrl = configService.get<string>('frontendUrl') || 'http://localhost:3000';
  const isProduction = configService.get<string>('nodeEnv') === 'production';
  const allowedOrigins = [
    frontendUrl,
    'http://localhost:3000',
    'http://localhost:5173',
    'http://localhost:8081',
    'http://localhost:19000',
    'http://localhost:19006',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:8081',
  ];

  app.enableCors({
    origin: (origin, callback) => {
      // Allow non-browser requests (mobile apps, curl, server-to-server) or matching origins
      if (!origin || !isProduction || allowedOrigins.includes(origin) || origin.startsWith('http://192.168.') || origin.startsWith('http://10.')) {
        callback(null, true);
      } else {
        callback(null, true);
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-admin-secret', 'Accept', 'x-requested-with'],
  });

  // Swagger OpenAPI Documentation
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Daily Love For Jesus - API')
    .setDescription('Modular NestJS Backend for Daily Love For Jesus Devotional & Community Platform')
    .setVersion('1.0.0')
    .addBearerAuth()
    .addTag('Auth', 'Authentication and profile management')
    .addTag('Bible', 'Holy Bible books, chapters, verses, translations, search, compare')
    .addTag('Hymns', 'Hymns catalog, search, and categories')
    .addTag('Devotionals', 'Daily devotionals feed and management')
    .addTag('Community', 'Sunday school groups, attendance, rosters, and push notifications')
    .addTag('Telegram', 'Telegram bot webhook and message ingestion')
    .addTag('Favorites', 'Bookmarks for verses, hymns, and devotionals')
    .addTag('Sync', 'Neon and Supabase PostgreSQL dual-database synchronization')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document, {
    customSiteTitle: 'Daily Love For Jesus API Docs',
  });

  return { app, expressApp };
}

// Standalone bootstrap for Render, Docker, Railway, and local development
async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const { app } = await createApp();
  const configService = app.get(ConfigService);
  const isProduction = configService.get<string>('nodeEnv') === 'production';

  // In production, serve frontend SPA static files if present
  const possiblePaths = [
    process.env.PUBLIC_DIR,
    path.resolve(__dirname, '../../app/dist/public'),
    path.resolve(__dirname, '../app/dist/public'),
    path.resolve(process.cwd(), '../app/dist/public'),
    path.resolve(process.cwd(), 'app/dist/public'),
    path.resolve(process.cwd(), 'dist/public'),
  ].filter(Boolean) as string[];

  const publicDir = possiblePaths.find((p) => fs.existsSync(p));
  if (isProduction && publicDir) {
    logger.log(`Serving static SPA frontend from: ${publicDir}`);
    app.use(express.static(publicDir));
    app.use((req, res, next) => {
      if (!req.path.startsWith('/api')) {
        res.sendFile(path.join(publicDir, 'index.html'));
      } else {
        next();
      }
    });
  }

  const port = configService.get<number>('port') || 4000;
  await app.listen(port, '0.0.0.0');

  logger.log(`🚀 NestJS Backend running at: http://localhost:${port}`);
  logger.log(`📖 Swagger API Documentation: http://localhost:${port}/api/docs`);
  logger.log(`⚡ tRPC API Endpoint: http://localhost:${port}/api/trpc`);
}

// Auto-run bootstrap when running directly in a standalone Node environment
if (!process.env.VERCEL) {
  bootstrap();
}

// Serverless entrypoint for Vercel
export default async function handler(req: any, res: any) {
  if (!cachedServer) {
    const { app, expressApp } = await createApp();
    await app.init();
    cachedServer = expressApp;
  }
  return cachedServer(req, res);
}
