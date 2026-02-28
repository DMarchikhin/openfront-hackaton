import { defineConfig } from '@mikro-orm/postgresql';
import { Migrator } from '@mikro-orm/migrations';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

// Try app root (watch mode CWD) then compiled dist dir
dotenv.config({ path: resolve(process.cwd(), '.env') });
dotenv.config({ path: resolve(__dirname, '.env') });

export default defineConfig({
  clientUrl: process.env.DATABASE_URL ?? 'postgresql://postgres:postgres@localhost:5432/openfort',
  entities: ['./dist/src/**/*.entity.js'],
  entitiesTs: ['./src/**/*.entity.ts'],
  migrations: {
    path: './src/database/migrations',
    pathTs: './src/database/migrations',
  },
  extensions: [Migrator],
  debug: process.env.NODE_ENV === 'development',
  allowGlobalContext: true,
});
