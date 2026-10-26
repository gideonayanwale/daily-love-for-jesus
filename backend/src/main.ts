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
  const frontendUrlRaw = configService.get<string>('frontendUrl') || 'http://localhost:3000';
  const isProduction = configService.get<string>('nodeEnv') === 'production';

  // Parse comma-separated domains and normalize by removing trailing slashes
  const configuredOrigins = frontendUrlRaw
    .split(',')
    .map((url) => url.trim().replace(/\/$/, ''))
    .filter(Boolean);

  const defaultLocalOrigins = [
    'http://localhost:3000',
    'http://localhost:5173',
    'http://localhost:8081',
    'http://localhost:19000',
    'http://localhost:19006',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:8081',
    'capacitor://localhost',
    'ionic://localhost',
  ];

  const allowedOrigins = new Set<string>([...configuredOrigins, ...defaultLocalOrigins]);

  app.enableCors({
    origin: (origin, callback) => {
      // Allow non-browser requests (mobile apps, curl, server-to-server) with no Origin header
      if (!origin) {
        callback(null, true);
        return;
      }

      const normalizedOrigin = origin.replace(/\/$/, '');

      // 1. Direct match with configured origins
      if (allowedOrigins.has(normalizedOrigin)) {
        callback(null, true);
        return;
      }

      // 2. Allow preview and branch deployments from trusted hosts (Vercel, Netlify, Cloudflare Pages)
      const isTrustedPreview =
        /^https:\/\/[a-zA-Z0-9_-]+\.netlify\.app$/.test(normalizedOrigin) ||
        /^https:\/\/[a-zA-Z0-9_-]+\.pages\.dev$/.test(normalizedOrigin) ||
        /^https:\/\/[a-zA-Z0-9_-]+\.vercel\.app$/.test(normalizedOrigin);

      if (isTrustedPreview) {
        callback(null, true);
        return;
      }

      // 3. In non-production, allow all localhost ports
      if (!isProduction && /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(normalizedOrigin)) {
        callback(null, true);
        return;
      }

      callback(new Error(`CORS: origin '${origin}' is not allowed`), false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-admin-secret', 'Accept', 'x-requested-with'],
    maxAge: 86400,
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
