export interface AppConfig {
  port: number;
  nodeEnv: string;
  frontendUrl: string;
  supabase: {
    url: string;
    anonKey: string;
    serviceRoleKey: string;
  };
  database: {
    databaseUrl: string;
    neonDatabaseUrl: string;
  };
  security: {
    appId: string;
    appSecret: string;
    adminUserId: string;
    adminEmail: string;
  };
  integrations: {
    apiBibleKey: string;
    telegramBotToken: string;
    telegramChannelId: string;
    geminiApiKey: string;
    openrouterApiKey: string;
    cloudinaryCloudName: string;
    cloudinaryApiKey: string;
    cloudinaryApiSecret: string;
    cloudinaryUrl: string;
  };
  archive: {
    supabaseUrl: string;
    supabaseServiceRoleKey: string;
    supabaseBucket: string;
  };
}

export default (): AppConfig => ({
  port: parseInt(process.env.PORT || '4000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
  supabase: {
    url: process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '',
    anonKey: process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '',
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  },
  database: {
    databaseUrl: process.env.DATABASE_URL || '',
    neonDatabaseUrl: process.env.NEON_DATABASE_URL || '',
  },
  security: {
    appId: process.env.APP_ID || 'daily-love-app',
    appSecret: process.env.APP_SECRET || 'daily-love-secret-jwt-key',
    adminUserId: process.env.ADMIN_USER_ID || '',
    adminEmail: process.env.ADMIN_EMAIL || '',
  },
  integrations: {
    apiBibleKey: process.env.API_BIBLE_KEY || '',
    telegramBotToken: process.env.TELEGRAM_BOT_TOKEN || '',
    telegramChannelId: process.env.TELEGRAM_CHANNEL_ID || '',
    geminiApiKey: process.env.GEMINI_API_KEY || '',
    openrouterApiKey: process.env.OPENROUTER_API_KEY || '',
    cloudinaryCloudName: process.env.CLOUDINARY_CLOUD_NAME || '',
    cloudinaryApiKey: process.env.CLOUDINARY_API_KEY || '',
    cloudinaryApiSecret: process.env.CLOUDINARY_API_SECRET || '',
    cloudinaryUrl: process.env.CLOUDINARY_URL || '',
  },
  archive: {
    supabaseUrl: process.env.ARCHIVE_SUPABASE_URL || '',
    supabaseServiceRoleKey: process.env.ARCHIVE_SUPABASE_SERVICE_ROLE_KEY || '',
    supabaseBucket: process.env.ARCHIVE_SUPABASE_BUCKET || 'chat-bulk-archives',
  },
});
