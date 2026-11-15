import "dotenv/config";

function get(name: string, defaultValue?: string): string {
  const value = process.env[name];
  if (!value) {
    if (process.env.NODE_ENV === 'production' && defaultValue === undefined) {
      throw new Error(`${name} environment variable is required in production`);
    }
    if (process.env.NODE_ENV === 'production') {
      console.warn(`[env] Missing environment variable: ${name}`);
    }
  }
  return value ?? (defaultValue ?? '');
}

export const env = {
  // Supabase Configuration (Auth + Realtime + Storage)
  supabaseUrl: get("SUPABASE_URL", process.env.VITE_SUPABASE_URL ?? ""),
  supabaseAnonKey: get("SUPABASE_ANON_KEY", process.env.VITE_SUPABASE_ANON_KEY ?? ""),
  supabaseServiceRoleKey: get("SUPABASE_SERVICE_ROLE_KEY"),

  // Supabase Postgres connection string (fallback / migrations)
  databaseUrl: get("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/postgres"),

  // Neon Serverless PostgreSQL (primary app data - fast serverless reads/writes)
  // Get from: https://console.neon.tech → your project → Connection string
  neonDatabaseUrl: get("NEON_DATABASE_URL", ""),

  // App & Security
  appId: get("APP_ID", "daily-love-app"),
  appSecret: get("APP_SECRET"),
  isProduction: process.env.NODE_ENV === "production",

  // Admin Configuration
  adminUserId: process.env.ADMIN_USER_ID ?? "",
  adminEmail: process.env.ADMIN_EMAIL ?? "",

  // Telegram Bot Configuration
  telegramBotToken: get("TELEGRAM_BOT_TOKEN"),
  telegramWebhookSecret: get("TELEGRAM_WEBHOOK_SECRET"),
  telegramChannelId: get("TELEGRAM_CHANNEL_ID", ""),

  // Cloudinary Media Storage
  cloudinaryCloudName: get("CLOUDINARY_CLOUD_NAME"),
  cloudinaryApiKey: get("CLOUDINARY_API_KEY"),
  cloudinaryApiSecret: get("CLOUDINARY_API_SECRET"),
};
