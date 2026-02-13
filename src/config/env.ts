import { z } from 'zod';

// Environment variables schema
const envSchema = z.object({
  // Supabase Configuration
  VITE_SUPABASE_URL: z.string().url('Invalid Supabase URL'),
  VITE_SUPABASE_ANON_KEY: z.string().min(1, 'Supabase anon key is required'),

  // Database Configuration (Optional - for direct PostgreSQL access)
  VITE_DB_HOST: z.string().optional(),
  VITE_DB_PORT: z.string().optional(),
  VITE_DB_USER: z.string().optional(),
  VITE_DB_PASS: z.string().optional(),
  VITE_DB_NAME: z.string().optional(),

  // Application Mode
  VITE_APP_MODE: z
    .enum(['manager', 'reception', 'admin', 'production', 'printer'])
    .optional(),

  // Build Target
  VITE_APP_TARGET: z
    .enum(['manager', 'reception', 'admin', 'production', 'printer'])
    .optional(),

  // API Keys (Optional)
  GEMINI_API_KEY: z.string().optional(),
});

// Parse and validate environment variables
export const env = envSchema.parse({
  VITE_SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL,
  VITE_SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY,
  VITE_DB_HOST: import.meta.env.VITE_DB_HOST,
  VITE_DB_PORT: import.meta.env.VITE_DB_PORT,
  VITE_DB_USER: import.meta.env.VITE_DB_USER,
  VITE_DB_PASS: import.meta.env.VITE_DB_PASS,
  VITE_DB_NAME: import.meta.env.VITE_DB_NAME,
  VITE_APP_MODE: import.meta.env.VITE_APP_MODE,
  VITE_APP_TARGET: import.meta.env.VITE_APP_TARGET,
  GEMINI_API_KEY: import.meta.env.GEMINI_API_KEY,
});

// Type-safe environment variables
export type Env = z.infer<typeof envSchema>;

// Helper function to check if running in development
export const isDev = import.meta.env.DEV;

// Helper function to check if running in production
export const isProd = import.meta.env.PROD;

// Log environment status (only in development)
if (isDev) {
  console.log('🔧 Environment Configuration:');
  console.log('- Mode:', env.VITE_APP_MODE || 'default');
  console.log('- Supabase URL:', env.VITE_SUPABASE_URL);
  console.log('- Database Host:', env.VITE_DB_HOST || 'Not configured');
}
